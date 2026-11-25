'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import { ApiClient } from '@/lib/api';
import { demoProperties, presentation, workflowLabel } from '@/lib/catalogue';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton, ErrorState } from '@/components/ui/Skeleton';
import type { LeadItem, ServiceFormType, ServiceItem, UserSummary } from '@/types';

const steps = [
  'Service & package',
  'Client & consent',
  'Service requirements',
  'Opportunity details',
  'Review & submit',
  'Confirmation',
];

const inputCls =
  'mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const initialBase = { name: '', phone: '', email: '', value: '', notes: '', additionalNotes: '' };

function inferFormType(service?: ServiceItem): ServiceFormType {
  if (service?.formType) return service.formType;
  const slug = service?.slug || '';
  if (/golden-visa|visa|residen/i.test(slug)) return 'GOLDEN_VISA';
  if (/mortgage|refinanc|finance/i.test(slug)) return 'MORTGAGE';
  if (/free-zone|mainland|formation|setup|licen/i.test(slug)) return 'COMPANY_FORMATION';
  if (/property|real-estate|off-plan|resale/i.test(slug)) return 'REAL_ESTATE';
  return 'CORPORATE_ADVISORY';
}

export default function ReferralWizard() {
  const [user, setUser] = useState<UserSummary>();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [packageSelection, setPackageSelection] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [draft, setDraft] = useState<LeadItem>();
  const [confirmed, setConfirmed] = useState<LeadItem>();
  const [form, setForm] = useState(initialBase);
  const [structured, setStructured] = useState<Record<string, string | number | boolean>>({});
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const writing = useRef(false);
  const submissionKey = useRef('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    Promise.all([ApiClient.getMe(), ApiClient.getServices(), ApiClient.getReferrals()])
      .then(([u, list, rows]) => {
        if (!active) return;
        setServices(list);
        setLeads(rows);
        if (params.has('draft')) {
          const row = rows.find((l) => l.id === params.get('draft'));
          if (
            !row ||
            row.partnerId !== u.id ||
            row.status !== 'DRAFT' ||
            row.agencyReviewStage === 'PENDING_AGENCY_APPROVAL'
          ) {
            throw new Error('This referral cannot be edited.');
          }
          setDraft(row);
          setServiceId(row.serviceId);
          setPackageSelection(row.packageId || '');
          setPropertyId(row.demoPropertyId || '');
          setForm({
            name: row.clientName,
            phone: row.clientPhone,
            email: row.clientEmail || '',
            value: String(row.expectedDealValue),
            notes: row.notes || '',
            additionalNotes: row.requirements || '',
          });
          if (row.structuredData && typeof row.structuredData === 'object') {
            setStructured(row.structuredData as Record<string, string | number | boolean>);
          }
        } else {
          const selected = list.find((s) => s.id === params.get('service') || s.slug === params.get('service'));
          setServiceId(selected?.id || list[0]?.id || '');
          if (params.get('package')) {
            setPackageSelection(params.get('package') || '');
          }
          if (selected && presentation(selected.slug).category === 'Real estate') {
            setPropertyId(demoProperties.find((p) => p.id === params.get('property'))?.id || '');
          }
        }
        setUser(u);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Unable to load referral form');
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = services.find((s) => s.id === serviceId);
  const formType = inferFormType(selected);
  const packages = selected?.packages || [];
  const selectedPkg = packages.find((p) => p.id === packageSelection || p.slug === packageSelection);
  const property = demoProperties.find((p) => p.id === propertyId);
  const setField = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const setStruct = (key: string, value: string | number | boolean) =>
    setStructured((prev) => ({ ...prev, [key]: value }));

  const duplicate = leads.find(
    (l) =>
      l.id !== draft?.id &&
      l.clientPhone === form.phone.trim() &&
      !['WON', 'LOST', 'CANCELLED'].includes(l.status)
  );

  function buildStructuredPayload(): Record<string, unknown> {
    const clean: Record<string, unknown> = { formType };
    for (const [k, v] of Object.entries(structured)) {
      if (k !== 'formType' && v !== '' && v !== undefined && v !== null) {
        clean[k] = v;
      }
    }
    if (formType === 'COMPANY_FORMATION' && selectedPkg?.slug && !clean.packageSlug) {
      clean.packageSlug = selectedPkg.slug;
    }
    return clean;
  }

  async function save(asDraft: boolean) {
    if (writing.current || !user || !selected) return;
    setError('');
    setNotice('');
    if (form.name.trim().length < 2 || form.phone.trim().length < 7 || !(Number(form.value) > 0)) {
      setError('Enter the client name, phone and estimated deal value before saving.');
      return;
    }
    if (!asDraft && !consent) {
      setError('Confirm client consent before submitting.');
      return;
    }
    if (form.additionalNotes.trim().length > 1200) {
      setError('Shorten additional requirements to 1,200 characters in total.');
      return;
    }

    writing.current = true;
    setBusy(true);
    try {
      const structuredData = buildStructuredPayload();
      const fields = {
        clientName: form.name.trim(),
        clientPhone: form.phone.trim(),
        expectedDealValue: Number(form.value),
        requirements: form.additionalNotes.trim() || '',
        notes: form.notes,
        packageId: selectedPkg?.id || undefined,
        structuredData,
      };

      let record: LeadItem;
      if (draft) {
        record = await ApiClient.editReferral(draft.id, {
          ...fields,
          packageId: selectedPkg?.id ?? null,
          clientEmail: form.email.trim() || null,
        });
        if (!asDraft) {
          record = await ApiClient.updateReferralStatus(draft.id, 'SUBMITTED', undefined, undefined, consent);
        }
      } else {
        submissionKey.current ||= crypto.randomUUID();
        record = await ApiClient.createReferral({
          ...fields,
          serviceId,
          demoPropertyId: propertyId || undefined,
          clientEmail: form.email.trim() || undefined,
          consent,
          asDraft,
          submissionKey: submissionKey.current,
        });
      }

      if (asDraft) {
        setDraft(record);
        window.history.replaceState(null, '', '?draft=' + record.id);
        setNotice('Draft saved · ' + record.referenceNo);
      } else {
        setConfirmed(record);
        setStep(5);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save referral');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  if (!user) {
    return error ? (
      <ErrorState title="Unable to open referral form" message={error} onRetry={() => window.location.reload()} />
    ) : (
      <DashboardSkeleton />
    );
  }

  if (user.role === 'COORDINATOR') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-700">Coordinators manage intake and assignments rather than creating referrals.</p>
        <Link href="/coordinator" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">
          Open your coordinator queue →
        </Link>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5 pb-12">
      <Link href="/referrals" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Back to Referrals
      </Link>

      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Step {step + 1} of 6 · {selected?.name || 'Referral'}
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{steps[step]}</h1>
      </header>

      <progress className="h-2 w-full accent-blue-700 rounded-full" aria-label="Referral progress" value={step + 1} max={6} />

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {step < 5 && (
        <form
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            if (step === 4) void save(false);
            else setStep(step + 1);
          }}
        >
          {/* STEP 0: SERVICE / PACKAGE / PROPERTY */}
          {step === 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-800">
                Approved Service
                <select
                  className={inputCls}
                  disabled={!!draft}
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setPackageSelection('');
                    setPropertyId('');
                    setStructured({});
                  }}
                  required
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              {selected && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">{selected.category?.name || selected.catalogMeta?.categoryGroup}</p>
                  <p>{selected.description}</p>
                </div>
              )}

              {packages.length > 0 && (
                <label className="block text-sm font-semibold text-slate-800">
                  Package / Option
                  <select
                    className={inputCls}
                    disabled={!!draft}
                    value={packageSelection}
                    onChange={(e) => setPackageSelection(e.target.value)}
                  >
                    <option value="">Select a package (optional)</option>
                    {packages.map((p) => (
                      <option key={p.slug} value={p.id || p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {formType === 'REAL_ESTATE' && (
                <label className="block text-sm font-semibold text-slate-800">
                  Property Reference (optional)
                  <select
                    className={inputCls}
                    disabled={!!draft}
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                  >
                    <option value="">General property enquiry</option>
                    {demoProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} · Illustrative Demo Property
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!services.length && <p className="text-sm text-slate-500">No active services available.</p>}
            </div>
          )}

          {/* STEP 1: CLIENT & CONSENT */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-800">
                Client full name
                <input
                  className={inputCls}
                  required
                  minLength={2}
                  maxLength={255}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Client phone
                <input
                  type="tel"
                  className={inputCls}
                  required
                  minLength={7}
                  maxLength={50}
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Client email (optional)
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </label>
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <label className="flex items-start gap-3 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I confirm that I have obtained the referred client&apos;s informed permission to share their personal
                    information with Prospera for the purpose of evaluating, contacting, and processing this referral.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: TYPED CONDITIONAL SERVICE QUESTIONS */}
          {step === 2 && (
            <div className="space-y-4">
              {formType === 'REAL_ESTATE' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Stage
                    <select className={inputCls} value={String(structured.transactionStage || '')} onChange={(e) => setStruct('transactionStage', e.target.value)}>
                      <option value="">Select stage</option>
                      <option value="OFF_PLAN">Off-plan</option>
                      <option value="READY">Ready</option>
                      <option value="RESALE">Resale</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Intention
                    <select className={inputCls} value={String(structured.intent || '')} onChange={(e) => setStruct('intent', e.target.value)}>
                      <option value="">Select intention</option>
                      <option value="PURCHASE">Purchase</option>
                      <option value="RENT">Rent</option>
                      <option value="INVESTMENT">Investment</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Property type
                    <input className={inputCls} placeholder="e.g. Apartment, Villa, Commercial" value={String(structured.propertyType || '')} onChange={(e) => setStruct('propertyType', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Preferred location
                    <input className={inputCls} placeholder="e.g. Dubai Marina, Downtown" value={String(structured.location || '')} onChange={(e) => setStruct('location', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Budget (AED)
                    <input type="number" min="1" className={inputCls} value={String(structured.budgetAed || '')} onChange={(e) => setStruct('budgetAed', e.target.value ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Financing requirement
                    <select className={inputCls} value={String(structured.financingRequired || '')} onChange={(e) => setStruct('financingRequired', e.target.value)}>
                      <option value="">Select financing</option>
                      <option value="CASH">Cash buyer</option>
                      <option value="MORTGAGE">Mortgage required</option>
                      <option value="UNDECIDED">Undecided</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
                    Expected timeline
                    <input className={inputCls} placeholder="e.g. Immediate / 1-3 months" value={String(structured.expectedTimeline || '')} onChange={(e) => setStruct('expectedTimeline', e.target.value)} />
                  </label>
                </div>
              )}

              {formType === 'GOLDEN_VISA' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Eligibility route
                    <input className={inputCls} placeholder="e.g. Property Investor, Entrepreneur, Talent" value={String(structured.eligibilityRoute || '')} onChange={(e) => setStruct('eligibilityRoute', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Investment / property category
                    <input className={inputCls} placeholder="e.g. AED 2M+ Property, Deposit" value={String(structured.investmentCategory || '')} onChange={(e) => setStruct('investmentCategory', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Approximate income or investment (AED)
                    <input type="number" min="1" className={inputCls} value={String(structured.approximateValueAed || '')} onChange={(e) => setStruct('approximateValueAed', e.target.value ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Current residency status
                    <input className={inputCls} placeholder="e.g. UAE Resident, Non-resident" value={String(structured.currentResidencyStatus || '')} onChange={(e) => setStruct('currentResidencyStatus', e.target.value)} />
                  </label>
                </div>
              )}

              {formType === 'MORTGAGE' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Property value (AED)
                    <input type="number" min="1" className={inputCls} value={String(structured.propertyValueAed || '')} onChange={(e) => setStruct('propertyValueAed', e.target.value ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Down payment (AED)
                    <input type="number" min="0" className={inputCls} value={String(structured.downPaymentAed || '')} onChange={(e) => setStruct('downPaymentAed', e.target.value ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Estimated finance amount (AED)
                    <input type="number" min="1" className={inputCls} value={String(structured.estimatedFinanceAmountAed || '')} onChange={(e) => setStruct('estimatedFinanceAmountAed', e.target.value ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Employment type
                    <select className={inputCls} value={String(structured.employmentType || '')} onChange={(e) => setStruct('employmentType', e.target.value)}>
                      <option value="">Select employment</option>
                      <option value="SALARIED">Salaried</option>
                      <option value="SELF_EMPLOYED">Self-employed</option>
                      <option value="NON_RESIDENT">Non-resident</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
                    Monthly income band
                    <input className={inputCls} placeholder="e.g. AED 25,000 - 40,000" value={String(structured.incomeBand || '')} onChange={(e) => setStruct('incomeBand', e.target.value)} />
                  </label>
                </div>
              )}

              {formType === 'COMPANY_FORMATION' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Structure type
                    <select className={inputCls} value={String(structured.structureType || '')} onChange={(e) => setStruct('structureType', e.target.value)}>
                      <option value="">Select structure</option>
                      <option value="FREE_ZONE">Free Zone</option>
                      <option value="MAINLAND">Mainland</option>
                      <option value="OFFSHORE_APPROVED">Offshore (if approved)</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Preferred free zone / jurisdiction
                    <input className={inputCls} placeholder="e.g. DMCC, IFZA, ADGM, DED" value={String(structured.preferredFreeZone || '')} onChange={(e) => setStruct('preferredFreeZone', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Business activity
                    <input className={inputCls} placeholder="e.g. Management Consultancy, Trading" value={String(structured.businessActivity || '')} onChange={(e) => setStruct('businessActivity', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Number of shareholders
                    <input type="number" min="1" max="50" className={inputCls} value={String(structured.shareholdersCount || '')} onChange={(e) => setStruct('shareholdersCount', e.target.value ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Visa requirement
                    <input type="number" min="0" max="500" className={inputCls} value={String(structured.visaRequirementCount ?? '')} onChange={(e) => setStruct('visaRequirementCount', e.target.value !== '' ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Office / facility requirement
                    <input className={inputCls} placeholder="e.g. Flexi-desk, Private office" value={String(structured.facilityRequirement || '')} onChange={(e) => setStruct('facilityRequirement', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Estimated setup budget (AED)
                    <input type="number" min="1" className={inputCls} value={String(structured.estimatedSetupBudgetAed || '')} onChange={(e) => setStruct('estimatedSetupBudgetAed', e.target.value ? Number(e.target.value) : '')} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Desired start date
                    <input type="date" className={inputCls} value={String(structured.desiredStartDate || '')} onChange={(e) => setStruct('desiredStartDate', e.target.value)} />
                  </label>
                </div>
              )}

              {formType === 'CORPORATE_ADVISORY' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Advisory category
                    <input className={inputCls} placeholder="e.g. Corporate Banking, Licensing, Restructuring" value={String(structured.advisoryCategory || '')} onChange={(e) => setStruct('advisoryCategory', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Jurisdiction
                    <input className={inputCls} placeholder="e.g. UAE Mainland, DIFC, ADGM" value={String(structured.jurisdiction || '')} onChange={(e) => setStruct('jurisdiction', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
                    Business requirement
                    <textarea rows={2} className={inputCls} value={String(structured.businessRequirement || '')} onChange={(e) => setStruct('businessRequirement', e.target.value)} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
                    Client objective
                    <textarea rows={2} className={inputCls} value={String(structured.clientObjective || '')} onChange={(e) => setStruct('clientObjective', e.target.value)} />
                  </label>
                </div>
              )}

              <label className="block text-sm font-semibold text-slate-800">
                Additional requirements / narrative notes (optional)
                <textarea
                  className={inputCls}
                  rows={3}
                  maxLength={1200}
                  value={form.additionalNotes}
                  onChange={(e) => setField('additionalNotes', e.target.value)}
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
                <FileText size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                <span>
                  Supporting documents are handled exclusively through Prospera&apos;s protected private document vault and
                  are never transmitted to external CRM endpoints without explicit compliance authorization.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: OPPORTUNITY DETAILS */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-800">
                Estimated deal value (AED)
                <input
                  className={inputCls}
                  type="number"
                  required
                  min="0.01"
                  max="9999999999.99"
                  step=".01"
                  value={form.value}
                  onChange={(e) => setField('value', e.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Opportunity notes (optional)
                <textarea
                  className={inputCls}
                  rows={4}
                  maxLength={2000}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                />
              </label>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1.5">
                <h2 className="text-base font-bold text-slate-900">{selected?.name}</h2>
                {selectedPkg && <p className="text-slate-700">Package: {selectedPkg.name}</p>}
                {property && <p className="text-slate-700">Property: {property.title} · Illustrative Demo Property</p>}
                <p className="text-slate-800 font-medium">
                  {form.name} · {form.phone} {form.email && `· ${form.email}`}
                </p>
                <p className="text-slate-800 font-semibold">Estimated value: AED {Number(form.value || 0).toLocaleString()}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-1">
                <p className="font-semibold text-slate-800">Structured Summary</p>
                {Object.entries(buildStructuredPayload())
                  .filter(([k]) => k !== 'formType')
                  .map(([k, v]) => (
                    <p key={k} className="text-slate-600">
                      <span className="font-medium text-slate-700">{k}:</span> {String(v)}
                    </p>
                  ))}
                {form.additionalNotes && <p className="text-slate-600 whitespace-pre-line mt-2">{form.additionalNotes}</p>}
              </div>

              <p className="flex items-center gap-2 text-slate-700">
                <ShieldCheck size={16} className={consent ? 'text-emerald-600' : 'text-amber-600'} />
                <span>
                  Submitter consent declaration:{' '}
                  <strong>{consent ? 'Confirmed' : 'Return to Client & consent to confirm before submission'}</strong>
                </span>
              </p>

              {duplicate && (
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  Possible duplicate · {duplicate.referenceNo} already uses this client phone number.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            {step > 0 && (
              <Button variant="outline" type="button" disabled={busy} onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step >= 3 && (
              <Button type="button" variant="outline" disabled={busy} onClick={() => save(true)}>
                Save draft
              </Button>
            )}
            <Button className="ml-auto" disabled={busy || !selected || (step === 4 && !consent)}>
              {busy ? 'Saving…' : step === 4 ? 'Submit referral' : 'Continue'}
            </Button>
          </div>
        </form>
      )}

      {confirmed && (
        <article className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={22} />
            <h2 className="text-xl font-bold text-slate-900">
              {confirmed.agencyReviewStage === 'PENDING_AGENCY_APPROVAL'
                ? 'Referral submitted for agency review'
                : 'Referral submitted to Prospera'}
            </h2>
          </div>
          <p className="text-lg font-bold text-blue-700">{confirmed.referenceNo}</p>
          <p className="text-sm text-slate-700">
            {confirmed.service?.name}
            {property && ' · ' + property.title + ' (illustrative)'}
          </p>
          <p className="text-sm text-slate-600">
            {workflowLabel(confirmed)} · Next owner:{' '}
            {confirmed.agencyReviewStage === 'PENDING_AGENCY_APPROVAL'
              ? 'Agency owner or administrator'
              : 'Prospera coordination'}
          </p>
          <time className="block text-xs text-slate-500" dateTime={confirmed.updatedAt}>
            {new Date(confirmed.updatedAt).toLocaleString()}
          </time>
          <p>
            <Link className="font-semibold text-blue-700 hover:underline" href="/referrals">
              Track referral →
            </Link>
          </p>
        </article>
      )}
    </section>
  );
}
