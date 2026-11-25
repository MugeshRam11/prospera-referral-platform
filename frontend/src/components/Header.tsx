'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Coins,
  Menu,
  ChevronDown,
  ChevronRight,
  Plus,
  ShieldCheck,
  Headphones,
  UserPlus,
  LogOut,
  Building2,
  FileText,
} from 'lucide-react';
import { UserSummary } from '../types';
import { ApiClient } from '@/lib/api';

interface HeaderProps {
  user: UserSummary | null;
  onOpenNewReferralModal: () => void;
  onSearch?: (query: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenNewReferralModal,
  onSearch,
  onToggleMobileMenu,
}) => {
  const pathname = usePathname();
  const [searchVal, setSearchVal] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [{ label: 'Dashboard', href: '/' }];
    const labels: Record<string, string> = {
      admin: 'Admin',
      agency: 'Agency Console',
      coordinator: 'Coordinator',
      partner: 'Partner Portal',
      referrals: 'Referrals',
      new: 'New Referral',
      services: 'Services & Properties',
      commissions: 'Commissions',
      withdrawals: 'Withdrawals',
      kyc: 'Verification & KYC',
      settings: 'Settings',
      support: 'Support',
      users: 'Users',
      agencies: 'Agencies',
      agents: 'Agents',
      coordinators: 'Coordinators',
      partners: 'Partners',
      banking: 'Banking',
      reports: 'Reports',
      'audit-logs': 'Audit Logs',
      'demo-personas': 'Demo Personas',
    };
    return segments.map((seg, idx) => ({
      label: labels[seg] || seg.replace(/-/g, ' '),
      href: '/' + segments.slice(0, idx + 1).join('/'),
    }));
  }, [pathname]);

  const accountStatusPill = React.useMemo(() => {
    if (!user) return null;
    if (user.accountStatus === 'ACTIVE') {
      return { label: 'Verified Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (user.accountStatus === 'PENDING_APPROVAL') {
      return { label: 'Pending Approval', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (user.accountStatus === 'PENDING_VERIFICATION') {
      return { label: 'Verify Email', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { label: user.accountStatus.replace(/_/g, ' '), cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  }, [user]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  const handleLogout = async () => {
    await ApiClient.logout();
    window.location.replace('/auth/login');
  };

  const getUserSubtitle = (): string => {
    if (!user) return 'Guest Portal';
    if (user.role === 'ADMIN') return 'Platform Admin';
    if (user.role === 'COORDINATOR') return 'Lead Coordinator';
    if (user.role === 'REFERRAL_PARTNER') return user.companyName || 'Corporate Partner';
    if (user.agentType === 'AGENCY_MEMBER') {
      if (user.agencyRole === 'AGENCY_OWNER') return 'Agency Owner';
      if (user.agencyRole === 'AGENCY_ADMIN') return 'Agency Admin';
      return 'Agency Broker';
    }
    return 'Independent Broker';
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-5 sm:px-8 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile Hamburger Toggle */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 bg-white shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-800 font-medium">
              Prospera
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href}>
                <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-slate-800 capitalize truncate">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-slate-800 capitalize truncate">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Global Contextual Search Bar */}
          <div className="relative w-full max-w-md">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              aria-label="Global search"
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder={
                user?.role === 'ADMIN'
                  ? 'Search users, agencies, or audit logs...'
                  : user?.role === 'COORDINATOR'
                  ? 'Search assigned leads, clients, or services...'
                  : 'Search properties, clients, or referrals...'
              }
              value={searchVal}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      {/* Topbar Right Actions */}
      <div className="flex items-center gap-3">
        {/* Contextual Primary Action Button */}
        {user?.role === 'ADMIN' ? (
          <Link
            href="/admin/users"
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#14243A] hover:bg-[#0B1524] text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <UserPlus size={14} />
            <span>Manage Users</span>
          </Link>
        ) : user?.role === 'COORDINATOR' ? (
          <Link
            href="/coordinator"
            className="hidden sm:inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Headphones size={14} />
            <span>Lead Queue</span>
          </Link>
        ) : user?.agentType === 'AGENCY_MEMBER' &&
          (user.agencyRole === 'AGENCY_OWNER' || user.agencyRole === 'AGENCY_ADMIN') ? (
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/referrals/new"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>Submit Referral</span>
            </Link>
            <Link
              href="/agency"
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
            >
              <Building2 size={14} />
              <span>Agency Console</span>
            </Link>
          </div>
        ) : user?.role === 'REFERRAL_PARTNER' || user?.role === 'AGENT' ? (
          <Link
            href="/referrals/new"
            className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Submit Referral</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <FileText size={14} />
            <span>Broker Pipeline</span>
          </Link>
        )}

        {/* Account Status Indicator */}
        {accountStatusPill && (
          <span
            className={`hidden xl:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${accountStatusPill.cls}`}
          >
            {accountStatusPill.label}
          </span>
        )}

        {/* Operational Pill / Wallet Balance */}
        {user?.role === 'ADMIN' ? (
          <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-3 py-2 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
              <ShieldCheck size={12} />
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Platform Admin
            </span>
          </div>
        ) : user?.role === 'COORDINATOR' ? (
          <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-3 py-2 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Headphones size={12} />
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Desk Active
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Coins size={12} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 font-medium leading-none">Withdrawable</span>
              <span className="text-xs font-bold text-slate-900 tracking-tight mt-0.5">
                Unavailable
              </span>
            </div>
          </div>
        )}

        {/* User Profile Pill Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs transition-colors"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-200 bg-slate-100">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="grid h-full place-items-center bg-slate-200 font-bold text-slate-700">{user?.fullName?.charAt(0)}</span>
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-1.5 border-white" />
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                {user?.fullName || 'Prospera Member'}
              </span>
              <span className="text-xs text-slate-500 leading-tight mt-0.5 truncate max-w-[140px]">
                {getUserSubtitle()}
              </span>
            </div>

            <ChevronDown size={14} className="text-slate-400 ml-0.5" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="font-bold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <Link
                href="/settings"
                onClick={() => setShowUserDropdown(false)}
                className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Profile & Settings
              </Link>
              <Link
                href="/kyc"
                onClick={() => setShowUserDropdown(false)}
                className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                Verification & KYC
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin/demo-personas"
                  onClick={() => setShowUserDropdown(false)}
                  className="block px-3 py-2 rounded-lg text-indigo-700 hover:bg-indigo-50 font-medium"
                >
                  Switch Demo Persona
                </Link>
              )}
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-medium flex items-center justify-between"
              >
                <span>Log Out</span>
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
