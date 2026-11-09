'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Users,
  ShieldAlert,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Headphones,
  Briefcase,
  Key,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { AdminDemoPersonaItem } from '../../../types';
import { ApiClient } from '../../../lib/api';

export default function AdminDemoPersonasPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<AdminDemoPersonaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState('Prospera@Demo2026!');

  const loadPersonas = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiClient.getAdminDemoPersonas();
      setPersonas(res.personas || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load demo personas directory');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  const handleSwitchPersona = async (email: string) => {
    if (!confirm(`Authenticate as ${email} via real backend authentication?`)) return;

    setSwitchingEmail(email);
    setErrorMsg(null);
    try {
      // Authenticate through the real backend API endpoint
      const authResult = await ApiClient.login(email, customPassword);
      if (authResult?.token) {
        ApiClient.setToken(authResult.token);
        if (authResult.user) {
          ApiClient.setStoredUser(authResult.user);
        }

        // Determine destination dashboard based on role
        if (authResult.user?.role === 'ADMIN') {
          window.location.href = '/admin';
        } else if (authResult.user?.role === 'COORDINATOR') {
          window.location.href = '/coordinator';
        } else if (authResult.user?.role === 'REFERRAL_PARTNER') {
          window.location.href = '/partner';
        } else if (
          authResult.user?.agentType === 'AGENCY_MEMBER' &&
          (authResult.user as any)?.agencyRole !== 'AGENT'
        ) {
          window.location.href = '/agency';
        } else {
          window.location.href = '/';
        }
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? `Authentication failed: ${err.message}. Ensure demo users are seeded via "npm run seed:demo".`
          : 'Failed to authenticate demo persona'
      );
    } finally {
      setSwitchingEmail(null);
    }
  };

  const getPersonaIcon = (role: string, agentType?: string | null, agencyRole?: string | null) => {
    if (role === 'ADMIN') return <ShieldAlert size={22} className="text-rose-600" />;
    if (role === 'COORDINATOR') return <Headphones size={22} className="text-indigo-600" />;
    if (role === 'REFERRAL_PARTNER') return <Briefcase size={22} className="text-emerald-600" />;
    if (agencyRole === 'AGENCY_OWNER' || agencyRole === 'AGENCY_ADMIN') {
      return <Building2 size={22} className="text-blue-600" />;
    }
    return <Users size={22} className="text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Demo Personas Directory</h2>
            <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              Development Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Switch between pre-provisioned synthetic role personas to review role-specific portals.
          </p>
        </div>

        <button
          onClick={() => loadPersonas()}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Personas</span>
        </button>
      </div>

      {/* Security & Authentication Notice */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
          <Key size={16} />
          <span>Real Backend Authentication Enforcement</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Prospera enforces strict security boundaries: no token forging or localStorage role hacking is permitted.
          Switching personas calls the real <code>POST /api/v1/auth/login</code> endpoint with the persona&apos;s development credentials,
          issuing an authentic signed JWT session token.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Development Seed Password:</label>
          <input
            type="password"
            value={customPassword}
            onChange={(e) => setCustomPassword(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-xs"
          />
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Personas Grid */}
      {isLoading ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center p-8">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading demo personas...</span>
          </div>
        </div>
      ) : personas.length === 0 ? (
        <div className="min-h-[250px] bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-3 border border-amber-200">
            <Sparkles size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Demo Personas Detected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Run <code>npm run seed:demo</code> in your terminal to provision the 7 synthetic role accounts in the development database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {personas.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center">
                    {getPersonaIcon(p.role, p.agentType, p.agencyRole)}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {p.role}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-3 leading-snug">{p.fullName}</h4>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{p.email}</p>

                <div className="mt-3 space-y-1 text-xs">
                  {(p.agency?.name || p.agencyName) && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building2 size={12} className="text-slate-400" />
                      <span>{p.agency?.name || p.agencyName} ({p.agencyRole})</span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    {p.personaDescription || `${p.role} — ${p.agentType}`}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px]">
                  <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                    {p.accountStatus}
                  </span>
                  <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                    KYC: {p.kycStatus || 'ACTIVE'}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleSwitchPersona(p.email)}
                  disabled={switchingEmail === p.email}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  {switchingEmail === p.email ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Login as Persona</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

