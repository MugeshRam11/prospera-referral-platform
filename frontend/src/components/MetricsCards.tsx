'use client';

import React from 'react';
import { Users, TrendingUp, Wallet, ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
  onWithdrawClick?: () => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, onWithdrawClick }) => {
  const formatAED = (val: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="metrics-grid">
      {/* 1. Active Pipeline Value */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-title">Active Pipeline Value</span>
          <div className="metric-icon-box metric-icon-blue">
            <TrendingUp size={22} />
          </div>
        </div>
        <div className="metric-value-container">
          <span className="metric-value">{formatAED(metrics.activePipelineValue)}</span>
        </div>
        <div className="metric-subtext">
          <span className="trend-badge-positive">
            <ArrowUpRight size={14} />
            +18.4%
          </span>
          <span>vs last quarter pipeline</span>
        </div>
      </div>

      {/* 2. Total Referrals */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-title">Total Referrals</span>
          <div className="metric-icon-box metric-icon-purple">
            <Users size={22} />
          </div>
        </div>
        <div className="metric-value-container">
          <span className="metric-value">{metrics.totalReferrals} Leads</span>
        </div>
        <div className="metric-subtext">
          <span style={{ color: 'var(--text-muted)' }}>
            <strong>{metrics.wonReferralsCount}</strong> won deals closed
          </span>
        </div>
      </div>

      {/* 3. Total Earned Commissions */}
      <div className="metric-card">
        <div className="metric-card-header">
          <span className="metric-title">Total Earned Commissions</span>
          <div className="metric-icon-box metric-icon-emerald">
            <Wallet size={22} />
          </div>
        </div>
        <div className="metric-value-container">
          <span className="metric-value">{formatAED(metrics.totalEarnedCommission)}</span>
        </div>
        <div className="metric-subtext">
          <span className="trend-badge-positive">
            <ArrowUpRight size={14} />
            Accrued
          </span>
          <span>from verified closed deals</span>
        </div>
      </div>

      {/* 4. Withdrawable Balance */}
      <div className="metric-card" style={{ borderColor: 'var(--blue-border)', backgroundColor: '#ffffff' }}>
        <div className="metric-card-header">
          <span className="metric-title" style={{ color: 'var(--blue-primary)' }}>
            Withdrawable Balance
          </span>
          <div className="metric-icon-box metric-icon-amber">
            <ArrowDownToLine size={22} />
          </div>
        </div>
        <div className="metric-value-container">
          <span className="metric-value" style={{ color: 'var(--blue-primary)' }}>
            {formatAED(metrics.withdrawableBalance)}
          </span>
        </div>
        <div className="metric-subtext" style={{ justifyContent: 'space-between', width: '100%' }}>
          <span>Ready for transfer</span>
          {onWithdrawClick && (
            <button
              onClick={onWithdrawClick}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--blue-primary)',
                background: 'var(--blue-subtle)',
                border: '1px solid var(--blue-border)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
              }}
            >
              Withdraw Now →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
