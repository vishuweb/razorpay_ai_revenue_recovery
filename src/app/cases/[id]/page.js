'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../page';
import { ProbabilityBar } from '../../components/Charts';
import React from 'react';

export default function CaseDetailPage({ params }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/cases/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [id]);

  const handleAction = async (actionStr) => {
    setActionLoading(true);
    try {
      await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionStr })
      });
      await fetchCase();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="skeleton" style={{ height: '100vh', width: '100%' }}></div>;
  }

  const { case: c, customer, actions, auditEntries } = data;

  const getStatusBadge = (status) => {
    switch(status) {
      case 'recovered': return <span className="badge success">Recovered</span>;
      case 'failed': return <span className="badge danger">Failed</span>;
      case 'open': return <span className="badge warning">Open</span>;
      case 'in_progress': return <span className="badge info">In Progress</span>;
      default: return <span className="badge muted">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      <button className="btn ghost mb-4" onClick={() => router.push('/cases')} style={{ marginBottom: '16px' }}>
        ← Back to Cases
      </button>

      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {customer.name} <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>| {customer.company}</span>
          </h1>
          <div style={{ marginTop: '8px' }}>
            {getStatusBadge(c.status)}
            <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>ID: {c.id}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Amount At Risk</div>
          <div style={{ color: 'var(--danger)', fontSize: '2rem', fontWeight: 700, textShadow: '0 0 10px rgba(255, 71, 87, 0.3)' }}>
            {formatCurrency(c.amount_at_risk)}
          </div>
        </div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <div className="card stat-card">
          <span className="stat-label">Recovery Probability</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="stat-value">{Math.round(c.recovery_probability * 100)}%</span>
            <div style={{ flex: 1 }}><ProbabilityBar value={c.recovery_probability} /></div>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Priority Score</span>
          <span className="stat-value" style={{ color: c.priority_score > 70 ? 'var(--danger)' : '#fff' }}>{c.priority_score} / 100</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Attempts</span>
          <span className="stat-value">{c.attempts_made} / {c.max_attempts}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Failure Reason</span>
          <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{c.failure_reason}</span>
        </div>
      </div>

      <div className="grid-cols-3" style={{ marginBottom: '24px' }}>
        <div className="card card-elevated" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--primary-accent)' }}>
            🤖 AI Analysis & Recommendation
          </h3>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Recommended Action</div>
            <div className="badge primary" style={{ fontSize: '1rem', padding: '8px 16px', background: 'var(--primary-accent)', color: '#000' }}>
              {c.recommended_action}
            </div>
          </div>
          <p style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>
            {c.ai_reasoning}
          </p>
          
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
            <button className="btn primary" onClick={() => handleAction('approve')} disabled={actionLoading || c.status === 'recovered' || c.status === 'failed'}>
              Approve Action
            </button>
            <button className="btn ghost" onClick={() => handleAction('execute')} disabled={actionLoading || c.status === 'recovered' || c.status === 'failed'}>
              Execute Now
            </button>
            <button className="btn danger" onClick={() => handleAction('stop')} disabled={actionLoading || c.status === 'recovered' || c.status === 'failed'}>
              Stop Recovery
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Customer Profile</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Email</div>
              <div>{customer.email}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Plan</div>
              <div className="badge info">{customer.plan_name || 'Standard'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>MRR</div>
              <div>{formatCurrency(customer.mrr)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Payment Success Rate</div>
              <div style={{ color: customer.payment_success_rate > 90 ? 'var(--primary-accent)' : 'var(--warning)' }}>
                {customer.payment_success_rate || 95}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Recovery Actions Timeline</h3>
          {actions?.length > 0 ? (
            <div className="timeline">
              {actions.map(a => (
                <div key={a.id} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div style={{ paddingLeft: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--primary-accent)' }}>{a.action_type}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="badge muted mb-2">{a.status}</div>
                    {a.ai_reasoning && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>{a.ai_reasoning}</p>}
                    {a.result && <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.875rem' }}>Result: {a.result}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No actions recorded yet.</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Audit Trail</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auditEntries?.map(entry => (
              <div key={entry.id} style={{ padding: '12px', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge muted">{entry.event_type}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(entry.created_at).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.875rem' }}>{entry.description}</p>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Actor: {entry.actor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
