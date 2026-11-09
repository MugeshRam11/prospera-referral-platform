'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Headphones,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  User,
  Phone,
  Mail,
  Calendar,
  Building,
  ArrowRight,
  TrendingUp,
  Tag,
  X,
  ShieldAlert,
} from 'lucide-react';
import { LeadItem, LeadStatus, UserSummary } from '../../types';
import { ApiClient } from '../../lib/api';

export default function CoordinatorDashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserSummary | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'IN_PROGRESS' | 'ALL'>('QUEUE');
  const [search, setSearch] = useState('');

  // Status Update Modal
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [newStatus, setNewStatus] = useState<LeadStatus>('CONTACTED');
  const [transitionNote, setTransitionNote] = useState('');
  const [actualDealValue, setActualDealValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [u, l] = await Promise.all([
        ApiClient.getMe(),
        ApiClient.getReferrals(),
      ]);
      setCurrentUser(u);
      setLeads(l || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load coordinator workspace');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle status update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const dealVal = actualDealValue ? parseFloat(actualDealValue) : undefined;
      await ApiClient.updateReferralStatus(
        selectedLead.id,
        newStatus,
        transitionNote.trim() || undefined,
        dealVal
      );
      setSuccessMsg(`Status for ${selectedLead.clientName} updated to ${newStatus}.`);
      setSelectedLead(null);
      setTransitionNote('');
      setActualDealValue('');
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update lead status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAED = (val: number | string | undefined | null) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    if (activeTab === 'QUEUE' && (lead.status === 'WON' || lead.status === 'LOST' || lead.status === 'CANCELLED')) {
      return false;
    }
    const inProgressStatuses: LeadStatus[] = ['ASSIGNED', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION'];
    if (activeTab === 'IN_PROGRESS' && !inProgressStatuses.includes(lead.status)) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      lead.clientName.toLowerCase().includes(q) ||
      (lead.clientPhone && lead.clientPhone.toLowerCase().includes(q)) ||
      (lead.service?.name && lead.service.name.toLowerCase().includes(q))
    );
  });

  // Calculate Metrics
  const queueCount = leads.filter((l) => l.status === 'SUBMITTED' || l.status === 'CONTACTED').length;
  const inProgressCount = leads.filter((l) => ['ASSIGNED', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION'].includes(l.status)).length;
  const wonCount = leads.filter((l) => l.status === 'WON').length;
  const totalVolume = leads
    .filter((l) => l.status === 'WON')
    .reduce((sum, l) => sum + Number(l.actualDealValue || l.expectedDealValue || 0), 0);

  // Role Gate check
  if (!isLoading && currentUser && currentUser.role !== 'COORDINATOR' && currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 text-center shadow-xs">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-base font-bold text-slate-900">Coordinator Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1">
            This workspace is intended for platform transaction coordinators. Your signed-in role is{' '}
            <strong className="text-slate-700">{currentUser.role}</strong>.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white inline-block"
            >
              Return to General Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Coordinator Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center flex-shrink-0">
              <Headphones size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Coordinator Dispatch Desk
                </h1>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 font-bold px-2 py-0.5 rounded border border-indigo-500/40">
                  OPERATIONS
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1">
                Oversee incoming referral queue, dispatch leads to licensed agents, and progress deals to closure.
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
              <span>Refresh Queue</span>
            </button>
            <Link
              href="/admin/referrals"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Platform Pipeline</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Coordinator Metric Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-indigo-800/60">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
              Pending Queue
            </span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">{queueCount}</div>
            <span className="text-[10px] text-slate-400">Awaiting contact</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
              In Progress
            </span>
            <div className="text-2xl font-extrabold text-blue-300 mt-1 font-mono">{inProgressCount}</div>
            <span className="text-[10px] text-slate-400">With broker/advisor</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
              Won Deals
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">{wonCount}</div>
            <span className="text-[10px] text-slate-400">Completed closings</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              Closed Volume
            </span>
            <div className="text-xl font-extrabold text-amber-300 mt-1 font-mono">{formatAED(totalVolume)}</div>
            <span className="text-[10px] text-slate-400">Gross deal volume</span>
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

      {/* Action / Queue Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'QUEUE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Active Queue ({queueCount + inProgressCount})
          </button>
          <button
            onClick={() => setActiveTab('IN_PROGRESS')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Referrals ({leads.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
          />
        </div>
      </div>

      {/* Queue Leads Table */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading referral queue...</span>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <FileText size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Queue is Clear</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No active referrals require coordinator action under this filter.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Client Information</th>
                  <th className="py-3.5 px-4">Requested Service</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Assigned Broker</th>
                  <th className="py-3.5 px-4 text-right">Est. Deal Value</th>
                  <th className="py-3.5 px-4 text-right">Coordinator Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{lead.clientName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-slate-400" />
                        <span>{lead.clientPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Tag size={12} className="text-indigo-500 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {lead.service?.name || 'General Inquiry'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          lead.status === 'WON'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : lead.status === 'SUBMITTED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : lead.status === 'CONTACTED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : lead.status === 'LOST' || lead.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {lead.assignedAgent || lead.agent ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <UserCheck size={13} className="text-emerald-500" />
                          <span>{(lead.assignedAgent || lead.agent)?.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                          Needs Assignment
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatAED(lead.actualDealValue || lead.expectedDealValue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setNewStatus(
                            lead.status === 'SUBMITTED'
                              ? 'CONTACTED'
                              : lead.status === 'CONTACTED'
                              ? 'QUALIFIED'
                              : lead.status === 'QUALIFIED'
                              ? 'PROPOSAL_SENT'
                              : lead.status === 'PROPOSAL_SENT'
                              ? 'NEGOTIATION'
                              : 'WON'
                          );
                          setActualDealValue(
                            String(lead.actualDealValue || lead.expectedDealValue || '')
                          );
                        }}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Headphones size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Progress Deal Status</h3>
                  <p className="text-[11px] text-slate-500">{selectedLead.clientName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                >
                  <option value="CONTACTED">CONTACTED (Client engaged)</option>
                  <option value="QUALIFIED">QUALIFIED (Client verified)</option>
                  <option value="PROPOSAL_SENT">PROPOSAL_SENT (Terms delivered)</option>
                  <option value="NEGOTIATION">NEGOTIATION (Finalizing deal)</option>
                  <option value="WON">WON (Closed transaction)</option>
                  <option value="LOST">LOST (Disqualified or declined)</option>
                </select>
              </div>

              {newStatus === 'WON' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Actual Deal Value (AED) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2500000"
                    value={actualDealValue}
                    onChange={(e) => setActualDealValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Entering final deal value will calculate commission shares for the agent and partner.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Coordinator Activity Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Record client feedback, next follow-up milestone, or broker assignment note..."
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Apply Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

