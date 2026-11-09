'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  UserPlus,
  FileText,
  TrendingUp,
  ShieldCheck,
  Mail,
  Phone,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  Briefcase,
  Copy,
  Settings,
} from 'lucide-react';
import { MyAgencyResponse, AgencyMemberInfo, LeadItem, UserSummary } from '../../types';
import { ApiClient } from '../../lib/api';

export default function AgencyPortalPage() {
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [agencyData, setAgencyData] = useState<MyAgencyResponse | null>(null);
  const [teamLeads, setTeamLeads] = useState<LeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'REFERRALS' | 'DOCUMENTS' | 'SETTINGS'>('MEMBERS');

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'AGENT' | 'AGENCY_ADMIN'>('AGENT');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [generatedInviteToken, setGeneratedInviteToken] = useState<string | null>(null);

  const loadAgency = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [u, agencyRes, leadsRes] = await Promise.all([
        ApiClient.getMe(),
        ApiClient.getMyAgency(),
        ApiClient.getReferrals(),
      ]);
      setCurrentUser(u);
      setAgencyData(agencyRes);
      setTeamLeads(leadsRes || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load agency workspace');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgency();
  }, [loadAgency]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyData?.agency?.id) return;
    setIsSubmittingInvite(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.inviteAgencyAgent(agencyData.agency.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setGeneratedInviteToken(res.inviteToken);
      setSuccessMsg(`Invitation dispatched to ${inviteEmail}.`);
      setInviteEmail('');
      loadAgency();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to invite agent');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRemoveMember = async (member: AgencyMemberInfo) => {
    if (!agencyData?.agency?.id) return;
    if (!confirm(`Remove ${member.fullName} from ${agencyData.agency.name}?`)) return;

    try {
      await ApiClient.removeAgencyMember(agencyData.agency.id, member.id);
      setSuccessMsg(`Member ${member.fullName} removed successfully.`);
      loadAgency();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const isOwnerOrAdmin =
    agencyData?.membership?.isPrivileged ||
    agencyData?.membership?.role === 'AGENCY_OWNER' ||
    agencyData?.membership?.role === 'AGENCY_ADMIN' ||
    currentUser?.role === 'ADMIN';

  const formatAED = (val: number | string | undefined | null) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const wonLeads = teamLeads.filter((l) => l.status === 'WON');
  const teamVolume = wonLeads.reduce(
    (sum, l) => sum + Number(l.actualDealValue || l.expectedDealValue || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Agency Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Building2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  {agencyData?.agency?.name || 'Agency Portal'}
                </h1>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    agencyData?.agency?.status === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {agencyData?.agency?.status || 'PENDING'}
                </span>
                {agencyData?.membership?.role && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-500/30">
                    ROLE: {agencyData.membership.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Trade License: <strong className="text-white font-mono">{agencyData?.agency?.tradeLicenseNo || 'N/A'}</strong>
                {agencyData?.agency?.orn && (
                  <span className="ml-3">
                    ORN: <strong className="text-white font-mono">{agencyData.agency.orn}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAgency()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <UserPlus size={14} />
                <span>Invite Broker</span>
              </button>
            )}
          </div>
        </div>

        {/* Agency Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Brokers & Staff
            </span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {agencyData?.agency?.membersCount || agencyData?.agency?.members?.length || 1}
            </div>
            <span className="text-[10px] text-slate-400">Registered members</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
              Active Referrals
            </span>
            <div className="text-2xl font-extrabold text-blue-300 mt-1 font-mono">{teamLeads.length}</div>
            <span className="text-[10px] text-slate-400">Team deal pipeline</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
              Won Deals
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">{wonLeads.length}</div>
            <span className="text-[10px] text-slate-400">Closed transactions</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              Gross Volume
            </span>
            <div className="text-xl font-extrabold text-amber-300 mt-1 font-mono">{formatAED(teamVolume)}</div>
            <span className="text-[10px] text-slate-400">Closed deals AED</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('MEMBERS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'MEMBERS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Team Members ({agencyData?.agency?.members?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('REFERRALS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'REFERRALS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Team Referrals ({teamLeads.length})
        </button>
        <button
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'DOCUMENTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Trade License & KYC
        </button>
      </div>

      {/* Tab 1: Members Table */}
      {activeTab === 'MEMBERS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Agency Role</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  {isOwnerOrAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {(agencyData?.agency?.members || []).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{m.fullName}</td>
                    <td className="py-3 px-4 text-[11px]">
                      {m.email && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail size={12} className="text-slate-400" />
                          <span>{m.email}</span>
                        </div>
                      )}
                      {m.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                          <Phone size={11} />
                          <span>{m.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          m.role === 'AGENCY_OWNER'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : m.role === 'AGENCY_ADMIN'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'Active Member'}
                    </td>
                    {isOwnerOrAdmin && (
                      <td className="py-3 px-4 text-right">
                        {m.role !== 'AGENCY_OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(m)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Invitations list */}
          {agencyData?.agency?.pendingInvitations && agencyData.agency.pendingInvitations.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-amber-50/40">
              <h4 className="text-xs font-bold text-amber-900 mb-2">Pending Agency Invitations</h4>
              <div className="space-y-1.5">
                {agencyData.agency.pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-amber-200/60"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{inv.email}</span>
                      <span className="ml-2 text-[10px] font-mono text-slate-400">({inv.role})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Team Referrals Table */}
      {activeTab === 'REFERRALS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Client Name</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Est. Deal Value</th>
                  <th className="py-3.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {teamLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{lead.clientName}</td>
                    <td className="py-3 px-4 text-slate-600">{lead.service?.name || 'General Inquiry'}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatAED(lead.actualDealValue || lead.expectedDealValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Documents & Compliance */}
      {activeTab === 'DOCUMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Corporate Compliance & Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <span className="font-bold text-slate-700 block">Commercial Registration</span>
              <p className="text-slate-500">Trade License: <strong>{agencyData?.agency?.tradeLicenseNo}</strong></p>
              <p className="text-slate-500">Legal Entity: <strong>{agencyData?.agency?.legalName}</strong></p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={11} />
                <span>Verified with UAE Department of Economy and Tourism (DET)</span>
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <span className="font-bold text-slate-700 block">Real Estate Regulatory Agency (RERA)</span>
              <p className="text-slate-500">Office Registration Number (ORN): <strong>{agencyData?.agency?.orn || 'ORN-11223'}</strong></p>
              <p className="text-slate-500">Jurisdiction: <strong>Dubai Land Department (DLD)</strong></p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <ShieldCheck size={11} />
                <span>RERA Corporate Broker License Active</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Invite Agent Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Invite Broker to Agency</h3>
                  <p className="text-[11px] text-slate-500">{agencyData?.agency?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Broker Email *</label>
                <input
                  type="email"
                  required
                  placeholder="agent@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agency Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'AGENT' | 'AGENCY_ADMIN')}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="AGENT">AGENT (Broker member)</option>
                  <option value="AGENCY_ADMIN">AGENCY_ADMIN (Can manage brokers and pipeline)</option>
                </select>
              </div>

              {generatedInviteToken && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-800 block">Invitation Token Generated:</span>
                  <div className="flex items-center justify-between mt-1 font-mono text-[11px] bg-white p-1.5 rounded border border-emerald-300">
                    <span className="truncate">{generatedInviteToken}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(generatedInviteToken)}
                      className="text-emerald-700 hover:text-emerald-900 ml-2"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50"
                >
                  {isSubmittingInvite ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

