'use client';

import React from 'react';
import Link from 'next/link';
import {
  Layers,
  ShieldCheck,
  ArrowRight,
  Database,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Lock,
  Cpu,
  RefreshCw,
} from 'lucide-react';

export default function AdminIntegrationsPage() {
  const connectors = [
    {
      name: 'HubSpot Enterprise CRM',
      type: 'B2B Sales Pipeline',
      status: 'STAGED',
      description: 'Bi-directional pipeline syncing for commercial off-plan and high-net-worth real estate leads.',
      inbound: 'Property project inventory & unit pricing',
      outbound: 'Prospera verified referral leads & client consent',
    },
    {
      name: 'Salesforce Financial Services Cloud',
      type: 'Banking & Advisory',
      status: 'STAGED',
      description: 'Institutional lead dispatch for DIFC/ADGM corporate advisory and UAE mortgage underwriting.',
      inbound: 'Advisory service categories & banker assignment',
      outbound: 'Accredited referral packages with encryption metadata',
    },
    {
      name: 'Zoho CRM / UAE Real Estate Desk',
      type: 'Brokerage Ops',
      status: 'STAGED',
      description: 'Broker synchronization and deal closing milestones for secondary property acquisitions.',
      inbound: 'Developer off-plan inventory feeds',
      outbound: 'Assigned broker leads with referral reference numbers',
    },
    {
      name: 'Prospera Secure Webhook Gateway',
      type: 'Custom API Endpoint',
      status: 'STAGED',
      description: 'High-security HMAC-SHA256 authenticated webhook stream with exponential backoff and retry queue.',
      inbound: 'Inventory updates (JSON schema)',
      outbound: 'Lead lifecycle events (SUBMITTED, ASSIGNED, WON)',
    },
  ];

  const fieldMappings = [
    { source: 'lead.referenceNo', target: 'prospera_ref_c', type: 'String (Unique)', required: true },
    { source: 'lead.clientName', target: 'Contact.FullName', type: 'String', required: true },
    { source: 'lead.clientPhone', target: 'Contact.Phone', type: 'E.164 String', required: true },
    { source: 'lead.clientEmail', target: 'Contact.Email', type: 'Email', required: false },
    { source: 'lead.expectedDealValue', target: 'Opportunity.Amount', type: 'Decimal(12,2) AED', required: true },
    { source: 'lead.status', target: 'Opportunity.StageName', type: 'Enum Mapping', required: true },
    { source: 'lead.partnerId', target: 'Partner_Source_c', type: 'UUID', required: true },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Enterprise CRM & External Integrations
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Architecture Staged • Dormant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Architectural connector specifications, field mappings, and idempotency retry queues.
          </p>
        </div>

        <Link
          href="/admin"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 p-2 px-3 rounded-xl bg-white border border-slate-200 shadow-2xs w-fit"
        >
          Back to Overview
        </Link>
      </div>

      {/* Boundary Guard Notice */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-5">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              CRM Boundary Guard Enforced
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              External synchronization is intentionally disabled in this deployment phase to maintain complete database isolation and prevent unauthorized data egress. The schema, field mappings, idempotency rules, and retry architecture below are staged for Phase 3 deployment.
            </p>
          </div>
        </div>
      </div>

      {/* Integration Connectors Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs text-slate-400">
          Staged CRM Connectors ({connectors.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((c, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                    <span className="text-[10.5px] text-slate-400 font-medium">{c.type}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {c.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mb-4">{c.description}</p>

                <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider w-16 flex-shrink-0">
                      Inbound:
                    </span>
                    <span className="text-slate-700 text-[11px]">{c.inbound}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider w-16 flex-shrink-0">
                      Outbound:
                    </span>
                    <span className="text-slate-700 text-[11px]">{c.outbound}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Idempotency: Supported</span>
                <span>Retry Policy: 3 attempts with exponential backoff</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Field Mapping Specification */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Lead Synchronization Field Mapping</h3>
          <p className="text-xs text-slate-500">
            Canonical transformation schema mapping Prospera referral entities to external CRM lead records.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Prospera Schema Attribute</th>
                <th className="pb-3">CRM Canonical Target</th>
                <th className="pb-3">Data Type</th>
                <th className="pb-3 pr-2 text-right">Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {fieldMappings.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 pl-2 font-bold text-blue-700">{m.source}</td>
                  <td className="py-3 text-slate-800">{m.target}</td>
                  <td className="py-3 text-slate-500 font-sans">{m.type}</td>
                  <td className="py-3 pr-2 text-right font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.required
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {m.required ? 'MANDATORY' : 'OPTIONAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

