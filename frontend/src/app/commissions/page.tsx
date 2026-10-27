'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownToLine,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Info,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { CommissionEntry, DashboardMetrics } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { ApiClient } from '../../lib/api';

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [c, m] = await Promise.all([
        ApiClient.getCommissions(),
        ApiClient.getDashboardMetrics(),
      ]);
      setCommissions(c);
      setMetrics(m);
    } catch (err) {
      console.error('Failed to load commission data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCreated = () => loadData();
    window.addEventListener('prospera_withdrawal_created' as any, handleCreated);
    return () => {
      window.removeEventListener('prospera_withdrawal_created' as any, handleCreated);
    };
  }, []);

  const openWithdraw = () => {
    window.dispatchEvent(new CustomEvent('prospera_open_withdraw'));
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
          <h1 className="page-title">Financial Commission Ledger</h1>
          <p className="page-desc">
            Append-only, immutable double-entry ledger. All balances are mathematically calculated from settled transactional accruals.
          </p>
        </div>
        <button className="btn-primary" onClick={openWithdraw} id="btn-request-payout-commissions">
          <ArrowDownToLine size={18} />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Financial Ledger Balance Breakdown */}
      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-title">Total Gross Accrued</span>
            <div className="metric-value-container">
              <span className="metric-value" style={{ color: '#059669' }}>
                {formatAED(metrics.totalEarnedCommission)}
              </span>
            </div>
            <div className="metric-subtext">Sum of all WON lead accruals</div>
          </div>

          <div className="metric-card">
            <span className="metric-title">Completed Payouts</span>
            <div className="metric-value-container">
              <span className="metric-value" style={{ color: 'var(--text-muted)' }}>
                {formatAED(metrics.payoutsProcessed)}
              </span>
            </div>
            <div className="metric-subtext">Settled to your verified bank account</div>
          </div>

          <div className="metric-card">
            <span className="metric-title">Active Reserved Payouts</span>
            <div className="metric-value-container">
              <span className="metric-value" style={{ color: '#d97706' }}>
                {formatAED(metrics.pendingClearanceCommission)}
              </span>
            </div>
            <div className="metric-subtext">Pending / in processing transfer</div>
          </div>

          <div className="metric-card" style={{ borderColor: 'var(--blue-border)', backgroundColor: '#ffffff' }}>
            <span className="metric-title" style={{ color: 'var(--blue-primary)' }}>
              Net Available Withdrawable
            </span>
            <div className="metric-value-container">
              <span className="metric-value" style={{ color: 'var(--blue-primary)' }}>
                {formatAED(metrics.withdrawableBalance)}
              </span>
            </div>
            <div className="metric-subtext">Available for immediate withdrawal</div>
          </div>
        </div>
      )}

      {/* Financial Integrity Note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          padding: '16px 20px',
          backgroundColor: 'var(--blue-subtle)',
          border: '1px solid var(--blue-border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <ShieldCheck size={24} className="text-blue-600" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--blue-primary)' }}>
            Financial Immutability & Double-Entry Principles
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#334155', marginTop: '4px', lineHeight: 1.5 }}>
            Prospera ensures zero double-crediting. Commission rows are uniquely constrained by (lead_id, recipient_user_id, entry_type) and balances are derived mathematically from ledger events—never mutable counter columns.
          </p>
        </div>
      </div>

      {/* Commission Ledger Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Commission Ledger Entries</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Historical accruals and disbursements recorded in AED.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ledger ID</th>
                <th>Lead Reference</th>
                <th>Client / Service</th>
                <th>Deal Value</th>
                <th>Partner Rate</th>
                <th>Commission Accrual</th>
                <th>Entry Type</th>
                <th>Settlement Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {c.id}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--blue-primary)', fontSize: '0.82rem' }}>
                      {c.lead?.referenceNo}
                    </strong>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.lead?.clientName}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {c.lead?.service?.name}
                    </div>
                  </td>
                  <td>
                    <strong>{formatAED(c.dealValue)}</strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--blue-primary)' }}>
                      {(c.commissionBps / 100).toFixed(1)}% ({c.commissionBps} bps)
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                      +{formatAED(c.amount)}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#f1f5f9',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      {c.entryType}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
