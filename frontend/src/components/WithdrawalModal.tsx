'use client';

import React, { useState } from 'react';
import { X, ArrowDownToLine, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { BankAccountItem, WithdrawalItem } from '../types';
import { ApiClient } from '../lib/api';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawableBalance: number;
  bankAccounts: BankAccountItem[];
  onWithdrawalRequested: (w: WithdrawalItem) => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  withdrawableBalance,
  bankAccounts,
  onWithdrawalRequested,
}) => {
  const [bankAccountId, setBankAccountId] = useState(
    bankAccounts[0]?.id || ''
  );
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (amountNum <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount.');
      return;
    }

    if (amountNum > withdrawableBalance) {
      setErrorMsg(`Amount exceeds your available withdrawable balance of AED ${withdrawableBalance.toLocaleString()}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await ApiClient.requestWithdrawal(
        bankAccountId || bankAccounts[0]?.id,
        amountNum,
        notes
      );
      onWithdrawalRequested(result);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request withdrawal';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Request Commission Payout</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Direct bank transfer via UAE Central Bank WPS / Online Banking.
            </p>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Withdrawable Balance Info */}
            <div
              style={{
                backgroundColor: 'var(--blue-subtle)',
                border: '1px solid var(--blue-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--blue-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Available Withdrawable Balance
                </span>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--blue-primary)', marginTop: '2px' }}>
                  AED {withdrawableBalance.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAmount(withdrawableBalance.toString())}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--blue-border)',
                  color: 'var(--blue-primary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Use Max
              </button>
            </div>

            {/* Bank Account Selection */}
            <div className="form-group">
              <label className="form-label" htmlFor="withdrawal-bank">
                Select Destination Bank Account *
              </label>
              <select
                id="withdrawal-bank"
                className="form-select"
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                required
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} (IBAN ending in •••• {b.ibanLast4}) — {b.currency}
                  </option>
                ))}
              </select>
            </div>

            {/* Payout Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="withdrawal-amount">
                Withdrawal Amount (AED) *
              </label>
              <input
                id="withdrawal-amount"
                type="number"
                min="100"
                step="50"
                max={withdrawableBalance}
                className="form-input"
                placeholder="4000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="withdrawal-notes">
                Payment Memo or Notes (Optional)
              </label>
              <textarea
                id="withdrawal-notes"
                className="form-textarea"
                placeholder="e.g. Q3 referral settlements"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || withdrawableBalance <= 0}
            >
              <ArrowDownToLine size={16} />
              <span>{isSubmitting ? 'Processing...' : 'Submit Withdrawal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
