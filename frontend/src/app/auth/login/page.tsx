'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';
import { ApiClient } from '../../../lib/api';
import prosperaLogo from '../../../assets/prospera-logo.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your corporate email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await ApiClient.login(email.trim(), password);
      // On success, redirect to dashboard or intended target
      window.location.href = '/';
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid credentials. Please verify your email and password.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
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
          <p
            style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              marginTop: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
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
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                Corporate Email Address <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email-input"
                  type="email"
                  className="form-input"
                  placeholder="name@company.ae"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password-input">
                Account Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password-input"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              disabled={isLoading}
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* Secure Institutional Footer Note */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Lock size={12} />
            <span>Encrypted Session • UAE Compliance Tier-1 Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
