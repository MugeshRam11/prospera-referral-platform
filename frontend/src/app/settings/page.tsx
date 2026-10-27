'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Copy,
  Check,
  Building,
  Key,
  LogOut,
  Trash2,
  Camera,
  Plus,
  Search,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  CreditCard,
  X,
  Send,
  MessageSquare,
  Lock,
} from 'lucide-react';
import {
  FullProfile,
  MyAgencyResponse,
  AgencyDetails,
  BankAccountItem,
  KycDocumentItem,
  AgencyRole,
} from '../../types';
import { ApiClient } from '../../lib/api';
import founderAvatar from '../../assets/founder.webp';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'support'>('profile');

  // Profile States
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Form Fields for Profile Edit
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [brn, setBrn] = useState('');
  const [nationality, setNationality] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Agency States
  const [agencyData, setAgencyData] = useState<MyAgencyResponse | null>(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(true);
  const [agencyError, setAgencyError] = useState<string | null>(null);
  const [agencySuccess, setAgencySuccess] = useState<string | null>(null);

  // Agency Registration Form Fields
  const [agencyName, setAgencyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeLicenseNo, setTradeLicenseNo] = useState('');
  const [orn, setOrn] = useState('');
  const [dedLicenseNo, setDedLicenseNo] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [agencyPoBox, setAgencyPoBox] = useState('');
  const [isRegisteringAgency, setIsRegisteringAgency] = useState(false);

  // Agency Invitation Form Fields
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'AGENT' | 'AGENCY_ADMIN'>('AGENT');
  const [isInviting, setIsInviting] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Banking States
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState('Emirates NBD');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [isPrimaryBank, setIsPrimaryBank] = useState(true);
  const [confirmationDoc, setConfirmationDoc] = useState<File | null>(null);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Modals & Action States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // FAQ Search
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Support inquiry form
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);

  // Load Initial Data
  const loadProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const p = await ApiClient.getProfile();
      setProfile(p);
      setFullName(p.fullName || '');
      setPhone(p.phone || '');
      setWhatsapp(p.whatsapp || '');
      setBrn(p.brn || '');
      setNationality(p.nationality || '');
      setCompanyName(p.companyName || '');
      setBankAccounts(p.bankAccounts || []);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile details.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadAgency = async () => {
    setIsLoadingAgency(true);
    setAgencyError(null);
    try {
      const res = await ApiClient.getMyAgency();
      setAgencyData(res);
      if (res.agency) {
        setAgencyName(res.agency.name || '');
        setLegalName(res.agency.legalName || '');
        setTradeLicenseNo(res.agency.tradeLicenseNo || '');
        setOrn(res.agency.orn || '');
        setDedLicenseNo(res.agency.dedLicenseNo || '');
        setAgencyEmail(res.agency.email || '');
        setAgencyPhone(res.agency.phone || '');
        setAgencyAddress(res.agency.address || '');
        setAgencyPoBox(res.agency.poBox || '');
      }
    } catch (err: unknown) {
      setAgencyError(err instanceof Error ? err.message : 'Failed to load agency context.');
    } finally {
      setIsLoadingAgency(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadAgency();
  }, []);

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const updated = await ApiClient.updateProfile({
        fullName,
        phone,
        whatsapp,
        brn,
        nationality,
        companyName,
      });
      setProfile(updated);
      setProfileSuccess('Profile credentials updated successfully.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProfileSuccess('Uploading profile image...');
      const res = await ApiClient.uploadAvatar(file);
      await loadProfile();
      setProfileSuccess('Profile photograph updated successfully.');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to upload photo.');
    }
  };

  // Register Agency Handler
  const handleRegisterAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegisteringAgency(true);
    setAgencyError(null);
    setAgencySuccess(null);
    try {
      await ApiClient.registerAgency({
        name: agencyName,
        legalName,
        tradeLicenseNo,
        orn: orn || null,
        dedLicenseNo: dedLicenseNo || null,
        email: agencyEmail,
        phone: agencyPhone,
        address: agencyAddress || null,
        poBox: agencyPoBox || null,
      });
      await loadAgency();
      await loadProfile();
      setAgencySuccess('Agency registered successfully. Review pending compliance approval.');
      setTimeout(() => setAgencySuccess(null), 4000);
    } catch (err: unknown) {
      setAgencyError(err instanceof Error ? err.message : 'Failed to register agency.');
    } finally {
      setIsRegisteringAgency(false);
    }
  };

  // Join Agency Handler
  const handleJoinAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinToken.trim()) return;
    setIsJoining(true);
    setAgencyError(null);
    try {
      await ApiClient.joinAgency(joinToken.trim());
      await loadAgency();
      await loadProfile();
      setAgencySuccess('Successfully joined organization!');
      setJoinToken('');
      setTimeout(() => setAgencySuccess(null), 4000);
    } catch (err: unknown) {
      setAgencyError(err instanceof Error ? err.message : 'Invalid or expired invite token.');
    } finally {
      setIsJoining(false);
    }
  };

  // Invite Agent Handler
  const handleInviteAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyData?.agency?.id || !inviteEmail.trim()) return;
    setIsInviting(true);
    setAgencyError(null);
    try {
      await ApiClient.inviteAgencyAgent(agencyData.agency.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      await loadAgency();
      setAgencySuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setTimeout(() => setAgencySuccess(null), 4000);
    } catch (err: unknown) {
      setAgencyError(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  // Remove Agency Member Handler
  const handleRemoveMember = async (memberId: string) => {
    if (!agencyData?.agency?.id) return;
    if (!confirm('Are you sure you want to remove this member from the organization?')) return;
    try {
      await ApiClient.removeAgencyMember(agencyData.agency.id, memberId);
      await loadAgency();
      setAgencySuccess('Member removed successfully.');
      setTimeout(() => setAgencySuccess(null), 3000);
    } catch (err: unknown) {
      setAgencyError(err instanceof Error ? err.message : 'Failed to remove member.');
    }
  };

  // Add Bank Account Handler
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBank(true);
    setBankError(null);

    try {
      const formData = new FormData();
      formData.append('bankName', bankName);
      formData.append('accountHolderName', accountHolderName);
      formData.append('iban', iban.replace(/\s+/g, ''));
      if (swift) formData.append('swift', swift);
      formData.append('currency', 'AED');
      formData.append('isPrimary', isPrimaryBank.toString());
      if (confirmationDoc) {
        formData.append('confirmationDoc', confirmationDoc);
      }

      await ApiClient.addBankAccount(formData);
      await loadProfile();
      setIsAddBankModalOpen(false);
      setAccountHolderName('');
      setIban('');
      setSwift('');
      setConfirmationDoc(null);
      setProfileSuccess('Bank settlement route added successfully and queued for verification.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: unknown) {
      setBankError(err instanceof Error ? err.message : 'Failed to submit bank account.');
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // Delete Bank Account Handler
  const handleDeleteBank = async (accountId: string) => {
    if (!confirm('Are you sure you want to remove this settlement bank account?')) return;
    try {
      await ApiClient.deleteBankAccount(accountId);
      await loadProfile();
      setProfileSuccess('Bank account removed.');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to remove bank account.');
    }
  };

  // Account Deletion Handler
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await ApiClient.requestAccountDeletion();
      setIsDeleteModalOpen(false);
      alert('Your deletion request has been submitted to the compliance registry.');
      await ApiClient.logout();
      window.location.href = '/auth/login';
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit deletion request.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy Helpers
  const copyReferral = () => {
    if (typeof navigator !== 'undefined') {
      const link = `https://portal.prospera.ae/r/${profile?.referralCode || 'PROSPERA-2026'}`;
      navigator.clipboard.writeText(link);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const copyToken = (tok: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(tok);
      setCopiedToken(tok);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  // FAQ Data List
  const faqList = [
    {
      q: 'How does Prospera calculate referral commissions?',
      a: 'Commissions are calculated based on the agreed basis points (BPS) for each institutional service line. Luxury Property acquisitions yield up to 200 BPS (2.0%), Mortgage Brokerage yields 50-75 BPS, and UAE Golden Visa processing provides fixed high-tier payouts upon official clearance and settlement.',
    },
    {
      q: 'What KYC identity documents are required for UAE compliance?',
      a: 'Under UAE Federal Decree-Law No. (20) of 2018 on AML/CFT, all individual agents must provide a clear, color scan of their Emirates ID (front & back) or a valid International Passport. If you are registered with DLD/RERA, your Broker Card (BRN) should also be uploaded.',
    },
    {
      q: 'How are banking settlement accounts verified?',
      a: 'To prevent unauthorized routing and comply with UAE Central Bank financial regulations, bank details require matching account holder names and an official Bank Confirmation Letter or stamped statement. Account IBANs are encrypted at rest using AES-256-GCM.',
    },
    {
      q: 'Can I switch from an Independent Agent to an Agency Member?',
      a: 'Yes. You can join any licensed UAE agency using an invitation token generated by the agency owner, or register your own commercial real estate brokerage directly in the Agency tab.',
    },
    {
      q: 'What does "Changes Requested" mean on a KYC document?',
      a: 'If a compliance officer marks a document as "Changes Requested," the document was rejected due to an issue (e.g. illegible copy, expired validity, or missing corners). A detailed note is provided so you can upload a corrected copy immediately.',
    },
    {
      q: 'How long do withdrawal payouts take to process?',
      a: 'Verified accounts with cleared commission balances are processed within 1-2 UAE business banking days via local UAE Central Bank IPI (Instant Payment Instruction) directly in AED.',
    },
  ];

  const filteredFaqs = faqList.filter(
    (item) =>
      item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Account & Organization Settings
          </h1>
          <p className="page-desc text-slate-500 text-sm mt-1">
            Manage your professional identity, UAE licensing, agency organization, and settlement banking.
          </p>
        </div>

        {/* Global Tab Navigation */}
        <div className="inline-flex bg-slate-200/70 p-1 rounded-xl shadow-inner border border-slate-300/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('agency')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'agency'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 size={16} />
            <span>Agency</span>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'support'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle size={16} />
            <span>FAQ & Support</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {profileSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}
      {profileError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 shadow-xs animate-fadeIn">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span>{profileError}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 1: PROFILE                                                        */}
      {/* ==================================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Overview & Completion Hero Card */}
          <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              {/* Avatar & Identifiers */}
              <div className="flex items-center gap-4">
                <div className="relative group w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-blue-500/20 bg-slate-100 flex-shrink-0 shadow-sm">
                  {profile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={founderAvatar}
                      alt={profile?.fullName || 'User Profile'}
                      fill
                      className="object-cover"
                    />
                  )}

                  {/* Camera overlay for avatar upload */}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[11px] font-medium"
                    title="Upload New Photograph"
                  >
                    <Camera size={20} className="mb-0.5" />
                    <span>Upload</span>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">
                      {profile?.fullName || 'Super Agent'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {profile?.role === 'ADMIN'
                        ? 'Administrator'
                        : profile?.agentType === 'AGENCY_MEMBER'
                        ? 'Agency Member'
                        : 'Independent Partner'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        profile?.accountStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : profile?.accountStatus === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {profile?.accountStatus || 'PENDING_VERIFICATION'}
                    </span>
                  </div>

                  <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400" />
                    <span>{profile?.email}</span>
                    <span className="text-emerald-600 font-semibold text-[11px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 flex items-center gap-0.5">
                      <Check size={10} /> Verified
                    </span>
                  </p>

                  <p className="text-slate-400 text-xs mt-0.5">
                    Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'October 2026'}
                  </p>
                </div>
              </div>

              {/* Referral Tracking Link Pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between sm:w-72">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Partner Referral Code
                </span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="font-mono text-sm font-bold text-slate-800 tracking-wide">
                    {profile?.referralCode || 'APEX-2026'}
                  </span>
                  <button
                    onClick={copyReferral}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    {copiedReferral ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Completion Progress Score */}
            <div className="mt-6 pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    UAE Regulatory Profile Completion
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                      (profile?.completion?.percentage || 0) >= 85
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {profile?.completion?.percentage || 0}% Complete
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {(profile?.completion?.percentage || 0) >= 85
                    ? 'Eligible for instant referral clearance'
                    : 'Minimum 85% required for commission payouts'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                <div
                  className={`h-full transition-all duration-500 ${
                    (profile?.completion?.percentage || 0) >= 85
                      ? 'bg-emerald-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${profile?.completion?.percentage || 0}%` }}
                />
              </div>

              {/* Dynamic Checklist Breakdown */}
              {profile?.completion?.checklist && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4">
                  {profile.completion.checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                        item.completed
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold opacity-75">+{item.weight}%</span>
                        {item.completed ? (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        ) : (
                          <Clock size={13} className="text-slate-400" />
                        )}
                      </div>
                      <span className="font-medium text-[11px] leading-tight truncate" title={item.field}>
                        {item.field}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Editable Personal & Professional Credentials */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="panel-header mb-5 border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Professional Credentials & Contact
                  </h3>
                  <p className="text-xs text-slate-500">
                    Your institutional contact details for referral coordination.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="form-group">
                  <label className="form-label text-xs font-bold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Corporate Email Address</span>
                    <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                      <Lock size={11} /> Read-only
                    </span>
                  </label>
                  <input
                    type="email"
                    className="form-input w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                    value={profile?.email || ''}
                    readOnly
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label text-xs font-bold text-slate-700">
                      Mobile Telephone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                      placeholder="+971 50 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs font-bold text-slate-700">
                      WhatsApp Messaging
                    </label>
                    <input
                      type="text"
                      className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                      placeholder="+971 50 000 0000"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label text-xs font-bold text-slate-700">
                      Professional BRN / Broker Card
                    </label>
                    <input
                      type="text"
                      className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                      placeholder="e.g. BRN-48921"
                      value={brn}
                      onChange={(e) => setBrn(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs font-bold text-slate-700">
                      Nationality / Jurisdiction
                    </label>
                    <input
                      type="text"
                      className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                      placeholder="e.g. United Arab Emirates"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs font-bold text-slate-700">
                    Trade / Operating Entity Name
                  </label>
                  <input
                    type="text"
                    className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. Apex Advisory & Capital LLC"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (profile) {
                        setFullName(profile.fullName || '');
                        setPhone(profile.phone || '');
                        setWhatsapp(profile.whatsapp || '');
                        setBrn(profile.brn || '');
                        setNationality(profile.nationality || '');
                        setCompanyName(profile.companyName || '');
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    Reset Changes
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Banking Settlement Routes & Identity Cards */}
            <div className="space-y-6">
              {/* Settlement Bank Accounts Panel */}
              <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Settlement Bank Accounts
                    </h3>
                    <p className="text-xs text-slate-500">
                      UAE IBAN settlement accounts for cleared referral commission payouts.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddBankModalOpen(true)}
                    className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Bank</span>
                  </button>
                </div>

                {bankAccounts.length === 0 ? (
                  <div className="p-5 rounded-xl border border-dashed border-slate-200 text-center bg-slate-50">
                    <CreditCard size={28} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No bank account linked</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add a verified UAE bank account to receive commission settlements.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bankAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                            AED
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{acc.bankName}</span>
                              {acc.isPrimary && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                                  Primary
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  acc.isVerified
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {acc.isVerified ? 'Verified' : 'Pending Review'}
                              </span>
                            </div>
                            <p className="font-mono text-xs text-slate-600 mt-0.5">
                              {acc.maskedIban || `AE*****************${acc.ibanLast4}`}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Holder: {acc.accountHolderName}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteBank(acc.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Identity & KYC Verification Quick Card */}
              <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Compliance & KYC Verification
                    </h3>
                    <p className="text-xs text-slate-500">
                      Verified under UAE Federal AML/CFT Regulations.
                    </p>
                  </div>
                  <Link
                    href="/kyc"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Manage KYC</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={24} className="text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {profile?.kycDocuments?.length || 0} Identification Document(s) On File
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Status:{' '}
                        <span className="font-semibold text-slate-700">
                          {profile?.accountStatus === 'ACTIVE'
                            ? 'Approved & Verified'
                            : 'Documents Uploaded'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/kyc"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                  >
                    View Status
                  </Link>
                </div>
              </div>

              {/* Danger Zone: Logout and Deletion */}
              <div className="panel bg-rose-50/50 border border-rose-200 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Account Access & Data Privacy</h4>
                  <p className="text-[11px] text-rose-700/80 mt-0.5">
                    Sign out of your active browser session or request account deletion.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      ApiClient.logout();
                      window.location.href = '/auth/login';
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: AGENCY MANAGEMENT                                             */}
      {/* ==================================================================== */}
      {activeTab === 'agency' && (
        <div className="space-y-6">
          {agencySuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <span>{agencySuccess}</span>
            </div>
          )}
          {agencyError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
              <span>{agencyError}</span>
            </div>
          )}

          {/* Sub-view A: User is an Independent Agent (No Agency linked) */}
          {!agencyData?.isAgencyMember ? (
            <div className="space-y-6">
              {/* Freelancer Status Banner */}
              <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      <User size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          Independent / Freelance Partner Account
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Freelancer Mode
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        You submit referrals and receive commissions directly under your personal UAE broker license.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 space-y-1">
                  <p className="font-bold">Looking to collaborate as an agency organization?</p>
                  <p className="text-blue-700 leading-relaxed">
                    You can either register your licensed UAE real estate brokerage to manage team agents and pooled commissions, or join an existing organization using an invite token.
                  </p>
                </div>
              </div>

              {/* Two Options: Register New Agency OR Join Existing */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Option 1: Register New Agency */}
                <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="panel-header mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 size={18} className="text-blue-600" />
                      <span>Register a New Brokerage Agency</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Create an agency workspace to invite team agents and track team referrals.
                    </p>
                  </div>

                  <form onSubmit={handleRegisterAgency} className="space-y-3.5">
                    <div className="form-group">
                      <label className="form-label text-xs font-bold text-slate-700">
                        Agency Brand Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                        placeholder="e.g. Apex Real Estate Advisory"
                        value={agencyName}
                        onChange={(e) => setAgencyName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label text-xs font-bold text-slate-700">
                        Legal Entity Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                        placeholder="e.g. Apex Advisory & Capital Brokerage LLC"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-group">
                        <label className="form-label text-xs font-bold text-slate-700">
                          Trade License Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                          placeholder="e.g. CN-104928"
                          value={tradeLicenseNo}
                          onChange={(e) => setTradeLicenseNo(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs font-bold text-slate-700">
                          DLD / ORN Number
                        </label>
                        <input
                          type="text"
                          className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                          placeholder="e.g. ORN-1289"
                          value={orn}
                          onChange={(e) => setOrn(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="form-group">
                        <label className="form-label text-xs font-bold text-slate-700">
                          Agency Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                          placeholder="compliance@agency.ae"
                          value={agencyEmail}
                          onChange={(e) => setAgencyEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs font-bold text-slate-700">
                          Agency Telephone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                          placeholder="+971 4 000 0000"
                          value={agencyPhone}
                          onChange={(e) => setAgencyPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label text-xs font-bold text-slate-700">
                        Office Physical Address & P.O. Box
                      </label>
                      <input
                        type="text"
                        className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-sm"
                        placeholder="e.g. Office 1402, Boulevard Plaza, Downtown Dubai"
                        value={agencyAddress}
                        onChange={(e) => setAgencyAddress(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isRegisteringAgency}
                      className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-sm mt-2"
                    >
                      {isRegisteringAgency ? (
                        <span>Submitting Agency Registration...</span>
                      ) : (
                        <>
                          <Plus size={15} />
                          <span>Submit Agency Registration</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Option 2: Join Agency via Token */}
                <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="panel-header mb-4 border-b border-slate-100 pb-3">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Key size={18} className="text-emerald-600" />
                        <span>Join an Existing Organization</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Have an invitation code from an agency administrator?
                      </p>
                    </div>

                    <form onSubmit={handleJoinAgency} className="space-y-4">
                      <div className="form-group">
                        <label className="form-label text-xs font-bold text-slate-700">
                          Invitation Security Token <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-input w-full p-3 font-mono text-sm tracking-wider rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="Paste 32-character invite token..."
                          value={joinToken}
                          onChange={(e) => setJoinToken(e.target.value)}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isJoining}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {isJoining ? (
                          <span>Verifying Token...</span>
                        ) : (
                          <>
                            <Check size={15} />
                            <span>Join Agency Workspace</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">What happens after joining?</p>
                    <p className="mt-1 leading-relaxed text-slate-500">
                      Your referrals will be organized under the agency hierarchy, and agency admins can collaborate on deal fulfillment and pooled settlement routes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Sub-view B: Linked Agency Details & Member Management */
            <div className="space-y-6">
              {/* Agency Overview Hero Card */}
              <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-xl shadow-xs">
                      <Building2 size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-slate-900">
                          {agencyData.agency?.name}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            agencyData.agency?.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {agencyData.agency?.status || 'PENDING_VERIFICATION'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Your Role: {agencyData.membership?.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Legal Entity: <span className="font-medium text-slate-700">{agencyData.agency?.legalName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Total Team Size</span>
                    <p className="text-2xl font-extrabold text-slate-900">
                      {agencyData.agency?.membersCount || 1} Agents
                    </p>
                  </div>
                </div>

                {/* Registration Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">
                      Trade License
                    </span>
                    <p className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                      {agencyData.agency?.tradeLicenseNo}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">
                      DLD ORN
                    </span>
                    <p className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                      {agencyData.agency?.orn || 'Not Specified'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">
                      Agency Email
                    </span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                      {agencyData.agency?.email}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase">
                      Agency Phone
                    </span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {agencyData.agency?.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Members Roster and Invite Console */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Roster (2 Cols) */}
                <div className="lg:col-span-2 panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900">
                      Agency Team Roster ({agencyData.agency?.members?.length || 0})
                    </h3>
                    <span className="text-xs text-slate-400">
                      Active authorized referral agents
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {agencyData.agency?.members?.map((m) => (
                      <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                            {m.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{m.fullName}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                                {m.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{m.email || 'Agency member'}</p>
                          </div>
                        </div>

                        {/* Action: remove member if owner/admin and not self */}
                        {agencyData.membership?.isPrivileged && m.userId !== profile?.id && (
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                            title="Remove from agency"
                          >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invite Agent Box (1 Col, Privileged Only) */}
                <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900">
                      Invite Agent to Team
                    </h3>
                    <p className="text-xs text-slate-500">
                      Generate a single-use join invitation token.
                    </p>
                  </div>

                  {agencyData.membership?.isPrivileged ? (
                    <form onSubmit={handleInviteAgent} className="space-y-3.5">
                      <div className="form-group">
                        <label className="form-label text-xs font-bold text-slate-700">
                          Agent Corporate Email
                        </label>
                        <input
                          type="email"
                          className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                          placeholder="agent@agency.ae"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label text-xs font-bold text-slate-700">
                          Assigned Role
                        </label>
                        <select
                          className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as any)}
                        >
                          <option value="AGENT">Agent (Referral Submitter)</option>
                          <option value="AGENCY_ADMIN">Agency Administrator</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isInviting}
                        className="btn-primary w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5"
                      >
                        {isInviting ? (
                          <span>Generating Invitation...</span>
                        ) : (
                          <>
                            <Send size={13} />
                            <span>Send Team Invitation</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                      <Lock size={16} className="text-slate-400 mb-1" />
                      <p className="font-bold text-slate-700">Member Privileges</p>
                      <p className="mt-0.5">
                        Only Agency Owners and Agency Admins have permission to invite or manage team members.
                      </p>
                    </div>
                  )}

                  {/* Pending Invitations List */}
                  {agencyData.agency?.pendingInvitations && agencyData.agency.pendingInvitations.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                        Pending Invites
                      </span>
                      <div className="space-y-2">
                        {agencyData.agency.pendingInvitations.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between"
                          >
                            <div className="truncate mr-2">
                              <p className="font-bold text-slate-800 truncate">{inv.email}</p>
                              <p className="text-[10px] text-slate-400">{inv.role}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToken(inv.inviteToken)}
                              className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-slate-100 flex-shrink-0"
                            >
                              {copiedToken === inv.inviteToken ? (
                                <span className="text-emerald-600">Copied</span>
                              ) : (
                                <>
                                  <Copy size={10} />
                                  <span>Token</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: FAQ & SUPPORT                                                 */}
      {/* ==================================================================== */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          {/* Support Contacts Card */}
          <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  Prospera Partner Desk
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                  Dedicated UAE Referral Partner Support
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Our compliance and deal coordination desk is available Monday through Friday, 9:00 AM to 6:00 PM Gulf Standard Time (GST).
                </p>
              </div>

              {/* Direct Reach Contacts */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="mailto:partners@prospera.ae"
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Mail size={14} className="text-blue-600" />
                  <span>partners@prospera.ae</span>
                </a>
                <a
                  href="tel:+97142483900"
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Phone size={14} className="text-emerald-600" />
                  <span>+971 4 248 3900</span>
                </a>
              </div>
            </div>

            {/* Office Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Downtown Dubai Headquarters</span>
                <p className="text-slate-500 mt-0.5">
                  Boulevard Plaza, Tower 1, Level 19, Downtown Dubai, United Arab Emirates
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Compliance & Legal Desk</span>
                <p className="text-slate-500 mt-0.5">
                  KYC inquiries & audit verification: <span className="text-blue-600">compliance@prospera.ae</span>
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-900 block">Payouts & Finance Desk</span>
                <p className="text-slate-500 mt-0.5">
                  IBAN verification & settlement letters: <span className="text-blue-600">finance@prospera.ae</span>
                </p>
              </div>
            </div>
          </div>

          {/* Searchable FAQ Accordion */}
          <div className="panel bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Frequently Asked Compliance & Operational Questions
                </h3>
                <p className="text-xs text-slate-500">
                  Clear guidance on UAE regulatory requirements and commission rules.
                </p>
              </div>

              {/* FAQ Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions or keywords..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = expandedFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all ${
                      isOpen
                        ? 'border-blue-200 bg-blue-50/20'
                        : 'border-slate-200/90 bg-white hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                      className="w-full text-left p-4 flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp size={16} className="text-blue-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-blue-100/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No matching questions found for &ldquo;{faqSearch}&rdquo;. Contact our partner desk directly.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD BANK ACCOUNT                                              */}
      {/* ==================================================================== */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                <span>Add Verified Settlement Bank Route</span>
              </h3>
              <button
                onClick={() => setIsAddBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {bankError && (
              <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 flex-shrink-0" />
                <span>{bankError}</span>
              </div>
            )}

            <form onSubmit={handleAddBank} className="space-y-4 mt-4">
              <div className="form-group">
                <label className="form-label text-xs font-bold text-slate-700">
                  UAE Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                >
                  <option value="Emirates NBD">Emirates NBD</option>
                  <option value="First Abu Dhabi Bank (FAB)">First Abu Dhabi Bank (FAB)</option>
                  <option value="Abu Dhabi Commercial Bank (ADCB)">Abu Dhabi Commercial Bank (ADCB)</option>
                  <option value="Dubai Islamic Bank (DIB)">Dubai Islamic Bank (DIB)</option>
                  <option value="Mashreq Bank">Mashreq Bank</option>
                  <option value="Wio Bank">Wio Bank PJSC</option>
                  <option value="Commercial Bank of Dubai (CBD)">Commercial Bank of Dubai (CBD)</option>
                  <option value="Other Licensed UAE Bank">Other Licensed UAE Bank</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-slate-700">
                  Account Holder Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-input w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  placeholder="Must match passport/trade license exactly"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-slate-700">
                  International Bank Account Number (IBAN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-input w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs uppercase"
                  placeholder="AE070330000000001234567"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  required
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">
                  UAE IBANs must start with AE and contain 23 alphanumeric characters.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-slate-700">
                  SWIFT / BIC Code (Optional)
                </label>
                <input
                  type="text"
                  className="form-input w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs uppercase"
                  placeholder="e.g. EBILAEADXXX"
                  value={swift}
                  onChange={(e) => setSwift(e.target.value.toUpperCase())}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold text-slate-700">
                  Bank Confirmation Letter / Stamped Certificate
                </label>
                <input
                  type="file"
                  accept="application/pdf, image/jpeg, image/png"
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => setConfirmationDoc(e.target.files?.[0] || null)}
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">
                  Official bank letter showing IBAN and account holder name. PDF, PNG, or JPG (max 10MB).
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primary-bank-checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={isPrimaryBank}
                  onChange={(e) => setIsPrimaryBank(e.target.checked)}
                />
                <label htmlFor="primary-bank-checkbox" className="text-xs text-slate-700 select-none">
                  Set as primary bank account for commission withdrawals
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBank}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmittingBank ? 'Submitting...' : 'Register Settlement Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ACCOUNT DELETION CONFIRMATION                                 */}
      {/* ==================================================================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-slate-900">Request Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This action will queue your account for regulatory deactivation. Historical commission ledgers and tax audit entries will be retained in compliance with UAE Federal Decree-Law No. (20) of 2018 on AML/CFT for statutory retention periods.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Keep Account
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isDeleting ? 'Submitting...' : 'Confirm Deletion Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
