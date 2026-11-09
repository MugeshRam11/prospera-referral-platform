'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Home,
  CreditCard,
  Award,
  Briefcase,
  Landmark,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  DollarSign,
  Clock,
  RotateCcw,
  Save,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ApiClient } from '@/lib/api';
import { formatAED } from '@/lib/utils';
import { LeadItem, ServiceItem } from '@/types';

// Helper to determine presentation metadata based on active service slug
function getServicePresentation(service: ServiceItem) {
  const slug = service.slug.toLowerCase();
  if (slug.includes('real-estate') || slug.includes('property')) {
    return {
      categoryKey: 'property',
      icon: Home,
      badge: 'Prime Real Estate',
      categoryLabel: 'Real Estate',
      defaultDealValue: 1500000,
    };
  }
  if (slug.includes('mortgage')) {
    return {
      categoryKey: 'mortgage',
      icon: CreditCard,
      badge: 'Home Financing',
      categoryLabel: 'Financing',
      defaultDealValue: 1200000,
    };
  }
  if (slug.includes('visa') || slug.includes('golden')) {
    return {
      categoryKey: 'golden-visa',
      icon: Award,
      badge: 'Residency Advisory',
      categoryLabel: 'Immigration',
      defaultDealValue: 100000,
    };
  }
  if (slug.includes('advisory') || slug.includes('spv') || slug.includes('corporate')) {
    return {
      categoryKey: 'corporate-advisory',
      icon: Briefcase,
      badge: 'Corporate Structuring',
      categoryLabel: 'Corporate',
      defaultDealValue: 350000,
    };
  }
  if (slug.includes('bank') || slug.includes('account')) {
    return {
      categoryKey: 'bank-account',
      icon: Landmark,
      badge: 'Commercial Banking',
      categoryLabel: 'Banking',
      defaultDealValue: 150000,
    };
  }
  return {
    categoryKey: 'company-formation',
    icon: Building2,
    badge: 'Entity Setup',
    categoryLabel: 'Licensing',
    defaultDealValue: 120000,
  };
}

const INITIAL_FORM_STATE = {
  // Step 1: Selected Service ID (Populated from live database services)
  selectedServiceId: '',
  // Step 2: Client Contact & Consent
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  preferredContact: 'phone',
  countryResidence: 'United Arab Emirates',
  clientConsent: false,
  // Step 3: Scoped Specifications
  propertyType: 'Luxury Waterfront Villa',
  propertyLocation: 'Palm Jumeirah',
  mortgageType: 'UAE Resident Ready Property Mortgage',
  goldenVisaCategory: 'Real Estate Investor (AED 2M+ Equity)',
  advisoryScope: 'DIFC / ADGM SPV Asset Protection Foundation',
  bankingPreference: 'Emirates NBD',
  formationJurisdiction: 'Dubai Mainland (DET 100% Foreign Owned)',
  // Step 4: Opportunity Scope & Commercial Value
  dealValue: '1500000',
  closingTimeline: 'Within 30 Days',
  notes: '',
};

export default function NewReferralWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedMsg, setDraftSavedMsg] = useState<string | null>(null);
  const [submittedLead, setSubmittedLead] = useState<LeadItem | null>(null);

  // Live Backend Data
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [existingReferrals, setExistingReferrals] = useState<LeadItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(true);

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Load real services and existing referrals directly from approved backend APIs
  useEffect(() => {
    setIsLoadingServices(true);
    Promise.all([ApiClient.getServices(), ApiClient.getReferrals(), ApiClient.getMe()])
      .then(([sList, rList, u]) => {
        setCurrentUser(u);
        if (sList && sList.length > 0) {
          setServices(sList);
          setFormData((prev) => ({
            ...prev,
            selectedServiceId: prev.selectedServiceId || sList[0].id,
            dealValue: prev.dealValue || String(getServicePresentation(sList[0]).defaultDealValue),
          }));
        }
        if (rList && rList.length > 0) {
          setExistingReferrals(rList);
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to load service catalog');
      })
      .finally(() => {
        setIsLoadingServices(false);
      });
  }, []);

  const selectedService = React.useMemo(() => {
    if (services.length === 0) return null;
    return services.find((s) => s.id === formData.selectedServiceId) || services[0];
  }, [services, formData.selectedServiceId]);

  const servicePresentation = React.useMemo(() => {
    if (!selectedService) return null;
    return getServicePresentation(selectedService);
  }, [selectedService]);

  const dealValueNum = parseFloat(formData.dealValue) || 0;
  // Derive commission rate strictly from approved backend basis points (100 bps = 1.00%)
  const partnerRatePercent = (selectedService?.defaultPartnerCommissionBps ?? 150) / 100;
  const estimatedCommission = (dealValueNum * partnerRatePercent) / 100;

  // Duplicate pre-check based on active leads in user pipeline
  const potentialDuplicate = React.useMemo(() => {
    if (!formData.clientPhone.trim() && !formData.clientName.trim()) return null;
    return existingReferrals.find(
      (r) =>
        (formData.clientPhone.trim() && r.clientPhone === formData.clientPhone.trim()) ||
        (formData.clientName.trim() && r.clientName.toLowerCase() === formData.clientName.trim().toLowerCase())
    );
  }, [existingReferrals, formData.clientPhone, formData.clientName]);

  // Validation per step
  const validateStep = (step: number): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.selectedServiceId) {
        setErrorMsg('Please select an active service offering to continue.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!formData.clientName.trim() || formData.clientName.trim().length < 2) {
        setErrorMsg('Please enter a valid client or company name (min 2 characters).');
        return false;
      }
      if (!formData.clientPhone.trim() || formData.clientPhone.trim().length < 7) {
        setErrorMsg('Please enter a valid telephone contact number (min 7 digits).');
        return false;
      }
      if (formData.clientEmail.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.clientEmail.trim())) {
          setErrorMsg('Please enter a valid email address or leave it blank.');
          return false;
        }
      }
      if (!formData.clientConsent) {
        setErrorMsg('Client consent is mandatory under UAE Personal Data Protection Law (PDPL). Please confirm express consent.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      return true;
    }
    if (step === 4) {
      if (dealValueNum <= 0) {
        setErrorMsg('Estimated deal value must be greater than zero.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrorMsg(null);
      setDraftSavedMsg(null);
      setCurrentStep((prev) => Math.min(6, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setDraftSavedMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compile structured notes including scoped specifications and legal PDPL consent metadata
  const buildContextNote = () => {
    const consentTimestamp = new Date().toISOString();
    let note = `[Service: ${selectedService?.name || 'Advisory'}]\n`;

    const catKey = servicePresentation?.categoryKey;
    if (catKey === 'property') {
      note += `Property Type: ${formData.propertyType}\nLocation: ${formData.propertyLocation}\n`;
    } else if (catKey === 'mortgage') {
      note += `Financing Type: ${formData.mortgageType}\n`;
    } else if (catKey === 'golden-visa') {
      note += `Residency Category: ${formData.goldenVisaCategory}\n`;
    } else if (catKey === 'corporate-advisory') {
      note += `Advisory Scope: ${formData.advisoryScope}\n`;
    } else if (catKey === 'bank-account') {
      note += `Preferred Bank: ${formData.bankingPreference}\n`;
    } else if (catKey === 'company-formation') {
      note += `Jurisdiction: ${formData.formationJurisdiction}\n`;
    }

    note += `Preferred Contact: ${formData.preferredContact}\nCountry of Residence: ${formData.countryResidence}\nTimeline: ${formData.closingTimeline}\n`;
    note += `[UAE PDPL Consent: Confirmed by Partner on ${consentTimestamp} | Legal Basis: UAE Federal Decree-Law No. 45/2021]\n`;

    if (formData.notes.trim()) {
      note += `Partner Notes: ${formData.notes.trim()}`;
    }
    return note;
  };

  // Save authenticated server-side draft (PostgreSQL Lead with status DRAFT)
  const handleSaveServerDraft = async () => {
    if (!formData.clientName.trim() || !formData.clientPhone.trim()) {
      setErrorMsg('Please provide at least client name and phone number to save a server draft.');
      return;
    }
    if (!selectedService) return;

    setIsSavingDraft(true);
    setErrorMsg(null);
    try {
      const draft = await ApiClient.createReferral({
        serviceId: selectedService.id,
        clientName: formData.clientName.trim(),
        clientPhone: formData.clientPhone.trim(),
        clientEmail: formData.clientEmail.trim() || undefined,
        expectedDealValue: dealValueNum || 10000,
        currency: 'AED',
        notes: buildContextNote(),
        asDraft: true,
      });

      setDraftSavedMsg(`Draft reference ${draft.referenceNo} securely saved to your account. You can complete and submit it anytime from your referrals desk.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save server draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Final submission of referral
  const handleSubmit = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await ApiClient.createReferral({
        serviceId: selectedService.id,
        clientName: formData.clientName.trim(),
        clientPhone: formData.clientPhone.trim(),
        clientEmail: formData.clientEmail.trim() || undefined,
        expectedDealValue: dealValueNum,
        currency: 'AED',
        notes: buildContextNote(),
        asDraft: false,
      });

      setSubmittedLead(created);
      setCurrentStep(6);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit referral. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsLabel = [
    'Service Selection',
    'Client Details & Consent',
    'Service Specifications',
    'Opportunity & Timeline',
    'Review & Duplicate Check',
    'Submitted & Tracking',
  ];

  return (
    <div className="max-w-4xl mx-auto py-4 pb-16">
      {/* Top Header */}
      <div className="mb-6">
        <Link
          href="/referrals"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Referrals Pipeline
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Guided Referral Submission Wizard
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Follow the six verified stages to submit a high-value opportunity to Prospera desks.
            </p>
          </div>

          {currentStep >= 2 && currentStep <= 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveServerDraft}
              disabled={isSavingDraft}
              className="text-xs font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
            >
              <Save size={13} className="text-blue-600" />
              <span>{isSavingDraft ? 'Saving Draft...' : 'Save Server Draft'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Agent Role Guidance */}
      {currentUser?.role === 'AGENT' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
            <span>Broker Guidance: Referral Intake Protocol</span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            As a licensed Sales Agent, client referrals are routed to you by Lead Coordinators. New referral intake is submitted by registered Referral Partners. You can review and progress your active assigned deals directly in your personal pipeline.
          </p>
          <div className="pt-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-[11px] shadow-xs"
            >
              <span>Open Broker Workspace</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* Progress Indicator (Steps 1 to 5) */}
      {currentStep <= 5 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-8 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Stage {currentStep} of 6: {stepsLabel[currentStep - 1]}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {Math.round((currentStep / 6) * 100)}% Completed
            </span>
          </div>
          <Progress value={(currentStep / 6) * 100} className="h-2" />

          {/* Step Pills */}
          <div className="grid grid-cols-5 gap-1.5 mt-3 text-center">
            {stepsLabel.slice(0, 5).map((label, idx) => (
              <div
                key={idx}
                className={`text-[11px] font-medium truncate ${
                  currentStep === idx + 1
                    ? 'text-blue-600 font-bold border-b-2 border-blue-600 pb-1'
                    : currentStep > idx + 1
                    ? 'text-emerald-600 font-semibold'
                    : 'text-slate-400'
                }`}
                title={label}
              >
                {idx + 1}. {label.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {draftSavedMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{draftSavedMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STAGE 1: Service Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Select Advisory Service Offering
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Choose from active approved catalog services. Commission percentages are derived strictly from platform rules.
            </p>

            {isLoadingServices ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading approved service catalog...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((srv) => {
                  const pres = getServicePresentation(srv);
                  const Icon = pres.icon;
                  const isSelected = formData.selectedServiceId === srv.id;
                  const partnerRate = (srv.defaultPartnerCommissionBps / 100).toFixed(2);

                  return (
                    <div
                      key={srv.id}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          selectedServiceId: srv.id,
                          dealValue: prev.dealValue || String(pres.defaultDealValue),
                        }))
                      }
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Icon size={20} />
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            {partnerRate}% Standard BPS
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900">{srv.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {srv.description || 'Institutional facilitation across UAE jurisdictions.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{pres.categoryLabel}</span>
                        <span className="font-semibold text-blue-600">
                          {isSelected ? '✓ Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleNext}
              disabled={isLoadingServices || !selectedService}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs"
            >
              <span>Continue to Client Details</span>
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 2: Client Details & Consent */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Client Contact & UAE Consent</h2>
              <p className="text-xs text-slate-500">
                Supply the legal name, telephone credentials, and verified client consent.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Client / Company Name *</label>
                <Input
                  placeholder="e.g. Tariq Al Nuaimi or Apex Ventures LLC"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Contact Telephone *</label>
                <Input
                  placeholder="e.g. +971 50 123 4567"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
                <Input
                  type="email"
                  placeholder="e.g. client@example.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className="rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Country of Residence</label>
                <Input
                  placeholder="e.g. United Arab Emirates"
                  value={formData.countryResidence}
                  onChange={(e) => setFormData({ ...formData, countryResidence: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* UAE PDPL Consent Checkbox */}
            <div className="mt-4 p-4 rounded-xl bg-blue-50/60 border border-blue-200/70">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.clientConsent}
                  onChange={(e) => setFormData({ ...formData, clientConsent: e.target.checked })}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block font-semibold">
                    Client Express Consent Confirmed (UAE PDPL Compliant)
                  </strong>
                  I confirm that the client has explicitly authorized Prospera and licensed partner desks to contact them regarding this advisory referral pursuant to UAE Federal Decree-Law No. 45/2021 on Personal Data Protection.
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={handleBack} className="rounded-xl">
              <ArrowLeft size={14} className="mr-1.5" /> Back
            </Button>
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              Continue to Specifications <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 3: Service-Specific Specifications */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                {selectedService?.name} Specifications
              </h2>
              <p className="text-xs text-slate-500">
                Tailor transaction parameters specific to {servicePresentation?.categoryLabel.toLowerCase()} processing.
              </p>
            </div>

            {servicePresentation?.categoryKey === 'property' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Property Type</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  >
                    <option>Luxury Waterfront Villa</option>
                    <option>Branded Penthouse</option>
                    <option>Commercial Freehold Office</option>
                    <option>Full Residential Building</option>
                    <option>Off-Plan Developer Townhouse</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Location</label>
                  <Input
                    placeholder="e.g. Palm Jumeirah, Downtown Dubai, Dubai Hills"
                    value={formData.propertyLocation}
                    onChange={(e) => setFormData({ ...formData, propertyLocation: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {servicePresentation?.categoryKey === 'mortgage' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Financing Structure</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  value={formData.mortgageType}
                  onChange={(e) => setFormData({ ...formData, mortgageType: e.target.value })}
                >
                  <option>UAE Resident Ready Property Mortgage</option>
                  <option>Non-Resident Foreign National Mortgage</option>
                  <option>Refinancing / Equity Release</option>
                  <option>Commercial Mortgage (Warehouse / Freehold Building)</option>
                </select>
              </div>
            )}

            {servicePresentation?.categoryKey === 'golden-visa' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Residency Category</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  value={formData.goldenVisaCategory}
                  onChange={(e) => setFormData({ ...formData, goldenVisaCategory: e.target.value })}
                >
                  <option>Real Estate Investor (AED 2M+ Equity)</option>
                  <option>Entrepreneur / Startup Founder</option>
                  <option>Senior Executive / High Skilled Talent</option>
                </select>
              </div>
            )}

            {servicePresentation?.categoryKey === 'corporate-advisory' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Advisory Scope</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  value={formData.advisoryScope}
                  onChange={(e) => setFormData({ ...formData, advisoryScope: e.target.value })}
                >
                  <option>DIFC / ADGM SPV Asset Protection Foundation</option>
                  <option>Cross-Border Tax & Corporate Restructuring</option>
                  <option>M&A Due Diligence & Deal Sourcing</option>
                </select>
              </div>
            )}

            {servicePresentation?.categoryKey === 'bank-account' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Preferred UAE Financial Institution</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  value={formData.bankingPreference}
                  onChange={(e) => setFormData({ ...formData, bankingPreference: e.target.value })}
                >
                  <option>Emirates NBD</option>
                  <option>First Abu Dhabi Bank (FAB)</option>
                  <option>Mashreq Neo Biz</option>
                  <option>Wio Business</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Note: Corporate account opening is subject to bank compliance review and client KYC verification.
                </p>
              </div>
            )}

            {servicePresentation?.categoryKey === 'company-formation' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Jurisdiction</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  value={formData.formationJurisdiction}
                  onChange={(e) => setFormData({ ...formData, formationJurisdiction: e.target.value })}
                >
                  <option>Dubai Mainland (DET 100% Foreign Owned)</option>
                  <option>DMCC (Dubai Multi Commodities Centre)</option>
                  <option>IFZA (International Free Zone Authority)</option>
                  <option>DAFZA (Dubai Airport Freezone)</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={handleBack} className="rounded-xl">
              <ArrowLeft size={14} className="mr-1.5" /> Back
            </Button>
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              Continue to Opportunity Scope <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 4: Opportunity Scope & Commercial Value */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Opportunity Scope & Value</h2>
              <p className="text-xs text-slate-500">
                Provide estimated transaction value and expected closing timeline.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Estimated Deal Value (AED) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 1500000"
                  value={formData.dealValue}
                  onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                  className="rounded-xl font-mono text-sm font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Expected Timeline</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  value={formData.closingTimeline}
                  onChange={(e) => setFormData({ ...formData, closingTimeline: e.target.value })}
                >
                  <option>Immediate / Within 7 Days</option>
                  <option>Within 30 Days</option>
                  <option>Within 60 Days</option>
                  <option>Exploring / Long Term</option>
                </select>
              </div>
            </div>

            {/* Derived Indicative Commission Calculation */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                  Indicative Partner Commission
                </span>
                <div className="text-xl font-extrabold text-emerald-700">
                  {formatAED(estimatedCommission)}
                </div>
                <p className="text-[10px] text-emerald-800/80 mt-0.5">
                  Based on approved {partnerRatePercent.toFixed(2)}% BPS catalog rate. Final settlement governed by verified deal closure.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-white px-3 py-1 rounded-full border border-emerald-200 flex-shrink-0">
                {partnerRatePercent.toFixed(2)}% Rate
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Additional Opportunity Notes</label>
              <Textarea
                placeholder="Client specific budget, preferred contact window, or special requirements..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="rounded-xl text-xs"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={handleBack} className="rounded-xl">
              <ArrowLeft size={14} className="mr-1.5" /> Back
            </Button>
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              Proceed to Review & Pre-Checks <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 5: Review & Duplicate Prevention */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Stage 5: Review & Duplicate Pre-Checks
              </h2>
              <p className="text-xs text-slate-500">
                Verify details before finalizing referral entry into the Prospera compliance ledger.
              </p>
            </div>

            {/* Duplicate Notice */}
            {potentialDuplicate ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Existing Lead Found in Pipeline:</strong>
                  <p className="mt-0.5">
                    Client contact details match active lead <strong className="font-mono">{potentialDuplicate.referenceNo}</strong> ({potentialDuplicate.clientName}). Duplicate leads will be triaged by the compliance coordinator desk.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Duplicate pre-check clear: No conflicting active leads registered for this telephone number.</span>
              </div>
            )}

            {/* Summary Review Card */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs space-y-3">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Service Offering:</span>
                <strong className="text-slate-900">{selectedService?.name}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Client / Company Name:</span>
                <strong className="text-slate-900">{formData.clientName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Client Telephone:</span>
                <strong className="text-slate-900 font-mono">{formData.clientPhone}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Estimated Deal Value:</span>
                <strong className="text-slate-900">{formatAED(dealValueNum)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Indicative Commission:</span>
                <strong className="text-emerald-600">{formatAED(estimatedCommission)} ({partnerRatePercent.toFixed(2)}%)</strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Client Consent:</span>
                <strong className="text-emerald-700">✓ Express Consent Verified (PDPL Compliant)</strong>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={handleBack} className="rounded-xl">
              <ArrowLeft size={14} className="mr-1.5" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6"
            >
              {isSubmitting ? 'Creating Lead...' : 'Submit to Compliance Desk'}
            </Button>
          </div>
        </div>
      )}

      {/* STAGE 6: Submission Success & Reference Tracking */}
      {currentStep === 6 && submittedLead && (
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Referral Created & Logged
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-3 font-mono">
              {submittedLead.referenceNo}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Client <strong>{submittedLead.clientName}</strong> has been registered with status <strong>{submittedLead.status}</strong>.
            </p>
          </div>

          {/* Timeline of Next Steps */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left text-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
              Lifecycle Progress
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-emerald-700 font-semibold">
                <CheckCircle2 size={15} />
                <span>1. Referral Created & Reference Assigned ({submittedLead.referenceNo})</span>
              </div>
              <div className="flex items-center gap-2.5 text-blue-700 font-semibold">
                <Clock size={15} />
                <span>2. Operations Coordinator Review (Within 4 Business Hours)</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <User size={15} />
                <span>3. Licensed Broker Allocation</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <DollarSign size={15} />
                <span>4. Client Deal Closing & Commission Settlement</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setFormData(INITIAL_FORM_STATE);
                setCurrentStep(1);
              }}
              className="rounded-xl"
            >
              Submit Another Lead
            </Button>
            <Button
              onClick={() => router.push('/referrals')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
            >
              View in Pipeline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
