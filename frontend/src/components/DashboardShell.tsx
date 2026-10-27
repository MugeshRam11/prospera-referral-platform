'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateReferralModal } from './CreateReferralModal';
import { ReferralDetailModal } from './ReferralDetailModal';
import { WithdrawalModal } from './WithdrawalModal';
import { UserSummary, LeadItem, ServiceItem, BankAccountItem, WithdrawalItem } from '../types';
import { ApiClient } from '../lib/api';

interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [withdrawableBalance, setWithdrawableBalance] = useState<number>(0);
  const [activeLeadsCount, setActiveLeadsCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [activeDetailLead, setActiveDetailLead] = useState<LeadItem | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const u = await ApiClient.getMe();
        setUser(u);

        const s = await ApiClient.getServices();
        setServices(s);

        const b = await ApiClient.getBankAccounts();
        setBankAccounts(b);

        const metrics = await ApiClient.getDashboardMetrics();
        setWithdrawableBalance(metrics.withdrawableBalance);

        const leads = await ApiClient.getReferrals();
        setActiveLeadsCount(
          leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length
        );
      } catch (err) {
        console.error('Failed to load initial data', err);
      }
    };
    initData();
  }, []);

  const handleReferralCreated = async (newLead: LeadItem) => {
    setActiveLeadsCount((prev) => prev + 1);
    window.dispatchEvent(new CustomEvent('prospera_referral_created', { detail: newLead }));
  };

  const handleWithdrawalRequested = async (newWithdrawal: WithdrawalItem) => {
    const metrics = await ApiClient.getDashboardMetrics();
    setWithdrawableBalance(metrics.withdrawableBalance);
    window.dispatchEvent(new CustomEvent('prospera_withdrawal_created', { detail: newWithdrawal }));
  };

  useEffect(() => {
    const handleOpenDetail = (e: CustomEvent<LeadItem>) => {
      setActiveDetailLead(e.detail);
    };
    const handleOpenWithdrawal = () => {
      setIsWithdrawModalOpen(true);
    };
    const handleOpenCreate = () => {
      setIsCreateModalOpen(true);
    };

    return () => {
      window.removeEventListener('prospera_open_detail' as any, handleOpenDetail as any);
      window.removeEventListener('prospera_open_withdraw' as any, handleOpenWithdrawal);
      window.removeEventListener('prospera_open_create' as any, handleOpenCreate);
    };
  }, []);

  if (pathname && pathname.startsWith('/auth')) {
    return <main>{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navy Sidebar with Mobile Drawer support */}
      <Sidebar
        user={user}
        activeReferralCount={activeLeadsCount}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          user={user}
          onOpenNewReferralModal={() => setIsCreateModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onSearch={(q) => {
            window.dispatchEvent(new CustomEvent('prospera_search_query', { detail: q }));
          }}
        />

        <main className="flex-1 p-5 sm:p-7 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Global Modals */}
      <CreateReferralModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReferralCreated={handleReferralCreated}
        services={services}
      />

      <ReferralDetailModal
        lead={activeDetailLead}
        isOpen={!!activeDetailLead}
        onClose={() => setActiveDetailLead(null)}
        onStatusUpdated={(updated) => {
          setActiveDetailLead(updated);
          window.dispatchEvent(new CustomEvent('prospera_lead_updated', { detail: updated }));
        }}
      />

      <WithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        withdrawableBalance={withdrawableBalance}
        bankAccounts={bankAccounts}
        onWithdrawalRequested={handleWithdrawalRequested}
      />
    </div>
  );
};
