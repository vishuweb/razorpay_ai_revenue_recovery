'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function SimulatorPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bulkCount, setBulkCount] = useState(5);

  const handleCommand = async (command, params = {}) => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, params })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const scenarios = [
    { title: 'Temporary Failure', desc: 'Insufficient funds or temporary gateway error. High recovery probability.', type: 'temporary' },
    { title: 'Chronic Failure', desc: 'Multiple failures over time. Low probability, requires human intervention.', type: 'chronic' },
    { title: 'High-Value Alert', desc: 'Large MRR customer fails payment. High priority score assigned.', type: 'high_value' },
    { title: 'Expired Card', desc: 'Hard decline due to expired card. Automated outreach required.', type: 'expired_card' },
    { title: '🛒 Checkout Abandoned', desc: 'Customer left checkout without paying', type: 'checkout_abandoned', command: 'trigger_event', paramKey: 'eventType' },
    { title: '⏰ Checkout Timeout', desc: 'Session expired during checkout', type: 'checkout_timeout', command: 'trigger_event', paramKey: 'eventType' },
    { title: '📦 Expiring Inventory', desc: 'Inventory approaching expiry date', type: 'near_expiry_inventory', command: 'trigger_event', paramKey: 'eventType' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Revenue Recovery Simulator</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Generate test data and trigger AI recovery scenarios
          </p>
        </div>
      </div>

      <div className="grid-cols-3" style={{ marginBottom: '24px' }}>
        <div className="card-elevated" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Control Panel</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => handleCommand('seed')}
              disabled={loading}
            >
              🌱 Seed Database
            </button>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="number" 
                className="input" 
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value))}
                style={{ width: '80px' }}
                min="1"
                max="50"
              />
              <button 
                className="btn btn-ghost" 
                onClick={() => handleCommand('bulk_scenarios', { count: bulkCount })}
                disabled={loading}
              >
                🎲 Run Bulk Scenarios
              </button>
            </div>
            <button 
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #3742fa, #00d4aa)', color: '#fff', border: 'none' }}
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch('/api/cron');
                  const data = await res.json();
                  setResult(data);
                } catch (err) {
                  setResult({ error: err.message });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              ⚡ Auto-Pilot Sweep (Run Cron)
            </button>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '16px' }}>Live Scenario Result</h3>
          {loading ? (
            <div className="skeleton" style={{ height: '200px' }}></div>
          ) : result ? (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              {result.case ? (
                <div>
                  <div className="badge warning mb-2">New Case Created: {result.case.id}</div>
                  <h4 style={{ margin: '8px 0', color: 'var(--danger)' }}>Amount: {formatCurrency(result.case.amount_at_risk)}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
                    Reason: {result.case.failure_reason}
                  </p>
                  
                  <div style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid var(--primary-accent)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h5 style={{ color: 'var(--primary-accent)', marginBottom: '4px' }}>AI Diagnosis</h5>
                    <p style={{ fontSize: '0.875rem' }}>{result.case.ai_reasoning}</p>
                    <div style={{ marginTop: '8px', fontWeight: 'bold' }}>Recommendation: {result.case.recommended_action}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn primary sm" onClick={() => handleCommand('simulate_recovery', { caseId: result.case.id })}>
                      Simulate Success
                    </button>
                    <button className="btn danger sm" onClick={() => handleCommand('simulate_failure', { caseId: result.case.id })}>
                      Simulate Failure
                    </button>
                  </div>
                </div>
              ) : (
                <pre style={{ color: 'var(--primary-accent)', fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
              Trigger a scenario to see results
            </div>
          )}
        </div>
      </div>

      <h3 style={{ marginBottom: '16px' }}>Scenario Triggers</h3>
      <div className="grid-cols-4">
        {scenarios.map((s, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginBottom: '8px' }}>{s.title}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px', flex: 1 }}>{s.desc}</p>
            <button className="btn ghost" onClick={() => {
              if (s.command) {
                handleCommand(s.command, { [s.paramKey]: s.type });
              } else {
                handleCommand('trigger_scenario', { type: s.type });
              }
            }} disabled={loading}>
              Trigger Event
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
