'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  FileText,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Lock,
  Upload,
  ExternalLink,
  Download,
  RefreshCw,
  Clock,
  HelpCircle,
  Check,
  Building,
  User,
  ArrowRight,
} from 'lucide-react';
import { KycDocumentItem, KycDocumentType, KycStatus, FullProfile } from '../../types';
import { ApiClient } from '../../lib/api';

interface DocumentSlotConfig {
  type: KycDocumentType;
  title: string;
  category: 'IDENTITY' | 'PROFESSIONAL' | 'CORPORATE';
  description: string;
  requiredFor: 'ALL' | 'AGENCY_ONLY' | 'OPTIONAL';
}

const DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    type: 'EMIRATES_ID_FRONT',
    title: 'Emirates ID (Front Side)',
    category: 'IDENTITY',
    description: 'High-resolution color scan of the front of your UAE Identity Card. Must clearly show photo, name, and ID number.',
    requiredFor: 'ALL',
  },
  {
    type: 'EMIRATES_ID_BACK',
    title: 'Emirates ID (Back Side)',
    category: 'IDENTITY',
    description: 'Color scan of the reverse of your UAE Identity Card showing chip, card number, and expiry date.',
    requiredFor: 'ALL',
  },
  {
    type: 'PASSPORT',
    title: 'International Passport',
    category: 'IDENTITY',
    description: 'Photo and bio-data page of your valid international passport. Required for non-resident partners or supplementary identity.',
    requiredFor: 'ALL',
  },
  {
    type: 'BROKER_CARD_BRN',
    title: 'Broker Registration Card (BRN)',
    category: 'PROFESSIONAL',
    description: 'Official Dubai Land Department (DLD) or RERA Broker Card indicating active real estate registration.',
    requiredFor: 'OPTIONAL',
  },
  {
    type: 'BANK_CONFIRMATION_LETTER',
    title: 'Bank Confirmation Letter',
    category: 'PROFESSIONAL',
    description: 'Official signed and stamped account certificate from your UAE bank displaying your legal name and IBAN.',
    requiredFor: 'ALL',
  },
  {
    type: 'TRADE_LICENSE',
    title: 'Commercial Trade License',
    category: 'CORPORATE',
    description: 'Current Dubai Economy & Tourism (DET) or UAE Freezone commercial license for agency organizations.',
    requiredFor: 'AGENCY_ONLY',
  },
  {
    type: 'VAT_CERTIFICATE',
    title: 'VAT / Tax Registration (TRN)',
    category: 'CORPORATE',
    description: 'Federal Tax Authority (FTA) Tax Registration certificate showing 15-digit TRN for commercial VAT billing.',
    requiredFor: 'AGENCY_ONLY',
  },
  {
    type: 'ESTABLISHMENT_CARD',
    title: 'Immigration Establishment Card',
    category: 'CORPORATE',
    description: 'Valid Establishment Card issued by GDRFA or relevant Freezone Authority.',
    requiredFor: 'AGENCY_ONLY',
  },
];

export default function KycPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [documents, setDocuments] = useState<KycDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Uploading state tracking: maps documentType to boolean
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const [uploadErrorSlots, setUploadErrorSlots] = useState<Record<string, string>>({});
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [prof, docs] = await Promise.all([
        ApiClient.getProfile(),
        ApiClient.getKycDocuments(),
      ]);
      setProfile(prof);
      setDocuments(docs || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load KYC compliance status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (documentType: KycDocumentType, file: File) => {
    // Validate file size: 10MB maximum
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadErrorSlots((prev) => ({
        ...prev,
        [documentType]: 'File exceeds maximum allowed size (10 MB).',
      }));
      return;
    }

    setUploadingSlots((prev) => ({ ...prev, [documentType]: true }));
    setUploadErrorSlots((prev) => ({ ...prev, [documentType]: '' }));
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (profile?.agency?.agencyId) {
        formData.append('agencyId', profile.agency.agencyId);
      }

      await ApiClient.uploadKycDocument(formData);
      await loadData();
      setSuccessMsg(`Document uploaded successfully and queued for compliance verification.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please check file format.';
      setUploadErrorSlots((prev) => ({ ...prev, [documentType]: msg }));
    } finally {
      setUploadingSlots((prev) => ({ ...prev, [documentType]: false }));
    }
  };

  const handleSubmitForReview = async () => {
    setIsSubmittingReview(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await ApiClient.submitKyc();
      await loadData();
      setSuccessMsg(result.message || 'Your KYC compliance file has been submitted for review.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit application.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Helper to find document by type
  const getDoc = (type: KycDocumentType): KycDocumentItem | undefined => {
    return documents.find((d) => d.documentType === type);
  };

  // Status statistics
  const verifiedCount = documents.filter((d) => d.status === 'VERIFIED').length;
  const pendingCount = documents.filter((d) => d.status === 'PENDING_REVIEW').length;
  const changesRequestedCount = documents.filter((d) => d.status === 'CHANGES_REQUESTED').length;
  const rejectedCount = documents.filter((d) => d.status === 'REJECTED').length;

  const hasChangesRequested = changesRequestedCount > 0;
  const hasRejected = rejectedCount > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Institutional Compliance & KYC
          </h1>
          <p className="page-desc text-slate-500 text-sm mt-1">
            UAE regulatory verification under Federal Decree-Law No. (20) of 2018 on Anti-Money Laundering.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto shadow-2xs"
          title="Refresh KYC Status"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 shadow-xs animate-fadeIn">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Actual Backend Account Status Banner */}
      <div
        className={`panel rounded-2xl p-6 border shadow-sm ${
          profile?.accountStatus === 'ACTIVE'
            ? 'bg-emerald-50/50 border-emerald-200'
            : profile?.accountStatus === 'PENDING_APPROVAL'
            ? 'bg-amber-50/50 border-amber-200'
            : hasChangesRequested
            ? 'bg-orange-50/60 border-orange-200'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
                profile?.accountStatus === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : profile?.accountStatus === 'PENDING_APPROVAL'
                  ? 'bg-amber-100 text-amber-700'
                  : hasChangesRequested
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {profile?.accountStatus === 'ACTIVE' ? (
                <ShieldCheck size={32} />
              ) : hasChangesRequested ? (
                <AlertTriangle size={32} />
              ) : (
                <ShieldAlert size={32} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">
                  {profile?.accountStatus === 'ACTIVE'
                    ? 'Account Fully Verified & Active'
                    : profile?.accountStatus === 'PENDING_APPROVAL'
                    ? 'KYC Application Pending Compliance Review'
                    : hasChangesRequested
                    ? 'Action Required — Corrections Requested'
                    : documents.length > 0
                    ? 'KYC Documents Uploaded — Ready for Submission'
                    : 'KYC Documents Required — Not Submitted'}
                </h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    profile?.accountStatus === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : profile?.accountStatus === 'PENDING_APPROVAL'
                      ? 'bg-amber-100 text-amber-800'
                      : hasChangesRequested
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {profile?.accountStatus || 'PENDING_VERIFICATION'}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {profile?.accountStatus === 'ACTIVE'
                  ? 'Your institutional identity has been approved by the Prospera Compliance Desk. You are authorized to submit referrals and receive direct commission settlements.'
                  : profile?.accountStatus === 'PENDING_APPROVAL'
                  ? 'Your documents are currently undergoing verification by our compliance officers. Typical clearance takes 1-2 business days.'
                  : hasChangesRequested
                  ? 'One or more of your submitted documents requires your attention. Review the compliance officer notes below, upload updated copies, and resubmit.'
                  : documents.length > 0
                  ? 'All required documents must be submitted together for review by clicking the button to the right.'
                  : 'To comply with UAE Central Bank and AML regulations, upload your Emirates ID, passport, and bank confirmation letter.'}
              </p>
            </div>
          </div>

          {/* Action Button: Submit for Review */}
          {profile?.accountStatus !== 'ACTIVE' && (
            <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
              <button
                onClick={handleSubmitForReview}
                disabled={isSubmittingReview || documents.length === 0}
                className="btn-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingReview ? (
                  <span>Submitting Application...</span>
                ) : (
                  <>
                    <span>Submit for Compliance Review</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Verification Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/60 text-xs">
          <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase">Documents on File</span>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{documents.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase">Verified Documents</span>
            <p className="text-base font-extrabold text-emerald-600 mt-0.5">{verifiedCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase">Pending Review</span>
            <p className="text-base font-extrabold text-amber-600 mt-0.5">{pendingCount}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase">Action Needed</span>
            <p className="text-base font-extrabold text-orange-600 mt-0.5">
              {changesRequestedCount + rejectedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Urgent Correction Notice Banner if changes requested */}
      {hasChangesRequested && (
        <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-3 shadow-xs">
          <AlertTriangle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-orange-950">
            <p className="font-bold text-sm">Action Required: Correction Requested</p>
            <p className="mt-0.5 text-orange-800 leading-relaxed">
              The compliance desk requested changes on your document submission. Please see the specific feedback note displayed in red/orange on the document card below and upload a corrected file.
            </p>
          </div>
        </div>
      )}

      {/* Document Slots Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Required Verification Documents</h3>
            <p className="text-xs text-slate-500">
              Files are stored securely with SHA-256 integrity checksums and accessible only by authorized compliance auditors.
            </p>
          </div>
          <span className="text-xs text-slate-400">PDF, PNG, or JPG (Max 10 MB each)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOCUMENT_SLOTS.map((slot) => {
            const doc = getDoc(slot.type);
            const isUploading = uploadingSlots[slot.type];
            const slotError = uploadErrorSlots[slot.type];

            return (
              <div
                key={slot.type}
                className={`panel bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                  doc?.status === 'VERIFIED'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : doc?.status === 'CHANGES_REQUESTED'
                    ? 'border-orange-300 bg-orange-50/30'
                    : doc?.status === 'REJECTED'
                    ? 'border-rose-300 bg-rose-50/30'
                    : doc?.status === 'PENDING_REVIEW'
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Slot Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {slot.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {slot.category} • {slot.requiredFor === 'ALL' ? 'Required' : 'Optional / Agency'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {doc ? (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            doc.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : doc.status === 'PENDING_REVIEW'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : doc.status === 'CHANGES_REQUESTED'
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {doc.status === 'VERIFIED' && <Check size={11} />}
                          {doc.status === 'PENDING_REVIEW' && <Clock size={11} />}
                          {doc.status === 'CHANGES_REQUESTED' && <AlertTriangle size={11} />}
                          {doc.status === 'REJECTED' && <AlertCircle size={11} />}
                          <span>{doc.status.replace(/_/g, ' ')}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Not Submitted
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    {slot.description}
                  </p>

                  {/* If document exists, display file summary */}
                  {doc && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-800">
                        <span className="font-semibold truncate max-w-[200px]" title={doc.originalFilename}>
                          {doc.originalFilename}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {(doc.fileSizeBytes / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </p>

                      {/* Prominent Rejection / Correction Reason Box */}
                      {doc.rejectionReason && (
                        <div className="mt-2 p-2 rounded-lg bg-orange-100/70 border border-orange-200 text-orange-900 text-xs">
                          <p className="font-bold flex items-center gap-1">
                            <AlertCircle size={12} className="text-orange-700" />
                            <span>Compliance Feedback:</span>
                          </p>
                          <p className="mt-0.5 text-orange-800">{doc.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Slot Error */}
                  {slotError && (
                    <div className="mb-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                      <AlertCircle size={13} className="flex-shrink-0" />
                      <span>{slotError}</span>
                    </div>
                  )}
                </div>

                {/* Upload or Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {doc ? (
                    <>
                      {/* Secure Download Link */}
                      <a
                        href={ApiClient.getDocumentDownloadUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <Download size={13} />
                        <span>View Document</span>
                      </a>

                      {/* Replace / Resubmit Button */}
                      <label className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors">
                        <Upload size={13} />
                        <span>{isUploading ? 'Uploading...' : 'Replace File'}</span>
                        <input
                          type="file"
                          accept="application/pdf, image/jpeg, image/png"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(slot.type, f);
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    /* Initial Upload Button */
                    <label className="w-full py-2 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                      <Upload size={14} />
                      <span>{isUploading ? 'Uploading Document...' : 'Select File to Upload'}</span>
                      <input
                        type="file"
                        accept="application/pdf, image/jpeg, image/png"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(slot.type, f);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
