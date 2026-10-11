'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { LeadItem, ServiceItem, LeadStatus } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { ApiClient } from '../../lib/api';

export default function ReferralsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'WON' | 'LOST'>('ALL');
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

  const openCreate = () => {
    window.dispatchEvent(new CustomEvent('prospera_open_create'));
  };

  const formatAED = (val: number | string | undefined | null) => {
    if (!val) return 'AED 0.00';
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  // Filtered Leads Calculation
  const filteredLeads = leads.filter((lead) => {
    // Status Tab Filter
    if (statusTab === 'ACTIVE') {
      if (lead.status === 'WON' || lead.status === 'LOST' || lead.status === 'CANCELLED') return false;
    } else if (statusTab === 'WON') {
      if (lead.status !== 'WON') return false;
    } else if (statusTab === 'LOST') {
      if (lead.status !== 'LOST') return false;
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
  });

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Referrals Pipeline Management</h1>
          <p className="page-desc">
            Track client onboarding stages, deal qualifications, and assigned Prospera advisory agents.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} id="btn-submit-referral-page">
          <Plus size={18} strokeWidth={2.4} />
          <span>Submit Referral</span>
        </button>
      </div>

      {/* Main Panel */}
      <div className="panel">
        {/* Filter Controls Bar */}
        <div className="panel-header" style={{ gap: '16px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setStatusTab('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                borderColor: statusTab === 'ALL' ? 'var(--blue-primary)' : 'var(--card-border)',
                backgroundColor: statusTab === 'ALL' ? 'var(--blue-subtle)' : '#ffffff',
                color: statusTab === 'ALL' ? 'var(--blue-primary)' : 'var(--text-muted)',
              }}
            >
              All Leads ({leads.length})
            </button>
            <button
              onClick={() => setStatusTab('ACTIVE')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                borderColor: statusTab === 'ACTIVE' ? 'var(--blue-primary)' : 'var(--card-border)',
                backgroundColor: statusTab === 'ACTIVE' ? 'var(--blue-subtle)' : '#ffffff',
                color: statusTab === 'ACTIVE' ? 'var(--blue-primary)' : 'var(--text-muted)',
              }}
            >
              In Progress ({leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length})
            </button>
            <button
              onClick={() => setStatusTab('WON')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                borderColor: statusTab === 'WON' ? '#059669' : 'var(--card-border)',
                backgroundColor: statusTab === 'WON' ? '#ecfdf5' : '#ffffff',
                color: statusTab === 'WON' ? '#059669' : 'var(--text-muted)',
              }}
            >
              Won Deals ({leads.filter((l) => l.status === 'WON').length})
            </button>
            <button
              onClick={() => setStatusTab('LOST')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                borderColor: statusTab === 'LOST' ? '#dc2626' : 'var(--card-border)',
                backgroundColor: statusTab === 'LOST' ? '#fef2f2' : '#ffffff',
                color: statusTab === 'LOST' ? '#dc2626' : 'var(--text-muted)',
              }}
            >
              Lost / Closed ({leads.filter((l) => l.status === 'LOST').length})
            </button>
          </div>

          {/* Search & Service Select */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--card-border)',
                backgroundColor: '#ffffff',
              }}
            >
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.84rem' }}
              />
            </div>

            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--card-border)',
                fontSize: '0.84rem',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">All Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Client / Business Name</th>
                <th>Service Type</th>
                <th>Deal Value (AED)</th>
                <th>Assigned Agent</th>
                <th>Pipeline Status</th>
                <th>Submission Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      No referrals found matching the selected criteria.
                    </p>
                    <button
                      className="btn-primary"
                      onClick={openCreate}
                      style={{ marginTop: '14px' }}
                    >
                      <Plus size={16} />
                      <span>Submit a New Referral</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: 'var(--blue-primary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {lead.referenceNo}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {lead.clientName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {lead.clientPhone}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#334155' }}>
                        {lead.service?.name.split('(')[0] || 'Advisory'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>
                        {formatAED(lead.actualDealValue || lead.expectedDealValue)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {lead.agent?.fullName || 'Senior Desk'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => openDetail(lead)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        Inspect & Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
