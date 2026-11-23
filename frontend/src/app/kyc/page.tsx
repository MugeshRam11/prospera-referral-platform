'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  Calendar,
  Lock,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { KycDocumentItem } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { ApiClient } from '../../lib/api';

export default function KycPage() {
  const [documents, setDocuments] = useState<KycDocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKyc = async () => {
      try {
        const docs = await ApiClient.getKycDocuments();
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to load KYC documents', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKyc();
  }, []);

  const getDocName = (type: string) => {
    switch (type) {
      case 'TRADE_LICENSE':
        return 'Commercial Trade License (DET Dubai / Free Zone)';
      case 'EMIRATES_ID_FRONT':
        return 'Emirates ID (Front & Back Copy)';
      case 'VAT_CERTIFICATE':
        return 'Federal Tax Authority (FTA) Tax Registration TRN';
      case 'PASSPORT':
        return 'Signatory Passport Copy';
      default:
        return type;
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Corporate Compliance & KYC</h1>
          <p className="page-desc">
            UAE regulatory verification for institutional referral partners under UAE Federal Decree-Law No. (20) of 2018 on Anti-Money Laundering.
          </p>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className="panel"
        style={{
          borderLeft: '5px solid #059669',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Corporate Account Verified
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid #a7f3d0',
                }}
              >
                LEVEL 2 APPROVED
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              All entity documentation and authorized signatory passports are fully cleared for corporate referrals and financial disbursements.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Next Annual Review
          </span>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
            January 14, 2027
          </p>
        </div>
      </div>

      {/* Submitted Documents Checklist */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Verified Compliance Dossier</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Stored securely in private, encrypted cloud storage (AES-256).
            </p>
          </div>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--card-border)',
                backgroundColor: '#ffffff',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <FileText size={24} className="text-blue-600" />
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                    {getDocName(doc.documentType)}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Filename: {doc.originalFilename} • {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {doc.expiryDate && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Expires: <strong>{new Date(doc.expiryDate).toLocaleDateString()}</strong>
                  </div>
                )}
                <StatusBadge status={doc.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zero-Trust Security Guarantee */}
      <div
        className="panel"
        style={{
          padding: '24px',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        <Lock size={20} className="text-slate-500" style={{ marginTop: '2px' }} />
        <div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Data Privacy & Encrypted Document Architecture
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
            Compliance records and personal identification files are never exposed in public directories or plaintext databases. All access strictly requires short-lived pre-signed URLs with TLS 1.3 encryption.
          </p>
        </div>
      </div>
    </>
  );
}
