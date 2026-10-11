'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  FileText,
  Users,
  Building2,
  Coins,
  CreditCard,
  ShieldCheck,
  Settings,
  ChevronDown,
  ArrowRight,
  X,
} from 'lucide-react';
import { UserSummary } from '../types';
import prosperaWhiteIcon from '../assets/prospera-white-logo-icon.png';
import founderAvatar from '../assets/founder.webp';
import sidebarPromoBg from '../assets/iStock-1572334424.webp';

interface SidebarProps {
  user: UserSummary | null;
  activeReferralCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeReferralCount = 38,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'New Referral',
      href: '/referrals/new',
      icon: Plus,
    },
    {
      label: 'My Referrals',
      href: '/referrals',
      icon: FileText,
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
    },
    {
      label: 'Properties & Services',
      href: '/services',
      icon: Building2,
    },
    {
      label: 'Commissions',
      href: '/commissions',
      icon: Coins,
    },
    {
      label: 'Withdrawals',
      href: '/withdrawals',
      icon: CreditCard,
    },
    {
      label: 'Documents & Verification',
      href: '/kyc',
      icon: ShieldCheck,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prospera_corporate_session_token');
      window.location.href = '/auth/login';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A1227] text-white flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800/80 shadow-2xl overflow-y-auto`}
        aria-label="Agent Navigation Sidebar"
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col flex-1">
          {/* Brand Header */}
          <div className="p-5 pb-6 flex items-center justify-between border-b border-slate-800/60">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 relative flex-shrink-0">
                <Image
                  src={prosperaWhiteIcon}
                  alt="Prospera Monogram"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-extrabold text-lg tracking-wider leading-none">
                  PROSPERA
                </span>
                <span className="text-slate-400 text-[10px] tracking-tight mt-1">
                  More Opportunities. Greater Value.
                </span>
              </div>
            </Link>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 mt-2">
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
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-white' : 'text-slate-400'}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Promo Card & Agent Profile */}
        <div className="p-3 pt-0 space-y-3">
          {/* Promo Card: "More than just referrals" */}
          <div className="rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg group">
            <div className="absolute inset-0">
              <Image
                src={sidebarPromoBg}
                alt="Dubai Skyline"
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/40" />
            </div>

            <div className="relative p-4 flex flex-col justify-between min-h-[160px]">
              <div>
                <h4 className="text-white font-bold text-sm leading-snug">
                  More than<br />just referrals
                </h4>
                <p className="text-slate-300 text-[10.5px] mt-2 leading-relaxed font-light">
                  Property • Mortgage • Golden Visa<br />
                  Corporate Advisory • Bank Accounts<br />
                  Company Formation
                </p>
              </div>

              <Link
                href="/services"
                className="mt-3 inline-flex items-center justify-center gap-1.5 bg-white text-slate-900 font-semibold text-xs py-2 px-3.5 rounded-full hover:bg-slate-100 transition-colors shadow-sm w-fit"
              >
                <span>Explore Services</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="bg-[#070D1D] rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-blue-500/30 flex-shrink-0">
                <Image
                  src={founderAvatar}
                  alt={user?.fullName || 'Mugesh | Ram'}
                  fill
                  className="object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#070D1D]" />
              </div>

              <div className="flex flex-col">
                <span className="text-white text-xs font-bold leading-tight truncate max-w-[110px]">
                  {user?.fullName || 'Mugesh | Ram'}
                </span>
                <span className="text-slate-400 text-[10.5px] font-medium leading-none mt-0.5">
                  Super Agent
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              title="Log Out"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
