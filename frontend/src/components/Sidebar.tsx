'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowDownToLine,
  ShieldCheck,
  Settings,
  Building2,
  CheckCircle2,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { UserSummary } from '../types';

interface SidebarProps {
  user: UserSummary | null;
  activeReferralCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, activeReferralCount = 6 }) => {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'Referrals Pipeline',
      href: '/referrals',
      icon: Users,
      badge: activeReferralCount > 0 ? activeReferralCount : null,
    },
    {
      label: 'Commission Ledger',
      href: '/commissions',
      icon: Wallet,
      badge: null,
    },
    {
      label: 'Withdrawals & Payouts',
      href: '/withdrawals',
      icon: ArrowDownToLine,
      badge: null,
    },
    {
      label: 'Compliance & KYC',
      href: '/kyc',
      icon: ShieldCheck,
      badge: user?.accountStatus === 'ACTIVE' ? 'Verified' : 'Pending',
    },
    {
      label: 'Settings & Banking',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'PR';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="sidebar" aria-label="Corporate Sidebar Navigation">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Building2 size={22} strokeWidth={2.2} />
        </div>
        <div className="brand-title">
          <span>PROSPERA</span>
          <span className="brand-subtitle">Corporate Referral Portal</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Workspace</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} className="nav-icon" />
              <span>{item.label}</span>
              {item.badge !== null && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="sidebar-footer">
        <div className="user-profile-pill">
          <div className="user-avatar" title={user?.fullName || 'User'}>
            {getInitials(user?.fullName)}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.fullName || 'Ahmed Al Mansoori'}</div>
            <div className="user-role-badge">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>{user?.companyName ? user.companyName : 'Referral Partner'}</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('prospera_corporate_session_token');
                window.location.href = '/auth/login';
              }
            }}
            title="Log Out"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--navy-text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
