'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ReferralDetailModal } from './ReferralDetailModal';
import { Orientation } from './Orientation';
import { DashboardSkeleton, ErrorState } from './ui/Skeleton';
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

  const loadSession = useCallback(() => {
    let active = true;
    setError('');
    ApiClient.getMe()
      .then((u) => {
        if (active) {
          setUser(u);
          setError('');
        }
      })
      .catch((e) => {
        if (!active) return;
        if (!ApiClient.getToken()) router.replace('/auth/login');
        else setError(e instanceof Error ? e.message : 'Unable to load workspace');
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (login) {
      setUser(null);
      setLead(null);
      return;
    }
    return loadSession();
  }, [login, loadSession]);

  useEffect(() => {
    const open = (e: Event) => setLead((e as CustomEvent<LeadItem>).detail);
    window.addEventListener('prospera_open_detail', open);
    return () => window.removeEventListener('prospera_open_detail', open);
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobile]);

  if (login) return <main>{children}</main>;

  if (!user) {
    if (error) {
      return (
        <main className="min-h-screen bg-[#F8FAFC] p-6 sm:p-10 max-w-2xl mx-auto flex items-center">
          <div className="w-full space-y-4">
            <ErrorState
              title="Unable to open your workspace"
              message={error}
              onRetry={() => loadSession()}
            />
            <div className="text-center">
              <Link href="/auth/login" className="text-sm font-semibold text-blue-700 hover:underline">
                Return to sign in
              </Link>
            </div>
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-[#F8FAFC]">
        <DashboardSkeleton />
      </main>
    );
  }

  const restricted =
    (pathname.startsWith('/admin') && user.role !== 'ADMIN') ||
    (pathname === '/coordinator' && !['ADMIN', 'COORDINATOR'].includes(user.role)) ||
    (pathname === '/partner' && user.role !== 'REFERRAL_PARTNER') ||
    (pathname === '/agency' && !user.agencyId && user.role !== 'ADMIN');

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar user={user} isOpenMobile={mobile} onCloseMobile={() => setMobile(false)} />
      <div className="lg:pl-72 transition-[padding] duration-200">
        <Header
          user={user}
          onOpenNewReferralModal={() => router.push('/referrals/new')}
          onToggleMobileMenu={() => setMobile(!mobile)}
          onSearch={(q) => window.dispatchEvent(new CustomEvent('prospera_search_query', { detail: q }))}
        />
        <main className="mx-auto max-w-7xl p-5 sm:p-8">
          <Orientation key={user.id} user={user} />
          {restricted ? (
            <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              This workspace requires a different role.{' '}
              <Link href="/" className="font-semibold underline">
                Open your dashboard
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      {lead && (
        <ReferralDetailModal
          key={lead.id}
          user={user}
          lead={lead}
          isOpen
          onClose={() => setLead(null)}
          onStatusUpdated={(updated) => {
            setLead(updated);
            window.dispatchEvent(new CustomEvent('prospera_lead_updated', { detail: updated }));
          }}
        />
      )}
    </div>
  );
}
