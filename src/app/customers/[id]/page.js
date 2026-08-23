'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../page';
import React from 'react';

export default function CustomerDetailPage({ params }) {
  const router = useRouter();
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`);
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
    fetchCustomer();
  }, [id]);

  if (loading || !data) {
    return <div className="skeleton" style={{ height: '100vh', width: '100%' }}></div>;
  }

  const { customer, paymentHistory, recoveryCases, stats } = data;

  const getStatusBadge = (status) => {
    switch(status) {
      case 'recovered': return <span className="badge success">Recovered</span>;
      case 'failed': return <span className="badge danger">Failed</span>;
      case 'open': return <span className="badge warning">Open</span>;
      case 'in_progress': return <span className="badge info">In Progress</span>;
      case 'succeeded': return <span className="badge success">Success</span>;
      default: return <span className="badge muted">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      <button className="btn ghost mb-4" onClick={() => router.push('/customers')} style={{ marginBottom: '16px' }}>
        ← Back to Customers
      </button>

      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {customer.name}
          </h1>
          <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{customer.company}</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-secondary)' }}>{customer.email}</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span className="badge info">{customer.plan_name || 'Standard'}</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-3" style={{ marginBottom: '24px' }}>
        <div className="card stat-card">
          <span className="stat-label">MRR</span>
          <span className="stat-value text-emerald">{formatCurrency(customer.mrr)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Lifetime Value</span>
          <span className="stat-value">{formatCurrency(customer.lifetime_value)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Risk Score</span>
          <span className="stat-value" style={{ color: customer.risk_score > 50 ? 'var(--danger)' : 'var(--primary-accent)' }}>
            {customer.risk_score || 0} / 100
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Payment Success Rate</span>
          <span className="stat-value">{stats.paymentSuccessRate}%</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Total At Risk (Lifetime)</span>
          <span className="stat-value text-danger">{formatCurrency(stats.totalAtRisk)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Total Recovered</span>
          <span className="stat-value text-emerald">{formatCurrency(stats.totalRecovered)}</span>
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Active Recovery Cases</h3>
          {recoveryCases?.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Probability</th>
                    <th>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryCases.map(c => (
                    <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                      <td>{getStatusBadge(c.status)}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatCurrency(c.amount_at_risk)}</td>
                      <td>{Math.round(c.recovery_probability * 100)}%</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(c.opened_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No active recovery cases.</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Recent Payments</h3>
          {paymentHistory?.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No payment history available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
