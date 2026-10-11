'use client';

import React, { useState } from 'react';
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
  HelpCircle,
  ShieldCheck,
  Phone,
  Mail,
  User,
  MapPin,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ApiClient } from '@/lib/api';
import { formatAED } from '@/lib/utils';
import { LeadItem } from '@/types';

// The 6 Supported Service Categories
const SERVICE_CATEGORIES = [
  {
    id: 'property',
    serviceId: '11111111-2222-3333-4444-555555555555',
    title: 'Property & Real Estate',
    category: 'Real Estate',
    icon: Home,
    badge: 'High Commission',
    commissionRate: 1.5,
    description: 'Prime residential acquisitions, luxury penthouses, commercial freehold, and high-yield off-plan developments.',
    defaultDealValue: 1500000,
  },
  {
    id: 'mortgage',
    serviceId: '11111111-2222-3333-4444-555555555556',
    title: 'Mortgage & Home Financing',
    category: 'Financing',
    icon: CreditCard,
    badge: 'Fast Track',
    commissionRate: 1.0,
    description: 'UAE resident & non-resident property loans, refinance options, and competitive interest rate advisory.',
    defaultDealValue: 1200000,
  },
  {
    id: 'golden-visa',
    serviceId: '11111111-2222-3333-4444-555555555553',
    title: 'UAE Golden Visa & Residency',
    category: 'Immigration',
    icon: Award,
    badge: 'Popular',
    commissionRate: 2.0,
    description: '10-Year investor visa processing for property buyers (AED 2M+), entrepreneurs, and specialized talents.',
    defaultDealValue: 95000,
  },
  {
    id: 'corporate-advisory',
    serviceId: '11111111-2222-3333-4444-555555555554',
    title: 'Corporate Advisory & SPVs',
    category: 'Corporate',
    icon: Briefcase,
    badge: 'Institutional',
    commissionRate: 3.5,
    description: 'DIFC and ADGM SPV asset protection vehicles, cross-border holding structures, and legal entity setup.',
    defaultDealValue: 350000,
  },
  {
    id: 'bank-account',
    serviceId: '11111111-2222-3333-4444-555555555551',
    title: 'Corporate Bank Account Opening',
    category: 'Banking',
    icon: Landmark,
    badge: 'Tier-1 Banks',
    commissionRate: 2.5,
    description: 'Guaranteed corporate banking facilitation with Emirates NBD, First Abu Dhabi Bank (FAB), Mashreq, and Wio.',
    defaultDealValue: 185000,
  },
  {
    id: 'company-formation',
    serviceId: '11111111-2222-3333-4444-555555555552',
    title: 'Company Formation & Licensing',
    category: 'Licensing',
    icon: Building2,
    badge: '100% Foreign Owned',
    commissionRate: 3.0,
    description: 'Dubai Mainland LLC (DET) incorporation, Free Zone licensing (DMCC, IFZA, DAFZA), and trade permits.',
    defaultDealValue: 145000,
  },
];

export default function NewReferralWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedLead, setSubmittedLead] = useState<LeadItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Service
    selectedCategoryId: 'property',
    // Step 2: Client Contact
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    preferredContact: 'phone',
    countryResidence: 'United Arab Emirates',
    // Step 3: Conditional Service Fields
    dealValue: '1500000',
    propertyType: 'Luxury Villa / Penthouse',
    propertyLocation: 'Palm Jumeirah',
    mortgageType: 'Ready Property Purchase',
    goldenVisaCategory: 'Real Estate Investor (AED 2M+)',
    advisoryScope: 'DIFC / ADGM SPV Asset Protection',
    bankingPreference: 'Emirates NBD',
    formationJurisdiction: 'Dubai Mainland (DET)',
    notes: '',
    // Step 4: Consent
    clientConsent: false,
  });

  const selectedService =
    SERVICE_CATEGORIES.find((s) => s.id === formData.selectedCategoryId) ||
    SERVICE_CATEGORIES[0];

  const dealValueNum = parseFloat(formData.dealValue) || 0;
  const estimatedCommission =
    (dealValueNum * selectedService.commissionRate) / 100;

  // Validation per step
  const validateStep = (step: number): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.selectedCategoryId) {
        setErrorMsg('Please select a service category to continue.');
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
      return true;
    }
    if (step === 3) {
      if (dealValueNum <= 0) {
        setErrorMsg('Estimated deal value must be greater than zero.');
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (!formData.clientConsent) {
        setErrorMsg('You must confirm that you have client consent to submit this referral.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    // Compile comprehensive notes incorporating conditional service requirements
    let contextNote = `[Service: ${selectedService.title}]\n`;
    if (formData.selectedCategoryId === 'property') {
      contextNote += `Property Type: ${formData.propertyType}\nLocation: ${formData.propertyLocation}\n`;
    } else if (formData.selectedCategoryId === 'mortgage') {
      contextNote += `Financing Type: ${formData.mortgageType}\n`;
    } else if (formData.selectedCategoryId === 'golden-visa') {
      contextNote += `Category: ${formData.goldenVisaCategory}\n`;
    } else if (formData.selectedCategoryId === 'corporate-advisory') {
      contextNote += `Advisory Scope: ${formData.advisoryScope}\n`;
    } else if (formData.selectedCategoryId === 'bank-account') {
      contextNote += `Preferred Bank: ${formData.bankingPreference}\n`;
    } else if (formData.selectedCategoryId === 'company-formation') {
      contextNote += `Jurisdiction: ${formData.formationJurisdiction}\n`;
    }

    contextNote += `Preferred Contact: ${formData.preferredContact}\nCountry: ${formData.countryResidence}\n`;
    if (formData.notes.trim()) {
      contextNote += `Partner Notes: ${formData.notes.trim()}`;
    }

    try {
      const created = await ApiClient.createReferral({
        serviceId: selectedService.serviceId,
        clientName: formData.clientName.trim(),
        clientPhone: formData.clientPhone.trim(),
        clientEmail: formData.clientEmail.trim() || undefined,
        expectedDealValue: dealValueNum,
        currency: 'AED',
        notes: contextNote,
      });

      setSubmittedLead(created);
      setCurrentStep(5);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit referral. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Top Header */}
      <div className="mb-6">
        <Link
          href="/referrals"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to My Referrals
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          New Referral Submission Wizard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Complete the guided steps below to refer a client to Prospera’s verified advisory desks.
        </p>
      </div>

      {/* Progress Indicator (Steps 1 to 4) */}
      {currentStep <= 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Step {currentStep} of 4: {
                currentStep === 1
                  ? 'Select Advisory Service'
                  : currentStep === 2
                  ? 'Client Contact Details'
                  : currentStep === 3
                  ? 'Service Specifications'
                  : 'Review & Partner Consent'
              }
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {Math.round((currentStep / 4) * 100)}% Completed
            </span>
          </div>
          <Progress value={(currentStep / 4) * 100} className="h-2" />

          {/* Step Pills */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className={`text-xs font-medium ${currentStep >= 1 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
              1. Service
            </div>
            <div className={`text-xs font-medium ${currentStep >= 2 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
              2. Client
            </div>
            <div className={`text-xs font-medium ${currentStep >= 3 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
              3. Requirements
            </div>
            <div className={`text-xs font-medium ${currentStep >= 4 ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
              4. Review
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div>
            <strong className="font-semibold">Action Required: </strong>
            {errorMsg}
          </div>
        </div>
      )}

      {/* STEP 1: Select Service Category */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Select Advisory Category
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Choose the primary domain of assistance your client requires.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SERVICE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = formData.selectedCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setFormData({
                        ...formData,
                        selectedCategoryId: cat.id,
                        dealValue: cat.defaultDealValue.toString(),
                      });
                    }}
                    className={`cursor-pointer border-2 rounded-xl p-5 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <Badge
                          variant={isSelected ? 'default' : 'secondary'}
                          className="text-[11px]"
                        >
                          {cat.commissionRate}% Partner Tier
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mb-1">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Standard Deal Range:</span>
                      <strong className="text-slate-800">
                        {formatAED(cat.defaultDealValue)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNext} size="lg" className="px-8 font-bold">
              Continue to Client Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Client Contact Information */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Client Contact Information
              </h2>
              <p className="text-sm text-slate-500">
                Please provide direct contact details for the individual or corporate representative.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {/* Client Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name / Legal Entity Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <Input
                    type="text"
                    placeholder="e.g. Tariq Al Mansoori / Gulf Horizons Ltd"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="pl-10 h-11"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Full name of the client or primary signatory.
                </p>
              </div>

              {/* Phone & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Telephone Number (with Country Code) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <Input
                      type="tel"
                      placeholder="+971 50 123 4567"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <Input
                      type="email"
                      placeholder="client@domain.ae"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Method & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Preferred Communication Channel
                  </label>
                  <select
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    value={formData.preferredContact}
                    onChange={(e) => setFormData({ ...formData, preferredContact: e.target.value })}
                  >
                    <option value="phone">Direct Phone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="email">Email Introduction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Country of Residence
                  </label>
                  <select
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    value={formData.countryResidence}
                    onChange={(e) => setFormData({ ...formData, countryResidence: e.target.value })}
                  >
                    <option value="United Arab Emirates">United Arab Emirates (UAE)</option>
                    <option value="Saudi Arabia">Saudi Arabia</option>
                    <option value="Qatar">Qatar</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="India">India</option>
                    <option value="Other International">Other International Jurisdiction</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="secondary" onClick={handleBack} size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext} size="lg" className="px-8 font-bold">
              Continue to Specifications <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Conditional Service Requirements */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  Service Specifications: {selectedService.title}
                </h2>
                <p className="text-sm text-slate-500">
                  Custom parameters tailored to this transaction type.
                </p>
              </div>
              <Badge variant="info" className="text-xs px-3 py-1">
                {selectedService.category}
              </Badge>
            </div>

            {/* Expected Deal Value (Universal to all services for financial transparency) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estimated Deal / Transaction Value (AED) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">
                  AED
                </span>
                <Input
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.dealValue}
                  onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                  className="pl-14 h-11 text-base font-semibold"
                  required
                />
              </div>

              {/* Dynamic Commission Accrual Preview */}
              <div className="mt-3 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-800">
                    Calculated Partner Commission ({selectedService.commissionRate}%):
                  </span>
                </div>
                <strong className="text-base font-extrabold text-emerald-700">
                  {formatAED(estimatedCommission)}
                </strong>
              </div>
            </div>

            {/* CONDITIONAL FIELDS BASED ON SERVICE CATEGORY */}
            {formData.selectedCategoryId === 'property' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Property Asset Class
                  </label>
                  <select
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  >
                    <option value="Luxury Villa / Penthouse">Luxury Villa / Penthouse</option>
                    <option value="Commercial Freehold Office">Commercial Freehold Office</option>
                    <option value="Off-Plan High-Yield Investment">Off-Plan High-Yield Investment</option>
                    <option value="Whole Building / Land Plot">Whole Building / Land Plot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Preferred Prime Location
                  </label>
                  <select
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    value={formData.propertyLocation}
                    onChange={(e) => setFormData({ ...formData, propertyLocation: e.target.value })}
                  >
                    <option value="Palm Jumeirah">Palm Jumeirah</option>
                    <option value="Downtown Dubai">Downtown Dubai</option>
                    <option value="Dubai Hills Estate">Dubai Hills Estate</option>
                    <option value="DIFC / Business Bay">DIFC / Business Bay</option>
                    <option value="Dubai Marina / Bluewaters">Dubai Marina / Bluewaters</option>
                    <option value="Abu Dhabi - Yas / Saadiyat Island">Abu Dhabi (Yas / Saadiyat Island)</option>
                  </select>
                </div>
              </div>
            )}

            {formData.selectedCategoryId === 'mortgage' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Financing Transaction Type
                </label>
                <select
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={formData.mortgageType}
                  onChange={(e) => setFormData({ ...formData, mortgageType: e.target.value })}
                >
                  <option value="Ready Property Purchase">Ready Property Purchase (Resident / Expat)</option>
                  <option value="Non-Resident International Mortgage">Non-Resident International Investor Mortgage</option>
                  <option value="Equity Release / Refinance">Equity Release / Mortgage Buyout</option>
                  <option value="Commercial Property Loan">Commercial Property Loan</option>
                </select>
              </div>
            )}

            {formData.selectedCategoryId === 'golden-visa' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Visa Qualification Pathway
                </label>
                <select
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={formData.goldenVisaCategory}
                  onChange={(e) => setFormData({ ...formData, goldenVisaCategory: e.target.value })}
                >
                  <option value="Real Estate Investor (AED 2M+)">Property Investor (Title deed ≥ AED 2M)</option>
                  <option value="Executive / Specialized Talent">Executive Leadership / Specialized Talent</option>
                  <option value="Entrepreneur / Business Owner">Entrepreneur / Business Owner</option>
                  <option value="Family Sponsorship Add-on">Family & Dependents Package</option>
                </select>
              </div>
            )}

            {formData.selectedCategoryId === 'corporate-advisory' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Corporate Advisory Vehicle
                </label>
                <select
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={formData.advisoryScope}
                  onChange={(e) => setFormData({ ...formData, advisoryScope: e.target.value })}
                >
                  <option value="DIFC / ADGM SPV Asset Protection">DIFC / ADGM Holding SPV Structuring</option>
                  <option value="Cross-Border Tax & Compliance">Cross-Border Corporate Tax Structuring</option>
                  <option value="Family Office & Foundation">Family Office Foundation Setup</option>
                </select>
              </div>
            )}

            {formData.selectedCategoryId === 'bank-account' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Preferred Commercial Bank Desk
                </label>
                <select
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={formData.bankingPreference}
                  onChange={(e) => setFormData({ ...formData, bankingPreference: e.target.value })}
                >
                  <option value="Emirates NBD">Emirates NBD (Priority Corporate Desk)</option>
                  <option value="First Abu Dhabi Bank (FAB)">First Abu Dhabi Bank (FAB Commercial)</option>
                  <option value="Mashreq Bank">Mashreq Bank (NEOBIZ / Corporate)</option>
                  <option value="Wio Bank Business">Wio Bank Business (Fast Digital Onboarding)</option>
                </select>
              </div>
            )}

            {formData.selectedCategoryId === 'company-formation' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Incorporation Jurisdiction
                </label>
                <select
                  className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={formData.formationJurisdiction}
                  onChange={(e) => setFormData({ ...formData, formationJurisdiction: e.target.value })}
                >
                  <option value="Dubai Mainland (DET)">Dubai Mainland LLC (100% Foreign Ownership)</option>
                  <option value="DMCC Free Zone">DMCC (Dubai Multi Commodities Centre)</option>
                  <option value="IFZA Dubai">IFZA Dubai Silicon Oasis</option>
                  <option value="ADGM Abu Dhabi">ADGM (Abu Dhabi Global Market)</option>
                </select>
              </div>
            )}

            {/* Client Context & Requirements */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Strategic Notes & Client Requirements
              </label>
              <Textarea
                placeholder="Include details about client timeline, specific property unit requirements, source of funds, or urgent deadlines..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="secondary" onClick={handleBack} size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext} size="lg" className="px-8 font-bold">
              Review Referral <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Review and Consent */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Final Review & Partner Consent
              </h2>
              <p className="text-sm text-slate-500">
                Verify the referral information before dispatching to the Prospera desk.
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Client / Company</span>
                <p className="font-bold text-slate-900 text-base mt-0.5">{formData.clientName}</p>
                <p className="text-xs text-slate-500 mt-1">{formData.clientPhone} • {formData.clientEmail || 'No email provided'}</p>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Selected Service</span>
                <p className="font-bold text-blue-600 text-base mt-0.5">{selectedService.title}</p>
                <p className="text-xs text-slate-500 mt-1">{formData.countryResidence} • Via {formData.preferredContact}</p>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Expected Deal Value</span>
                <p className="font-bold text-slate-900 text-lg mt-0.5">{formatAED(dealValueNum)}</p>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-slate-400">Estimated Commission</span>
                <p className="font-bold text-emerald-600 text-lg mt-0.5">
                  {formatAED(estimatedCommission)}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    ({selectedService.commissionRate}% tier)
                  </span>
                </p>
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.clientConsent}
                  onChange={(e) => setFormData({ ...formData, clientConsent: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                />
                <div className="text-xs leading-relaxed text-slate-700">
                  <strong className="text-slate-900 font-semibold block mb-0.5">
                    Explicit Client Referral Consent
                  </strong>
                  I confirm that I have informed the client of this referral and have their explicit consent to be contacted by Prospera authorized corporate specialists under UAE Personal Data Protection laws.
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="secondary" onClick={handleBack} size="lg" disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              size="lg"
              className="px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting || !formData.clientConsent}
            >
              {isSubmitting ? 'Dispatching to Prospera...' : 'Submit Referral Now'}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Submission Success Confirmation */}
      {currentStep === 5 && submittedLead && (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Referral Successfully Dispatched
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-3">
              Lead Created: {submittedLead.referenceNo}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Client <strong>{submittedLead.clientName}</strong> has been logged in the Prospera Referral Pipeline under status <strong>SUBMITTED</strong>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left text-xs space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Service Category:</span>
              <strong className="text-slate-800">{submittedLead.service?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Deal Value:</span>
              <strong className="text-slate-800">{formatAED(submittedLead.expectedDealValue)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Partner Reward:</span>
              <strong className="text-emerald-600">{formatAED(estimatedCommission)}</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-500">SLA Response Window:</span>
              <strong className="text-slate-800">Assigned coordinator will reach out within 4 business hours</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setFormData({
                  ...formData,
                  clientName: '',
                  clientPhone: '',
                  clientEmail: '',
                  notes: '',
                  clientConsent: false,
                });
                setCurrentStep(1);
              }}
            >
              Submit Another Referral
            </Button>
            <Button
              onClick={() => router.push('/referrals')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              View in My Referrals Pipeline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
