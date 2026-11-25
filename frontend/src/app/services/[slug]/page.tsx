'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Info,
  Layers,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { ApiClient } from '@/lib/api';
import { presentation } from '@/lib/catalogue';
import { DashboardSkeleton, ErrorState } from '@/components/ui/Skeleton';
import type { ServiceItem } from '@/types';

export default function ServiceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || '';
  const [service, setService] = useState<ServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canRefer, setCanRefer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [services, user] = await Promise.all([
        ApiClient.getServices(),
        ApiClient.getMe().catch(() => null),
      ]);
      const match = services.find((s) => s.slug === slug || s.id === slug) || null;
      if (!match) {
        setError('This service offering is not currently active in the approved catalog.');
      } else {
        setService(match);
      }
      setCanRefer(Boolean(user && user.role !== 'COORDINATOR'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load service details');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (error || !service) {
    return (
      <div className="space-y-4">
        <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
          <ArrowLeft size={16} />
          <span>Back to Services Catalog</span>
        </Link>
        <ErrorState title="Service unavailable" message={error || 'Service not found'} onRetry={load} />
      </div>
    );
  }

  const meta = presentation(service.slug);
  const partnerPct = (service.defaultPartnerCommissionBps / 100).toFixed(2);
  const agentPct = (service.defaultAgentCommissionBps / 100).toFixed(2);
  const docs = Array.isArray(service.requiredDocs) ? service.requiredDocs : [];
  const packages = Array.isArray(service.packages) ? service.packages : [];

  return (
    <section className="space-y-6 pb-10">
      <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
        <ArrowLeft size={16} />
        <span>Back to Services &amp; Properties</span>
      </Link>

      {/* Hero Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm grid lg:grid-cols-5">
        <div className="relative min-h-[240px] lg:col-span-2 bg-slate-100">
          <Image src={meta.image} alt={service.name} fill className="object-cover" priority />
        </div>
        <div className="p-6 sm:p-8 lg:col-span-3 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                <Layers size={13} />
                <span>{service.category?.name || service.catalogMeta?.categoryGroup || meta.category}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <ShieldCheck size={13} />
                <span>Approved Offering</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{service.name}</h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {service.description || meta.prompt}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            {canRefer && (
              <Link
                href={`/referrals/new?service=${service.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#14243A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <span>Submit Referral</span>
                <ArrowUpRight size={16} />
              </Link>
            )}
            <Link
              href="/referrals"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>View My Pipeline</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Eligibility */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-blue-600" />
              <span>Eligibility &amp; Referral Requirements</span>
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {service.eligibilityInfo || 'Subject to Prospera intake review and client consent confirmation.'}
            </p>
          </div>

          {/* Expected Workflow */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Workflow size={18} className="text-indigo-600" />
              <span>Expected Workflow</span>
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {service.expectedWorkflow || 'Referral Submission → Prospera Intake → Specialist Assignment → Delivery'}
            </p>
          </div>

          {/* Configurable Packages (e.g. Free Zone packages) */}
          {packages.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Available Packages &amp; Options</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select a package to pre-fill your structured referral submission.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {packages.map((pkg) => (
                  <div key={pkg.slug} className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between gap-3 hover:border-blue-300 transition-colors">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{pkg.name}</h3>
                        {pkg.visaCount !== null && pkg.visaCount !== undefined && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            {pkg.visaCount === 0 ? '0 Visas' : `${pkg.visaCount} Visa${pkg.visaCount > 1 ? 's' : ''}`}
                          </span>
                        )}
                      </div>
                      {pkg.description && <p className="text-xs text-slate-600 mt-1.5">{pkg.description}</p>}
                    </div>
                    {canRefer && (
                      <Link
                        href={`/referrals/new?service=${service.id}&package=${pkg.id || pkg.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                      >
                        <span>Refer with this package</span>
                        <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checklist & Conditional Commission */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              <span>Required Documentation</span>
            </h2>
            {docs.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {docs.map((doc) => (
                  <li key={doc} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">Standard client identity and scope documentation collected during intake.</p>
            )}
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 space-y-3">
            <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
              <Info size={18} className="text-amber-700" />
              <span>Conditional Commission</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white p-3 border border-amber-200/70">
                <p className="text-xs text-slate-500">Partner Rate</p>
                <p className="text-lg font-bold text-slate-900">{partnerPct}%</p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-amber-200/70">
                <p className="text-xs text-slate-500">Agent Rate</p>
                <p className="text-lg font-bold text-slate-900">{agentPct}%</p>
              </div>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {service.catalogMeta?.commissionDisclosure ||
                'Commission eligibility is conditional upon client qualification, deal completion, settlement clearance, and compliance verification. Rates shown are illustrative of active default rules and are not guaranteed.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
