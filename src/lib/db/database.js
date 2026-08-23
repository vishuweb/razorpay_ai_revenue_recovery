import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Get the singleton database instance.
 * Initializes schema on first call. Uses WAL mode for concurrency.
 */
export function getDb() {
  if (globalThis.__revenueRecoveryDb) {
    return globalThis.__revenueRecoveryDb;
  }

  const dbPath = path.join(process.cwd(), 'data', 'revenue_recovery.db');
  const dataDir = path.dirname(dbPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Initialize schema
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  }

  globalThis.__revenueRecoveryDb = db;
  return db;
}

/**
 * Reset the entire database — used by the simulator to start fresh.
 * Deletes all data but preserves schema.
 */
export function resetDatabase() {
  const db = getDb();
  db.exec(`
    DELETE FROM audit_log;
    DELETE FROM recovery_actions;
    DELETE FROM recovery_cases;
    DELETE FROM payments;
    DELETE FROM invoices;
    DELETE FROM subscriptions;
    DELETE FROM customers;
  `);
}

/**
 * Log an entry to the audit trail.
 */
export function auditLog(entry) {
  const db = getDb();
  const { v4: uuidv4 } = require('uuid');
  db.prepare(`
    INSERT INTO audit_log (id, entity_type, entity_id, event_type, description, details, actor, amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    uuidv4(),
    entry.entityType,
    entry.entityId,
    entry.eventType,
    entry.description,
    entry.details ? JSON.stringify(entry.details) : null,
    entry.actor || 'system',
    entry.amount || null
  );
}
