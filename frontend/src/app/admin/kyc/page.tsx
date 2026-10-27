'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  FileText,
  User,
  Building2,
  Check,
} from 'lucide-react';
import { AdminPendingKycItem, PaginationMeta } from '../../../types';
import { ApiClient } from '../../../lib/api';

export default function AdminKycPage() {
  const [documents, setDocuments] = useState<AdminPendingKycItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review Modal State
  const [activeReviewDoc, setActiveReviewDoc] = useState<AdminPendingKycItem | null>(null);
  const [reviewMode, setReviewMode] = useState<'CHANGES_REQUESTED' | 'REJECTED'>('CHANGES_REQUESTED');
  const [reasonText, setReasonText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadPendingQueue = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminPendingKycQueue(page, 15);
      setDocuments(res.documents || []);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to retrieve pending KYC queue.');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadPendingQueue();
  }, [loadPendingQueue]);

  // Approve Document Handler
  const handleApproveDocument = async (doc: AdminPendingKycItem) => {
    if (!confirm(`Approve document '${doc.documentType}' for ${doc.user?.fullName}?`)) return;
    setIsSubmittingReview(true);
    try {
      await ApiClient.reviewKycDocument(doc.id, 'VERIFIED');
      setSuccessMsg(`Document for ${doc.user?.fullName} approved and marked VERIFIED.`);
      await loadPendingQueue();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to approve document.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Open Changes Requested / Reject Modal
  const openDecisionModal = (doc: AdminPendingKycItem, mode: 'CHANGES_REQUESTED' | 'REJECTED') => {
    setActiveReviewDoc(doc);
    setReviewMode(mode);
    setReasonText(
      mode === 'CHANGES_REQUESTED'
        ? 'Please provide a clearer color scan showing all four corners with unblurred text.'
        : 'Document does not meet UAE regulatory compliance criteria or does not match applicant identity.'
    );
  };

  // Submit Rejection / Changes Requested Handler
  const handleSubmitDecision = async () => {
    if (!activeReviewDoc) return;
    if (!reasonText.trim()) {
      alert('A mandatory note or reason is required by UAE AML audit standards.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await ApiClient.reviewKycDocument(activeReviewDoc.id, reviewMode, reasonText.trim());
      setSuccessMsg(
        reviewMode === 'CHANGES_REQUESTED'
          ? `Changes requested for ${activeReviewDoc.user?.fullName}. Applicant notified.`
          : `Document rejected for ${activeReviewDoc.user?.fullName}.`
      );
      setActiveReviewDoc(null);
      setReasonText('');
      await loadPendingQueue();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit review decision.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Queue Summary */}
      <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              KYC & Compliance Review Workspace
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              FIFO Audit Queue
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review applicant documents, verify security features, and record regulatory decisions.
          </p>
        </div>

        <button
          onClick={loadPendingQueue}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Queue ({pagination.total})</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Pending Queue Table */}
      <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Pending Documents Awaiting Verification ({pagination.total})
          </h3>
          <span className="text-xs text-slate-400">
            Strict regulatory audit logging active
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="font-bold text-slate-700 text-sm">Review Queue Empty</p>
            <p className="text-slate-400">
              All submitted partner and agency compliance documents have been reviewed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10.5px]">
                  <th className="py-2.5 px-3">Applicant / Partner</th>
                  <th className="py-2.5 px-3">Document Type</th>
                  <th className="py-2.5 px-3">File Specs</th>
                  <th className="py-2.5 px-3">Submitted</th>
                  <th className="py-2.5 px-3">Audit Document</th>
                  <th className="py-2.5 px-3 text-right">Review Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-bold text-slate-900 block">{doc.user?.fullName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{doc.user?.email}</span>
                        {doc.agency && (
                          <span className="text-[10px] text-blue-600 font-medium block">
                            Agency: {doc.agency.name}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 block">
                        {doc.documentType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        {doc.mimeType}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-slate-700 font-medium block truncate max-w-[160px]" title={doc.originalFilename}>
                        {doc.originalFilename}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {(doc.fileSizeBytes / 1024).toFixed(0)} KB
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(doc.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-3">
                      <a
                        href={ApiClient.getDocumentDownloadUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors"
                      >
                        <Download size={13} />
                        <span>Inspect Original</span>
                      </a>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Approve Button */}
                        <button
                          onClick={() => handleApproveDocument(doc)}
                          disabled={isSubmittingReview}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                          title="Approve Document"
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>

                        {/* Request Changes Button */}
                        <button
                          onClick={() => openDecisionModal(doc, 'CHANGES_REQUESTED')}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 transition-colors"
                          title="Request Corrections"
                        >
                          Fix
                        </button>

                        {/* Reject Button */}
                        <button
                          onClick={() => openDecisionModal(doc, 'REJECTED')}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
                          title="Reject Document"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} documents)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decision Modal (Changes Requested or Reject) */}
      {activeReviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                {reviewMode === 'CHANGES_REQUESTED' ? (
                  <AlertTriangle size={20} className="text-orange-600" />
                ) : (
                  <XCircle size={20} className="text-rose-600" />
                )}
                <h3 className="text-base font-bold text-slate-900">
                  {reviewMode === 'CHANGES_REQUESTED'
                    ? 'Request Document Corrections'
                    : 'Reject KYC Document'}
                </h3>
              </div>
              <button
                onClick={() => setActiveReviewDoc(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Target Applicant: <strong className="text-slate-900">{activeReviewDoc.user?.fullName}</strong> ({activeReviewDoc.documentType})
            </p>

            <div className="form-group mb-4">
              <label className="form-label text-xs font-bold text-slate-700">
                Mandatory Feedback Note (Visible to Applicant) <span className="text-red-500">*</span>
              </label>
              <textarea
                className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                rows={4}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Explain the defect (e.g. illegible copy, missing back side, blurred photo, or expired expiry date)..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveReviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={isSubmittingReview || !reasonText.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 ${
                  reviewMode === 'CHANGES_REQUESTED'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmittingReview ? 'Recording...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
