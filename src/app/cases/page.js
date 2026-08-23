'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../page';
import { ProbabilityBar } from '../components/Charts';

export default function CasesPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('amount');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases?status=${status}&sortBy=${sortBy}`);
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
    fetchCases();
  }, [status, sortBy]);

  const getPriorityDot = (score) => {
    if (score >= 80) return <span className="priority-dot critical"></span>;
    if (score >= 50) return <span className="priority-dot high"></span>;
    if (score >= 30) return <span className="priority-dot medium"></span>;
    return <span className="priority-dot low"></span>;
  };

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
      <div className="page-header">
        <div>
          <h1>Recovery Cases</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {data ? `${data.total} cases found` : 'Loading...'}
          </p>
        </div>
      </div>

      <div className="card mb-6" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select className="select" style={{ width: '200px' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="recovered">Recovered</option>
            <option value="failed">Failed</option>
          </select>
          <select className="select" style={{ width: '200px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="amount">Sort by Amount</option>
            <option value="priority">Sort by Priority</option>
            <option value="probability">Sort by Probability</option>
            <option value="date">Sort by Date</option>
          </select>
          <button className="btn ghost" onClick={fetchCases}>↻ Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="skeleton" style={{ height: '400px' }}></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Customer</th>
                  <th>Amount At Risk</th>
                  <th>Failure Reason</th>
                  <th>Probability</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Opened</th>
                </tr>
              </thead>
              <tbody>
                {data?.cases?.map(c => (
                  <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                    <td>
                      <div className="priority-badge">
                        {getPriorityDot(c.priority_score)}
                        <span>{c.priority_score}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.customer_company}</div>
                    </td>
                    <td style={{ color: 'var(--danger)' }}>{formatCurrency(c.amount_at_risk)}</td>
                    <td>{c.failure_reason}</td>
                    <td style={{ width: '120px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem' }}>{Math.round(c.recovery_probability * 100)}%</span>
                        <ProbabilityBar value={c.recovery_probability} />
                      </div>
                    </td>
                    <td>{getStatusBadge(c.status)}</td>
                    <td><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.recommended_action}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(c.opened_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {data?.cases?.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>No cases found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
