'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  FileText,
  Users,
  Building2,
  Coins,
  CreditCard,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  Headphones,
  Briefcase,
  LifeBuoy,
  Sparkles,
  Layers,
  History,
  BarChart3,
  UserCog,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';
import { UserSummary } from '../types';
import prosperaWhiteIcon from '../assets/prospera-white-logo-icon.png';
import founderAvatar from '../assets/founder.webp';
import sidebarPromoBg from '../assets/iStock-1572334424.webp';

interface SidebarProps {
  user: UserSummary | null;
  activeReferralCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeReferralCount,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const getPersonaNavigation = (): NavSection[] => {
    if (!user) {
      return [
        {
          items: [
            { label: 'Dashboard', href: '/', icon: LayoutDashboard },
            { label: 'Services', href: '/services', icon: Building2 },
          ],
        },
      ];
    }

    // 1. PLATFORM ADMIN
    if (user.role === 'ADMIN') {
      return [
        {
          title: 'Operations',
          items: [
            { label: 'Admin Overview', href: '/admin', icon: LayoutDashboard },
            { label: 'User Management', href: '/admin/users', icon: UserCog },
          ],
        },
        {
          title: 'Organization Network',
          items: [
            { label: 'Agencies', href: '/admin/agencies', icon: Building2 },
            { label: 'Agents Directory', href: '/admin/agents', icon: Users },
            { label: 'Coordinators', href: '/admin/coordinators', icon: Headphones },
            { label: 'Referral Partners', href: '/admin/partners', icon: Briefcase },
          ],
        },
        {
          title: 'Verification Center',
          items: [
            { label: 'KYC Review', href: '/admin/kyc', icon: ShieldCheck },
            { label: 'Banking Verification', href: '/admin/banking', icon: CreditCard },
          ],
        },
        {
          title: 'Referrals & Services',
          items: [
            { label: 'Referrals Pipeline', href: '/admin/referrals', icon: FileText },
            { label: 'Service Catalog', href: '/admin/services', icon: Layers },
          ],
        },
        {
          title: 'Finance & Analytics',
          items: [
            { label: 'Commissions', href: '/admin/commissions', icon: Coins },
            { label: 'Platform Reports', href: '/admin/reports', icon: BarChart3 },
            { label: 'Audit Logs', href: '/admin/audit-logs', icon: History },
            { label: 'Demo Personas', href: '/admin/demo-personas', icon: Sparkles },
            { label: 'Platform Settings', href: '/settings', icon: Settings },
          ],
        },
      ];
    }

    // 2. LEAD COORDINATOR
    if (user.role === 'COORDINATOR') {
      return [
        {
          title: 'Operations Desk',
          items: [
            { label: 'Coordinator Desk', href: '/coordinator', icon: Headphones },
            { label: 'Referral Queue', href: '/coordinator?tab=queue', icon: FileText },
          ],
        },
        {
          title: 'Ecosystem',
          items: [
            { label: 'Service Catalog', href: '/services', icon: Building2 },
            { label: 'Partners Directory', href: '/admin/partners', icon: Briefcase },
          ],
        },
        {
          title: 'Account',
          items: [
            { label: 'Profile & Settings', href: '/settings', icon: Settings },
            { label: 'Concierge Support', href: '/support', icon: LifeBuoy },
          ],
        },
      ];
    }

    // 3. CORPORATE REFERRAL PARTNER
    if (user.role === 'REFERRAL_PARTNER') {
      return [
        {
          title: 'Partner Portal',
          items: [
            { label: 'Partner Dashboard', href: '/partner', icon: LayoutDashboard },
            { label: 'Submit Client Lead', href: '/referrals/new', icon: Plus },
            { label: 'My Referrals', href: '/referrals', icon: FileText },
          ],
        },
        {
          title: 'Services & Commissions',
          items: [
            { label: 'Services Catalog', href: '/services', icon: Building2 },
            { label: 'Commissions Ledger', href: '/commissions', icon: Coins },
            { label: 'Payout Withdrawals', href: '/withdrawals', icon: CreditCard },
          ],
        },
        {
          title: 'Corporate Governance',
          items: [
            { label: 'Company KYC', href: '/kyc', icon: ShieldCheck },
            { label: 'Company Profile', href: '/settings', icon: Settings },
            { label: 'VIP Concierge', href: '/support', icon: LifeBuoy },
          ],
        },
      ];
    }

    // 4. AGENCY OWNER
    if (user.agentType === 'AGENCY_MEMBER' && user.agencyRole === 'AGENCY_OWNER') {
      return [
        {
          title: 'Agency Principal',
          items: [
            { label: 'Agency Console', href: '/agency', icon: Building2 },
            { label: 'Agency Pipeline', href: '/agency?tab=referrals', icon: FileText },
          ],
        },
        {
          title: 'Organization & Team',
          items: [
            { label: 'Brokers & Members', href: '/agency?tab=members', icon: Users },
            { label: 'Agency Documents', href: '/agency?tab=documents', icon: ShieldCheck },
            { label: 'Agency Settings', href: '/agency?tab=settings', icon: Settings },
          ],
        },
        {
          title: 'Financials & Market',
          items: [
            { label: 'Commissions Ledger', href: '/commissions', icon: Coins },
            { label: 'Agency Withdrawals', href: '/withdrawals', icon: CreditCard },
            { label: 'Service Catalog', href: '/services', icon: Building2 },
            { label: 'Agency Support', href: '/support', icon: LifeBuoy },
          ],
        },
      ];
    }

    // 5. AGENCY ADMIN
    if (user.agentType === 'AGENCY_MEMBER' && user.agencyRole === 'AGENCY_ADMIN') {
      return [
        {
          title: 'Agency Operations',
          items: [
            { label: 'Agency Dashboard', href: '/agency', icon: Building2 },
            { label: 'Team Pipeline', href: '/agency?tab=referrals', icon: FileText },
          ],
        },
        {
          title: 'Team Management',
          items: [
            { label: 'Brokers Directory', href: '/agency?tab=members', icon: Users },
            { label: 'Agency Documents', href: '/agency?tab=documents', icon: ShieldCheck },
          ],
        },
        {
          title: 'Services & Support',
          items: [
            { label: 'Service Catalog', href: '/services', icon: Building2 },
            { label: 'Commissions', href: '/commissions', icon: Coins },
            { label: 'Support Desk', href: '/support', icon: LifeBuoy },
          ],
        },
      ];
    }

    // 6. AGENCY MEMBER (Broker under an agency)
    if (user.agentType === 'AGENCY_MEMBER') {
      return [
        {
          title: 'Broker Workspace',
          items: [
            { label: 'My Dashboard', href: '/', icon: LayoutDashboard },
            { label: 'Assigned Pipeline', href: '/referrals', icon: FileText },
            { label: 'Properties & Services', href: '/services', icon: Building2 },
          ],
        },
        {
          title: 'Earnings & Compliance',
          items: [
            { label: 'My Commissions', href: '/commissions', icon: Coins },
            { label: 'My Withdrawals', href: '/withdrawals', icon: CreditCard },
            { label: 'My Broker KYC', href: '/kyc', icon: ShieldCheck },
            { label: 'Profile & Settings', href: '/settings', icon: Settings },
            { label: 'Support Desk', href: '/support', icon: LifeBuoy },
          ],
        },
      ];
    }

    // 7. INDEPENDENT AGENT
    return [
      {
        title: 'Broker Workspace',
        items: [
          { label: 'Dashboard', href: '/', icon: LayoutDashboard },
          { label: 'My Pipeline', href: '/referrals', icon: FileText },
          { label: 'Services Catalog', href: '/services', icon: Building2 },
        ],
      },
      {
        title: 'Earnings & Compliance',
        items: [
          { label: 'Commissions', href: '/commissions', icon: Coins },
          { label: 'Withdrawals', href: '/withdrawals', icon: CreditCard },
          { label: 'Broker KYC', href: '/kyc', icon: ShieldCheck },
          { label: 'Settings', href: '/settings', icon: Settings },
          { label: 'Concierge Support', href: '/support', icon: LifeBuoy },
        ],
      },
    ];
  };

  const navSections = getPersonaNavigation();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('prospera_corporate_session_token');
      localStorage.removeItem('prospera_user');
      window.location.href = '/auth/login';
    }
  };

  const getPersonaRoleLabel = (): { title: string; badge: string; color: string } => {
    if (!user) return { title: 'Prospera Member', badge: 'Guest', color: 'bg-slate-800 text-slate-300' };
    if (user.role === 'ADMIN') return { title: user.fullName, badge: 'Platform Admin', color: 'bg-rose-950/80 text-rose-300 border-rose-800/80' };
    if (user.role === 'COORDINATOR') return { title: user.fullName, badge: 'Lead Coordinator', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80' };
    if (user.role === 'REFERRAL_PARTNER') return { title: user.fullName, badge: user.companyName || 'Corporate Partner', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' };
    if (user.agentType === 'AGENCY_MEMBER') {
      if (user.agencyRole === 'AGENCY_OWNER') {
        return { title: user.fullName, badge: `Owner • ${user.agency?.name || 'Agency'}`, color: 'bg-blue-950/80 text-blue-300 border-blue-800/80' };
      }
      if (user.agencyRole === 'AGENCY_ADMIN') {
        return { title: user.fullName, badge: `Admin • ${user.agency?.name || 'Agency'}`, color: 'bg-sky-950/80 text-sky-300 border-sky-800/80' };
      }
      return { title: user.fullName, badge: `Broker • ${user.agency?.name || 'Agency'}`, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
    return { title: user.fullName, badge: 'Independent Agent', color: 'bg-blue-950/80 text-blue-300 border-blue-800/80' };
  };

  const roleInfo = getPersonaRoleLabel();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A1227] text-white flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800/80 shadow-2xl overflow-y-auto`}
        aria-label="Application Navigation Sidebar"
      >
        {/* Top Header & Navigation */}
        <div className="flex flex-col flex-1">
          {/* Brand Header */}
          <div className="p-5 pb-6 flex items-center justify-between border-b border-slate-800/60">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 relative flex-shrink-0">
                <Image
                  src={prosperaWhiteIcon}
                  alt="Prospera Monogram"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-extrabold text-lg tracking-wider leading-none">
                  PROSPERA
                </span>
                <span className="text-slate-400 text-[10px] tracking-tight mt-1">
                  More Opportunities. Greater Value.
                </span>
              </div>
            </Link>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Navigation Sections */}
          <nav className="p-3 space-y-4 mt-1">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {section.title && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/70">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.href.split('?')[0]);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`flex items-center justify-between px-3.5 py-2.2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/30 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={16}
                          className={isActive ? 'text-white' : 'text-slate-400'}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Promo Card & User Identity */}
        <div className="p-3 pt-2 space-y-3">
          {/* Promo Card (For Non-Admins) */}
          {user?.role !== 'ADMIN' && (
            <div className="rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg group">
              <div className="absolute inset-0">
                <Image
                  src={sidebarPromoBg}
                  alt="Dubai Skyline"
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-900/40" />
              </div>

              <div className="relative p-3.5 flex flex-col justify-between min-h-[140px]">
                <div>
                  <h4 className="text-white font-bold text-xs leading-snug">
                    More than<br />just referrals
                  </h4>
                  <p className="text-slate-300 text-[10px] mt-1.5 leading-relaxed font-light">
                    Property • Mortgage • Golden Visa<br />
                    Corporate Advisory • Bank Accounts
                  </p>
                </div>

                <Link
                  href="/services"
                  className="mt-2.5 inline-flex items-center justify-center gap-1.5 bg-white text-slate-900 font-semibold text-[11px] py-1.5 px-3 rounded-full hover:bg-slate-100 transition-colors shadow-sm w-fit"
                >
                  <span>Explore Catalog</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}

          {/* User Profile Footer Card */}
          <div className="bg-[#070D1D] rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-blue-500/30 flex-shrink-0 bg-slate-800 flex items-center justify-center">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={founderAvatar}
                    alt={user?.fullName || 'Prospera Member'}
                    fill
                    className="object-cover"
                  />
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#070D1D]" />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-white text-xs font-bold leading-tight truncate">
                  {roleInfo.title}
                </span>
                <span
                  className="text-[10px] text-slate-400 font-medium leading-none mt-0.5 truncate"
                  title={roleInfo.badge}
                >
                  {roleInfo.badge}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
              title="Log Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
