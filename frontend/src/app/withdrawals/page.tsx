'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Plus,
  Coins,
} from 'lucide-react';
import { WithdrawalItem, BankAccountItem, DashboardMetrics } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { ApiClient } from '../../lib/api';

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [w, b, m] = await Promise.all([
        ApiClient.getWithdrawals(),
        ApiClient.getBankAccounts(),
        ApiClient.getDashboardMetrics(),
      ]);
      setWithdrawals(w);
      setBankAccounts(b);
      setMetrics(m);
    } catch (err) {
      console.error('Failed to load withdrawals', err);
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
          <h1 className="page-title">Withdrawals & Payout Settlements</h1>
          <p className="page-desc">
            Direct banking disbursement of cleared referral earnings via UAE Central Bank online wire and WPS channels.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={openWithdraw}
          disabled={!metrics || metrics.withdrawableBalance <= 0}
        >
          <ArrowDownToLine size={18} />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Top Cards: Balance & Primary Bank */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Available Balance Box */}
        <div
          className="panel"
          style={{
            backgroundColor: 'var(--blue-subtle)',
            borderColor: 'var(--blue-border)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--blue-primary)', textTransform: 'uppercase' }}>
              Available Withdrawable Balance
            </span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--blue-primary)', marginTop: '4px' }}>
              {formatAED(metrics?.withdrawableBalance ?? 0)}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Cleared funds available for immediate payout initiation. Minimum payout AED 100.
            </p>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button
              className="btn-primary"
              onClick={openWithdraw}
              disabled={!metrics || metrics.withdrawableBalance <= 0}
            >
              <ArrowDownToLine size={16} />
              <span>Withdraw Full Amount</span>
            </button>
          </div>
        </div>

        {/* Primary Bank Card */}
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Verified Settlement Bank Account
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
              }}
            >
              Primary Account
            </span>
          </div>

          {bankAccounts.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={24} className="text-blue-600" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    {bankAccounts[0].bankName}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    Beneficiary: {bankAccounts[0].accountHolderName}
                  </p>
                </div>
              </div>
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--card-border)',
                  fontFamily: 'monospace',
                  fontSize: '0.86rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>IBAN: AE•••• •••• •••• •••• {bankAccounts[0].ibanLast4}</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>Active Verified</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Payouts Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Payout Requests & Settlement Records</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Audit log of all withdrawal transactions requested from your partner account.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Destination Bank</th>
                <th>Disbursed Amount</th>
                <th>Status</th>
                <th>Requested Date</th>
                <th>Settled Date</th>
                <th>Transfer Memo</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--blue-primary)', fontFamily: 'monospace' }}>
                      {w.referenceNo}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.bankAccount?.bankName}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      IBAN ending in {w.bankAccount?.ibanLast4}
                    </div>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.95rem' }}>{formatAED(w.amount)}</strong>
                  </td>
                  <td>
                    <StatusBadge status={w.status} />
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {w.paidAt ? new Date(w.paidAt).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {w.userNotes || 'Standard Settlement'}
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
