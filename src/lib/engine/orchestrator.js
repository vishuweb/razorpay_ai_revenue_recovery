import { getDb, auditLog } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { classifyFailure } from './classifier.js';
import { predictRecovery } from './predictor.js';
import { calculatePriority } from './prioritizer.js';
import { decideAction } from './decider.js';
import { checkGuardrails } from './guardrails.js';
import { getSimulationProvider } from '../providers/simulation.js';

export function processFailedPayment(paymentId) {
  const db = getDb();
  
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
  if (!payment) throw new Error('Payment not found');
  
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(payment.customer_id);
  if (!customer) throw new Error('Customer not found');

  const classification = classifyFailure(payment.failure_reason, payment.failure_source);
  
  const caseData = {
    attempts_made: 0,
    max_attempts: 5,
    failure_category: classification.category,
    amount_at_risk: payment.amount,
    opened_at: new Date().toISOString()
  };

  const prediction = predictRecovery(classification.baseRecoveryProbability, customer, caseData);
  
  let urgency = 100; // Fresh failure
  const priority = calculatePriority(prediction.probability, payment.amount, customer.lifetime_value, urgency);
  
  const decision = decideAction(
    { ...caseData, failure_reason: payment.failure_reason },
    customer,
    classification,
    prediction,
    priority
  );

  const caseId = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  db.prepare(`
    INSERT INTO recovery_cases (
      id, customer_id, payment_id, subscription_id, invoice_id, amount_at_risk, 
      failure_reason, failure_category, recovery_probability, priority_score, 
      recommended_action, ai_reasoning, status, current_step, max_attempts, 
      attempts_made, recovered_amount, opened_at, expires_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    caseId, customer.id, payment.id, payment.subscription_id, payment.invoice_id, payment.amount,
    payment.failure_reason, classification.category, prediction.probability, priority.score,
    decision.action, decision.reasoning, 'open', 1, 5, 0, 0, caseData.opened_at, expiresAt, new Date().toISOString()
  );

  const actionId = uuidv4();
  const scheduledAt = new Date(Date.now() + decision.scheduledDelay).toISOString();
  
  db.prepare(`
    INSERT INTO recovery_actions (
      id, case_id, action_type, status, scheduled_at, requires_approval, ai_reasoning, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    actionId, caseId, decision.action, 'pending', scheduledAt, decision.requiresApproval ? 1 : 0, decision.reasoning, new Date().toISOString()
  );

  auditLog({
    entityType: 'case',
    entityId: caseId,
    eventType: 'case_opened',
    description: `Recovery case opened for failed payment ${payment.id}`,
    details: JSON.stringify({ classification, prediction, priority, decision }),
    actor: 'system',
    amount: payment.amount
  });

  return { caseId, actionId, decision };
}

export async function executeRecoveryAction(actionId) {
  const db = getDb();
  
  const action = db.prepare('SELECT * FROM recovery_actions WHERE id = ?').get(actionId);
  if (!action) throw new Error('Action not found');
  
  const caseData = db.prepare('SELECT * FROM recovery_cases WHERE id = ?').get(action.case_id);
  if (!caseData) throw new Error('Case not found');

  const history = db.prepare('SELECT * FROM recovery_actions WHERE case_id = ?').all(caseData.id);
  
  const guardrailsResult = checkGuardrails(caseData, action.action_type, history);
  
  if (!guardrailsResult.allowed) {
    db.prepare('UPDATE recovery_actions SET status = ?, result_details = ? WHERE id = ?')
      .run('skipped', JSON.stringify({ violations: guardrailsResult.violations }), action.id);
    
    auditLog({
      entityType: 'action',
      entityId: action.id,
      eventType: 'action_skipped',
      description: `Action skipped due to guardrails: ${guardrailsResult.violations.join(', ')}`,
      details: JSON.stringify(guardrailsResult),
      actor: 'system',
      amount: 0
    });
    return { status: 'skipped', guardrailsResult };
  }

  if (action.requires_approval === 1 && !action.approved_by) {
    return { status: 'pending_approval' };
  }

  db.prepare('UPDATE recovery_actions SET status = ?, executed_at = ? WHERE id = ?')
    .run('executing', new Date().toISOString(), action.id);

  const provider = getSimulationProvider();
  
  let result;
  if (action.action_type === 'retry') {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(caseData.payment_id);
    result = await provider.retryPayment(payment.id, payment.amount, payment.customer_id, caseData);
    
    if (result.success) {
      db.prepare('UPDATE recovery_actions SET status = ?, result = ?, result_details = ? WHERE id = ?')
        .run('completed', 'success', JSON.stringify(result), action.id);
      
      processRecoveryOutcome(caseData.id, result);
    } else {
      db.prepare('UPDATE recovery_actions SET status = ?, result = ?, result_details = ? WHERE id = ?')
        .run('failed', 'failed', JSON.stringify(result), action.id);
      
      db.prepare('UPDATE recovery_cases SET attempts_made = attempts_made + 1, updated_at = ? WHERE id = ?')
        .run(new Date().toISOString(), caseData.id);

      // Re-run AI to decide next action
      const updatedCaseData = db.prepare('SELECT * FROM recovery_cases WHERE id = ?').get(caseData.id);
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(caseData.customer_id);
      const classification = classifyFailure(payment.failure_reason, payment.failure_source);
      const prediction = predictRecovery(classification.baseRecoveryProbability, customer, updatedCaseData);
      const priority = calculatePriority(prediction.probability, payment.amount, customer.lifetime_value, 100);
      
      const nextDecision = decideAction(updatedCaseData, customer, classification, prediction, priority);
      
      const nextActionId = uuidv4();
      const scheduledAt = new Date(Date.now() + nextDecision.scheduledDelay).toISOString();
      
      db.prepare(`
        INSERT INTO recovery_actions (
          id, case_id, action_type, status, scheduled_at, requires_approval, ai_reasoning, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nextActionId, caseData.id, nextDecision.action, 'pending', scheduledAt, nextDecision.requiresApproval ? 1 : 0, nextDecision.reasoning, new Date().toISOString()
      );
    }
  } else if (action.action_type === 'payment_link') {
    result = await provider.createPaymentLink(caseData.customer_id, caseData.amount_at_risk, `Recovery for case ${caseData.id}`);
    db.prepare('UPDATE recovery_actions SET status = ?, result = ?, result_details = ? WHERE id = ?')
      .run('completed', 'success', JSON.stringify(result), action.id);
  } else {
    // email, sms, escalate, stop
    result = { msg: `Executed ${action.action_type}` };
    db.prepare('UPDATE recovery_actions SET status = ?, result = ?, result_details = ? WHERE id = ?')
      .run('completed', 'success', JSON.stringify(result), action.id);
  }

  auditLog({
    entityType: 'action',
    entityId: action.id,
    eventType: 'action_executed',
    description: `Action ${action.action_type} executed`,
    details: JSON.stringify({ result }),
    actor: 'system',
    amount: 0
  });

  return { status: 'completed', result };
}

export function processRecoveryOutcome(caseId, paymentResult) {
  const db = getDb();
  
  const caseData = db.prepare('SELECT * FROM recovery_cases WHERE id = ?').get(caseId);
  if (!caseData) return;

  if (paymentResult.success) {
    db.prepare(`
      UPDATE recovery_cases 
      SET status = 'recovered', recovered_amount = amount_at_risk, resolved_at = ?, updated_at = ? 
      WHERE id = ?
    `).run(new Date().toISOString(), new Date().toISOString(), caseId);

    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('success', caseData.payment_id);

    db.prepare('UPDATE customers SET successful_payments = successful_payments + 1, total_payments = total_payments + 1 WHERE id = ?').run(caseData.customer_id);

    if (caseData.subscription_id) {
      db.prepare("UPDATE subscriptions SET status = 'active', updated_at = ? WHERE id = ?").run(new Date().toISOString(), caseData.subscription_id);
    }

    auditLog({
      entityType: 'case',
      entityId: caseId,
      eventType: 'case_recovered',
      description: `Case recovered successfully`,
      details: JSON.stringify(paymentResult),
      actor: 'system',
      amount: caseData.amount_at_risk
    });
  }
}
