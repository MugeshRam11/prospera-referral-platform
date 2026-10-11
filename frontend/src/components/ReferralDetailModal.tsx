'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { LeadItem, LeadStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { ApiClient } from '../lib/api';

interface ReferralDetailModalProps {
  lead: LeadItem | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updatedLead: LeadItem) => void;
}

export const ReferralDetailModal: React.FC<ReferralDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [transitionNote, setTransitionNote] = useState('');

  if (!isOpen || !lead) return null;

  const formatAED = (val: number | string | undefined | null) => {
    if (!val) return 'AED 0.00';
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setIsUpdatingStatus(true);
    try {
      const updated = await ApiClient.updateReferralStatus(
        lead.id,
        selectedStatus,
        transitionNote || `Status updated to ${selectedStatus}`
      );
      if (onStatusUpdated) {
        onStatusUpdated(updated);
      }
      setSelectedStatus('');
      setTransitionNote('');
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const commissionRate = (lead.customPartnerCommissionBps || lead.service?.defaultPartnerCommissionBps || 250) / 100;
  const dealValue = Number(lead.actualDealValue || lead.expectedDealValue || 0);
  const partnerCommissionAmount = (dealValue * commissionRate) / 100;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--blue-primary)',
                backgroundColor: 'var(--blue-subtle)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {lead.referenceNo}
            </span>
            <StatusBadge status={lead.status} />
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Main Title */}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {lead.clientName}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Service: <strong>{lead.service?.name || 'Corporate Advisory'}</strong>
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Deal Value
              </span>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {formatAED(dealValue)}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Commission Rate
              </span>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--blue-primary)', marginTop: '2px' }}>
                {commissionRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Estimated Accrual
              </span>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                {formatAED(partnerCommissionAmount)}
              </p>
            </div>
          </div>

          {/* Client & Team Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Client Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Client Contact Details
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Phone size={16} className="text-slate-400" />
                <span>{lead.clientPhone}</span>
              </div>
              {lead.clientEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                  <Mail size={16} className="text-slate-400" />
                  <span>{lead.clientEmail}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Calendar size={16} className="text-slate-400" />
                <span>Submitted {new Date(lead.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Assignment Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Assigned Specialists
              </span>
              <div style={{ fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sales Agent: </span>
                <strong>{lead.agent?.fullName || 'Senior Banking Team'}</strong>
              </div>
              <div style={{ fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Coordinator: </span>
                <strong>{lead.coordinator?.fullName || 'Rashid Al Nuaimi'}</strong>
              </div>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
              }}
            >
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Client Context & Notes
              </span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginTop: '4px' }}>
                {lead.notes}
              </p>
            </div>
          )}

          {/* Status Pipeline Advancement */}
          <div
            style={{
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              backgroundColor: '#f8fafc',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Pipeline Stage Progression
            </span>
            <form onSubmit={handleStatusChange} style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                className="form-select"
                style={{ width: 'auto', flex: 1, minWidth: '180px' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
              >
                <option value="">Update Stage...</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL_SENT">PROPOSAL SENT</option>
                <option value="NEGOTIATION">NEGOTIATION</option>
                <option value="WON">WON (Deal Closed)</option>
                <option value="LOST">LOST</option>
              </select>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, minWidth: '180px' }}
                placeholder="Transition note..."
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={!selectedStatus || isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Updating...' : 'Advance Stage'}
              </button>
            </form>
          </div>

          {/* Audit History Timeline */}
          <div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Status History & Audit Trail
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {(lead.statusHistory || []).map((h, i) => (
                <div
                  key={h.id || i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '0.84rem',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--blue-subtle)',
                      color: 'var(--blue-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong>{h.newStatus}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {h.transitionNote && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                        {h.transitionNote}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
