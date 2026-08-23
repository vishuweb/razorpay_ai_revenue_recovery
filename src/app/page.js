'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RevenueChart, FailureReasonsChart, StatusPieChart, ProbabilityBar } from './components/Charts';

export function formatCurrency(paise) {
  if (paise == null) return '₹0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
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
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div>
        <div className="page-header">
          <h1>Revenue Recovery Dashboard</h1>
        </div>
        <div className="grid-cols-4 mb-6" style={{ marginBottom: '24px' }}>
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '120px' }}></div>)}
        </div>
        <div className="card skeleton mb-6" style={{ height: '350px', marginBottom: '24px' }}></div>
        <div className="grid-cols-2">
          <div className="card skeleton" style={{ height: '300px' }}></div>
          <div className="card skeleton" style={{ height: '300px' }}></div>
        </div>
      </div>
    );
  }

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
        <h1>Revenue Recovery Dashboard</h1>
        <div className="badge muted">Live • Updated just now</div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
        <div className="card stat-card">
          <span className="stat-label">Total Revenue</span>
          <span className="stat-value text-emerald">{formatCurrency(data.totalRevenue)}</span>
        </div>
        <div className="card stat-card animate-pulse-danger">
          <span className="stat-label">Revenue At Risk</span>
          <span className="stat-value text-danger glow-danger">{formatCurrency(data.revenueAtRisk)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Revenue Recovered</span>
          <span className="stat-value">{formatCurrency(data.revenueRecovered)}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Recovery Rate</span>
          <span className="stat-value">{data.recoveryRate}%</span>
        </div>
        {data.interventionCost !== undefined && (
          <div className="card stat-card">
            <span className="stat-label">Intervention Cost</span>
            <span className="stat-value" style={{ color: 'var(--warning)' }}>{formatCurrency(data.interventionCost)}</span>
          </div>
        )}
        {data.netRecovery !== undefined && (
          <div className="card stat-card">
            <span className="stat-label">Net Recovery</span>
            <span className="stat-value text-emerald">{formatCurrency(data.netRecovery)}</span>
          </div>
        )}
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        <div className="card stat-card">
          <span className="stat-label">Active Cases</span>
          <span className="stat-value">{data.activeCases}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Customers At Risk</span>
          <span className="stat-value">{data.customersAtRisk}</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Recovery Trend (30 Days)</h3>
        <div className="chart-container">
          <RevenueChart data={data.recoveryTrend} />
        </div>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Failure Reasons Breakdown</h3>
          <div className="chart-container">
            <FailureReasonsChart data={data.failureReasons} />
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Recovery Status</h3>
          <div className="chart-container">
            <StatusPieChart data={data.statusBreakdown} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Recent Cases</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount At Risk</th>
                <th>Probability</th>
                <th>Status</th>
                <th>Action</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {data.recentCases?.map(c => (
                <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                  <td style={{ fontWeight: 500 }}>{c.customer_name}</td>
                  <td style={{ color: 'var(--danger)' }}>{formatCurrency(c.amount_at_risk)}</td>
                  <td style={{ width: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem' }}>{Math.round(c.recovery_probability * 100)}%</span>
                      <ProbabilityBar value={c.recovery_probability} />
                    </div>
                  </td>
                  <td>{getStatusBadge(c.status)}</td>
                  <td><span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.recommended_action}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(c.opened_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
