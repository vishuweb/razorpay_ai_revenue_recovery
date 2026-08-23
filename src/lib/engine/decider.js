export function decideAction(caseData, customerData, classification, prediction, priority) {
  let action = 'escalate';
  let reasoning = '';
  let requiresApproval = false;
  let scheduledDelay = 0; // ms

  const maxAttempts = caseData.max_attempts || 5;

  if (caseData.attempts_made >= maxAttempts) {
    action = 'stop';
    reasoning = 'Maximum retry attempts exhausted';
  } else if (prediction.probability < 0.10) {
    action = 'stop';
    reasoning = 'Recovery probability too low';
  } else if (classification.category === 'permanent' && classification.isRetryable === false) {
    if (caseData.failure_reason === 'card_expired' || caseData.failure_reason === 'invalid_card') {
      action = 'payment_link';
      reasoning = 'Customer needs to update payment method';
    } else {
      action = 'escalate';
      reasoning = 'Permanent failure requiring manual intervention';
    }
  } else if (classification.category === 'temporary' && caseData.attempts_made < 3) {
    action = 'retry';
    if (['gateway_error', 'network_error', 'bank_server_down'].includes(caseData.failure_reason)) {
      scheduledDelay = 30 * 60 * 1000;
    } else if (caseData.failure_reason === 'insufficient_funds') {
      scheduledDelay = 6 * 60 * 60 * 1000;
    } else if (caseData.failure_reason === 'card_declined') {
      scheduledDelay = 24 * 60 * 60 * 1000;
    } else if (caseData.failure_reason === 'payment_timed_out') {
      scheduledDelay = 2 * 60 * 60 * 1000;
    } else {
      scheduledDelay = 60 * 60 * 1000;
    }
    reasoning = `Temporary failure, attempting retry after delay (${scheduledDelay/1000}s)`;
  } else if (classification.category === 'behavioral') {
    if (customerData.plan === 'enterprise' || customerData.lifetime_value > 500000) {
      action = 'email';
      reasoning = 'Behavioral failure for high-value customer, sending personalized email';
    } else {
      action = 'payment_link';
      reasoning = 'Behavioral failure, sending payment link';
    }
  } else if (caseData.attempts_made >= 3 && prediction.probability > 0.3) {
    action = 'email';
    reasoning = 'Multiple retries failed, probability is decent, switching to email outreach';
  } else {
    action = 'escalate';
    reasoning = 'Defaulting to escalation';
  }

  if (caseData.amount_at_risk > 5000000 || action === 'escalate') {
    requiresApproval = true;
  }

  return {
    action,
    reasoning,
    requiresApproval,
    scheduledDelay
  };
}
