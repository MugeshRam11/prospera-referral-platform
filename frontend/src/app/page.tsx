'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  Wallet,
  ArrowDownToLine,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { MetricsCards } from '../components/MetricsCards';
import { StatusBadge } from '../components/StatusBadge';
import { LeadItem, CommissionEntry, DashboardMetrics } from '../types';
import { ApiClient } from '../lib/api';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [m, l, c] = await Promise.all([
        ApiClient.getDashboardMetrics(),
        ApiClient.getReferrals(),
        ApiClient.getCommissions(),
      ]);
      setMetrics(m);
      setLeads(l);
      setCommissions(c);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCreated = () => loadData();
    const handleUpdated = () => loadData();
    window.addEventListener('prospera_referral_created' as any, handleCreated);
    window.addEventListener('prospera_lead_updated' as any, handleUpdated);
    window.addEventListener('prospera_withdrawal_created' as any, handleCreated);

    return () => {
      window.removeEventListener('prospera_referral_created' as any, handleCreated);
      window.removeEventListener('prospera_lead_updated' as any, handleUpdated);
      window.removeEventListener('prospera_withdrawal_created' as any, handleCreated);
    };
  }, []);

  const openDetail = (lead: LeadItem) => {
    window.dispatchEvent(new CustomEvent('prospera_open_detail', { detail: lead }));
  };

  const openWithdraw = () => {
    window.dispatchEvent(new CustomEvent('prospera_open_withdraw'));
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

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive Referral Dashboard</h1>
          <p className="page-desc">
            Welcome back, <strong>Apex Advisory & Capital LLC</strong>. Real-time overview of your UAE corporate referral pipeline and earnings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={openWithdraw}>
            <ArrowDownToLine size={16} />
            <span>Request Payout</span>
          </button>
          <button className="btn-primary" onClick={openCreate} id="btn-submit-referral-hero">
            <Plus size={18} strokeWidth={2.4} />
            <span>Submit Referral</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      {metrics && <MetricsCards metrics={metrics} onWithdrawClick={openWithdraw} />}

      {/* Pipeline Visual Stages Flow */}
      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} className="text-blue-600" />
            <h2 className="panel-title">Active Referral Progression Funnel</h2>
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            8-Stage State Machine Lifecycle
          </span>
        </div>
        <div className="panel-body" style={{ padding: '16px 24px' }}>
          <div className="pipeline-stepper">
            <div className="pipeline-step completed">
              <span>1. Submitted</span>
            </div>
            <span className="pipeline-step-arrow">→</span>
            <div className="pipeline-step completed">
              <span>2. Assigned</span>
            </div>
            <span className="pipeline-step-arrow">→</span>
            <div className="pipeline-step completed">
              <span>3. Contacted</span>
            </div>
            <span className="pipeline-step-arrow">→</span>
            <div className="pipeline-step completed">
              <span>4. Qualified</span>
            </div>
            <span className="pipeline-step-arrow">→</span>
            <div className="pipeline-step active">
              <span>5. Proposal Sent</span>
            </div>
            <span className="pipeline-step-arrow">→</span>
            <div className="pipeline-step">
              <span>6. Negotiation</span>
            </div>
            <span className="pipeline-step-arrow">→</span>
            <div className="pipeline-step" style={{ backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 700 }}>
              <span>7. Deal Won (Accrual)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Recent Referrals Table */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Active Referral Pipeline</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Latest prospective corporate clients referred to Prospera specialists.
              </p>
            </div>
            <Link
              href="/referrals"
              style={{
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--blue-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View All ({leads.length}) <ChevronRight size={16} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client / Entity</th>
                  <th>Service</th>
                  <th>Deal Value</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {lead.clientName}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Ref: {lead.referenceNo}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#334155' }}>
                        {lead.service?.name.split('(')[0] || 'Advisory'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>
                        {formatAED(lead.expectedDealValue)}
                      </strong>
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => openDetail(lead)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--blue-primary)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                        }}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Recent Ledger Accruals & Quick Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Commission Accruals Card */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Commission Accruals</h2>
              <Link
                href="/commissions"
                style={{ fontSize: '0.8rem', color: 'var(--blue-primary)', fontWeight: 600 }}
              >
                Ledger →
              </Link>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {commissions.slice(0, 3).map((comm) => (
                <div
                  key={comm.id}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--card-border)',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-main)' }}>
                        {comm.lead?.clientName || 'Closed Client'}
                      </p>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {(comm.commissionBps / 100).toFixed(1)}% Partner Tier • Ref {comm.lead?.referenceNo}
                      </p>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#059669' }}>
                      +{formatAED(comm.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UAE Advisory Partner Perks Card */}
          <div
            className="panel"
            style={{
              background: 'linear-gradient(135deg, #0a192f 0%, #1e293b 100%)',
              color: '#ffffff',
            }}
          >
            <div className="panel-body">
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#93c5fd',
                  letterSpacing: '0.05em',
                }}
              >
                Institutional Partner Tier
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '6px' }}>
                Dubai Corporate Tier A
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.5 }}>
                Your partner account enjoys priority lead assignment, Dedicated Coordinator desk routing, and direct Central Bank WPS settlement.
              </p>
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Partner Code: <strong>APEX-2026</strong></span>
                <Link
                  href="/settings"
                  style={{
                    fontSize: '0.8rem',
                    color: '#60a5fa',
                    fontWeight: 600,
                  }}
                >
                  Manage Profile →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
