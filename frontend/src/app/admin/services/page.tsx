'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
  FolderTree,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { ApiClient } from '../../../lib/api';

interface ServiceRecord {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  defaultPartnerCommissionBps: number;
  defaultAgentCommissionBps: number;
  isActive: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdAt: string;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Service Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: '',
    slug: '',
    description: '',
    partnerCommissionPct: '2.0',
    agentCommissionPct: '1.5',
    isActive: true,
  });

  const loadServices = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiClient.getAdminServicesList();
      setServices(data || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load service catalog');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const partnerBps = Math.round(parseFloat(modalForm.partnerCommissionPct || '0') * 100);
      const agentBps = Math.round(parseFloat(modalForm.agentCommissionPct || '0') * 100);

      await ApiClient.createAdminService({
        name: modalForm.name.trim(),
        slug: modalForm.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: modalForm.description.trim() || undefined,
        defaultPartnerCommissionBps: partnerBps,
        defaultAgentCommissionBps: agentBps,
        isActive: modalForm.isActive,
      });

      setSuccessMsg(`Service "${modalForm.name}" created successfully.`);
      setIsModalOpen(false);
      setModalForm({
        name: '',
        slug: '',
        description: '',
        partnerCommissionPct: '2.0',
        agentCommissionPct: '1.5',
        isActive: true,
      });
      loadServices();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create new service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Service Catalog</h2>
            <span className="text-xs bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
              {services.length} Offerings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure institutional referral products, baseline agent compensation, and commission tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadServices()}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Service</span>
          </button>
        </div>
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

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search service name, slug, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Service Cards Grid */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading services...</span>
          </div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <Layers size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Services Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No service catalog offerings match your search criteria. Click &quot;Add Service&quot; to configure a new offering.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Layers size={20} />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      srv.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {srv.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 mt-3 leading-snug">{srv.name}</h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{srv.slug}</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {srv.description || 'Institutional advisory service for UAE resident and foreign investors.'}
                </p>

                {srv.category && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md mt-3">
                    <FolderTree size={11} className="text-slate-400" />
                    <span>{srv.category.name}</span>
                  </div>
                )}
              </div>

              {/* Commission Rates */}
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider block">
                    Partner Split
                  </span>
                  <span className="text-sm font-extrabold text-blue-900 mt-0.5 block">
                    {(srv.defaultPartnerCommissionBps / 100).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-slate-400">{srv.defaultPartnerCommissionBps} bps</span>
                </div>
                <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider block">
                    Agent Split
                  </span>
                  <span className="text-sm font-extrabold text-emerald-900 mt-0.5 block">
                    {(srv.defaultAgentCommissionBps / 100).toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-slate-400">{srv.defaultAgentCommissionBps} bps</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Service to Catalog</h3>
                  <p className="text-xs text-slate-500">Configure new institutional offering.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dubai Commercial Real Estate"
                  value={modalForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setModalForm({ ...modalForm, name, slug: autoSlug });
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Slug Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dubai-commercial-real-estate"
                  value={modalForm.slug}
                  onChange={(e) => setModalForm({ ...modalForm, slug: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the service and client eligibility..."
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Partner Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="100"
                    required
                    value={modalForm.partnerCommissionPct}
                    onChange={(e) => setModalForm({ ...modalForm, partnerCommissionPct: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    = {Math.round(parseFloat(modalForm.partnerCommissionPct || '0') * 100)} bps
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Agent Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="100"
                    required
                    value={modalForm.agentCommissionPct}
                    onChange={(e) => setModalForm({ ...modalForm, agentCommissionPct: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    = {Math.round(parseFloat(modalForm.agentCommissionPct || '0') * 100)} bps
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

