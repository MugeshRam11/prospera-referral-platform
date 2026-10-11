'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Bell, Coins, Menu, ChevronDown, CheckCircle2, User } from 'lucide-react';
import { UserSummary } from '../types';
import prosperaWhiteIcon from '../assets/prospera-white-logo-icon.png';
import founderAvatar from '../assets/founder.webp';

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
      window.location.href = '/auth/login';
    }
  };

  return (
    <header className="h-18 px-6 sm:px-8 bg-transparent flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Mobile Hamburger Toggle */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 bg-white"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Global Search Bar (matching reference screenshot) */}
        <div className="relative w-full max-w-md">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            className="w-full bg-white hover:bg-slate-50/80 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Search properties, clients, or referrals..."
            value={searchVal}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Topbar Right Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications Button with Red Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors relative"
            aria-label="View notifications"
          >
            <Bell size={18} />
            <span className="w-2 h-2 bg-red-500 rounded-full absolute top-2.5 right-2.5 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-slate-900">Notifications</span>
                <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">
                  Mark all as read
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100/60">
                  <p className="font-semibold text-slate-900">New Deal Closed</p>
                  <p className="text-slate-600 mt-0.5">AED 48,750 commission accredited to your balance.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-semibold text-slate-900">Referral Assigned</p>
                  <p className="text-slate-600 mt-0.5">Sarah Johnson assigned to Senior Mortgage Advisor.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wallet Balance Pill (matching reference screenshot) */}
        <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-2xs">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Coins size={14} />
          </div>
          <span className="text-sm font-bold text-slate-800 tracking-tight">
            AED 12,450.00
          </span>
        </div>

        {/* User Profile Pill Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs transition-colors"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-200">
              <Image
                src={founderAvatar}
                alt={user?.fullName || 'Mugesh | Ram'}
                fill
                className="object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-1.5 border-white" />
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user?.fullName || 'Mugesh | Ram'}
              </span>
              <span className="text-[10.5px] text-slate-500 leading-none mt-0.5">
                Super Agent
              </span>
            </div>

            <ChevronDown size={14} className="text-slate-400 ml-0.5" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs">
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
                Verification Status
              </Link>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-medium"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
