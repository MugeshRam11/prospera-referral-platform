'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  FileText,
  Coins,
  CreditCard,
  Plus,
  ChevronRight,
  ShieldCheck,
  Building2,
  LifeBuoy,
  Percent,
  Briefcase,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { MetricsCards } from '../components/MetricsCards';
import { StatusBadge } from '../components/StatusBadge';
import { LeadItem, DashboardMetrics, UserSummary } from '../types';
import { ApiClient } from '../lib/api';
import heroBg from '../assets/hero-bg.webp';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [m, l, u] = await Promise.all([
        ApiClient.getDashboardMetrics(),
        ApiClient.getReferrals(),
        ApiClient.getMe(),
      ]);

      // Intelligent role routing: Redirect specialized personas to their designated portals
      if (u) {
        if (u.role === 'ADMIN') {
          window.location.replace('/admin');
          return;
        }
        if (u.role === 'COORDINATOR') {
          window.location.replace('/coordinator');
          return;
        }
        if (u.role === 'REFERRAL_PARTNER') {
          window.location.replace('/partner');
          return;
        }
        if (
          u.agentType === 'AGENCY_MEMBER' &&
          (u.agencyRole === 'AGENCY_OWNER' || u.agencyRole === 'AGENCY_ADMIN')
        ) {
          window.location.replace('/agency');
          return;
        }
      }

      setMetrics(m);
      setLeads(l || []);
      setUser(u);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCreated = () => loadData();
    const handleUpdated = () => loadData();
    window.addEventListener('prospera_referral_created' as any, handleCreated);
    window.addEventListener('prospera_lead_updated' as any, handleUpdated);
    window.addEventListener('prospera_withdrawal_created' as any, handleCreated);

    return () => {
      window.removeEventListener('prospera_referral_created' as any, handleCreated);
      window.removeEventListener('prospera_lead_updated' as any, handleUpdated);
      window.removeEventListener('prospera_withdrawal_created' as any, handleCreated);
    };
  }, []);

  const openWithdrawModal = () => {
    window.dispatchEvent(new CustomEvent('prospera_open_withdraw'));
  };

  const openDetailModal = (lead: LeadItem) => {
    window.dispatchEvent(new CustomEvent('prospera_open_detail', { detail: lead }));
  };

  const servicesList = [
    {
      title: 'Property & Real Estate',
      desc: 'Prime UAE residential & commercial acquisitions',
      icon: Home,
      iconColor: 'bg-blue-100 text-blue-600',
      href: '/services',
    },
    {
      title: 'Mortgage Services',
      desc: 'UAE resident & non-resident financing advisory',
      icon: Percent,
      iconColor: 'bg-teal-100 text-teal-600',
      href: '/services',
    },
    {
      title: 'Golden Visa',
      desc: '10-Year UAE residency for investors & executives',
      icon: ShieldCheck,
      iconColor: 'bg-amber-100 text-amber-600',
      href: '/services',
    },
    {
      title: 'Corporate Advisory',
      desc: 'DIFC/ADGM structuring, foundations & M&A',
      icon: Briefcase,
      iconColor: 'bg-purple-100 text-purple-600',
      href: '/services',
    },
    {
      title: 'Bank Account Opening',
      desc: 'Corporate accounts with Tier-1 UAE banks',
      icon: CreditCard,
      iconColor: 'bg-cyan-100 text-cyan-600',
      href: '/services',
    },
    {
      title: 'Company Formation',
      desc: 'Mainland & Free Zone commercial licensing',
      icon: Building2,
      iconColor: 'bg-orange-100 text-orange-600',
      href: '/services',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER */}
      <div className="rounded-2xl overflow-hidden relative shadow-sm border border-slate-200/80">
        <div className="relative min-h-[190px] sm:min-h-[220px] flex items-center p-6 sm:p-8">
          {/* Background Image */}
          <Image
            src={heroBg}
            alt="Dubai Skyline"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1528]/95 via-[#0B1528]/85 to-transparent sm:to-black/30" />

          {/* Banner Content */}
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold backdrop-blur-sm border border-blue-400/30 mb-2.5">
              <Sparkles size={12} />
              <span>
                {user?.agentType === 'AGENCY_MEMBER'
                  ? `Broker • ${user.agency?.name || 'Agency Portal'}`
                  : 'Independent Licensed Broker'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Refer Properties.
              <br />
              Earn High-Value Commissions.
            </h2>
            <p className="text-slate-200 text-xs sm:text-sm mt-1.5 max-w-md font-light">
              Connect clients to prime UAE developments, competitive mortgages, and corporate advisory services.
            </p>

            <div className="flex items-center gap-3 mt-4">
              <Link
                href="/referrals/new"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-colors shadow-md"
              >
                <Plus size={14} />
                <span>Submit Referral</span>
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3.5 py-2 rounded-xl backdrop-blur-xs transition-colors border border-white/20"
              >
                <span>Explore Catalog</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LIVE METRICS STAT CARDS */}
      <MetricsCards
        metrics={
          metrics || {
            totalReferrals: leads.length,
            activePipelineValue: 0,
            wonReferralsCount: leads.filter((l) => l.status === 'WON').length,
            wonReferralsValue: 0,
            totalEarnedCommission: 0,
            withdrawableBalance: 0,
            pendingClearanceCommission: 0,
            payoutsProcessed: 0,
          }
        }
        onWithdrawClick={openWithdrawModal}
      />

      {/* 3. MAIN DASHBOARD TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: QUICK ACTIONS + LIVE REFERRALS */}
        <div className="lg:col-span-8 space-y-6">
          {/* A. QUICK ACTIONS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Broker Actions</h3>
              <Link
                href="/referrals"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>All Referrals</span>
                <ArrowRight size={13} />
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Direct access to pipeline management, client onboarding, and payouts.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/referrals/new"
                className="bg-blue-50/60 hover:bg-blue-50 border border-blue-200/70 rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Plus size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center">New Referral</span>
              </Link>

              <Link
                href="/services"
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
                  <Building2 size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center">Service Catalog</span>
              </Link>

              <Link
                href="/commissions"
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
                  <Coins size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center">Earnings Ledger</span>
              </Link>

              <button
                onClick={openWithdrawModal}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-105 transition-transform">
                  <CreditCard size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800 text-center">Request Payout</span>
              </button>
            </div>
          </div>

          {/* B. RECENT LIVE REFERRALS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Recent Referrals ({leads.length})
                </h3>
                <p className="text-xs text-slate-500">Live opportunities submitted by your account.</p>
              </div>
              <Link
                href="/referrals"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Reference ID</th>
                    <th className="pb-3">Client Name</th>
                    <th className="pb-3">Service</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Submitted</th>
                    <th className="pb-3 pr-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.length > 0 ? (
                    leads.slice(0, 6).map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => openDetailModal(lead)}
                      >
                        <td className="py-3.5 pl-2 font-semibold text-slate-700 flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          <span>{lead.referenceNo}</span>
                        </td>
                        <td className="py-3.5 font-medium text-slate-900">{lead.clientName}</td>
                        <td className="py-3.5 text-slate-600">
                          {lead.service?.name || 'UAE Advisory'}
                        </td>
                        <td className="py-3.5">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="py-3.5 text-slate-500 font-normal">
                          {new Date(lead.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          <span className="text-blue-600 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                            <span>Inspect</span>
                            <ChevronRight size={13} />
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText size={32} className="text-slate-300" />
                          <p className="text-xs font-bold text-slate-700">No referrals submitted yet</p>
                          <p className="text-[11px] text-slate-400 max-w-sm">
                            Connect your clients to luxury UAE properties, mortgages, or visa processing to track status and receive commission disbursements.
                          </p>
                          <Link
                            href="/referrals/new"
                            className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs"
                          >
                            <Plus size={13} />
                            <span>Create First Referral</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SERVICES & SUPPORT */}
        <div className="lg:col-span-4 space-y-6">
          {/* A. OUR SERVICES */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Ecosystem Services</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Accredited solutions across property, banking, and immigration.
            </p>

            <div className="space-y-2.5">
              {servicesList.map((srv, idx) => {
                const Icon = srv.icon;
                return (
                  <Link
                    key={idx}
                    href={srv.href}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${srv.iconColor}`}>
                        <Icon size={17} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {srv.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-tight">{srv.desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* B. BROKER SUPPORT & CONCIERGE */}
          <div className="bg-gradient-to-br from-slate-900 to-[#14243A] rounded-2xl p-5 text-white shadow-sm border border-slate-800">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <LifeBuoy size={16} />
              </div>
              <h4 className="text-xs font-bold tracking-tight">Concierge Support Desk</h4>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-light">
              Need assistance with mortgage pre-approvals, Golden Visa eligibility, or high-value villa off-plan contracts?
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Link
                href="/support"
                className="bg-white hover:bg-slate-100 text-slate-900 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
              >
                Contact Concierge
              </Link>
              <Link
                href="/kyc"
                className="text-slate-300 hover:text-white text-[11px] font-medium px-2 py-1.5"
              >
                Check KYC
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
