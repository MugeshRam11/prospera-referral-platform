'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  Building,
  User,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

interface CommissionLedgerRecord {
  id: string;
  amount: number;
  rateBps: number;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  referral?: {
    id: string;
    clientName: string;
    expectedDealValue: number;
    actualDealValue?: number | null;
    service?: { name: string } | null;
  } | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export default function AdminCommissionsPage() {
  const [entries, setEntries] = useState<CommissionLedgerRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCommissions = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminCommissionsLedgerList({
        page,
        limit: 15,
        status: status !== 'ALL' ? status : undefined,
      });
      setEntries(res.entries || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load commissions ledger');
    } finally {
      setIsLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} />
            <span>PAID</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 size={11} />
            <span>APPROVED</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} />
            <span>PENDING</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={11} />
            <span>CANCELLED</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
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
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Commissions Ledger & Payouts</h2>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              {pagination.total} Ledger Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Institutional revenue share accounting, agent splits, and clearance records.
          </p>
        </div>

        <button
          onClick={() => loadCommissions()}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        {['ALL', 'PENDING', 'APPROVED', 'PAID', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatus(tab);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              status === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL' ? 'All Entries' : tab}
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading ledger entries...</span>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <Coins size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Commission Entries</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No commission ledger records match the selected status.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Beneficiary</th>
                  <th className="py-3.5 px-4">Referral & Client</th>
                  <th className="py-3.5 px-4 text-center">Split Rate</th>
                  <th className="py-3.5 px-4 text-right">Commission Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Payout Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      {entry.user ? (
                        <div>
                          <div className="font-bold text-slate-900">{entry.user.fullName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{entry.user.role}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Institutional</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {entry.referral ? (
                        <div>
                          <div className="font-semibold text-slate-800">{entry.referral.clientName}</div>
                          <div className="text-[11px] text-slate-400">
                            {entry.referral.service?.name || 'Referral'} (Deal:{' '}
                            {formatAED(entry.referral.actualDealValue || entry.referral.expectedDealValue)})
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                      {(entry.rateBps / 100).toFixed(2)}% ({entry.rateBps} bps)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 text-sm">
                      {formatAED(entry.amount)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(entry.status)}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {entry.paidAt ? new Date(entry.paidAt).toLocaleDateString() : '—'}
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

