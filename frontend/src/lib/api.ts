import {
  UserSummary,
  LeadItem,
  ServiceItem,
  CommissionEntry,
  WithdrawalItem,
  BankAccountItem,
  KycDocumentItem,
  DashboardMetrics,
  LeadStatus,
  FullProfile,
  MyAgencyResponse,
  AgencyDetails,
  AdminOverviewMetrics,
  AdminRecentApplication,
  AdminAgentItem,
  AdminAgencyItem,
  AdminPendingKycItem,
  PaginationMeta,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Token storage key
const TOKEN_KEY = 'prospera_corporate_session_token';
const USER_KEY = 'prospera_corporate_user';

export class ApiClient {
  public static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  public static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  }

  public static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  public static getStoredUser(): UserSummary | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  public static setStoredUser(user: UserSummary): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Core authenticated fetch request handler
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Network request failed';
      throw new Error(`Unable to reach Prospera API server (${msg}). Please verify connectivity.`);
    }

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Expired or invalid session
        this.removeToken();
        const errMessage = data?.error?.message || 'Session expired or authentication required. Please sign in again.';
        throw new Error(errMessage);
      }
      if (response.status === 403) {
        const errMessage = data?.error?.message || 'Access denied. You do not have permission for this resource.';
        throw new Error(errMessage);
      }

      const message = data?.error?.message || `Request failed with HTTP status ${response.status}`;
      throw new Error(message);
    }

    return data?.data as T;
  }

  // ============================================================================
  // 1. AUTHENTICATION CONTRACT
  // ============================================================================

  public static async login(
    email: string,
    password: string
  ): Promise<{ user: UserSummary; token: string }> {
    const data = await this.request<{ sessionToken: string; user: UserSummary }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!data || !data.sessionToken) {
      throw new Error('Authentication response did not return a valid session token.');
    }

    this.setToken(data.sessionToken);
    this.setStoredUser(data.user);
    return { user: data.user, token: data.sessionToken };
  }

  public static async register(data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    companyName?: string;
  }): Promise<{ message: string }> {
    return await this.request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async verifyOtp(
    email: string,
    code: string,
    purpose: string = 'SIGNUP_VERIFICATION'
  ): Promise<{ message: string }> {
    return await this.request<{ message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code, purpose }),
    });
  }

  public static async getMe(): Promise<UserSummary> {
    const user = await this.request<UserSummary>('/auth/me');
    if (user) {
      this.setStoredUser(user);
    }
    return user;
  }

  public static async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      this.removeToken();
    }
  }

  // ============================================================================
  // 2. PROFILE & SETTINGS APIS
  // ============================================================================

  public static async getProfile(): Promise<FullProfile> {
    return await this.request<FullProfile>('/profile');
  }

  public static async updateProfile(data: {
    fullName?: string;
    phone?: string | null;
    whatsapp?: string | null;
    brn?: string | null;
    nationality?: string | null;
    companyName?: string | null;
  }): Promise<FullProfile> {
    return await this.request<FullProfile>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public static async uploadAvatar(file: File): Promise<{ avatarUrl: string; user: UserSummary }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return await this.request<{ avatarUrl: string; user: UserSummary }>('/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  public static async requestAccountDeletion(): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>('/profile/request-deletion', {
      method: 'POST',
    });
  }

  // ============================================================================
  // 3. AGENCY & ORGANIZATION APIS
  // ============================================================================

  public static async getMyAgency(): Promise<MyAgencyResponse> {
    return await this.request<MyAgencyResponse>('/agency/my-agency');
  }

  public static async registerAgency(data: {
    name: string;
    legalName: string;
    tradeLicenseNo: string;
    orn?: string | null;
    dedLicenseNo?: string | null;
    email: string;
    phone: string;
    address?: string | null;
    poBox?: string | null;
  }): Promise<AgencyDetails> {
    return await this.request<AgencyDetails>('/agency/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async updateAgency(
    agencyId: string,
    data: Partial<{
      name: string;
      legalName: string;
      tradeLicenseNo: string;
      orn?: string | null;
      dedLicenseNo?: string | null;
      email: string;
      phone: string;
      address?: string | null;
      poBox?: string | null;
    }>
  ): Promise<AgencyDetails> {
    return await this.request<AgencyDetails>(`/agency/${agencyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public static async inviteAgencyAgent(
    agencyId: string,
    data: {
      email: string;
      role: 'AGENCY_ADMIN' | 'AGENT';
    }
  ): Promise<{ id: string; email: string; inviteToken: string; expiresAt: string }> {
    return await this.request<{ id: string; email: string; inviteToken: string; expiresAt: string }>(
      `/agency/${agencyId}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  public static async joinAgency(inviteToken: string): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>('/agency/join', {
      method: 'POST',
      body: JSON.stringify({ inviteToken }),
    });
  }

  public static async removeAgencyMember(
    agencyId: string,
    memberId: string
  ): Promise<{ success: boolean; message: string }> {
    return await this.request<{ success: boolean; message: string }>(
      `/agency/${agencyId}/members/${memberId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // ============================================================================
  // 4. BANKING VERIFICATION APIS
  // ============================================================================

  public static async getBankAccounts(agencyId?: string): Promise<BankAccountItem[]> {
    const query = agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : '';
    const accounts = await this.request<BankAccountItem[]>(`/banking/accounts${query}`);
    return accounts || [];
  }

  public static async addBankAccount(data: FormData | {
    bankName: string;
    accountHolderName: string;
    iban: string;
    swift?: string;
    currency?: string;
    isPrimary?: boolean;
    agencyId?: string;
  }): Promise<BankAccountItem> {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return await this.request<BankAccountItem>('/banking/accounts', {
        method: 'POST',
        body: data,
      });
    }

    return await this.request<BankAccountItem>('/banking/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async deleteBankAccount(accountId: string): Promise<{ success: boolean }> {
    return await this.request<{ success: boolean }>(`/banking/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // 5. KYC & COMPLIANCE APIS
  // ============================================================================

  public static async getKycDocuments(agencyId?: string): Promise<KycDocumentItem[]> {
    const query = agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : '';
    const docs = await this.request<KycDocumentItem[]>(`/kyc/documents${query}`);
    return docs || [];
  }

  public static async uploadKycDocument(formData: FormData): Promise<KycDocumentItem> {
    return await this.request<KycDocumentItem>('/kyc/upload', {
      method: 'POST',
      body: formData,
    });
  }

  public static async submitKyc(): Promise<{
    success: boolean;
    accountStatus: string;
    message: string;
  }> {
    return await this.request<{
      success: boolean;
      accountStatus: string;
      message: string;
    }>('/kyc/submit', {
      method: 'POST',
    });
  }

  public static getDocumentDownloadUrl(documentId: string): string {
    return `${API_BASE_URL}/documents/${documentId}/download`;
  }

  // ============================================================================
  // 6. PROSPERA ADMIN PORTAL APIS
  // ============================================================================

  public static async getAdminOverview(): Promise<{
    metrics: AdminOverviewMetrics;
    recentApplications: AdminRecentApplication[];
  }> {
    return await this.request<{
      metrics: AdminOverviewMetrics;
      recentApplications: AdminRecentApplication[];
    }>('/admin/overview');
  }

  public static async getAdminAgents(params?: {
    search?: string;
    agentType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ agents: AdminAgentItem[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.agentType && params.agentType !== 'ALL') searchParams.set('agentType', params.agentType);
    if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    return await this.request<{ agents: AdminAgentItem[]; pagination: PaginationMeta }>(
      `/admin/agents?${searchParams.toString()}`
    );
  }

  public static async getAdminAgentById(agentId: string): Promise<AdminAgentItem> {
    return await this.request<AdminAgentItem>(`/admin/agents/${agentId}`);
  }

  public static async updateAdminAgentStatus(
    agentId: string,
    status: string,
    reason?: string
  ): Promise<{ id: string; accountStatus: string }> {
    return await this.request<{ id: string; accountStatus: string }>(`/admin/agents/${agentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  public static async revokeUserSessions(
    userId: string
  ): Promise<{ success: boolean; revokedCount: number }> {
    return await this.request<{ success: boolean; revokedCount: number }>(
      `/admin/users/${userId}/revoke-sessions`,
      {
        method: 'POST',
      }
    );
  }

  public static async getAdminAgencies(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ agencies: AdminAgencyItem[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    return await this.request<{ agencies: AdminAgencyItem[]; pagination: PaginationMeta }>(
      `/admin/agencies?${searchParams.toString()}`
    );
  }

  public static async getAdminAgencyById(agencyId: string): Promise<AdminAgencyItem> {
    return await this.request<AdminAgencyItem>(`/admin/agencies/${agencyId}`);
  }

  public static async updateAdminAgencyStatus(
    agencyId: string,
    status: string,
    rejectionReason?: string
  ): Promise<AdminAgencyItem> {
    return await this.request<AdminAgencyItem>(`/admin/agencies/${agencyId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason }),
    });
  }

  public static async getAdminPendingKycQueue(
    page: number = 1,
    limit: number = 20
  ): Promise<{ documents: AdminPendingKycItem[]; pagination: PaginationMeta }> {
    return await this.request<{ documents: AdminPendingKycItem[]; pagination: PaginationMeta }>(
      `/admin/kyc/pending?page=${page}&limit=${limit}`
    );
  }

  public static async reviewKycDocument(
    documentId: string,
    status: 'VERIFIED' | 'REJECTED' | 'CHANGES_REQUESTED',
    rejectionReason?: string
  ): Promise<{ id: string; status: string; rejectionReason?: string | null }> {
    return await this.request<{ id: string; status: string; rejectionReason?: string | null }>(
      `/admin/kyc/${documentId}/review`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, rejectionReason }),
      }
    );
  }

  public static async verifyAdminBankAccount(
    accountId: string,
    isVerified: boolean,
    rejectionReason?: string
  ): Promise<BankAccountItem> {
    return await this.request<BankAccountItem>(`/admin/banking/${accountId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified, rejectionReason }),
    });
  }

  public static async getAdminAuditLogs(params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    actorUserId?: string;
  }): Promise<{ logs: any[]; pagination: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.actorUserId) searchParams.set('actorUserId', params.actorUserId);

    return await this.request<{ logs: any[]; pagination: PaginationMeta }>(
      `/admin/audit-logs?${searchParams.toString()}`
    );
  }

  // ============================================================================
  // 7. REFERRAL & METRICS APIS (Preserved)
  // ============================================================================

  public static async getReferrals(params?: {
    status?: LeadStatus;
    search?: string;
    serviceId?: string;
  }): Promise<LeadItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.serviceId) query.set('serviceId', params.serviceId);

    try {
      const res = await this.request<{ items: LeadItem[] }>(`/referrals?${query.toString()}`);
      return res?.items || [];
    } catch (err) {
      console.warn('API error fetching referrals:', err);
      return [];
    }
  }

  public static async createReferral(data: {
    serviceId: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    expectedDealValue: number;
    currency?: string;
    notes?: string;
  }): Promise<LeadItem> {
    return await this.request<LeadItem>('/referrals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async getReferralById(id: string): Promise<LeadItem | null> {
    try {
      return await this.request<LeadItem>(`/referrals/${id}`);
    } catch {
      return null;
    }
  }

  public static async updateReferralStatus(
    id: string,
    newStatus: LeadStatus,
    note?: string
  ): Promise<LeadItem> {
    return await this.request<LeadItem>(`/referrals/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, transitionNote: note }),
    });
  }

  public static async getServices(): Promise<ServiceItem[]> {
    try {
      const res = await this.request<ServiceItem[]>('/referrals/services');
      return res || [];
    } catch {
      return [
        {
          id: 'srv-1',
          slug: 'property-sales',
          name: 'UAE Luxury Real Estate',
          description: 'High-yield residential, waterfront villas and off-plan investments.',
          defaultPartnerCommissionBps: 200,
          defaultAgentCommissionBps: 150,
          isActive: true,
        },
        {
          id: 'srv-2',
          slug: 'mortgage-brokerage',
          name: 'Mortgage Advisory',
          description: 'Resident and non-resident home financing with Tier-1 UAE lenders.',
          defaultPartnerCommissionBps: 75,
          defaultAgentCommissionBps: 50,
          isActive: true,
        },
        {
          id: 'srv-3',
          slug: 'golden-visa',
          name: 'UAE Golden Visa',
          description: '10-Year residency for investors, entrepreneurs, and skilled professionals.',
          defaultPartnerCommissionBps: 300,
          defaultAgentCommissionBps: 200,
          isActive: true,
        },
        {
          id: 'srv-4',
          slug: 'corporate-advisory',
          name: 'Corporate Structuring & M&A',
          description: 'Freezone/Mainland company formation and DIFC holding structures.',
          defaultPartnerCommissionBps: 150,
          defaultAgentCommissionBps: 100,
          isActive: true,
        },
      ];
    }
  }

  public static async getCommissions(): Promise<CommissionEntry[]> {
    try {
      const res = await this.request<CommissionEntry[]>('/referrals/commissions');
      return res || [];
    } catch {
      return [];
    }
  }

  public static async getWithdrawals(): Promise<WithdrawalItem[]> {
    try {
      const res = await this.request<WithdrawalItem[]>('/referrals/withdrawals');
      return res || [];
    } catch {
      return [];
    }
  }

  public static async createWithdrawal(data: {
    bankAccountId: string;
    amount: number;
    currency?: string;
    userNotes?: string;
  }): Promise<WithdrawalItem> {
    return await this.request<WithdrawalItem>('/referrals/withdrawals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public static async requestWithdrawal(
    bankAccountId: string,
    amount: number,
    userNotes?: string
  ): Promise<WithdrawalItem> {
    return await this.createWithdrawal({ bankAccountId, amount, userNotes });
  }

  public static async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const metrics = await this.request<DashboardMetrics>('/referrals/metrics');
      if (metrics) return metrics;
    } catch {
      // Fallback calculation from leads if endpoint not implemented
    }

    const leads = await this.getReferrals();
    const wonLeads = leads.filter((l) => l.status === 'WON');
    const activePipeline = leads.filter(
      (l) => l.status !== 'WON' && l.status !== 'LOST' && l.status !== 'CANCELLED'
    );

    const activePipelineValue = activePipeline.reduce(
      (acc, curr) => acc + Number(curr.expectedDealValue || 0),
      0
    );
    const wonReferralsValue = wonLeads.reduce(
      (acc, curr) => acc + Number(curr.actualDealValue || curr.expectedDealValue || 0),
      0
    );

    return {
      totalReferrals: leads.length,
      activePipelineValue,
      wonReferralsCount: wonLeads.length,
      wonReferralsValue,
      totalEarnedCommission: wonReferralsValue * 0.02,
      withdrawableBalance: wonReferralsValue * 0.02,
      pendingClearanceCommission: 0,
      payoutsProcessed: 0,
    };
  }
}
