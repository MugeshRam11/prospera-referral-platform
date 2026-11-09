'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Coins,
  FileText,
  CheckCircle2,
  PieChart,
  RefreshCw,
  AlertCircle,
  Building2,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { ApiClient } from '../../../lib/api';

interface PlatformReportsData {
  totalVolume: number;
  activePipeline: number;
  totalCommissionsEarned: number;
  leadsCount: number;
  wonCount: number;
  conversionRate: string;
  statusBreakdown: Record<string, number>;
  serviceBreakdown: Array<{
    name: string;
    count: number;
    volume: number;
  }>;
}

export default function AdminReportsPage() {
  const [data, setData] = useState<PlatformReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReports = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminPlatformReports();
      setData(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate platform analytics reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const formatAED = (val: number | string | undefined | null) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Institutional Reports & Analytics</h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
              Live Platform Aggregation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline progression, volume conversion funnels, and commission liabilities.
          </p>
        </div>

        <button
          onClick={() => loadReports()}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="min-h-[300px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Calculating metrics and volume funnels...</span>
          </div>
        </div>
      ) : !data ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
          No analytics data available.
        </div>
      ) : (
        <>
          {/* High-Level Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Closed Deal Volume</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
                {formatAED(data.totalVolume)}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <ArrowUpRight size={12} />
                <span>{data.wonCount} won transactions</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Pipeline</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
                {formatAED(data.activePipeline)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Across active qualified leads
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Earned Commissions</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Coins size={16} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
                {formatAED(data.totalCommissionsEarned)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Total agent & partner shares
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Conversion Rate</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <BarChart3 size={16} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
                {data.conversionRate}%
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {data.wonCount} of {data.leadsCount} leads converted
              </span>
            </div>
          </div>

          {/* Funnel & Service Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Stage Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <PieChart size={16} className="text-blue-600" />
                <span>Leads Funnel Distribution</span>
              </h3>

              <div className="space-y-3">
                {Object.entries(data.statusBreakdown || {}).map(([stage, count]) => {
                  const pct = data.leadsCount > 0 ? ((count / data.leadsCount) * 100).toFixed(0) : '0';
                  return (
                    <div key={stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{stage.replace(/_/g, ' ')}</span>
                        <span className="text-slate-500 font-mono">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            stage === 'WON'
                              ? 'bg-emerald-500'
                              : stage === 'IN_PROGRESS'
                              ? 'bg-blue-500'
                              : stage === 'CONTACTED'
                              ? 'bg-purple-500'
                              : stage === 'SUBMITTED'
                              ? 'bg-amber-500'
                              : 'bg-rose-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Services by Volume */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-purple-600" />
                <span>Service Category Performance</span>
              </h3>

              {data.serviceBreakdown && data.serviceBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {data.serviceBreakdown.map((srv, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{srv.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{srv.count} deal(s) initiated</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-slate-900 font-mono">
                          {formatAED(srv.volume)}
                        </div>
                        <span className="text-[10px] text-slate-400">Total volume</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No services breakdown available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

