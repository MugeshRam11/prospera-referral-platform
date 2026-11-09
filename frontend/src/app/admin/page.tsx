'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  FileText,
  History,
  Layers,
  Coins,
  RefreshCw,
  UserCheck,
  UserX,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  AdminOverviewMetrics,
  AdminRecentApplication,
  AdminRecentAuditLog,
} from '../../types';
import { ApiClient } from '../../lib/api';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [recentApplications, setRecentApplications] = useState<AdminRecentApplication[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AdminRecentAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOverview = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getAdminOverview();
      setMetrics(data.metrics);
      setRecentApplications(data.recentApplications || []);
      setRecentAuditLogs(data.recentAuditLogs || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load admin overview metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const totalUrgentTasks =
    (metrics?.pendingAgencyApprovals ?? 0) +
    (metrics?.pendingKycReviews ?? 0) +
    (metrics?.pendingBankVerifications ?? 0) +
    (metrics?.unassignedLeads ?? 0);

  return (
    <div className="space-y-6">
      {/* 1. OPERATIONS TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Platform Operations & Governance
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
              Live Compliance Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time verified data from isolated VPS development database (`prospera_dev`).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/demo-personas"
            className="p-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200 shadow-2xs"
          >
            <Sparkles size={13} />
            <span>Switch Demo Persona</span>
          </Link>
          <button
            onClick={loadOverview}
            disabled={isLoading}
            className="p-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. URGENT OPERATIONS ALERT BANNER (If tasks require attention) */}
      {totalUrgentTasks > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Action Required: {totalUrgentTasks} Items Pending Compliance Review
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {(metrics?.pendingKycReviews ?? 0) > 0 && `${metrics?.pendingKycReviews} KYC documents • `}
                {(metrics?.pendingAgencyApprovals ?? 0) > 0 && `${metrics?.pendingAgencyApprovals} agencies • `}
                {(metrics?.pendingBankVerifications ?? 0) > 0 && `${metrics?.pendingBankVerifications} bank accounts • `}
                {(metrics?.unassignedLeads ?? 0) > 0 && `${metrics?.unassignedLeads} unassigned referrals`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(metrics?.pendingKycReviews ?? 0) > 0 && (
              <Link
                href="/admin/kyc"
                className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              >
                Review KYC
              </Link>
            )}
            {(metrics?.pendingBankVerifications ?? 0) > 0 && (
              <Link
                href="/admin/banking"
                className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
              >
                Verify Banks
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 3. FOUR ENTERPRISE KPI CLUSTERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CLUSTER 1: ORGANIZATION NETWORK */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Organization Network
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 size={15} />
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Registered Agencies</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {isLoading ? '...' : metrics?.totalAgencies ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pl-2 border-l-2 border-slate-200">
                <span className="text-slate-400">Verified Agencies</span>
                <span className="font-bold text-emerald-600">
                  {isLoading ? '...' : metrics?.verifiedAgencies ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Independent Brokers</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {isLoading ? '...' : metrics?.totalIndependentAgents ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Agency Team Brokers</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {isLoading ? '...' : metrics?.totalAgencyMembers ?? 0}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/agencies"
            className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center justify-between group"
          >
            <span>Inspect Agencies Directory</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* CLUSTER 2: VERIFICATION CENTER */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Verification Center
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck size={15} />
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Pending KYC Documents</span>
                <span
                  className={`text-sm font-extrabold ${
                    (metrics?.pendingKycReviews ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}
                >
                  {isLoading ? '...' : metrics?.pendingKycReviews ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Pending Agency Approvals</span>
                <span
                  className={`text-sm font-extrabold ${
                    (metrics?.pendingAgencyApprovals ?? 0) > 0 ? 'text-orange-600' : 'text-slate-900'
                  }`}
                >
                  {isLoading ? '...' : metrics?.pendingAgencyApprovals ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Bank Accounts to Verify</span>
                <span
                  className={`text-sm font-extrabold ${
                    (metrics?.pendingBankVerifications ?? 0) > 0 ? 'text-blue-600' : 'text-slate-900'
                  }`}
                >
                  {isLoading ? '...' : metrics?.pendingBankVerifications ?? 0}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/kyc"
            className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center justify-between group"
          >
            <span>Open KYC Verification Queue</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* CLUSTER 3: REFERRAL OPERATIONS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Referral Operations
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText size={15} />
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Unassigned Referrals</span>
                <span
                  className={`text-sm font-extrabold ${
                    (metrics?.unassignedLeads ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {isLoading ? '...' : metrics?.unassignedLeads ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Active Pipeline Referrals</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {isLoading ? '...' : metrics?.activeReferralsCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Service Catalogues</span>
                <span className="text-sm font-extrabold text-slate-900">Active</span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/referrals"
            className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center justify-between group"
          >
            <span>Open Pipeline Management</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* CLUSTER 4: PLATFORM GOVERNANCE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Governance & Status
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={15} />
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Active Verified Accounts</span>
                <span className="text-sm font-extrabold text-emerald-600">
                  {isLoading ? '...' : metrics?.verifiedAccounts ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Suspended Accounts</span>
                <span className="text-sm font-extrabold text-rose-600">
                  {isLoading ? '...' : metrics?.suspendedAccounts ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Security Sessions</span>
                <span className="text-xs font-bold text-slate-700">Protected</span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/users"
            className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center justify-between group"
          >
            <span>Manage All Platform Users</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* 4. TWO-COLUMN OPERATIONS DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: RECENT USER REGISTRATIONS & APPLICATIONS */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Recent User Registrations ({recentApplications.length})
              </h3>
              <p className="text-xs text-slate-500">
                Newly provisioned partner, coordinator, and broker accounts in `prospera_dev`.
              </p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>User Directory</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2">User Name</th>
                  <th className="pb-3">Role & Type</th>
                  <th className="pb-3">Account Status</th>
                  <th className="pb-3">KYC State</th>
                  <th className="pb-3">Registered</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-2">
                      <div className="font-bold text-slate-900">{app.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{app.email}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-semibold text-slate-700">{app.role}</span>
                      <div className="text-[10px] text-slate-400">
                        {app.agentType === 'AGENCY_MEMBER' ? 'Agency Member' : 'Independent'}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          app.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : app.accountStatus === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {app.accountStatus}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          app.kycStatusSummary === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : app.kycStatusSummary === 'PENDING_REVIEW'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {app.kycStatusSummary}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400 font-normal">
                      {new Date(app.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <Link
                        href={`/admin/users?search=${encodeURIComponent(app.email)}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT AUDIT LOGS */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Audit Trail</h3>
              <p className="text-xs text-slate-500">Security & compliance actions stream.</p>
            </div>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Full Stream</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {recentAuditLogs.length > 0 ? (
              recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate max-w-[170px]">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[140px] font-medium">{log.userName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                      {log.entityType}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">
                <History size={24} className="mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-600">No recent audit log entries</p>
                <p className="text-[10.5px] text-slate-400">Privileged actions will be logged automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
