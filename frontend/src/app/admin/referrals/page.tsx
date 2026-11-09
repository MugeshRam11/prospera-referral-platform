'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  User,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Tag,
} from 'lucide-react';
import { PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

interface AdminReferralRecord {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  expectedDealValue: number;
  actualDealValue?: number | null;
  currency: string;
  status: string;
  createdAt: string;
  service?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  referrer?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  assignedAgent?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  coordinator?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<AdminReferralRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReferrals = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminAllReferrals({
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        page,
        limit: 15,
      });
      setReferrals(res.referrals || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load global referrals pipeline');
    } finally {
      setIsLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadReferrals();
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'WON':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} />
            <span>WON DEAL</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Clock size={11} />
            <span>IN PROGRESS</span>
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Clock size={11} />
            <span>CONTACTED</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} />
            <span>SUBMITTED</span>
          </span>
        );
      case 'LOST':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} />
            <span>{st}</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {st}
          </span>
        );
    }
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
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Referrals & Leads Pipeline</h2>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
              {pagination.total} Deals
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global deal tracking, lead assignments, and status transitions across all network participants.
          </p>
        </div>

        <button
          onClick={() => loadReferrals()}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, client phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full md:w-auto px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="CONTACTED">Contacted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WON">Won Deal</option>
            <option value="LOST">Lost</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Referrals Table */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading referral records...</span>
          </div>
        </div>
      ) : referrals.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <FileText size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Referrals in Pipeline</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No referral records match your search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Client / Contact</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Referrer</th>
                  <th className="py-3.5 px-4">Assigned Agent</th>
                  <th className="py-3.5 px-4">Coordinator</th>
                  <th className="py-3.5 px-4 text-right">Deal Value</th>
                  <th className="py-3.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.clientName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-slate-400" />
                        <span>{r.clientPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Tag size={12} className="text-blue-500 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {r.service?.name || 'General Referral'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3 px-4">
                      {r.referrer ? (
                        <div>
                          <span className="font-medium text-slate-800">{r.referrer.fullName}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {r.referrer.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Direct Entry</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.assignedAgent ? (
                        <span className="font-medium text-slate-800">{r.assignedAgent.fullName}</span>
                      ) : (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.coordinator ? (
                        <div className="flex items-center gap-1 text-slate-700">
                          <Headphones size={12} className="text-slate-400" />
                          <span>{r.coordinator.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatAED(r.actualDealValue || r.expectedDealValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
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

