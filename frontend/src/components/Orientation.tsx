'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import type { UserSummary } from '@/types';

type Step = [string, string, string];
const profile: Step = ['Complete your profile', 'Review your contact and company details.', '/settings'];
const kyc: Step = ['Review verification requirements', 'Open your verification record and see which documents are required.', '/kyc'];
const bank: Step = ['Review banking details', 'Manage your own banking information in account settings.', '/settings'];
const discover: Step = ['Discover services', 'Choose an active service or explore illustrative properties.', '/services'];
const track: Step = ['Track referrals', 'Open a reference to see its responsible team and recorded activity.', '/referrals'];
function guide(user: UserSummary): { name: string; steps: Step[] } {
  if (user.role === 'ADMIN') return { name: 'Platform Admin', steps: [['Organization overview', 'Review the network and its operational queues.', '/admin'], ['Agency verification', 'Inspect agency applications and verification status.', '/admin/agencies'], ['Compliance', 'Open the KYC review queue.', '/admin/kyc'], ['Review activity', 'Inspect operational audit records.', '/admin/audit-logs']] };
  if (user.role === 'COORDINATOR') return { name: 'Coordinator', steps: [['Central intake', 'Open an approved referral and choose an eligible agent.', '/coordinator'], ['Follow up', 'Review assigned work and record the next action.', '/referrals']] };
  if (user.agencyRole === 'AGENCY_OWNER' || user.agencyRole === 'AGENCY_ADMIN') return {
    name: user.agencyRole === 'AGENCY_OWNER' ? 'Agency Owner' : 'Agency Admin', steps: [profile, ['Agency team', 'Check your roster, verification and invitations.', '/agency'], ['Agency review', 'Approve member referrals or return them with a reason.', '/referrals'], track] };
  if (user.agencyId) return { name: 'Agency Member', steps: [profile, kyc, discover, ['Submit to your agency', 'Confirm consent and send the referral for internal review.', '/referrals/new'], track] };
  return { name: user.role === 'REFERRAL_PARTNER' ? 'Corporate Referral Partner' : 'Independent Agent', steps: [profile, kyc, bank, discover, ['Submit to Prospera', 'Send a new client opportunity to central intake.', '/referrals/new'], track] };
}
export function Orientation({ user }: { user: UserSummary }) {
  const [record, setRecord] = useState<Awaited<ReturnType<typeof ApiClient.getOrientation>>>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { ApiClient.getOrientation().then(setRecord).catch(e => setError(e.message)); }, []);
  const { name, steps } = guide(user);
  const step = Math.min(record?.step ?? 0, steps.length - 1);
  const [title, description, href] = steps[step];
  async function save(index: number, state: 'active' | 'skipped' | 'complete') {
    setBusy(true); setError('');
    try { setRecord(await ApiClient.saveOrientation(index, state)); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save tour progress'); }
    finally { setBusy(false); }
  }
  return <aside aria-label="Workspace orientation" className="mb-4 text-sm">
    <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <summary className="cursor-pointer font-semibold text-blue-800">Workspace guide · {name}</summary>
      {error && <p role="alert">Workspace guide unavailable. {error}</p>}
      {record && (record.state === 'active' ? <div className="space-y-3 rounded-2xl border border-blue-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-bold">Welcome to Prospera · {name}</h2><button disabled={busy} onClick={() => save(step, 'skipped')}>Skip tour</button></div>
        <p className="text-xs text-slate-500">Workspace guide · {step + 1} of {steps.length}</p>
        <strong>{title}</strong><p>{description}</p>
        <div className="flex flex-wrap gap-4 font-semibold text-blue-800"><Link href={href}>{title} →</Link>
          {step > 0 && <button disabled={busy} onClick={() => save(step - 1, 'active')}>Previous</button>}
          <button disabled={busy} onClick={() => step + 1 === steps.length ? save(step, 'complete') : save(step + 1, 'active')}>{step + 1 === steps.length ? 'Finish tour' : 'Next step'}</button></div>
      </div> : <button disabled={busy} className="text-blue-800 underline" onClick={() => save(record.state === 'complete' ? 0 : step, 'active')}>{record.state === 'complete' ? 'Replay tour' : 'Resume tour'}</button>)}
    </details>
  </aside>;
}
