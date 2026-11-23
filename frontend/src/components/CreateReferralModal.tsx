'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, Phone, Mail, DollarSign, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { ServiceItem, LeadItem } from '../types';
import { ApiClient } from '../lib/api';

interface CreateReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReferralCreated: (newLead: LeadItem) => void;
  services: ServiceItem[];
}

export const CreateReferralModal: React.FC<CreateReferralModalProps> = ({
  isOpen,
  onClose,
  onReferralCreated,
  services,
}) => {
  const [serviceId, setServiceId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [expectedDealValue, setExpectedDealValue] = useState<string>('150000');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (services.length > 0 && !serviceId) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === serviceId) || services[0];
  const dealValueNum = parseFloat(expectedDealValue) || 0;
  const commissionBps = selectedService?.defaultPartnerCommissionBps || 250;
  const estimatedCommission = (dealValueNum * commissionBps) / 10000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clientName.trim() || clientName.trim().length < 2) {
      setErrorMsg('Client name must be at least 2 characters long.');
      return;
    }
    if (!clientPhone.trim() || clientPhone.trim().length < 7) {
      setErrorMsg('Valid client telephone number is required.');
      return;
    }
    if (dealValueNum <= 0) {
      setErrorMsg('Expected deal value must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await ApiClient.createReferral({
        serviceId: serviceId || (services[0]?.id ?? ''),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        expectedDealValue: dealValueNum,
        currency: 'AED',
        notes: notes.trim() || undefined,
      });

      onReferralCreated(created);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit referral. Please try again.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Submit New Corporate Referral</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Connect a business client to Prospera’s corporate advisory team.
            </p>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Service Selection */}
            <div className="form-group">
              <label className="form-label" htmlFor="referral-service">
                Select Advisory Service *
              </label>
              <select
                id="referral-service"
                className="form-select"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — ({(s.defaultPartnerCommissionBps / 100).toFixed(1)}% Partner Commission)
                  </option>
                ))}
              </select>
            </div>

            {/* Client Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="client-name">
                Company or Client Name *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="client-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Al Wasl Holdings FZCO / John Smith"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Contact Row: Phone & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="client-phone">
                  Client Contact Phone *
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  className="form-input"
                  placeholder="+971 50 123 4567"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="client-email">
                  Client Email (Optional)
                </label>
                <input
                  id="client-email"
                  type="email"
                  className="form-input"
                  placeholder="client@company.ae"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Deal Value */}
            <div className="form-group">
              <label className="form-label" htmlFor="expected-deal-value">
                Estimated Deal / Transaction Value (AED) *
              </label>
              <input
                id="expected-deal-value"
                type="number"
                min="1000"
                step="1000"
                className="form-input"
                placeholder="150000"
                value={expectedDealValue}
                onChange={(e) => setExpectedDealValue(e.target.value)}
                required
              />
            </div>

            {/* Commission Preview Card */}
            <div
              style={{
                backgroundColor: 'var(--blue-subtle)',
                border: '1px solid var(--blue-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--blue-primary)', textTransform: 'uppercase' }}>
                  Estimated Partner Commission
                </p>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Accrues automatically into your ledger once deal reaches WON.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--blue-primary)' }}>
                  {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(estimatedCommission)}
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ({(commissionBps / 100).toFixed(1)}% rate)
                </span>
              </div>
            </div>

            {/* Strategic Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="referral-notes">
                Special Instructions or Context
              </label>
              <textarea
                id="referral-notes"
                className="form-textarea"
                placeholder="Details on client timeline, specific banking jurisdictions, or requirements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="submit-referral-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
