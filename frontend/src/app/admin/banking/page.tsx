'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Building,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BankAccountItem, PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

export default function AdminBankingPage() {
  const [accounts, setAccounts] = useState<BankAccountItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [filterVerified, setFilterVerified] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalAccount, setRejectModalAccount] = useState<BankAccountItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBankAccounts = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const isVerified =
        filterVerified === 'ALL' ? undefined : filterVerified === 'VERIFIED';
      const res = await ApiClient.getAdminBankAccountsList({
        page,
        limit: 15,
        isVerified,
      });
      setAccounts(res.accounts || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load banking accounts');
    } finally {
      setIsLoading(false);
    }
  }, [filterVerified, page]);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  const handleVerify = async (account: BankAccountItem) => {
    if (!confirm(`Verify and approve bank account for ${account.accountHolderName}?`)) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await ApiClient.verifyAdminBankAccount(account.id, true);
      setSuccessMsg(`Bank account at ${account.bankName} verified successfully.`);
      loadBankAccounts();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to verify bank account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalAccount) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await ApiClient.verifyAdminBankAccount(
        rejectModalAccount.id,
        false,
        rejectReason.trim() || 'Account details do not match identity records'
      );
      setSuccessMsg(`Bank account at ${rejectModalAccount.bankName} marked as rejected.`);
      setRejectModalAccount(null);
      setRejectReason('');
      loadBankAccounts();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reject bank account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Banking Verification Workspace
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
              {pagination.total} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review masked IBAN records and compliance approval for automated commission payouts.
          </p>
        </div>

        <button
          onClick={() => loadBankAccounts()}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => {
            setFilterVerified('ALL');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterVerified === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Accounts
        </button>
        <button
          onClick={() => {
            setFilterVerified('PENDING');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterVerified === 'PENDING'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Verification
        </button>
        <button
          onClick={() => {
            setFilterVerified('VERIFIED');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            filterVerified === 'VERIFIED'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Verified Accounts
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading bank accounts...</span>
          </div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <CreditCard size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Bank Accounts Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No bank accounts found matching this verification status.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Account Holder</th>
                  <th className="py-3.5 px-4">Financial Institution</th>
                  <th className="py-3.5 px-4">Masked IBAN</th>
                  <th className="py-3.5 px-4">Currency</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{acc.accountHolderName}</div>
                      {acc.user && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User size={11} className="text-slate-400" />
                          <span>{acc.user.fullName} ({acc.user.role})</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building size={13} className="text-slate-400" />
                        <span>{acc.bankName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {acc.ibanMasked || acc.maskedIban || `•••• ${acc.ibanLast4}`}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {acc.currency}
                    </td>
                    <td className="py-3 px-4">
                      {acc.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          <span>VERIFIED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={11} />
                          <span>PENDING</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!acc.isVerified ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleVerify(acc)}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                          >
                            Verify & Approve
                          </button>
                          <button
                            onClick={() => setRejectModalAccount(acc)}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-end gap-1">
                          <ShieldCheck size={13} className="text-emerald-500" />
                          <span>Approved</span>
                        </span>
                      )}
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

      {/* Reject Modal */}
      {rejectModalAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reject Bank Account</h3>
              <button
                onClick={() => setRejectModalAccount(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Provide a reason for rejecting the bank account at{' '}
                <strong>{rejectModalAccount.bankName}</strong> ({rejectModalAccount.ibanMasked || rejectModalAccount.maskedIban || `•••• ${rejectModalAccount.ibanLast4}`}).
                This feedback will be recorded in the audit trail.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. IBAN name does not match passport/Emirates ID name on record."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalAccount(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

