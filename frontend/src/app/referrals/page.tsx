'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Calendar,
  Building2,
  CheckCircle2,
  ArrowUpRight,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeadItem, ServiceItem, LeadStatus } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiClient } from '@/lib/api';
import { formatAED } from '@/lib/utils';

export default function ReferralsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'value-desc' | 'value-asc'>('date-desc');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const [l, s] = await Promise.all([ApiClient.getReferrals(), ApiClient.getServices()]);
      setLeads(l);
      setServices(s);
    } catch (err) {
      console.error('Failed to load referrals', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    const handleCreated = () => fetchLeads();
    const handleUpdated = () => fetchLeads();
    const handleGlobalSearch = (e: CustomEvent<string>) => {
      setSearchQuery(e.detail);
    };

    window.addEventListener('prospera_referral_created' as any, handleCreated);
    window.addEventListener('prospera_lead_updated' as any, handleUpdated);
    window.addEventListener('prospera_search_query' as any, handleGlobalSearch as any);

    return () => {
      window.removeEventListener('prospera_referral_created' as any, handleCreated);
      window.removeEventListener('prospera_lead_updated' as any, handleUpdated);
      window.removeEventListener('prospera_search_query' as any, handleGlobalSearch as any);
    };
  }, []);

  const openDetail = (lead: LeadItem) => {
    window.dispatchEvent(new CustomEvent('prospera_open_detail', { detail: lead }));
  };

  // Filtered & Sorted Leads
  const filteredLeads = leads
    .filter((lead) => {
      // Status Filter
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }
      // Service Filter
      if (selectedService && lead.serviceId !== selectedService) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = lead.clientName.toLowerCase().includes(q);
        const matchRef = lead.referenceNo.toLowerCase().includes(q);
        const matchPhone = lead.clientPhone.toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchPhone) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      const valA = Number(a.actualDealValue || a.expectedDealValue || 0);
      const valB = Number(b.actualDealValue || b.expectedDealValue || 0);
      if (sortBy === 'value-desc') {
        return valB - valA;
      }
      return valA - valB;
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Referrals Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track real-time lead qualifications, assigned Prospera coordinators, and deal progression stages.
          </p>
        </div>
        <Link href="/referrals/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Submit New Referral
          </Button>
        </Link>
      </div>

      {/* Main Filter & Search Control Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Search & Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reference #, client name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex gap-3 w-full sm:w-auto items-center">
            {/* Service Filter */}
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white outline-none focus:border-blue-600"
            >
              <option value="">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white outline-none focus:border-blue-600"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="value-desc">Highest Deal Value</option>
              <option value="value-asc">Lowest Deal Value</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Pills Tabs */}
        <div className="flex gap-2 flex-wrap pt-2 border-t border-slate-100">
          {[
            { label: 'All Leads', value: 'ALL', count: leads.length },
            { label: 'Submitted', value: 'SUBMITTED', count: leads.filter((l) => l.status === 'SUBMITTED').length },
            { label: 'Assigned', value: 'ASSIGNED', count: leads.filter((l) => l.status === 'ASSIGNED').length },
            { label: 'Qualified', value: 'QUALIFIED', count: leads.filter((l) => l.status === 'QUALIFIED').length },
            { label: 'Proposal Sent', value: 'PROPOSAL_SENT', count: leads.filter((l) => l.status === 'PROPOSAL_SENT').length },
            { label: 'Negotiation', value: 'NEGOTIATION', count: leads.filter((l) => l.status === 'NEGOTIATION').length },
            { label: 'Won (Accrued)', value: 'WON', count: leads.filter((l) => l.status === 'WON').length },
            { label: 'Lost / Closed', value: 'LOST', count: leads.filter((l) => l.status === 'LOST').length },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.value ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Referrals Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-5">Reference #</th>
                <th className="py-3.5 px-5">Client Name</th>
                <th className="py-3.5 px-5">Advisory Service</th>
                <th className="py-3.5 px-5">Deal Value (AED)</th>
                <th className="py-3.5 px-5">Assigned Desk</th>
                <th className="py-3.5 px-5">Pipeline Status</th>
                <th className="py-3.5 px-5">Submission Date</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    <p>No referrals found matching the selected filters.</p>
                    <Link href="/referrals/new" className="inline-block mt-3">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Submit a New Referral
                      </Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <span className="font-mono text-xs font-bold text-blue-600">
                        {lead.referenceNo}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900">{lead.clientName}</div>
                      <div className="text-xs text-slate-400">{lead.clientPhone}</div>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-700">
                      {lead.service?.name.split('(')[0] || 'Advisory'}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-900">
                      {formatAED(lead.actualDealValue || lead.expectedDealValue)}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600">
                      <div>Agent: <strong>{lead.agent?.fullName || 'Senior Desk'}</strong></div>
                      <div className="text-slate-400">Coord: {lead.coordinator?.fullName || 'Rashid Al Nuaimi'}</div>
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs font-semibold h-8"
                        onClick={() => openDetail(lead)}
                      >
                        Inspect & Update
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
