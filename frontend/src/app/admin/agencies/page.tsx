'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  FileText,
  Users,
} from 'lucide-react';
import { AdminAgencyItem, PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<AdminAgencyItem[]>([]);
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalAgency, setRejectModalAgency] = useState<AdminAgencyItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadAgencies = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminAgencies({
        search: search.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        page,
        limit: 15,
      });
      setAgencies(res.agencies || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to retrieve agency records.');
    } finally {
      setIsLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    loadAgencies();
  }, [loadAgencies]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAgencies();
  };

  const handleVerifyAgency = async (agencyId: string) => {
    if (!confirm('Verify this agency organization and approve team referral distribution?')) return;
    setIsSubmittingAction(true);
    try {
      await ApiClient.updateAdminAgencyStatus(agencyId, 'VERIFIED');
      setSuccessMsg('Agency verified successfully.');
      await loadAgencies();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to verify agency.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSuspendAgency = async (agencyId: string) => {
    if (!confirm('Suspend this agency? Members will be temporarily restricted from agency submissions.')) return;
    setIsSubmittingAction(true);
    try {
      await ApiClient.updateAdminAgencyStatus(agencyId, 'SUSPENDED');
      setSuccessMsg('Agency suspended.');
      await loadAgencies();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to suspend agency.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalAgency) return;
    if (!rejectionReason.trim()) {
      alert('A rejection reason is required for compliance audit logs.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      await ApiClient.updateAdminAgencyStatus(
        rejectModalAgency.id,
        'REJECTED',
        rejectionReason.trim()
      );
      setSuccessMsg(`Agency registration for ${rejectModalAgency.name} rejected.`);
      setRejectModalAgency(null);
      setRejectionReason('');
      await loadAgencies();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reject agency.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="panel bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by agency brand, legal entity, trade license, or email..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button
              type="submit"
              className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Agencies Table */}
      <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Agency Directory ({pagination.total})
            </h3>
            <p className="text-xs text-slate-500">
              Manage licensed real estate brokerages and commercial legal entities.
            </p>
          </div>
          <button
            onClick={loadAgencies}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>
        </div>

        {agencies.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {isLoading ? 'Loading agency records...' : 'No agencies found matching current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Agency Brand & Legal Entity</th>
                  <th className="py-2.5 px-3">Trade License & ORN</th>
                  <th className="py-2.5 px-3">Contact Email / Phone</th>
                  <th className="py-2.5 px-3">Members Count</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registered</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{agency.name}</span>
                          <span className="text-[10px] text-slate-400">{agency.legalName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-700 block">
                        {agency.tradeLicenseNo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ORN: {agency.orn || 'N/A'}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-slate-700 font-mono block truncate max-w-[150px]" title={agency.email}>
                        {agency.email}
                      </span>
                      <span className="text-slate-400 text-[11px]">{agency.phone}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <Users size={12} className="text-slate-400" />
                        <span>{agency.totalMembers} agent(s)</span>
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          agency.status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : agency.status === 'PENDING_VERIFICATION'
                            ? 'bg-amber-100 text-amber-800'
                            : agency.status === 'SUSPENDED'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {agency.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(agency.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {agency.status !== 'VERIFIED' && (
                          <button
                            onClick={() => handleVerifyAgency(agency.id)}
                            disabled={isSubmittingAction}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-colors"
                            title="Verify Agency"
                          >
                            Verify
                          </button>
                        )}

                        {agency.status !== 'SUSPENDED' && (
                          <button
                            onClick={() => handleSuspendAgency(agency.id)}
                            disabled={isSubmittingAction}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors"
                            title="Suspend Agency"
                          >
                            Suspend
                          </button>
                        )}

                        {agency.status !== 'REJECTED' && (
                          <button
                            onClick={() => setRejectModalAgency(agency)}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition-colors"
                            title="Reject Agency"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} agencies)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-slate-900">
                Reject Agency: {rejectModalAgency.name}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              A clear rejection reason will be saved in the compliance audit trail and visible to the agency creator.
            </p>

            <div className="form-group mb-4">
              <label className="form-label text-xs font-bold text-slate-700">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                rows={3}
                placeholder="e.g. Invalid trade license number, missing commercial establishment card, or unregistered DLD activity..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setRejectModalAgency(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmittingAction || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                {isSubmittingAction ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
