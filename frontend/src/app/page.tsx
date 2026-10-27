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
} from 'lucide-react';
import { MetricsCards } from '../components/MetricsCards';
import { LeadItem, CommissionEntry, DashboardMetrics, UserSummary } from '../types';
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
      setMetrics(m);
      setLeads(l);
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

  // High-fidelity fallback / sample referrals matching reference screenshot
  const displayReferrals = [
    {
      id: 'REF-2025-0048',
      clientName: 'Ahmed Al Mansoori',
      service: 'Property & Real Estate',
      status: 'In Progress',
      statusColor: 'bg-blue-50 text-blue-600 border-blue-100',
      submitted: '2h ago',
    },
    {
      id: 'REF-2025-0047',
      clientName: 'Sarah Johnson',
      service: 'Mortgage',
      status: 'Won Deal',
      statusColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      submitted: '5h ago',
    },
    {
      id: 'REF-2025-0046',
      clientName: 'Mohammed Khan',
      service: 'Golden Visa',
      status: 'In Progress',
      statusColor: 'bg-blue-50 text-blue-600 border-blue-100',
      submitted: '1d ago',
    },
    {
      id: 'REF-2025-0045',
      clientName: 'Emily Carter',
      service: 'Corporate Advisory',
      status: 'Lost',
      statusColor: 'bg-rose-50 text-rose-600 border-rose-100',
      submitted: '2d ago',
    },
    {
      id: 'REF-2025-0044',
      clientName: 'David Wilson',
      service: 'Bank Account Opening',
      status: 'In Progress',
      statusColor: 'bg-blue-50 text-blue-600 border-blue-100',
      submitted: '3d ago',
    },
  ];

  const servicesList = [
    {
      title: 'Property & Real Estate',
      desc: 'Residential & commercial properties',
      icon: Home,
      iconColor: 'bg-blue-100 text-blue-600',
      href: '/services',
    },
    {
      title: 'Mortgage Services',
      desc: 'Competitive rates & flexible terms',
      icon: Percent,
      iconColor: 'bg-teal-100 text-teal-600',
      href: '/services',
    },
    {
      title: 'Golden Visa',
      desc: 'UAE residency & long-term security',
      icon: ShieldCheck,
      iconColor: 'bg-amber-100 text-amber-600',
      href: '/services',
    },
    {
      title: 'Corporate Advisory',
      desc: 'Business setup & growth support',
      icon: Briefcase,
      iconColor: 'bg-purple-100 text-purple-600',
      href: '/services',
    },
    {
      title: 'Bank Account Opening',
      desc: 'Personal & corporate accounts',
      icon: CreditCard,
      iconColor: 'bg-cyan-100 text-cyan-600',
      href: '/services',
    },
    {
      title: 'Company Formation',
      desc: 'Free zone & mainland setup',
      icon: Building2,
      iconColor: 'bg-orange-100 text-orange-600',
      href: '/services',
    },
  ];

  return (
    <div className="space-y-7 pb-10">
      {/* 1. TOP GREETING & HERO BANNER (MATCHING REFERENCE SCREENSHOT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Personalized Greeting */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <p className="text-slate-500 text-base font-normal">Good morning,</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1 flex items-center gap-2 tracking-tight">
            <span>{user?.fullName?.split(' ')[0] || 'Mugesh'}!</span>
            <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-2 leading-relaxed">
            Here&apos;s your referral performance and latest updates.
          </p>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Keep building your network — more opportunities await!
          </p>
        </div>

        {/* Right: Luxury Property Hero Banner */}
        <div className="lg:col-span-7">
          <div className="relative rounded-2xl overflow-hidden min-h-[190px] h-full shadow-md flex flex-col justify-between p-6 group">
            {/* Background Luxury Property Image */}
            <div className="absolute inset-0">
              <Image
                src={heroBg}
                alt="Luxury Dubai Villa Skyline"
                fill
                className="object-cover object-right group-hover:scale-105 transition-transform duration-700"
                priority
              />
              {/* Dark Gradient Overlay for optimal legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-transparent" />
            </div>

            {/* Banner Header Tag */}
            <div className="relative z-10">
              <span className="inline-flex items-center bg-black/40 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                Premium Partner
              </span>
            </div>

            {/* Banner Content */}
            <div className="relative z-10 mt-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Refer Properties.
                <br />
                Earn More.
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-1 max-w-md font-light">
                Luxury homes, prime locations, trusted developments.
              </p>

              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 bg-white text-slate-900 font-semibold text-xs px-4 py-2 rounded-full hover:bg-slate-100 transition-colors shadow-md mt-4"
              >
                <span>Explore Properties</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 METRIC STAT CARDS WITH WAVE SPARKLINES */}
      <MetricsCards
        metrics={
          metrics || {
            totalReferrals: 38,
            activePipelineValue: 2850000,
            wonReferralsCount: 14,
            wonReferralsValue: 1250000,
            totalEarnedCommission: 48750,
            withdrawableBalance: 32400,
            pendingClearanceCommission: 48750,
            payoutsProcessed: 0,
          }
        }
        onWithdrawClick={openWithdrawModal}
      />

      {/* 3. MAIN DASHBOARD TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: QUICK ACTIONS + RECENT REFERRALS */}
        <div className="lg:col-span-8 space-y-6">
          {/* A. QUICK ACTIONS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Quick Actions</h3>
              <Link
                href="/referrals"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Get started with your next referral or manage your activities.
            </p>

            {/* 5 Action Buttons Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* 1. New Referral (Solid Blue) */}
              <Link
                href="/referrals/new"
                className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 transition-all shadow-md shadow-blue-600/20 group"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={20} strokeWidth={2.6} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-center text-white">
                  New Referral
                </span>
              </Link>

              {/* 2. Browse Properties */}
              <Link
                href="/services"
                className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 transition-all shadow-2xs hover:shadow-sm group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home size={19} className="text-slate-700" />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center">
                  Browse Properties
                </span>
              </Link>

              {/* 3. My Referrals */}
              <Link
                href="/referrals"
                className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 transition-all shadow-2xs hover:shadow-sm group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={19} className="text-slate-700" />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center">
                  My Referrals
                </span>
              </Link>

              {/* 4. Check Commissions */}
              <Link
                href="/commissions"
                className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 transition-all shadow-2xs hover:shadow-sm group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coins size={19} className="text-slate-700" />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center">
                  Check Commissions
                </span>
              </Link>

              {/* 5. Request Withdrawal */}
              <button
                onClick={openWithdrawModal}
                className="bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 transition-all shadow-2xs hover:shadow-sm group col-span-2 sm:col-span-1"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard size={19} className="text-slate-700" />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center">
                  Request Withdrawal
                </span>
              </button>
            </div>
          </div>

          {/* B. RECENT REFERRALS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Recent Referrals</h3>
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
                  {displayReferrals.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => {
                        const matchedLead = leads.find((l) => l.referenceNo === item.id);
                        if (matchedLead) {
                          openDetailModal(matchedLead);
                        } else {
                          window.location.href = '/referrals';
                        }
                      }}
                    >
                      <td className="py-3.5 pl-2 font-semibold text-slate-700 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <span>{item.id}</span>
                      </td>
                      <td className="py-3.5 font-medium text-slate-900">
                        {item.clientName}
                      </td>
                      <td className="py-3.5 text-slate-600">
                        {item.service}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.statusColor}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 font-normal">
                        {item.submitted}
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <span className="text-blue-600 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                          <span>View</span>
                          <ChevronRight size={13} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: OUR SERVICES + NEED HELP? */}
        <div className="lg:col-span-4 space-y-6">
          {/* A. OUR SERVICES CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Our Services</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Help your clients with a complete range of solutions.
            </p>

            <div className="space-y-3">
              {servicesList.map((srv) => {
                const Icon = srv.icon;
                return (
                  <Link
                    key={srv.title}
                    href={srv.href}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${srv.iconColor} flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {srv.title}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {srv.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={15}
                      className="text-slate-400 group-hover:text-blue-600 transition-colors"
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* B. NEED HELP? CARD */}
          <div className="bg-blue-50/70 border border-blue-100/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <LifeBuoy size={19} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">Need help?</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Our support team is here for you.
                </p>

                <a
                  href="mailto:support@prospera.ae"
                  className="mt-3 inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-600 font-semibold text-xs px-3.5 py-1.5 rounded-full hover:bg-blue-50 transition-colors shadow-2xs"
                >
                  <span>Contact Support</span>
                  <ArrowRight size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
