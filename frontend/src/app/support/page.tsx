'use client';

import React, { useState } from 'react';
import {
  Headphones,
  Mail,
  Phone,
  Clock,
  Send,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  CreditCard,
  FileText,
  MessageSquare,
} from 'lucide-react';

export default function SupportDeskPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('REFERRAL_STATUS');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Support Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-800/40">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center flex-shrink-0">
            <Headphones size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Prospera Partner & Agent Concierge
            </h1>
            <p className="text-xs text-blue-200/80 mt-1">
              Direct institutional facilitation for high-value referral operations, KYC processing, and payout clearance.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Direct Contact Info */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Direct Relationship Desk</h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail size={15} />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">VIP Concierge Email</span>
                  <a
                    href="mailto:concierge@prospera.ae"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    concierge@prospera.ae
                  </a>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Response under 2 hours</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone size={15} />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">Dedicated Desk Hotline</span>
                  <span className="font-mono text-slate-700">+971 4 550 9000</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Direct coordinator transfer</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={15} />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">UAE Business Hours</span>
                  <span className="text-slate-600">Mon – Fri: 9:00 AM – 6:00 PM GST</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Emergency support 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-blue-600" />
              <span>Standard SLAs</span>
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              • KYC Verification: <strong>24 business hours</strong><br />
              • Lead Coordinator Assignment: <strong>Instant to 4 hours</strong><br />
              • Bank Account Verification: <strong>1 business day</strong><br />
              • Payout Clearance: <strong>3-5 business days post deal closure</strong>
            </p>
          </div>
        </div>

        {/* Right Column: Ticket / Inquiry Form */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          {submitted ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Inquiry Dispatched</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Your request has been routed to your dedicated Prospera Transaction Coordinator. You will receive an email update shortly.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setSubject('');
                  setMessage('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white mt-2"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <MessageSquare size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Submit Facilitation Inquiry</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="REFERRAL_STATUS">Referral Status Progression</option>
                  <option value="KYC_ASSISTANCE">KYC Document Approval Support</option>
                  <option value="COMMISSION_PAYOUT">Commission Split & Payout Clearance</option>
                  <option value="AGENCY_ONBOARDING">Agency Organization & Broker Invitations</option>
                  <option value="TECHNICAL">Platform Access & Technical Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead status update for Ahmed Al Mansoori (REF-0048)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Details *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Provide context, deal ID, or any specific documents relevant to your query..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send size={13} />
                  <span>Send to Concierge Desk</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

