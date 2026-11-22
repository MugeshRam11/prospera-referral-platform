'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Building2, ArrowUpRight, Home, Landmark, Briefcase, KeyRound, CreditCard, type LucideIcon } from 'lucide-react';
import { ApiClient } from '@/lib/api';
import { demoProperties, presentation } from '@/lib/catalogue';
import type { ServiceItem } from '@/types';

const serviceIcons: Record<string, LucideIcon> = { Finance: CreditCard, Banking: Landmark, Residency: KeyRound, 'Real estate': Home, Advisory: Briefcase };
export default function ServicesPage() {
  const [catalogue, setCatalogue] = useState<ServiceItem[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('Services');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [canRefer, setCanRefer] = useState(false);
  useEffect(() => {
    ApiClient.getServices().then(setCatalogue).catch(e => setError(e.message));
    ApiClient.getMe().then(u => setCanRefer(u.role !== 'COORDINATOR')).catch(() => setCanRefer(false));
  }, []);
  const propertyService = catalogue?.find(s => presentation(s.slug).category === 'Real estate');
  const services = catalogue?.filter(s => (s.name + ' ' + (s.description ?? '')).toLowerCase().includes(query.toLowerCase()));
  const properties = demoProperties.filter(p => (!location || p.location === location) && (!type || p.type === type) &&
    (p.title + ' ' + p.location + ' ' + p.type).toLowerCase().includes(query.toLowerCase()));
  const cta = 'inline-flex items-center gap-1 rounded-lg bg-[#14243A] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-2';
  const card = 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg';
  return <section className="space-y-6">
    <header className="rounded-2xl bg-[#14243A] p-7 text-white sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Services &amp; properties</h1>
      <p className="mt-2 text-slate-200">Find the right service for your client and start a referral.</p>
    </header>
    <div className="flex flex-wrap items-center gap-3">{['Services', 'Properties'].map(t =>
      <button key={t} aria-pressed={tab === t} className={tab === t ? cta : 'rounded-lg border bg-white px-4 py-2'} onClick={() => { setTab(t); setQuery(''); }}>{t}</button>)}
      <input aria-label={'Search ' + tab} placeholder={'Search ' + tab.toLowerCase()} className="rounded-lg border p-2 sm:ml-auto" value={query} onChange={e => setQuery(e.target.value)} />
    </div>
    {tab === 'Properties' && <div className="flex flex-wrap items-center gap-3">
      <strong>Sample listing — not live inventory</strong>
      <select aria-label="Location" value={location} onChange={e => setLocation(e.target.value)} className="rounded-lg border p-2"><option value="">All locations</option><option>Dubai</option><option>Abu Dhabi</option></select>
      <select aria-label="Property type" value={type} onChange={e => setType(e.target.value)} className="rounded-lg border p-2"><option value="">All types</option>{demoProperties.map(p => <option key={p.type}>{p.type}</option>)}</select>
    </div>}
    {error && <p role="alert">Service catalogue unavailable. {error}</p>}
    {tab === 'Services' && !catalogue && !error && <p role="status">Loading services…</p>}
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {tab === 'Services' && services?.map(s => {
        const meta = presentation(s.slug);
        const Icon = serviceIcons[meta.category] || Building2;
        return <article key={s.id} className={card}>
          <div className="relative aspect-video bg-slate-100"><Image src={meta.image} fill sizes="(max-width:768px) 100vw, 33vw" alt="" className="object-cover" /></div>
          <div className="space-y-3 p-5"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600"><Icon size={16}/>{s.category?.name || meta.category}</p>
            <h2 className="text-xl font-bold">{s.name}</h2><p className="line-clamp-2 min-h-10 text-sm text-slate-600">{s.description || meta.prompt}</p>
            <details><summary className="cursor-pointer text-sm font-semibold">View Details</summary><p className="my-2 text-sm">{s.description} {meta.prompt} Confirm client consent before submitting.</p></details>
            {canRefer && <Link className={cta} href={'/referrals/new?service=' + s.id}>Create Referral <ArrowUpRight size={15}/></Link>}
          </div></article>;
      })}
      {tab === 'Properties' && properties.map(p => <article key={p.id} className={card}>
        <div className="relative aspect-video"><Image fill src={p.image} sizes="(max-width:768px) 100vw, 33vw" alt="Architectural illustration" className="object-cover" /></div>
        <div className="space-y-3 p-5"><p className="text-xs font-bold uppercase text-amber-800">Illustrative Demo Property</p><h2 className="text-xl font-bold">{p.title}</h2>
          <p>{p.location} · {p.type}</p><p className="text-sm text-slate-600">{p.specs}</p><strong>Price on request</strong>
          <details><summary className="cursor-pointer text-sm font-semibold">View Details</summary><p className="my-2 text-sm">Fictional listing for referral walkthroughs. Availability unverified.</p></details>
          {canRefer && (propertyService ? <Link className={cta} href={'/referrals/new?service=' + propertyService.id + '&property=' + p.id}>Refer Client <ArrowUpRight size={15}/></Link> : <p>Property referral service unavailable.</p>)}
        </div></article>)}
    </div>
    {((tab === 'Services' && services?.length === 0) || (tab === 'Properties' && properties.length === 0)) && <p>No matches. Try another search or filter.</p>}
  </section>;
}
