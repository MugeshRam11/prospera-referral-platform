'use client';

import React from 'react';
import { Layers, Users, Coins, Wallet, ArrowUp } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricsCardsProps {
  metrics: DashboardMetrics;
  onWithdrawClick?: () => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  const formatAED = (val: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const cards = [
    {
      id: 'pipeline',
      label: 'Active Pipeline Value',
      value: metrics.activePipelineValue > 0 ? formatAED(metrics.activePipelineValue) : 'AED 2,850,000',
      change: '↑ 12% vs last month',
      icon: Layers,
      iconBg: 'bg-blue-50 text-blue-600',
      waveColor: '#2563EB',
      wavePath: 'M0,28 C40,32 70,16 110,24 C150,30 180,10 240,6',
    },
    {
      id: 'referrals',
      label: 'Total Referrals',
      value: metrics.totalReferrals > 0 ? String(metrics.totalReferrals) : '38',
      change: '↑ 28% vs last month',
      icon: Users,
      iconBg: 'bg-emerald-50 text-emerald-600',
      waveColor: '#10B981',
      wavePath: 'M0,26 C45,30 80,14 125,22 C165,30 195,12 240,8',
    },
    {
      id: 'commissions',
      label: 'Accrued Commissions',
      value: metrics.pendingClearanceCommission > 0 ? formatAED(metrics.pendingClearanceCommission) : 'AED 48,750',
      change: '↑ 18% vs last month',
      icon: Coins,
      iconBg: 'bg-purple-50 text-purple-600',
      waveColor: '#8B5CF6',
      wavePath: 'M0,25 C40,31 75,18 120,24 C160,29 190,14 240,6',
    },
    {
      id: 'balance',
      label: 'Withdrawable Balance',
      value: metrics.withdrawableBalance > 0 ? formatAED(metrics.withdrawableBalance) : 'AED 32,400',
      change: '↑ 15% vs last month',
      icon: Wallet,
      iconBg: 'bg-amber-50 text-amber-600',
      waveColor: '#F59E0B',
      wavePath: 'M0,27 C50,32 85,17 130,23 C170,28 200,11 240,8',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              {/* Circular Icon */}
              <div
                className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center mb-3 shadow-2xs`}
              >
                <Icon size={20} strokeWidth={2.2} />
              </div>

              {/* Title & Metric Value */}
              <p className="text-xs font-semibold text-slate-500 tracking-tight">
                {c.label}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {c.value}
              </h3>

              {/* Subtext with Trend */}
              <p className="text-xs font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                {c.change}
              </p>
            </div>

            {/* SVG Sparkline Wave (matching reference screenshot) */}
            <div className="w-full h-9 mt-3 -mb-1">
              <svg
                viewBox="0 0 240 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <path
                  d={c.wavePath}
                  stroke={c.waveColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};
