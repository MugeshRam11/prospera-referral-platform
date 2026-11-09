'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Headphones,
  Search,
  Filter,
  UserCheck,
  UserX,
  FileText,
  Users,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Plus,
} from 'lucide-react';
import { AdminCoordinatorItem, PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

export default function AdminCoordinatorsPage() {
  const [coordinators, setCoordinators] = useState<AdminCoordinatorItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCoordinators = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminCoordinators({
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setCoordinators(res.coordinators || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load platform coordinators');
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    loadCoordinators();
  }, [loadCoordinators]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCoordinators();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Platform Coordinators</h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
              {pagination.total} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervise referral queues, lead dispatching, and agent-partner facilitation officers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCoordinators()}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Assign New Coordinator</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search coordinators by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Coordinators Grid / List */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading coordinators...</span>
          </div>
        </div>
      ) : coordinators.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
            <Headphones size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Coordinators Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No platform coordinators match your search criteria. You can promote existing members to the COORDINATOR role in User Management.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coordinators.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {c.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{c.fullName}</h4>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Mail size={11} />
                        <span className="truncate max-w-[170px]">{c.email}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      c.accountStatus === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {c.accountStatus}
                  </span>
                </div>

                {c.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                    <Phone size={12} className="text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                )}

                {/* Performance & Assignment Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-[11px]">
                      <Users size={12} />
                      <span>Agents</span>
                    </div>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {c.assignedAgentsCount}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/80 text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-600 text-[11px]">
                      <FileText size={12} />
                      <span>Leads</span>
                    </div>
                    <span className="text-base font-extrabold text-blue-700 mt-0.5 block">
                      {c.assignedLeadsCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>Joined {new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <Link
                  href={`/admin/users?search=${encodeURIComponent(c.email)}`}
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          ))}
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

