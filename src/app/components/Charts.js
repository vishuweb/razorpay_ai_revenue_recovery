'use client';

import React from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function RevenueChart({ data }) {
  if (!data || data.length === 0) return <div style={{color:'var(--text-muted)'}}>No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#00d4aa" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff4757" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ff4757" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
        <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'var(--elevated-color)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
          itemStyle={{ color: '#fff' }}
        />
        <Legend />
        <Area type="monotone" dataKey="recovered" name="Recovered" stroke="#00d4aa" fillOpacity={1} fill="url(#colorRecovered)" />
        <Area type="monotone" dataKey="atRisk" name="At Risk" stroke="#ff4757" fillOpacity={1} fill="url(#colorAtRisk)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FailureReasonsChart({ data }) {
  if (!data || data.length === 0) return <div style={{color:'var(--text-muted)'}}>No data available</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" horizontal={false} />
        <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
        <YAxis dataKey="reason" type="category" stroke="var(--text-secondary)" fontSize={12} width={100} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'var(--elevated-color)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
          cursor={{fill: 'var(--glass-bg)'}}
        />
        <Bar dataKey="amount" name="Amount (₹)" fill="var(--warning)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = {
  open: '#ffa502',
  in_progress: '#3742fa',
  recovered: '#00d4aa',
  failed: '#ff4757',
  stopped: '#6b6b80',
  expired: '#a0a0b8'
};

export function StatusPieChart({ data }) {
  if (!data) return <div style={{color:'var(--text-muted)'}}>No data available</div>;
  
  const formattedData = Object.keys(data).map(key => ({
    name: key,
    value: data[key]
  })).filter(item => item.value > 0);

  if (formattedData.length === 0) return <div style={{color:'var(--text-muted)'}}>No data available</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#ffffff'} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ backgroundColor: 'var(--elevated-color)', borderColor: 'var(--glass-border)', borderRadius: '8px' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProbabilityBar({ value }) {
  const percentage = Math.round(value * 100);
  let colorClass = 'high';
  if (value < 0.6) colorClass = 'medium';
  if (value < 0.3) colorClass = 'low';

  return (
    <div className="probability-bar-container">
      <div 
        className={`probability-bar-fill ${colorClass}`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
