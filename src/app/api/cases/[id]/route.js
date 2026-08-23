import { NextResponse } from 'next/server'
import { getDb, auditLog } from '@/lib/db/database'
import { executeRecoveryAction } from '@/lib/engine/orchestrator'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const db = getDb()

    const caseRecord = db.prepare(`SELECT * FROM recovery_cases WHERE id = ?`).get(id)
    if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(caseRecord.customer_id)
    const recoveryActions = db.prepare(`SELECT * FROM recovery_actions WHERE case_id = ? ORDER BY created_at ASC`).all(id)
    const auditEntries = db.prepare(`SELECT * FROM audit_log WHERE entity_id = ? ORDER BY created_at ASC`).all(id)
    const payment = db.prepare(`SELECT * FROM payments WHERE id = ?`).get(caseRecord.payment_id)
    const subscription = customer ? db.prepare(`SELECT * FROM subscriptions WHERE customer_id = ?`).get(customer.id) : null
    const invoice = payment ? db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(payment.invoice_id) : null

    return NextResponse.json({
      case: caseRecord,
      customer,
      recoveryActions,
      auditEntries,
      payment,
      subscription,
      invoice
    })
  } catch (error) {
    console.error('Case Detail GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const { action, actionId } = await request.json()
    const db = getDb()

    const caseRecord = db.prepare(`SELECT * FROM recovery_cases WHERE id = ?`).get(id)
    if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    if (action === 'approve') {
      if (!actionId) return NextResponse.json({ error: 'actionId required' }, { status: 400 })
      db.prepare(`UPDATE recovery_actions SET status = 'approved', approved_by = 'user' WHERE id = ?`).run(actionId)
      auditLog('recovery_case', id, 'action_approved', 'user', { actionId })
      const result = await executeRecoveryAction(actionId)
      return NextResponse.json(result)
    }

    if (action === 'execute') {
      if (!actionId) return NextResponse.json({ error: 'actionId required' }, { status: 400 })
      const result = await executeRecoveryAction(actionId)
      return NextResponse.json(result)
    }

    if (action === 'stop') {
      db.prepare(`UPDATE recovery_cases SET status = 'stopped', resolved_at = datetime('now') WHERE id = ?`).run(id)
      auditLog('recovery_case', id, 'case_stopped', 'user', {})
      return NextResponse.json({ success: true, message: 'Case stopped' })
    }

    if (action === 'escalate') {
      const newActionId = uuidv4()
      db.prepare(`
        INSERT INTO recovery_actions (id, case_id, type, status, priority, scheduled_for, created_at)
        VALUES (?, ?, 'escalate', 'pending', 'high', datetime('now'), datetime('now'))
      `).run(newActionId, id)
      auditLog('recovery_case', id, 'escalation_requested', 'user', { actionId: newActionId })
      return NextResponse.json({ success: true, actionId: newActionId })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Case Detail PATCH Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
