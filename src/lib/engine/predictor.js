export function predictRecovery(baseProb, customerData, caseData) {
  const { total_payments, successful_payments, failed_payments, lifetime_value, mrr, plan } = customerData;
  const { attempts_made, max_attempts, failure_category, amount_at_risk, opened_at } = caseData;

  const customerHistoryFactor = total_payments > 0 
    ? Math.max(0.5, Math.min(1.5, successful_payments / total_payments)) 
    : 1.0;

  const retryDecayFactor = Math.max(0.3, 1.0 - (attempts_made * 0.15));

  let customerValueFactor = 1.0;
  if (lifetime_value > 500000) customerValueFactor = 1.2;
  else if (lifetime_value > 200000) customerValueFactor = 1.1;

  const hoursSinceOpened = opened_at ? (Date.now() - new Date(opened_at).getTime()) / (1000 * 60 * 60) : 0;
  let timingFactor = 0.5;
  if (hoursSinceOpened < 6) timingFactor = 1.0;
  else if (hoursSinceOpened < 24) timingFactor = 0.95;
  else if (hoursSinceOpened < 72) timingFactor = 0.85;
  else if (hoursSinceOpened < 168) timingFactor = 0.7;

  let finalProb = baseProb * customerHistoryFactor * retryDecayFactor * customerValueFactor * timingFactor;
  finalProb = Math.max(0.01, Math.min(0.99, finalProb));

  return {
    probability: finalProb,
    factors: [
      { name: 'baseProbability', value: baseProb },
      { name: 'customerHistoryFactor', value: customerHistoryFactor },
      { name: 'retryDecayFactor', value: retryDecayFactor },
      { name: 'customerValueFactor', value: customerValueFactor },
      { name: 'timingFactor', value: timingFactor }
    ],
    explanation: `Predicted probability is ${(finalProb*100).toFixed(1)}%. Customer history factor is ${customerHistoryFactor.toFixed(2)}, retry decay is ${retryDecayFactor.toFixed(2)}, value factor is ${customerValueFactor.toFixed(2)}, and timing factor is ${timingFactor.toFixed(2)}.`
  };
}
