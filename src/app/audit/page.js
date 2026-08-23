'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../page';

export default function AuditPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');
  
  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?entity_type=${entityType}`);
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
    fetchAudit();
  }, [entityType]);

  const getActorBadge = (actor) => {
    if (actor === 'ai_engine') return <span className="badge primary" style={{ background: 'var(--primary-accent)', color: '#000' }}>AI Engine</span>;
    if (actor === 'system') return <span className="badge muted">System</span>;
    return <span className="badge info">{actor}</span>;
  };

  const getEventIcon = (type) => {
    if (type.includes('failed')) return '❌';
    if (type.includes('recovered') || type.includes('success')) return '✅';
    if (type.includes('action')) return '⚡';
    if (type.includes('created')) return '✨';
    return '📝';
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Audit Trail</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            System-wide chronological event log
          </p>
        </div>
      </div>

      <div className="card mb-6" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select className="select" style={{ width: '200px' }} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All Entities</option>
            <option value="case">Recovery Cases</option>
            <option value="payment">Payments</option>
            <option value="customer">Customers</option>
            <option value="action">Actions</option>
          </select>
          <button className="btn ghost" onClick={fetchAudit}>↻ Refresh</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="skeleton" style={{ height: '600px' }}></div>
        ) : (
          <div className="timeline" style={{ padding: '16px' }}>
            {data?.entries?.map(entry => (
              <div key={entry.id} className="timeline-item" style={{ marginBottom: '32px' }}>
                <div className="timeline-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-color)', border: 'none', fontSize: '1.2rem', left: '-30px', top: '0', width: '28px', height: '28px' }}>
                  {getEventIcon(entry.event_type)}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem', marginRight: '12px' }}>{entry.event_type}</strong>
                      {getActorBadge(entry.actor)}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <p style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>{entry.description}</p>
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '4px' }}>
                    <div>
                      Entity: <Link href={`/${entry.entity_type}s/${entry.entity_id}`} style={{ color: 'var(--primary-accent)', textDecoration: 'none' }}>{entry.entity_type} #{entry.entity_id}</Link>
                    </div>
                    {entry.amount != null && (
                      <div style={{ color: 'var(--danger)' }}>Amount: {formatCurrency(entry.amount)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {data?.entries?.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No audit events found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
