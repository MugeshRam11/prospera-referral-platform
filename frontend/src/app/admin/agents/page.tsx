'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserX,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Eye,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { AdminAgentItem, PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AdminAgentItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [agentType, setAgentType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Suspend modal state
  const [suspendModalAgent, setSuspendModalAgent] = useState<AdminAgentItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadAgents = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminAgents({
        search: search.trim() || undefined,
        agentType: agentType !== 'ALL' ? agentType : undefined,
        status: status !== 'ALL' ? status : undefined,
        page,
        limit: 15,
      });
      setAgents(res.agents || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to retrieve agent records.');
    } finally {
      setIsLoading(false);
    }
  }, [search, agentType, status, page]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAgents();
  };

  // Status Update Handler
  const handleApproveAgent = async (agentId: string) => {
    if (!confirm('Approve this agent and activate referral submission & commission permissions?')) return;
    setIsSubmittingAction(true);
    try {
      await ApiClient.updateAdminAgentStatus(agentId, 'ACTIVE');
      setSuccessMsg('Agent account verified and marked ACTIVE.');
      await loadAgents();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to approve agent.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModalAgent) return;
    setIsSubmittingAction(true);
    try {
      await ApiClient.updateAdminAgentStatus(
        suspendModalAgent.id,
        'SUSPENDED',
        suspendReason.trim() || undefined
      );
      setSuccessMsg(`Agent account for ${suspendModalAgent.fullName} suspended.`);
      setSuspendModalAgent(null);
      setSuspendReason('');
      await loadAgents();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to suspend account.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRevokeSessions = async (agent: AdminAgentItem) => {
    if (!confirm(`Force session logout and revoke all active JWT tokens for ${agent.fullName}?`)) return;
    try {
      const res = await ApiClient.revokeUserSessions(agent.id);
      setSuccessMsg(`Revoked ${res.revokedCount} active session(s) for ${agent.fullName}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to revoke sessions.');
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
              placeholder="Search by agent name, email, phone number, or company..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
              value={agentType}
              onChange={(e) => {
                setAgentType(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Types</option>
              <option value="INDEPENDENT">Independent Agent</option>
              <option value="AGENCY_MEMBER">Agency Member</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="ACTIVE">Active (Verified)</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="SUSPENDED">Suspended</option>
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

      {/* Agents Table */}
      <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Agent Directory ({pagination.total})
            </h3>
            <p className="text-xs text-slate-500">
              Manage individual agent profiles, regulatory compliance, and session controls.
            </p>
          </div>
          <button
            onClick={loadAgents}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {isLoading ? 'Loading agent records...' : 'No agents found matching the current search parameters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Agent Identity</th>
                  <th className="py-2.5 px-3">Contact Details</th>
                  <th className="py-2.5 px-3">Affiliation</th>
                  <th className="py-2.5 px-3">Account Status</th>
                  <th className="py-2.5 px-3">KYC Docs</th>
                  <th className="py-2.5 px-3">Joined</th>
                  <th className="py-2.5 px-3 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((agent) => {
                  const verifiedDocs = agent.kycDocuments?.filter((d) => d.status === 'VERIFIED').length || 0;
                  const totalDocs = agent.kycDocuments?.length || 0;
                  const agencyName = agent.agencyMemberships?.[0]?.agency?.name;

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs flex-shrink-0">
                            {agent.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{agent.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              BRN: {agent.brn || 'None'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-mono block">{agent.email}</span>
                        <span className="text-slate-400 text-[11px]">{agent.phone || 'No phone'}</span>
                      </td>

                      <td className="py-3 px-3">
                        {agencyName ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <Building2 size={12} className="text-blue-600" />
                            <span>{agencyName}</span>
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                            Independent
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            agent.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : agent.accountStatus === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800'
                              : agent.accountStatus === 'SUSPENDED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {agent.accountStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[11px] font-bold text-slate-700">
                          {verifiedDocs}/{totalDocs} Verified
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Action */}
                          {agent.accountStatus !== 'ACTIVE' && (
                            <button
                              onClick={() => handleApproveAgent(agent.id)}
                              disabled={isSubmittingAction}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-colors"
                              title="Approve & Activate Account"
                            >
                              Approve
                            </button>
                          )}

                          {/* Suspend Action */}
                          {agent.accountStatus !== 'SUSPENDED' && (
                            <button
                              onClick={() => setSuspendModalAgent(agent)}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition-colors"
                              title="Suspend Account"
                            >
                              Suspend
                            </button>
                          )}

                          {/* Session Revocation Action */}
                          <button
                            onClick={() => handleRevokeSessions(agent)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Force Logout / Revoke Sessions"
                          >
                            <LogOut size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total agents)
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

      {/* Suspend Confirmation Modal */}
      {suspendModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <UserX size={24} />
              <h3 className="text-base font-bold text-slate-900">
                Suspend Agent Account: {suspendModalAgent.fullName}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Suspended agents will be blocked from accessing the portal, creating new client referrals, or withdrawing commissions.
            </p>

            <div className="form-group mb-4">
              <label className="form-label text-xs font-bold text-slate-700">
                Reason for Suspension (Audit Log)
              </label>
              <textarea
                className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                rows={3}
                placeholder="e.g. Expired broker license, compliance dispute, or AML identity discrepancy..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setSuspendModalAgent(null);
                  setSuspendReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isSubmittingAction ? 'Processing...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
