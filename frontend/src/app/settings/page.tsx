'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  Shield,
  Copy,
  Check,
  Building,
  Key,
  LogOut,
} from 'lucide-react';
import { UserSummary, BankAccountItem } from '../../types';
import { ApiClient } from '../../lib/api';

export default function SettingsPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [u, b] = await Promise.all([ApiClient.getMe(), ApiClient.getBankAccounts()]);
        setUser(u);
        setBankAccounts(b);
      } catch (err) {
        console.error('Failed to load user settings', err);
      }
    };
    load();
  }, []);

  const referralLink = `https://portal.prospera.ae/r/${user?.referralCode || 'APEX-2026'}`;

  const copyReferralLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Corporate Settings & Banking Details</h1>
          <p className="page-desc">
            Manage your corporate identity, referral tracking code, and verified banking settlement routes.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Organization Profile */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Institutional Entity Profile</h2>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label">Company Legal Name</label>
              <input
                type="text"
                className="form-input"
                defaultValue={user?.companyName || 'Apex Advisory & Capital LLC'}
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Authorized Managing Partner</label>
              <input
                type="text"
                className="form-input"
                defaultValue={user?.fullName || 'Ahmed Al Mansoori'}
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Corporate Email Address</label>
              <input
                type="email"
                className="form-input"
                defaultValue={user?.email || 'ahmed.mansoori@apexadvisory.ae'}
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Telephone Contact</label>
              <input
                type="text"
                className="form-input"
                defaultValue={user?.phone || '+971 50 892 4110'}
                readOnly
              />
            </div>

            {/* Unique Referral Link Card */}
            <div
              style={{
                backgroundColor: 'var(--blue-subtle)',
                border: '1px solid var(--blue-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginTop: '10px',
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--blue-primary)', textTransform: 'uppercase' }}>
                Your Unique Partner Referral Link
              </span>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Share this link with clients. Any inbound leads will be automatically attributed to your account.
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="form-input"
                  style={{ backgroundColor: '#ffffff', fontSize: '0.84rem', fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={copyReferralLink}
                  style={{ whiteSpace: 'nowrap', padding: '10px 14px' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Banking & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Registered Settlement Bank Accounts */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Disbursement Bank Accounts</h2>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {bankAccounts.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--card-border)',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Building2 size={22} className="text-blue-600" />
                    <div>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                        {b.bankName}
                      </h3>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        IBAN: AE•••• •••• •••• •••• {b.ibanLast4} ({b.currency})
                      </p>
                    </div>
                  </div>
                  {b.isPrimary && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#ecfdf5',
                        color: '#059669',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Session Security */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Session Security & Access Controls</h2>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Sessions are cryptographically hashed using SHA-256 tokens with idle timeout protection (120 minutes) and brute-force throttling.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    ApiClient.logout();
                    window.location.href = '/auth/login';
                  }}
                >
                  <LogOut size={16} />
                  <span>Log Out Active Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
