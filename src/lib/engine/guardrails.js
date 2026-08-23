export function checkGuardrails(caseData, proposedAction, actionsHistory) {
  const violations = [];
  const warnings = [];

  const MAX_RETRY_ATTEMPTS = 5;
  const MIN_RETRY_INTERVAL = 30 * 60 * 1000; // 30 min in ms
  const MAX_EMAILS_PER_CASE = 3;
  const MAX_SMS_PER_CASE = 2;

  if (proposedAction === 'retry' && caseData.attempts_made >= MAX_RETRY_ATTEMPTS) {
    violations.push(`MAX_RETRY_ATTEMPTS: Maximum attempts (${MAX_RETRY_ATTEMPTS}) reached`);
  }

  const retries = actionsHistory.filter(a => a.action_type === 'retry' && a.executed_at);
  if (proposedAction === 'retry' && retries.length > 0) {
    const lastRetry = retries.sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))[0];
    const timeSinceLastRetry = Date.now() - new Date(lastRetry.executed_at).getTime();
    if (timeSinceLastRetry < MIN_RETRY_INTERVAL) {
      violations.push(`MIN_RETRY_INTERVAL: Last retry was less than 30 minutes ago`);
    }
  }

  const emails = actionsHistory.filter(a => a.action_type === 'email');
  if (proposedAction === 'email' && emails.length >= MAX_EMAILS_PER_CASE) {
    violations.push(`MAX_EMAILS_PER_CASE: Sent ${emails.length} emails, max is ${MAX_EMAILS_PER_CASE}`);
  }

  const sms = actionsHistory.filter(a => a.action_type === 'sms');
  if (proposedAction === 'sms' && sms.length >= MAX_SMS_PER_CASE) {
    violations.push(`MAX_SMS_PER_CASE: Sent ${sms.length} SMS, max is ${MAX_SMS_PER_CASE}`);
  }

  const pendingExec = actionsHistory.filter(a => a.action_type === proposedAction && ['pending', 'executing'].includes(a.status));
  if (pendingExec.length > 0) {
    violations.push(`DUPLICATE_ACTION_PREVENTION: Action ${proposedAction} is already pending or executing`);
  }

  if (caseData.expires_at && new Date(caseData.expires_at) < new Date()) {
    violations.push(`CASE_EXPIRED: The case has expired`);
  }

  if (caseData.status === 'recovered') {
    violations.push(`ALREADY_RECOVERED: The case is already recovered`);
  }

  const caseAge = Date.now() - new Date(caseData.opened_at).getTime();
  if (caseAge > 20 * 24 * 60 * 60 * 1000) { // 20 days
    warnings.push(`RECOVERY_WINDOW: Case is over 20 days old`);
  }

  return {
    allowed: violations.length === 0,
    violations,
    warnings
  };
}
