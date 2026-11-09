'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  FileText,
  Coins,
  CreditCard,
  Building2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Tag,
  Headphones,
} from 'lucide-react';
import { LeadItem, UserSummary, DashboardMetrics } from '../../types';
import { ApiClient } from '../../lib/api';

export default function PartnerDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [referrals, setReferrals] = useState<LeadItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [u, r, m] = await Promise.all([
        ApiClient.getMe(),
        ApiClient.getReferrals(),
        ApiClient.getDashboardMetrics(),
      ]);
      setCurrentUser(u);
      setReferrals(r || []);
      setMetrics(m);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load partner dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatAED = (val: number | string | undefined | null) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const wonLeads = referrals.filter((r) => r.status === 'WON');
  const wonVolume = wonLeads.reduce(
    (sum, r) => sum + Number(r.actualDealValue || r.expectedDealValue || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Partner Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center flex-shrink-0">
              <Briefcase size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  {currentUser?.companyName || 'Corporate Partner Portal'}
                </h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  INSTITUTIONAL PARTNER
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-1">
                Representative: <strong className="text-white">{currentUser?.fullName}</strong> ({currentUser?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link
              href="/referrals/new"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>New Referral</span>
            </Link>
          </div>
        </div>

        {/* Partner Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-800/60">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Referrals
            </span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">{referrals.length}</div>
            <span className="text-[10px] text-slate-400">Submitted deals</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
              Won Deals
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">{wonLeads.length}</div>
            <span className="text-[10px] text-slate-400">Successfully closed</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
              Closed Volume
            </span>
            <div className="text-xl font-extrabold text-blue-300 mt-1 font-mono">{formatAED(wonVolume)}</div>
            <span className="text-[10px] text-slate-400">Total transaction value</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              Earned Commission
            </span>
            <div className="text-xl font-extrabold text-amber-300 mt-1 font-mono">
              {formatAED(metrics?.totalEarnedCommission || wonVolume * 0.02)}
            </div>
            <span className="text-[10px] text-slate-400">Accrued to date</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/referrals/new"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Submit Client Referral
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">High-net-worth real estate or advisory</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/commissions"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                Commission Statements
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Track deal splits and payout remittances</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/support"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Headphones size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Concierge Desk
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Direct coordinator liaison & queries</p>
            </div>
          </div>
          <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Institutional Referrals Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Partner Referral Ledger</h3>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
              {referrals.length} Deals
            </span>
          </div>
          <Link
            href="/referrals"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {referrals.length === 0 ? (
          <div className="min-h-[200px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-2">
              <FileText size={24} />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Referrals Registered</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Click &quot;New Referral&quot; above to submit your first institutional client inquiry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Est. Deal Value</th>
                  <th className="py-3 px-4 text-right">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.clientName}</td>
                    <td className="py-3 px-4 text-slate-600">{r.service?.name || 'Inquiry'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          r.status === 'WON'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'LOST' || r.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : r.status === 'SUBMITTED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatAED(r.actualDealValue || r.expectedDealValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

