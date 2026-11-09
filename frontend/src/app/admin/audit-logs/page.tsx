'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Code,
} from 'lucide-react';
import { PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actorUser?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [entityType, setEntityType] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadLogs = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminAuditLogs({
        page,
        limit: 25,
        entityType: entityType !== 'ALL' ? entityType : undefined,
      });
      setLogs(res.logs || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load security audit log trail');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionBadge = (action: string) => {
    if (action.includes('SUSPEND') || action.includes('REJECT') || action.includes('REVOKE')) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
          {action}
        </span>
      );
    }
    if (action.includes('APPROVE') || action.includes('VERIF') || action.includes('REACTIVATE')) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          {action}
        </span>
      );
    }
    if (action.includes('INVITE') || action.includes('CREATE')) {
      return (
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          {action}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security & Governance Audit Trail</h2>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full border border-slate-200">
              {pagination.total} Log Entries
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-resistant audit record of privileged modifications, status updates, and KYC actions.
          </p>
        </div>

        <button
          onClick={() => loadLogs()}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2 overflow-x-auto">
        {['ALL', 'USER', 'KYC_DOCUMENT', 'BANK_ACCOUNT', 'AGENCY', 'REFERRAL'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setEntityType(tab);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              entityType === tab
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL' ? 'All Entities' : tab}
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading security audit records...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <History size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Audit Events Logged</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No privileged administrative events match the selected criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Details / Delta</th>
                  <th className="py-3.5 px-4 text-right">IP Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{log.entityType}</span>
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px] block">
                        {log.entityId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.actorUser ? (
                        <div>
                          <span className="font-semibold text-slate-900 block">{log.actorUser.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {log.actorUser.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">SYSTEM</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.newValues || log.oldValues ? (
                        <pre className="text-[10px] font-mono bg-slate-50 p-1.5 rounded border border-slate-200 max-w-xs overflow-x-auto">
                          {JSON.stringify(log.newValues || log.oldValues, null, 1)}
                        </pre>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 text-xs text-slate-600">
          <span>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (
            {pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || isLoading}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

