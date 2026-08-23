'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../page';

export default function CustomersPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('mrr');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${search}&sortBy=${sortBy}`);
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
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, sortBy]);

  const getRiskScoreBar = (score) => {
    let color = 'var(--primary-accent)';
    if (score > 30) color = 'var(--warning)';
    if (score > 60) color = 'var(--danger)';
    
    return (
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color }}></div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {data ? `${data.total} total customers` : 'Loading...'}
          </p>
        </div>
      </div>

      <div className="card mb-6" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search by name, email or company..." 
            style={{ flex: 1 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" style={{ width: '200px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="mrr">Sort by MRR</option>
            <option value="lifetime_value">Sort by LTV</option>
            <option value="risk_score">Sort by Risk Score</option>
          </select>
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
                  <th>Customer</th>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>MRR</th>
                  <th>Lifetime Value</th>
                  <th>Risk Score</th>
                  <th>Active Risk</th>
                  <th>Cases</th>
                </tr>
              </thead>
              <tbody>
                {data?.customers?.map(c => (
                  <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email}</div>
                    </td>
                    <td>{c.company}</td>
                    <td><span className="badge info">{c.plan_name || 'Standard'}</span></td>
                    <td style={{ color: 'var(--primary-accent)' }}>{formatCurrency(c.mrr)}</td>
                    <td>{formatCurrency(c.lifetime_value)}</td>
                    <td style={{ width: '100px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem' }}>{c.risk_score || 0}</span>
                        {getRiskScoreBar(c.risk_score || 0)}
                      </div>
                    </td>
                    <td style={{ color: c.activeRiskAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {formatCurrency(c.activeRiskAmount || 0)}
                    </td>
                    <td>
                      {c.activeCases > 0 ? (
                        <span className="badge warning">{c.activeCases} active</span>
                      ) : (
                        <span className="badge muted">0</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.customers?.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px' }}>No customers found.</td>
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
