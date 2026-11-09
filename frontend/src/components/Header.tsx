'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Bell,
  Coins,
  Menu,
  ChevronDown,
  Plus,
  ShieldCheck,
  Headphones,
  UserPlus,
  ArrowRight,
  LogOut,
  Building2,
  FileText,
} from 'lucide-react';
import { UserSummary } from '../types';
import founderAvatar from '../assets/founder.webp';

interface HeaderProps {
  user: UserSummary | null;
  onOpenNewReferralModal: () => void;
  onSearch?: (query: string) => void;
  onToggleMobileMenu?: () => void;
  withdrawableBalance?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenNewReferralModal,
  onSearch,
  onToggleMobileMenu,
  withdrawableBalance = 0,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prospera_corporate_session_token');
      localStorage.removeItem('prospera_user');
      window.location.href = '/auth/login';
    }
  };

  const formatAED = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
    }).format(amount);
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
    <header className="h-18 px-6 sm:px-8 bg-transparent flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Mobile Hamburger Toggle */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 bg-white shadow-2xs"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Global Contextual Search Bar */}
        <div className="relative w-full max-w-md">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            className="w-full bg-white hover:bg-slate-50/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm pl-10 pr-4 py-2 rounded-xl border border-slate-200/90 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                {formatAED(withdrawableBalance)}
              </span>
            </div>
          </div>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors relative"
            aria-label="View notifications"
          >
            <Bell size={17} />
            <span className="w-2 h-2 bg-blue-600 rounded-full absolute top-2 right-2 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-xs text-slate-900">Notifications</span>
                <span className="text-[11px] text-blue-600 font-medium cursor-pointer hover:underline">
                  Mark all as read
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100/60">
                  <p className="font-semibold text-slate-900">Platform Active</p>
                  <p className="text-slate-600 mt-0.5">Connected to Prospera real-time compliance ledger.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-900">Session Verified</p>
                  <p className="text-slate-600 mt-0.5">Secure authenticated session established.</p>
                </div>
              </div>
            </div>
          )}
        </div>

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
                <Image
                  src={founderAvatar}
                  alt={user?.fullName || 'Prospera Member'}
                  fill
                  className="object-cover"
                />
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-1.5 border-white" />
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                {user?.fullName || 'Prospera Member'}
              </span>
              <span className="text-[10.5px] text-slate-500 leading-none mt-0.5 truncate max-w-[120px]">
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
