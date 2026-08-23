import { getDb, auditLog } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { processFailedPayment } from '../engine/orchestrator.js';

export function triggerScenario(scenarioType) {
  const db = getDb();
  let type = scenarioType;
  
  const types = ['temporary_failure', 'chronic_failure', 'high_value_failure', 'expired_card', 'gateway_outage'];
  if (type === 'random') type = types[Math.floor(Math.random() * types.length)];

  let targetCustomer;
  let failureReason = 'insufficient_funds';
  let failureSource = 'bank';
  let isGatewayOutage = false;

  if (type === 'temporary_failure') {
    targetCustomer = db.prepare('SELECT * FROM customers ORDER BY RANDOM() LIMIT 1').get();
  } else if (type === 'chronic_failure') {
    targetCustomer = db.prepare('SELECT * FROM customers ORDER BY RANDOM() LIMIT 1').get();
    failureReason = 'card_declined';
    db.prepare('UPDATE customers SET failed_payments = failed_payments + 5 WHERE id = ?').run(targetCustomer.id);
  } else if (type === 'high_value_failure') {
    targetCustomer = db.prepare('SELECT * FROM customers WHERE plan = "enterprise" ORDER BY RANDOM() LIMIT 1').get();
  } else if (type === 'expired_card') {
    targetCustomer = db.prepare('SELECT * FROM customers WHERE payment_method = "card" ORDER BY RANDOM() LIMIT 1').get();
    if (!targetCustomer) targetCustomer = db.prepare('SELECT * FROM customers ORDER BY RANDOM() LIMIT 1').get(); // Fallback
    failureReason = 'card_expired';
  } else if (type === 'gateway_outage') {
    isGatewayOutage = true;
    failureReason = 'gateway_error';
    failureSource = 'razorpay';
  }

  const createFailureForCustomer = (customer, reason, source) => {
    const sub = db.prepare('SELECT * FROM subscriptions WHERE customer_id = ? LIMIT 1').get(customer.id);
    const amount = customer.mrr;

    const invId = uuidv4();
    const date = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO invoices (
        id, customer_id, subscription_id, amount, currency, status, due_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invId, customer.id, sub ? sub.id : null, amount, 'INR', 'unpaid', date, date);

    const payId = uuidv4();
    db.prepare(`
      INSERT INTO payments (
        id, customer_id, subscription_id, invoice_id, amount, currency, status, 
        method, failure_reason, failure_source, provider_payment_id, attempted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(payId, customer.id, sub ? sub.id : null, invId, amount, 'INR', 'failed', customer.payment_method, reason, source, `raz_${uuidv4()}`, date, date);

    db.prepare('UPDATE customers SET failed_payments = failed_payments + 1 WHERE id = ?').run(customer.id);
    if (sub) {
      db.prepare('UPDATE subscriptions SET status = "past_due" WHERE id = ?').run(sub.id);
    }

    return processFailedPayment(payId);
  };

  if (isGatewayOutage) {
    const customers = db.prepare('SELECT * FROM customers ORDER BY RANDOM() LIMIT 3').all();
    const cases = customers.map(c => createFailureForCustomer(c, failureReason, failureSource));
    return { scenario: type, cases };
  } else {
    if (!targetCustomer) targetCustomer = db.prepare('SELECT * FROM customers ORDER BY RANDOM() LIMIT 1').get();
    const result = createFailureForCustomer(targetCustomer, failureReason, failureSource);
    return { scenario: type, cases: [result] };
  }
}
