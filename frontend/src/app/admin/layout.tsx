'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  LayoutDashboard,
  Users,
  Building2,
  FileCheck2,
  Lock,
  ArrowLeft,
  AlertOctagon,
} from 'lucide-react';
import { UserSummary } from '../../types';
import { ApiClient } from '../../lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const u = await ApiClient.getMe();
        setCurrentUser(u);
      } catch (err) {
        console.warn('Admin route authorization check failed:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const adminTabs = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Agent Directory', href: '/admin/agents', icon: Users },
    { label: 'Agency Directory', href: '/admin/agencies', icon: Building2 },
    { label: 'KYC Review Queue', href: '/admin/kyc', icon: FileCheck2 },
  ];

  if (isLoadingAuth) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-semibold">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Verifying administrative authorization...</span>
        </div>
      </div>
    );
  }

  // Security gate: strictly ADMIN role
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertOctagon size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            403 — Unauthorized Access
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Administrative access is restricted to authorized Prospera Compliance Officers and System Administrators. Your current role (<span className="font-semibold text-slate-800">{currentUser?.role || 'UNAUTHENTICATED'}</span>) does not possess administrative privileges.
          </p>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Admin Top Navigation & Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  Prospera Administration Portal
                </h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-500/30">
                  TIER-1 ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized agent KYC review, organization approvals, and platform governance.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 self-start md:self-auto">
            <Lock size={13} className="text-emerald-400" />
            <span>Logged in as: <strong className="text-white">{currentUser.fullName}</strong></span>
          </div>
        </div>

        {/* Admin Section Tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Subpage Content */}
      {children}
    </div>
  );
}
