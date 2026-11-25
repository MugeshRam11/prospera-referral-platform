'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-2 h-9 w-36 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" aria-busy="true" aria-label="Loading table">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-5 py-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-7 max-w-7xl mx-auto" role="status" aria-busy="true" aria-label="Loading workspace">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={4} cols={5} />
      <span className="sr-only">Loading your Prospera workspace…</span>
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load this section',
  message = 'Please check your connection and try again.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
          <AlertCircle size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
          <p className="text-sm text-rose-700 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100/60 transition-colors self-start sm:self-center"
        >
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
        <Inbox size={22} />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
