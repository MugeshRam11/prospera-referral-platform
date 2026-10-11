'use client';

import React, { useState } from 'react';
import { Search, Bell, Plus, Coins, Check } from 'lucide-react';
import { UserSummary } from '../types';

interface HeaderProps {
  user: UserSummary | null;
  onOpenNewReferralModal: () => void;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenNewReferralModal,
  onSearch,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <header className="topbar">
      {/* Global Search Bar */}
      <div className="search-container">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          className="search-input"
          placeholder="Search leads, clients, reference #..."
          value={searchVal}
          onChange={handleSearchChange}
        />
      </div>

      {/* Topbar Right Actions */}
      <div className="topbar-actions">
        {/* Currency Pill */}
        <div className="currency-badge">
          <Coins size={14} />
          <span>AED (Dirhams)</span>
        </div>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
          >
            <Bell size={18} />
            <span className="notification-dot" />
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                width: '320px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--card-shadow-hover)',
                zIndex: 60,
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent Activity</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--blue-primary)', cursor: 'pointer' }}>
                  Mark all read
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--blue-subtle)',
                    fontSize: '0.8rem',
                  }}
                >
                  <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    Referral Won: Al Hamra Maritime
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    +4,625 AED credited to your commission ledger.
                  </p>
                </div>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.8rem',
                  }}
                >
                  <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    KYC Verified
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    Your corporate partner account is active and verified.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA: New Referral */}
        <button
          className="btn-primary"
          id="btn-new-referral-header"
          onClick={onOpenNewReferralModal}
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>New Referral</span>
        </button>
      </div>
    </header>
  );
};
