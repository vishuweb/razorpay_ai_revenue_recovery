import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/database'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const db = getDb()

    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id)
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const paymentHistory = db.prepare(`SELECT * FROM payments WHERE customer_id = ? ORDER BY attempted_at DESC LIMIT 50`).all(id)
    const subscriptions = db.prepare(`SELECT * FROM subscriptions WHERE customer_id = ?`).all(id)
    const invoices = db.prepare(`SELECT * FROM invoices WHERE customer_id = ?`).all(id)
    const recoveryCases = db.prepare(`SELECT * FROM recovery_cases WHERE customer_id = ? ORDER BY opened_at DESC`).all(id)
    
    let recoveryActions = []
    if (recoveryCases.length > 0) {
      const caseIds = recoveryCases.map(c => `'${c.id}'`).join(',')
      recoveryActions = db.prepare(`SELECT * FROM recovery_actions WHERE case_id IN (${caseIds}) ORDER BY created_at DESC`).all()
    }

    const auditEntries = db.prepare(`SELECT * FROM audit_log WHERE entity_id = ? ORDER BY created_at DESC`).all(id)

    const totalPayments = paymentHistory.length
    const successfulPayments = paymentHistory.filter(p => p.status === 'success').length
    const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0
    
    const avgPaymentAmount = totalPayments > 0 ? paymentHistory.reduce((acc, p) => acc + p.amount, 0) / totalPayments : 0
    
    const totalAtRisk = recoveryCases.filter(c => ['open', 'in_progress'].includes(c.status)).reduce((acc, c) => acc + c.amount_at_risk, 0)
    const totalRecovered = recoveryCases.filter(c => c.status === 'recovered').reduce((acc, c) => acc + c.recovered_amount, 0)

    return NextResponse.json({
      customer,
      paymentHistory,
      subscriptions,
      invoices,
      recoveryCases,
      recoveryActions,
      auditEntries,
      stats: {
        paymentSuccessRate,
        avgPaymentAmount,
        totalAtRisk,
        totalRecovered
      }
    })
  } catch (error) {
    console.error('Customer Detail GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
