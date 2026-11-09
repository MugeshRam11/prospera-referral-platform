'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Plus,
} from 'lucide-react';
import { AdminReferralPartnerItem, PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

export default function AdminReferralPartnersPage() {
  const [partners, setPartners] = useState<AdminReferralPartnerItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPartners = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminReferralPartners({
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setPartners(res.partners || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load referral partners');
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPartners();
  };

  const formatAED = (val: number | string | undefined | null) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Referral Partners Directory</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
              {pagination.total} Partners
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Corporate entities, institutional partners, and verified high-value client referrers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadPartners()}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Onboard Partner</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, contact person, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Partners List */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading referral partners...</span>
          </div>
        </div>
      ) : partners.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <Briefcase size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Referral Partners Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No referral partners match your filter. You can onboard new partners from the User Management console.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Partner / Company</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Banking Status</th>
                  <th className="py-3.5 px-4 text-center">Total Referrals</th>
                  <th className="py-3.5 px-4 text-center">Won Deals</th>
                  <th className="py-3.5 px-4 text-right">Closed Volume</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {p.companyName ? p.companyName.charAt(0) : p.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{p.fullName}</div>
                          {p.companyName && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building size={11} className="text-slate-400" />
                              <span>{p.companyName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail size={12} className="text-slate-400" />
                        <span>{p.email}</span>
                      </div>
                      {p.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                          <Phone size={12} className="text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          p.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {p.accountStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          p.hasVerifiedBank
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}
                      >
                        <FileCheck2 size={11} />
                        <span>{p.hasVerifiedBank ? 'Verified Bank' : 'Pending Bank'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {p.totalReferrals}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        {p.wonReferralsCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatAED(p.wonVolume)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/users?search=${encodeURIComponent(p.email)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <span>Profile</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 text-xs text-slate-600">
          <span>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (
            {pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

