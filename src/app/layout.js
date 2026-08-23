'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/cases', label: 'Recovery Cases', icon: '🔄' },
    { href: '/customers', label: 'Customers', icon: '👥' },
    { href: '/simulator', label: 'Simulator', icon: '🎮' },
    { href: '/audit', label: 'Audit Trail', icon: '📋' },
  ];

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="sidebar">
          <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #a0a0b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              RevenueGuard
            </span>
          </div>
          <nav style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    background: isActive ? 'var(--glass-bg)' : 'transparent',
                    border: isActive ? '1px solid var(--glass-border)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                    fontWeight: isActive ? '600' : '500'
                  }} className="nav-item">
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
          <div style={{ padding: '24px', borderTop: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center' }}>
            v2.4.0 (Premium)
          </div>
        </div>
        <main className="main-content animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  );
}
