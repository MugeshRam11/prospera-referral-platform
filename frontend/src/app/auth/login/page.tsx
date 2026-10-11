'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../../lib/api';
import prosperaLogo from '../../../assets/prospera-logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('ahmed.mansoori@apexadvisory.ae');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await ApiClient.login(email, password);
      window.location.href = '/';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await ApiClient.login('ahmed.mansoori@apexadvisory.ae', 'DemoPass123!');
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a192f',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '36px 36px 24px',
            textAlign: 'center',
            backgroundColor: '#0f172a',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              padding: '10px 18px',
              marginBottom: '16px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
          >
            <Image
              src={prosperaLogo}
              alt="Prospera"
              height={36}
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
              priority
            />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Corporate Partner Portal
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            UAE & Middle East Referral Management
          </p>
        </div>

        {/* Card Body */}
        <div style={{ padding: '32px 36px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label">Corporate Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.ae"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={isLoading}
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In to Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--blue-subtle)',
                border: '1px solid var(--blue-border)',
                color: 'var(--blue-primary)',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ShieldCheck size={16} />
              <span>1-Click Access as Demo Partner (Apex Advisory)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
