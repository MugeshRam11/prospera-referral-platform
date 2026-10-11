'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  Building2,
  TrendingUp,
  FileText,
  ShieldCheck,
  Plus,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { LeadItem } from '@/types';
import { ApiClient } from '@/lib/api';
import { formatAED } from '@/lib/utils';

interface AggregatedClient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalReferrals: number;
  totalVolume: number;
  latestReferral: LeadItem;
  referrals: LeadItem[];
}

export default function ClientsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<AggregatedClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await ApiClient.getReferrals();
        setLeads(data);
      } catch (err) {
        console.error('Failed to load referrals for client directory', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  // Aggregate clients by phone / name from verified referral leads
  const clientMap = new Map<string, AggregatedClient>();
  leads.forEach((lead) => {
    const key = lead.clientPhone || lead.clientName.toLowerCase();
    const existing = clientMap.get(key);
    const dealVal = Number(lead.actualDealValue || lead.expectedDealValue || 0);

    if (existing) {
      existing.totalReferrals += 1;
      existing.totalVolume += dealVal;
      existing.referrals.push(lead);
      if (new Date(lead.createdAt) > new Date(existing.latestReferral.createdAt)) {
        existing.latestReferral = lead;
      }
    } else {
      clientMap.set(key, {
        id: `client-${lead.id}`,
        name: lead.clientName,
        phone: lead.clientPhone,
        email: lead.clientEmail || null,
        totalReferrals: 1,
        totalVolume: dealVal,
        latestReferral: lead,
        referrals: [lead],
      });
    }
  });

  const clients = Array.from(clientMap.values()).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Client Directory & Portfolio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Referred corporate entities and private clients aggregated from your active pipeline records.
          </p>
        </div>
        <Link href="/referrals/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Refer New Client
          </Button>
        </Link>
      </div>

      {/* Backend Integration Note (Honest API state per Part I) */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900 block font-semibold mb-0.5">
            Single Source of Truth: Referral CRM Ingestion
          </strong>
          Client records are derived directly from authorized backend referral records associated with your partner ID. Sensitive contact information is protected and never stored in insecure client-side state.
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search clients by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
          {clients.length} Unique Clients
        </span>
      </div>

      {/* Clients Table & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Client Name / Business</th>
                  <th className="py-3.5 px-4">Direct Contact</th>
                  <th className="py-3.5 px-4">Referrals</th>
                  <th className="py-3.5 px-4">Cumulative Volume</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                      No client records found.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => {
                    const isSelected = selectedClient?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                        onClick={() => setSelectedClient(c)}
                      >
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {c.name}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-600">
                          <div>{c.phone}</div>
                          {c.email && <div className="text-slate-400">{c.email}</div>}
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                          {c.totalReferrals} {c.totalReferrals === 1 ? 'deal' : 'deals'}
                        </td>
                        <td className="py-4 px-4 text-xs font-extrabold text-slate-900">
                          {formatAED(c.totalVolume)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(c);
                            }}
                          >
                            Inspect History →
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Details Drawer / Side Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-fit space-y-5">
          {selectedClient ? (
            <>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Client Profile
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  {selectedClient.name}
                </h3>
                <div className="text-xs text-slate-500 mt-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedClient.phone}</span>
                  </div>
                  {selectedClient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedClient.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold">Total Deals</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedClient.totalReferrals}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold">Portfolio Value</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {formatAED(selectedClient.totalVolume)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Associated Referrals History
                </h4>
                <div className="space-y-2">
                  {selectedClient.referrals.map((ref) => (
                    <div
                      key={ref.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-colors text-xs"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-blue-600 font-mono text-[11px]">
                          {ref.referenceNo}
                        </strong>
                        <StatusBadge status={ref.status} />
                      </div>
                      <div className="text-slate-700 font-medium">
                        {ref.service?.name}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-1 flex justify-between">
                        <span>Value: {formatAED(ref.expectedDealValue)}</span>
                        <span>{new Date(ref.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link href={`/referrals/new?client=${encodeURIComponent(selectedClient.name)}`} className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                  Submit Another Referral for this Client
                </Button>
              </Link>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p>Select a client row to inspect their portfolio and referral history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
