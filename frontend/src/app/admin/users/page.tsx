'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  MoreVertical,
  ShieldCheck,
  ShieldAlert,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  KeyRound,
  LogOut,
  Building2,
  Phone,
  FileCheck2,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  FileText,
  CreditCard,
  History,
} from 'lucide-react';
import { ApiClient } from '../../../lib/api';
import {
  AdminUserItem,
  AdminUserDetails,
  Role,
  AccountStatus,
  AgentType,
  AgencyRole,
  PaginationMeta,
} from '../../../types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedAgentType, setSelectedAgentType] = useState<string>('ALL');
  const [selectedKycStatus, setSelectedKycStatus] = useState<string>('ALL');

  // Modals state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<AdminUserDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Status transition state
  const [statusActionUser, setStatusActionUser] = useState<AdminUserItem | null>(null);
  const [newStatus, setNewStatus] = useState<AccountStatus>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Success notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'AGENT' as Role,
    agentType: 'INDEPENDENT' as AgentType,
    companyName: '',
    password: '',
    accountStatus: 'ACTIVE' as AccountStatus,
  });

  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    role: 'AGENT' as Role,
    agentType: 'INDEPENDENT' as AgentType,
    companyName: '',
  });

  const [editForm, setEditForm] = useState({
    userId: '',
    fullName: '',
    phone: '',
    whatsapp: '',
    companyName: '',
    brn: '',
    role: 'AGENT' as Role,
    agentType: 'INDEPENDENT' as AgentType,
  });

  const fetchUsers = useCallback(async (pageToLoad = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getAdminUsers({
        search: search.trim() || undefined,
        role: selectedRole,
        accountStatus: selectedStatus,
        agentType: selectedAgentType,
        kycStatus: selectedKycStatus,
        page: pageToLoad,
        limit: 15,
      });
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user directory');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedRole, selectedStatus, selectedAgentType, selectedKycStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const openUserDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailDrawerOpen(true);
    setIsLoadingDetails(true);
    try {
      const res = await ApiClient.getAdminUserDetails(userId);
      setUserDetails(res.user);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ApiClient.createAdminUser(createForm);
      setIsCreateModalOpen(false);
      setSuccessNotice(`User ${createForm.fullName} (${createForm.email}) created successfully.`);
      setCreateForm({
        fullName: '',
        email: '',
        phone: '',
        role: 'AGENT',
        agentType: 'INDEPENDENT',
        companyName: '',
        password: '',
        accountStatus: 'ACTIVE',
      });
      fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err?.message || 'Failed to create user');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ApiClient.inviteAdminUser(inviteForm);
      setIsInviteModalOpen(false);
      setSuccessNotice(`Invitation issued successfully for ${inviteForm.email}.`);
      setInviteForm({
        fullName: '',
        email: '',
        role: 'AGENT',
        agentType: 'INDEPENDENT',
        companyName: '',
      });
      fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err?.message || 'Failed to invite user');
    }
  };

  const openEditModal = (u: AdminUserItem) => {
    setEditForm({
      userId: u.id,
      fullName: u.fullName,
      phone: u.phone || '',
      whatsapp: u.whatsapp || '',
      companyName: u.companyName || '',
      brn: u.brn || '',
      role: u.role,
      agentType: u.agentType || 'INDEPENDENT',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ApiClient.updateAdminUser(editForm.userId, {
        fullName: editForm.fullName,
        phone: editForm.phone || null,
        whatsapp: editForm.whatsapp || null,
        companyName: editForm.companyName || null,
        brn: editForm.brn || null,
        role: editForm.role,
        agentType: editForm.agentType,
      });
      setIsEditModalOpen(false);
      setSuccessNotice(`User profile updated successfully.`);
      fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err?.message || 'Failed to update user profile');
    }
  };

  const openStatusModal = (u: AdminUserItem, targetStatus: AccountStatus) => {
    setStatusActionUser(u);
    setNewStatus(targetStatus);
    setStatusReason('');
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!statusActionUser) return;
    setIsSubmittingStatus(true);
    setError(null);
    try {
      await ApiClient.updateAdminUserStatus(statusActionUser.id, newStatus, statusReason);
      setIsStatusModalOpen(false);
      setSuccessNotice(`User ${statusActionUser.fullName} status updated to ${newStatus}.`);
      fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err?.message || 'Failed to update user status');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handlePasswordReset = async (u: AdminUserItem) => {
    if (!confirm(`Are you sure you want to generate a password reset challenge for ${u.fullName} (${u.email})?`)) {
      return;
    }
    setError(null);
    try {
      await ApiClient.requestAdminPasswordReset(u.id);
      setSuccessNotice(`Password reset challenge dispatched securely to ${u.email}.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate password reset');
    }
  };

  const handleRevokeSessions = async (u: AdminUserItem) => {
    if (!confirm(`Revoke all active sessions for ${u.fullName}? User will be signed out on all devices.`)) {
      return;
    }
    setError(null);
    try {
      const res = await ApiClient.revokeUserSessions(u.id);
      setSuccessNotice(`Successfully revoked ${res.revokedCount} active session(s) for ${u.fullName}.`);
      fetchUsers(pagination.page);
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke sessions');
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-200">ADMIN</span>;
      case 'COORDINATOR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-200">COORDINATOR</span>;
      case 'REFERRAL_PARTNER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">PARTNER</span>;
      case 'AGENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-200">AGENT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{role}</span>;
    }
  };

  const getStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />ACTIVE</span>;
      case 'PENDING_APPROVAL':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />PENDING APPROVAL</span>;
      case 'PENDING_VERIFICATION':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" />VERIFYING</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />SUSPENDED</span>;
      case 'DEACTIVATED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />DEACTIVATED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={12} className="text-emerald-500" />Verified</span>;
      case 'PENDING_REVIEW':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"><Clock size={12} className="text-amber-500" />In Review</span>;
      case 'CHANGES_REQUESTED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700"><AlertCircle size={12} className="text-sky-500" />Changes Req</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700"><X size={12} className="text-rose-500" />Rejected</span>;
      default:
        return <span className="text-[11px] text-slate-400 font-medium">Incomplete</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">×</button>
        </div>
      )}


      {/* Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Platform User Management</h2>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                {pagination.total} registered users
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Search, filter, view profiles, assign roles, approve accounts, and audit privileged actions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              <Mail size={14} />
              <span>Invite User</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus size={14} />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-slate-700"
            >
              <option value="ALL">All Platform Roles</option>
              <option value="ADMIN">Platform Admin</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="AGENT">Agent</option>
              <option value="REFERRAL_PARTNER">Referral Partner</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-slate-700"
            >
              <option value="ALL">All Account Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>

          <div>
            <select
              value={selectedAgentType}
              onChange={(e) => setSelectedAgentType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-slate-700"
            >
              <option value="ALL">All Account Types</option>
              <option value="INDEPENDENT">Independent</option>
              <option value="AGENCY_MEMBER">Agency Member</option>
            </select>
          </div>

          <div>
            <select
              value={selectedKycStatus}
              onChange={(e) => setSelectedKycStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white text-slate-700"
            >
              <option value="ALL">All KYC States</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING_REVIEW">In Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="REJECTED">Rejected</option>
              <option value="INCOMPLETE">Incomplete</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading user registry...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Users size={36} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No users found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No registered user accounts match the current filters or search terms. Try adjusting your query parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Type</th>
                  <th className="py-3 px-4">Agency</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {u.fullName}
                      {u.companyName && (
                        <span className="block text-[10px] font-normal text-slate-400">{u.companyName}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {u.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                      {u.agentType === 'AGENCY_MEMBER' ? 'Agency Member' : 'Independent'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.agency ? (
                        <div>
                          <span className="font-semibold text-slate-800">{u.agency.name}</span>
                          {u.agencyRole && (
                            <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                              {u.agencyRole.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getKycBadge(u.kycStatusSummary)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(u.accountStatus)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {u.lastLogin ? (
                        <span title={new Date(u.lastLogin).toLocaleString()}>
                          {new Date(u.lastLogin).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Never</span>
                      )}
                      {u.activeSessionsCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          {u.activeSessionsCount} active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openUserDetails(u.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Profile Details & History"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Edit Permitted Information & Role"
                        >
                          <Edit2 size={15} />
                        </button>

                        {u.accountStatus !== 'ACTIVE' ? (
                          <button
                            onClick={() => openStatusModal(u, 'ACTIVE')}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-bold text-[11px]"
                            title="Approve / Activate Account"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => openStatusModal(u, 'SUSPENDED')}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-bold text-[11px]"
                            title="Suspend Account"
                          >
                            Suspend
                          </button>
                        )}

                        <button
                          onClick={() => handlePasswordReset(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Request Password Reset"
                        >
                          <KeyRound size={15} />
                        </button>

                        <button
                          onClick={() => handleRevokeSessions(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Revoke Active Sessions"
                        >
                          <LogOut size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || 1}</strong> ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              Previous
            </button>
            <button
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {isDetailDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {userDetails?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{userDetails?.fullName || 'User Profile'}</h3>
                  <p className="text-xs text-slate-500 font-mono">{userDetails?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {isLoadingDetails ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-blue-600" />
                  <span className="text-xs">Fetching profile and audit history...</span>
                </div>
              ) : userDetails ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Platform Role</span>
                      <div className="mt-1">{getRoleBadge(userDetails.role)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Account Status</span>
                      <div className="mt-1">{getStatusBadge(userDetails.accountStatus)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">KYC Progress</span>
                      <div className="mt-1">{getKycBadge(userDetails.kycStatusSummary)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Total Referrals</span>
                      <div className="mt-1 text-sm font-bold text-slate-900">
                        {userDetails.leadCounts.partnerLeads + userDetails.leadCounts.agentLeads}
                      </div>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Phone</span>
                        <span className="font-semibold text-slate-800">{userDetails.phone || 'None provided'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">WhatsApp</span>
                        <span className="font-semibold text-slate-800">{userDetails.whatsapp || 'None provided'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Company / Agency</span>
                        <span className="font-semibold text-slate-800">
                          {userDetails.agency?.name || userDetails.companyName || 'Independent'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">RERA BRN</span>
                        <span className="font-semibold text-slate-800">{userDetails.brn || 'Not registered'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Assigned Coordinator</span>
                        <span className="font-semibold text-slate-800">
                          {userDetails.coordinator?.fullName || 'Direct Platform'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Active Sessions</span>
                        <span className="font-semibold text-slate-800">{userDetails.activeSessions.length} active device(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* KYC Documents */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Compliance Documents ({userDetails.kycDocuments.length})</h4>
                    </div>
                    {userDetails.kycDocuments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No verification documents uploaded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetails.kycDocuments.map((doc) => (
                          <div key={doc.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-slate-800 block">{doc.documentType.replace(/_/g, ' ')}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{doc.originalFilename}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getKycBadge(doc.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bank Accounts */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Registered Bank Accounts ({userDetails.bankAccounts.length})</h4>
                    {userDetails.bankAccounts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No bank accounts registered.</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetails.bankAccounts.map((b) => (
                          <div key={b.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-slate-800 block">{b.bankName} — {b.accountHolderName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">IBAN ending in {b.ibanLast4} ({b.currency})</span>
                            </div>
                            <div>
                              {b.isVerified ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Verified</span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Pending Review</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audit History */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Privileged Activity Log</h4>
                    {userDetails.recentActivity.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No privileged actions recorded.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {userDetails.recentActivity.map((log) => (
                          <div key={log.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-bold text-slate-700">{log.action}</span>
                              <span>{new Date(log.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 mt-0.5 text-[11px]">
                              Actor: <strong>{log.actorUser?.fullName || 'System'}</strong> ({log.actorUser?.role || 'SYSTEM'})
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Create Platform Account</h3>
                <p className="text-xs text-slate-500">Add an authenticated user with verified platform privileges.</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. Tariq Mansour"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="e.g. agent@demo.prospera.test"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Platform Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="REFERRAL_PARTNER">Referral Partner</option>
                    <option value="COORDINATOR">Lead Coordinator</option>
                    <option value="ADMIN">Platform Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Classification</label>
                  <select
                    value={createForm.agentType}
                    onChange={(e) => setCreateForm({ ...createForm, agentType: e.target.value as AgentType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="INDEPENDENT">Independent</option>
                    <option value="AGENCY_MEMBER">Agency Member</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+971 50 000 0000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company / Entity</label>
                  <input
                    type="text"
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                    placeholder="e.g. Apex Realty"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Custom Password <span className="text-slate-400 font-normal">(Leave blank to auto-generate a secure password)</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Invite Platform User</h3>
                <p className="text-xs text-slate-500">Sends registration challenge with pre-authorized role.</p>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={inviteForm.fullName}
                  onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Role *</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Role })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value="AGENT">Agent</option>
                  <option value="REFERRAL_PARTNER">Referral Partner</option>
                  <option value="COORDINATOR">Lead Coordinator</option>
                  <option value="ADMIN">Platform Admin</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit User Profile & Role</h3>
                <p className="text-xs text-slate-500">Update contact info, company affiliation, and platform permissions.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Platform Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-semibold"
                  >
                    <option value="AGENT">Agent</option>
                    <option value="REFERRAL_PARTNER">Referral Partner</option>
                    <option value="COORDINATOR">Lead Coordinator</option>
                    <option value="ADMIN">Platform Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Classification</label>
                  <select
                    value={editForm.agentType}
                    onChange={(e) => setEditForm({ ...editForm, agentType: e.target.value as AgentType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="INDEPENDENT">Independent</option>
                    <option value="AGENCY_MEMBER">Agency Member</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">RERA BRN</label>
                  <input
                    type="text"
                    value={editForm.brn}
                    onChange={(e) => setEditForm({ ...editForm, brn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {isStatusModalOpen && statusActionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {newStatus === 'ACTIVE' ? 'Approve & Activate Account' : 'Suspend Account Access'}
                </h3>
                <p className="text-xs text-slate-500">
                  Target: <strong>{statusActionUser.fullName}</strong> ({statusActionUser.email})
                </p>
              </div>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                {newStatus === 'ACTIVE'
                  ? 'Activating this account grants full authorized access to submit leads, view commissions, and participate in platform workflows.'
                  : 'Suspending this account immediately revokes all active web and API sessions. The user will be blocked from accessing protected resources.'}
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason / Compliance Note <span className="text-slate-400 font-normal">(Recorded in immutable audit trail)</span>
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Identity and trade license verified / AML clearance"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingStatus}
                  onClick={handleConfirmStatus}
                  className={`px-5 py-2 rounded-xl font-semibold text-white shadow-xs ${
                    newStatus === 'ACTIVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingStatus ? 'Updating...' : `Confirm ${newStatus === 'ACTIVE' ? 'Activation' : 'Suspension'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

