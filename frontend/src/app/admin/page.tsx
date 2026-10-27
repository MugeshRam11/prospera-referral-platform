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
  Search,
  ExternalLink,
  RefreshCw,
  UserCheck,
  UserX,
} from 'lucide-react';
import { AdminOverviewMetrics, AdminRecentApplication } from '../../types';
import { ApiClient } from '../../lib/api';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [recentApplications, setRecentApplications] = useState<AdminRecentApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadOverview = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getAdminOverview();
      setMetrics(data.metrics);
      setRecentApplications(data.recentApplications || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load admin overview metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const metricCards = [
    {
      label: 'Independent Agents',
      value: metrics?.totalIndependentAgents ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      href: '/admin/agents?agentType=INDEPENDENT',
    },
    {
      label: 'Total Registered Agencies',
      value: metrics?.totalAgencies ?? 0,
      icon: Building2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      href: '/admin/agencies',
    },
    {
      label: 'Agency Team Members',
      value: metrics?.totalAgencyMembers ?? 0,
      icon: UserCheck,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      href: '/admin/agents?agentType=AGENCY_MEMBER',
    },
    {
      label: 'Pending Agent Approvals',
      value: metrics?.pendingAgentApprovals ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      href: '/admin/agents?status=PENDING_APPROVAL',
      urgent: (metrics?.pendingAgentApprovals ?? 0) > 0,
    },
    {
      label: 'Pending Agency Approvals',
      value: metrics?.pendingAgencyApprovals ?? 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      href: '/admin/agencies?status=PENDING_VERIFICATION',
      urgent: (metrics?.pendingAgencyApprovals ?? 0) > 0,
    },
    {
      label: 'Pending KYC Documents',
      value: metrics?.pendingKycReviews ?? 0,
      icon: FileCheck2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      href: '/admin/kyc',
      urgent: (metrics?.pendingKycReviews ?? 0) > 0,
    },
    {
      label: 'Verified & Active Accounts',
      value: metrics?.verifiedAccounts ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      href: '/admin/agents?status=ACTIVE',
    },
    {
      label: 'Suspended Accounts',
      value: metrics?.suspendedAccounts ?? 0,
      icon: UserX,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      href: '/admin/agents?status=SUSPENDED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Platform Governance Overview</h2>
          <p className="text-xs text-slate-500">Live aggregated metrics from the Prospera compliance database.</p>
        </div>
        <button
          onClick={loadOverview}
          disabled={isLoading}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 8 Aggregate Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className={`panel bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                card.urgent ? 'ring-1 ring-amber-400/80 border-amber-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 truncate max-w-[120px]" title={card.label}>
                  {card.label}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bgColor} ${card.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900">
                  {isLoading ? '...' : card.value}
                </span>
                <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 hover:underline">
                  View <ArrowRight size={10} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Applications Queue */}
      <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recent Partner & Agent Registrations ({recentApplications.length})
            </h3>
            <p className="text-xs text-slate-500">
              Newly registered accounts requiring verification and compliance sign-off.
            </p>
          </div>
          <Link
            href="/admin/agents"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Full Directory</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {isLoading ? 'Loading applicant data...' : 'No recently registered applicants found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Corporate Email</th>
                  <th className="py-2.5 px-3">Agent Type</th>
                  <th className="py-2.5 px-3">Account Status</th>
                  <th className="py-2.5 px-3">KYC Summary</th>
                  <th className="py-2.5 px-3">Date Registered</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{app.fullName}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{app.email}</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {app.agentType || 'INDEPENDENT'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.accountStatus === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {app.accountStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.kycStatusSummary === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.kycStatusSummary === 'PENDING_REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {app.kycStatusSummary}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/admin/agents`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5"
                      >
                        Review
                      </Link>
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
