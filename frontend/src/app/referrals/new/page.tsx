'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import { demoProperties, presentation, referralQuestions, workflowLabel } from '@/lib/catalogue';
import { Button } from '@/components/ui/button';
import type { LeadItem, ServiceItem, UserSummary } from '@/types';

const steps = ['Service or property', 'Client and consent', 'Service requirements', 'Opportunity details', 'Review', 'Confirmation'];
const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-base focus-visible:ring-2';
const initial = { name: '', phone: '', email: '', value: '', notes: '', requirements: '' };

export default function ReferralWizard() {
  const [user, setUser] = useState<UserSummary>();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [draft, setDraft] = useState<LeadItem>();
  const [confirmed, setConfirmed] = useState<LeadItem>();
  const [form, setForm] = useState(initial);
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
    Promise.all([ApiClient.getMe(), ApiClient.getServices(), ApiClient.getReferrals()]).then(([u, list, rows]) => {
      if (!active) return;
      setServices(list); setLeads(rows);
      if (params.has('draft')) {
        const row = rows.find(l => l.id === params.get('draft'));
        if (!row || row.partnerId !== u.id || row.status !== 'DRAFT' || row.agencyReviewStage === 'PENDING_AGENCY_APPROVAL') throw new Error('This referral cannot be edited.');
        setDraft(row); setServiceId(row.serviceId); setPropertyId(row.demoPropertyId || '');
        setForm({ name: row.clientName, phone: row.clientPhone, email: row.clientEmail || '', value: String(row.expectedDealValue), notes: row.notes || '', requirements: row.requirements || '' });
      } else {
        const selected = list.find(s => s.id === params.get('service'));
        setServiceId(selected?.id || list[0]?.id || '');
        if (selected && presentation(selected.slug).category === 'Real estate') setPropertyId(demoProperties.find(p => p.id === params.get('property'))?.id || '');
      }
      setUser(u);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  const selected = services.find(s => s.id === serviceId);
  const questions = selected ? referralQuestions[presentation(selected.slug).category] || [] : [];
  const lines = form.requirements.split('\n');
  const questionFor = (line: string) => questions.find(q => line.startsWith(q + ': '));
  const additional = lines.filter(line => !questionFor(line)).join('\n');
  const property = demoProperties.find(p => p.id === propertyId);
  const field = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));
  const duplicate = leads.find(l => l.id !== draft?.id && l.clientPhone === form.phone.trim() && !['WON', 'LOST', 'CANCELLED'].includes(l.status));

  async function save(asDraft: boolean) {
    if (writing.current || !user || !selected) return;
    setError(''); setNotice('');
    if (form.name.trim().length < 2 || form.phone.trim().length < 7 || !(Number(form.value) > 0)) {
      setError('Enter the client name, phone and estimated deal value before saving.'); return;
    }
    if (!asDraft && !consent) { setError('Confirm client consent before submitting.'); return; }
    if (form.requirements.trim().length > 1200) { setError('Shorten service requirements to 1,200 characters in total.'); return; }
    writing.current = true; setBusy(true);
    try {
      const fields = { clientName: form.name.trim(), clientPhone: form.phone.trim(), expectedDealValue: Number(form.value), requirements: form.requirements, notes: form.notes };
      let record: LeadItem;
      if (draft) {
        record = await ApiClient.editReferral(draft.id, { ...fields, clientEmail: form.email.trim() || null });
        if (!asDraft) record = await ApiClient.updateReferralStatus(draft.id, 'SUBMITTED', undefined, undefined, consent);
      } else {
        submissionKey.current ||= crypto.randomUUID();
        record = await ApiClient.createReferral({ ...fields, serviceId, demoPropertyId: propertyId || undefined,
          clientEmail: form.email.trim() || undefined, consent, asDraft, submissionKey: submissionKey.current });
      }
      if (asDraft) {
        setDraft(record); window.history.replaceState(null, '', '?draft=' + record.id); setNotice('Draft saved · ' + record.referenceNo);
      } else { setConfirmed(record); setStep(5); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save referral'); }
    finally { writing.current = false; setBusy(false); }
  }
  if (!user) return <p role="status">{error || 'Loading referral form…'}</p>;
  if (user.role === 'COORDINATOR') return <Link href="/coordinator">Open your coordinator queue</Link>;
  return <section className="mx-auto max-w-3xl space-y-5">
    <Link href="/referrals" className="text-sm text-blue-800">← Referrals</Link>
    <header><p className="text-xs font-bold uppercase tracking-widest text-slate-600">Step {step + 1} of 6</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{steps[step]}</h1></header>
    <progress className="h-2 w-full accent-blue-700" aria-label="Referral progress" value={step + 1} max={6}/>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{notice}</p>}
    {step < 5 && <form className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm" onSubmit={e => { e.preventDefault(); setError(''); if (step === 4) void save(false); else setStep(step + 1); }}>
      {step === 0 && <><label className="block">Service<select className={input} disabled={!!draft} value={serviceId} onChange={e => { setServiceId(e.target.value); setPropertyId(''); field('requirements', ''); }} required>
        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {selected && <p className="text-sm text-slate-600">{selected.description}</p>}
        {selected && presentation(selected.slug).category === 'Real estate' && <label className="block">Property<select className={input} disabled={!!draft} value={propertyId} onChange={e => setPropertyId(e.target.value)}><option value="">General property enquiry</option>{demoProperties.map(p => <option key={p.id} value={p.id}>{p.title} · Illustrative Demo Property</option>)}</select></label>}
        {!services.length && <p>No active services available.</p>}</>}
      {step === 1 && <><label className="block">Client name<input className={input} required minLength={2} maxLength={255} value={form.name} onChange={e => field('name', e.target.value)}/></label>
        <label className="block">Phone<input type="tel" className={input} required minLength={7} maxLength={50} value={form.phone} onChange={e => field('phone', e.target.value)}/></label>
        <label className="block">Email (optional)<input type="email" className={input} value={form.email} onChange={e => field('email', e.target.value)}/></label>
        <label className="flex items-baseline gap-2"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>I confirm that I have obtained the referred client&apos;s informed permission to share their personal information with Prospera for the purpose of evaluating, contacting and processing this referral.</label></>}
      {step === 2 && <>{questions.map(q => <label className="block" key={q}>{q} (optional)
        <input className={input} value={lines.find(line => questionFor(line) === q)?.slice(q.length + 2) || ''} onChange={e => {
          const remaining = lines.filter(line => questionFor(line) !== q);
          if (e.target.value) remaining.unshift(q + ': ' + e.target.value);
          field('requirements', remaining.join('\n'));
        }}/></label>)}<label className="block">{questions.length ? 'Additional requirements (optional)' : selected && presentation(selected.slug).prompt}<textarea className={input} rows={4} maxLength={1200} value={additional} onChange={e => field('requirements', [...lines.filter(line => questionFor(line)), e.target.value].join('\n'))}/></label></>}
      {step === 3 && <><label className="block">Estimated deal value (AED)<input className={input} type="number" required min="0.01" max="9999999999.99" step=".01" value={form.value} onChange={e => field('value', e.target.value)}/></label>
        <label className="block">Opportunity notes<textarea className={input} rows={4} maxLength={2000} value={form.notes} onChange={e => field('notes', e.target.value)}/></label></>}
      {step === 4 && <div className="space-y-3"><h2 className="text-xl font-semibold">{selected?.name}</h2>
        {property && <p>{property.title} · Illustrative Demo Property</p>}
        <p>{form.name} · {form.phone} {form.email}</p><p>Estimated value · AED {Number(form.value).toLocaleString()}</p>
        <p className="whitespace-pre-line">{form.requirements}</p><p>{form.notes}</p><p>Submitter declaration · {consent ? 'Confirmed' : 'Return to Client and consent to confirm before submission'}</p>
        {duplicate && <p role="alert" className="bg-amber-50 p-3">Possible duplicate · {duplicate.referenceNo} uses this phone number.</p>}</div>}
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        {step > 0 && <Button variant="outline" type="button" disabled={busy} onClick={() => setStep(step - 1)}>Back</Button>}
        {step >= 3 && <Button type="button" variant="outline" disabled={busy} onClick={() => save(true)}>Save draft</Button>}
        <Button className="ml-auto" disabled={busy || !selected || (step === 4 && !consent)}>{busy ? 'Saving…' : step === 4 ? 'Submit referral' : 'Continue'}</Button>
      </div></form>}
    {confirmed && <article className="space-y-4 rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">{confirmed.agencyReviewStage === 'PENDING_AGENCY_APPROVAL' ? 'Referral submitted for agency review' : 'Referral submitted to Prospera'}</h2>
      <strong>{confirmed.referenceNo}</strong><p>{confirmed.service?.name}{property && ' · ' + property.title + ' (illustrative)'}</p>
      <p>{workflowLabel(confirmed)} · Next owner: {confirmed.agencyReviewStage === 'PENDING_AGENCY_APPROVAL' ? 'Agency owner or administrator' : 'Prospera coordination'}</p>
      <time dateTime={confirmed.updatedAt}>{new Date(confirmed.updatedAt).toLocaleString()}</time>
      <p><Link className="font-semibold text-blue-800" href="/referrals">Track referral →</Link></p>
    </article>}
  </section>;
}
