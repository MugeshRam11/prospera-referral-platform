'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ReferralDetailModal } from './ReferralDetailModal';
import { Orientation } from './Orientation';
import { ApiClient } from '@/lib/api';
import type { LeadItem, UserSummary } from '@/types';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const login = pathname.startsWith('/auth');
  const [user, setUser] = useState<UserSummary | null>(null);
  const [lead, setLead] = useState<LeadItem | null>(null);
  const [mobile, setMobile] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (login) { setUser(null); setLead(null); return; }
    ApiClient.getMe().then(u => { if (active) { setUser(u); setError(''); } }).catch(e => {
      if (!active) return;
      if (!ApiClient.getToken()) router.replace('/auth/login');
      else setError(e.message);
    });
    return () => { active = false; };
  }, [login, router]);
  useEffect(() => {
    const open = (e: Event) => setLead((e as CustomEvent<LeadItem>).detail);
    window.addEventListener('prospera_open_detail', open);
    return () => window.removeEventListener('prospera_open_detail', open);
  }, []);
  if (login) return <main>{children}</main>;
  if (!user) return <main className="p-8" role="status">{error || 'Opening your workspace…'}</main>;
  const restricted = (pathname.startsWith('/admin') && user.role !== 'ADMIN') ||
    (pathname === '/coordinator' && !['ADMIN', 'COORDINATOR'].includes(user.role)) ||
    (pathname === '/partner' && user.role !== 'REFERRAL_PARTNER') ||
    (pathname === '/agency' && !user.agencyId && user.role !== 'ADMIN');
  return <div className="min-h-screen bg-[#F8FAFC]"><Sidebar user={user} isOpenMobile={mobile} onCloseMobile={() => setMobile(false)}/>
    <div className="lg:pl-64"><Header user={user} onOpenNewReferralModal={() => router.push('/referrals/new')}
      onToggleMobileMenu={() => setMobile(!mobile)} onSearch={q => window.dispatchEvent(new CustomEvent('prospera_search_query', { detail: q }))}/>
      <main className="mx-auto max-w-7xl p-5 sm:p-7"><Orientation key={user.id} user={user}/>{restricted ? <p role="alert">This workspace requires a different role. <a href="/">Open your dashboard</a></p> : children}</main></div>
    {lead && <ReferralDetailModal key={lead.id} user={user} lead={lead} isOpen onClose={() => setLead(null)} onStatusUpdated={updated => {
      setLead(updated); window.dispatchEvent(new CustomEvent('prospera_lead_updated', { detail: updated }));
    }}/>}</div>;
}
