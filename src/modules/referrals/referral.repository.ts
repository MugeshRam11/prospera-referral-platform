import { Lead, LeadStatus, LeadStatusHistory, Service, User, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

export interface LeadWithDetails extends Lead {
  partner?: { id: string; fullName: string; email: string; companyName: string | null };
  coordinator?: { id: string; fullName: string; email: string } | null;
  agent?: { id: string; fullName: string; email: string } | null;
  service?: { id: string; name: string; slug: string } | null;
  statusHistory?: LeadStatusHistoryWithUser[];
}

export interface LeadStatusHistoryWithUser extends LeadStatusHistory {
  changedBy?: { id: string; fullName: string; email: string; role: string };
}

export interface LeadFilterCriteria {
  partnerId?: string;
  coordinatorId?: string;
  agentId?: string;
  status?: LeadStatus;
  serviceId?: string;
  search?: string;
}

export interface ListLeadsParams {
  filter: LeadFilterCriteria;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface CreateLeadRecordInput {
  referenceNo: string;
  partnerId: string;
  coordinatorId?: string | null;
  agentId?: string | null;
  serviceId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone: string;
  expectedDealValue: number | Prisma.Decimal;
  currency?: string;
  notes?: string | null;
  status?: LeadStatus;
  changedById: string;
  transitionNote?: string;
}

export interface UpdateLeadRecordInput {
  clientName?: string;
  clientEmail?: string | null;
  clientPhone?: string;
  expectedDealValue?: number | Prisma.Decimal;
  actualDealValue?: number | Prisma.Decimal | null;
  notes?: string | null;
}

export interface TransitionStatusRecordInput {
  status: LeadStatus;
  previousStatus: LeadStatus;
  changedById: string;
  transitionNote?: string | null;
  actualDealValue?: number | Prisma.Decimal | null;
  wonAt?: Date | null;
  lostReasonId?: string | null;
  lostDetails?: string | null;
}

export interface AssignLeadRecordInput {
  coordinatorId?: string | null;
  agentId?: string | null;
  changedById: string;
  transitionNote?: string | null;
  statusChange?: {
    previousStatus: LeadStatus;
    newStatus: LeadStatus;
  };
}

export interface IReferralRepository {
  createLead(data: CreateLeadRecordInput): Promise<LeadWithDetails>;
  findLeadById(id: string): Promise<LeadWithDetails | null>;
  findLeadByReferenceNo(referenceNo: string): Promise<LeadWithDetails | null>;
  listLeads(params: ListLeadsParams): Promise<{ items: LeadWithDetails[]; total: number }>;
  updateLead(id: string, data: UpdateLeadRecordInput): Promise<LeadWithDetails>;
  transitionLeadStatus(id: string, transition: TransitionStatusRecordInput): Promise<LeadWithDetails>;
  assignLead(id: string, assignment: AssignLeadRecordInput): Promise<LeadWithDetails>;
  findServiceById(id: string): Promise<Service | null>;
  findUserById(id: string): Promise<User | null>;
  getLeadStatusHistory(leadId: string): Promise<LeadStatusHistoryWithUser[]>;
  clearAll?(): void;
  seedService?(service: Partial<Service>): Service;
  seedUser?(user: Partial<User>): User;
}

export class PrismaReferralRepository implements IReferralRepository {
  async createLead(data: CreateLeadRecordInput): Promise<LeadWithDetails> {
    return prisma.$transaction(async (tx) => {
      const initialStatus = data.status ?? LeadStatus.SUBMITTED;

      const createdLead = await tx.lead.create({
        data: {
          referenceNo: data.referenceNo,
          partnerId: data.partnerId,
          coordinatorId: data.coordinatorId ?? null,
          agentId: data.agentId ?? null,
          serviceId: data.serviceId,
          clientName: data.clientName,
          clientEmail: data.clientEmail ?? null,
          clientPhone: data.clientPhone,
          expectedDealValue: new Prisma.Decimal(data.expectedDealValue.toString()),
          currency: data.currency ?? 'AED',
          notes: data.notes ?? null,
          status: initialStatus,
        },
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: createdLead.id,
          changedById: data.changedById,
          previousStatus: null,
          newStatus: initialStatus,
          transitionNote: data.transitionNote ?? 'Initial referral submission',
        },
      });

      return tx.lead.findUniqueOrThrow({
        where: { id: createdLead.id },
        include: {
          partner: { select: { id: true, fullName: true, email: true, companyName: true } },
          coordinator: { select: { id: true, fullName: true, email: true } },
          agent: { select: { id: true, fullName: true, email: true } },
          service: { select: { id: true, name: true, slug: true } },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            include: { changedBy: { select: { id: true, fullName: true, email: true, role: true } } },
          },
        },
      });
    });
  }

  async findLeadById(id: string): Promise<LeadWithDetails | null> {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        partner: { select: { id: true, fullName: true, email: true, companyName: true } },
        coordinator: { select: { id: true, fullName: true, email: true } },
        agent: { select: { id: true, fullName: true, email: true } },
        service: { select: { id: true, name: true, slug: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { select: { id: true, fullName: true, email: true, role: true } } },
        },
      },
    });
  }

  async findLeadByReferenceNo(referenceNo: string): Promise<LeadWithDetails | null> {
    return prisma.lead.findUnique({
      where: { referenceNo },
      include: {
        partner: { select: { id: true, fullName: true, email: true, companyName: true } },
        coordinator: { select: { id: true, fullName: true, email: true } },
        agent: { select: { id: true, fullName: true, email: true } },
        service: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async listLeads(params: ListLeadsParams): Promise<{ items: LeadWithDetails[]; total: number }> {
    const where: Prisma.LeadWhereInput = {};

    if (params.filter.partnerId) {
      where.partnerId = params.filter.partnerId;
    }
    if (params.filter.coordinatorId) {
      where.coordinatorId = params.filter.coordinatorId;
    }
    if (params.filter.agentId) {
      where.agentId = params.filter.agentId;
    }
    if (params.filter.status) {
      where.status = params.filter.status;
    }
    if (params.filter.serviceId) {
      where.serviceId = params.filter.serviceId;
    }
    if (params.filter.search) {
      const search = params.filter.search;
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search, mode: 'insensitive' } },
        { clientEmail: { contains: search, mode: 'insensitive' } },
        { referenceNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (params.page - 1) * params.limit;
    const take = params.limit;
    const orderBy: Prisma.LeadOrderByWithRelationInput = {
      [params.sortBy]: params.sortOrder,
    };

    const [total, items] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          partner: { select: { id: true, fullName: true, email: true, companyName: true } },
          coordinator: { select: { id: true, fullName: true, email: true } },
          agent: { select: { id: true, fullName: true, email: true } },
          service: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    return { items, total };
  }

  async updateLead(id: string, data: UpdateLeadRecordInput): Promise<LeadWithDetails> {
    const updateData: Prisma.LeadUpdateInput = {};

    if (data.clientName !== undefined) updateData.clientName = data.clientName;
    if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
    if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
    if (data.expectedDealValue !== undefined) {
      updateData.expectedDealValue = new Prisma.Decimal(data.expectedDealValue.toString());
    }
    if (data.actualDealValue !== undefined) {
      updateData.actualDealValue =
        data.actualDealValue !== null ? new Prisma.Decimal(data.actualDealValue.toString()) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        partner: { select: { id: true, fullName: true, email: true, companyName: true } },
        coordinator: { select: { id: true, fullName: true, email: true } },
        agent: { select: { id: true, fullName: true, email: true } },
        service: { select: { id: true, name: true, slug: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { select: { id: true, fullName: true, email: true, role: true } } },
        },
      },
    });
  }

  async transitionLeadStatus(id: string, transition: TransitionStatusRecordInput): Promise<LeadWithDetails> {
    return prisma.$transaction(async (tx) => {
      const updatePayload: Prisma.LeadUpdateInput = {
        status: transition.status,
      };

      if (transition.wonAt !== undefined) {
        updatePayload.wonAt = transition.wonAt;
      }
      if (transition.actualDealValue !== undefined && transition.actualDealValue !== null) {
        updatePayload.actualDealValue = new Prisma.Decimal(transition.actualDealValue.toString());
      }
      if (transition.lostReasonId !== undefined) {
        updatePayload.lostReason = transition.lostReasonId
          ? { connect: { id: transition.lostReasonId } }
          : { disconnect: true };
      }
      if (transition.lostDetails !== undefined) {
        updatePayload.lostDetails = transition.lostDetails;
      }

      const updatedLead = await tx.lead.update({
        where: { id },
        data: updatePayload,
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: updatedLead.id,
          changedById: transition.changedById,
          previousStatus: transition.previousStatus,
          newStatus: transition.status,
          transitionNote: transition.transitionNote ?? null,
        },
      });

      return tx.lead.findUniqueOrThrow({
        where: { id },
        include: {
          partner: { select: { id: true, fullName: true, email: true, companyName: true } },
          coordinator: { select: { id: true, fullName: true, email: true } },
          agent: { select: { id: true, fullName: true, email: true } },
          service: { select: { id: true, name: true, slug: true } },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            include: { changedBy: { select: { id: true, fullName: true, email: true, role: true } } },
          },
        },
      });
    });
  }

  async assignLead(id: string, assignment: AssignLeadRecordInput): Promise<LeadWithDetails> {
    return prisma.$transaction(async (tx) => {
      const updatePayload: Prisma.LeadUpdateInput = {};

      if (assignment.coordinatorId !== undefined) {
        updatePayload.coordinator = assignment.coordinatorId
          ? { connect: { id: assignment.coordinatorId } }
          : { disconnect: true };
      }
      if (assignment.agentId !== undefined) {
        updatePayload.agent = assignment.agentId
          ? { connect: { id: assignment.agentId } }
          : { disconnect: true };
      }
      if (assignment.statusChange) {
        updatePayload.status = assignment.statusChange.newStatus;
      }

      const updatedLead = await tx.lead.update({
        where: { id },
        data: updatePayload,
      });

      if (assignment.statusChange || assignment.transitionNote) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: updatedLead.id,
            changedById: assignment.changedById,
            previousStatus: assignment.statusChange ? assignment.statusChange.previousStatus : updatedLead.status,
            newStatus: assignment.statusChange ? assignment.statusChange.newStatus : updatedLead.status,
            transitionNote: assignment.transitionNote ?? 'Lead reassignment update',
          },
        });
      }

      return tx.lead.findUniqueOrThrow({
        where: { id },
        include: {
          partner: { select: { id: true, fullName: true, email: true, companyName: true } },
          coordinator: { select: { id: true, fullName: true, email: true } },
          agent: { select: { id: true, fullName: true, email: true } },
          service: { select: { id: true, name: true, slug: true } },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            include: { changedBy: { select: { id: true, fullName: true, email: true, role: true } } },
          },
        },
      });
    });
  }

  async findServiceById(id: string): Promise<Service | null> {
    return prisma.service.findUnique({ where: { id } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async getLeadStatusHistory(leadId: string): Promise<LeadStatusHistoryWithUser[]> {
    return prisma.leadStatusHistory.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
      include: {
        changedBy: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });
  }
}

export class InMemoryReferralRepository implements IReferralRepository {
  private leads: Map<string, Lead> = new Map();
  private history: Map<string, LeadStatusHistoryWithUser[]> = new Map();
  private services: Map<string, Service> = new Map();
  private users: Map<string, User> = new Map();

  clearAll(): void {
    this.leads.clear();
    this.history.clear();
    this.services.clear();
    this.users.clear();
  }

  seedService(data: Partial<Service>): Service {
    const id = data.id ?? crypto.randomUUID();
    const service: Service = {
      id,
      categoryId: data.categoryId ?? crypto.randomUUID(),
      slug: data.slug ?? `service-${id.substring(0, 8)}`,
      name: data.name ?? 'UAE Business Setup',
      description: data.description ?? 'Company incorporation',
      defaultPartnerCommissionBps: data.defaultPartnerCommissionBps ?? 200,
      defaultAgentCommissionBps: data.defaultAgentCommissionBps ?? 100,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.services.set(id, service);
    return service;
  }

  seedUser(data: Partial<User>): User {
    const id = data.id ?? crypto.randomUUID();
    const user: User = {
      id,
      email: data.email ?? `user-${id.substring(0, 6)}@test.com`,
      passwordHash: data.passwordHash ?? 'hash',
      fullName: data.fullName ?? 'Test User',
      phone: data.phone ?? '+971500000000',
      whatsapp: data.whatsapp ?? null,
      avatarUrl: data.avatarUrl ?? null,
      brn: data.brn ?? null,
      nationality: data.nationality ?? null,
      role: data.role ?? 'REFERRAL_PARTNER',
      agentType: data.agentType ?? 'INDEPENDENT',
      accountStatus: data.accountStatus ?? 'ACTIVE',
      coordinatorId: data.coordinatorId ?? null,
      companyName: data.companyName ?? null,
      referralCode: data.referralCode ?? null,
      emailVerifiedAt: data.emailVerifiedAt ?? new Date(),
      kycVerifiedAt: data.kycVerifiedAt ?? null,
      deletionRequestedAt: data.deletionRequestedAt ?? null,
      approvedAt: data.approvedAt ?? new Date(),
      approvedById: data.approvedById ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async findServiceById(id: string): Promise<Service | null> {
    return this.services.get(id) ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async createLead(data: CreateLeadRecordInput): Promise<LeadWithDetails> {
    const id = crypto.randomUUID();
    const initialStatus = data.status ?? LeadStatus.SUBMITTED;
    const now = new Date();

    const lead: Lead = {
      id,
      referenceNo: data.referenceNo,
      partnerId: data.partnerId,
      coordinatorId: data.coordinatorId ?? null,
      agentId: data.agentId ?? null,
      serviceId: data.serviceId,
      clientName: data.clientName,
      clientEmail: data.clientEmail ?? null,
      clientPhone: data.clientPhone,
      expectedDealValue: new Prisma.Decimal(data.expectedDealValue.toString()),
      actualDealValue: null,
      currency: data.currency ?? 'AED',
      customPartnerCommissionBps: null,
      customAgentCommissionBps: null,
      status: initialStatus,
      wonAt: null,
      lostReasonId: null,
      lostDetails: null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.leads.set(id, lead);

    const historyRecord: LeadStatusHistoryWithUser = {
      id: crypto.randomUUID(),
      leadId: id,
      changedById: data.changedById,
      previousStatus: null,
      newStatus: initialStatus,
      transitionNote: data.transitionNote ?? 'Initial referral submission',
      createdAt: now,
      changedBy: this.users.get(data.changedById)
        ? {
            id: data.changedById,
            fullName: this.users.get(data.changedById)!.fullName,
            email: this.users.get(data.changedById)!.email,
            role: this.users.get(data.changedById)!.role,
          }
        : undefined,
    };

    this.history.set(id, [historyRecord]);

    return this.enrichLead(lead);
  }

  async findLeadById(id: string): Promise<LeadWithDetails | null> {
    const lead = this.leads.get(id);
    return lead ? this.enrichLead(lead) : null;
  }

  async findLeadByReferenceNo(referenceNo: string): Promise<LeadWithDetails | null> {
    for (const lead of this.leads.values()) {
      if (lead.referenceNo === referenceNo) {
        return this.enrichLead(lead);
      }
    }
    return null;
  }

  async listLeads(params: ListLeadsParams): Promise<{ items: LeadWithDetails[]; total: number }> {
    let list = Array.from(this.leads.values());

    if (params.filter.partnerId) {
      list = list.filter((l) => l.partnerId === params.filter.partnerId);
    }
    if (params.filter.coordinatorId) {
      list = list.filter((l) => l.coordinatorId === params.filter.coordinatorId);
    }
    if (params.filter.agentId) {
      list = list.filter((l) => l.agentId === params.filter.agentId);
    }
    if (params.filter.status) {
      list = list.filter((l) => l.status === params.filter.status);
    }
    if (params.filter.serviceId) {
      list = list.filter((l) => l.serviceId === params.filter.serviceId);
    }
    if (params.filter.search) {
      const q = params.filter.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.clientName.toLowerCase().includes(q) ||
          l.clientPhone.toLowerCase().includes(q) ||
          (l.clientEmail && l.clientEmail.toLowerCase().includes(q)) ||
          l.referenceNo.toLowerCase().includes(q)
      );
    }

    const total = list.length;

    list.sort((a, b) => {
      let aVal = a[params.sortBy as keyof Lead] as string | number | Date | Prisma.Decimal | null | undefined;
      let bVal = b[params.sortBy as keyof Lead] as string | number | Date | Prisma.Decimal | null | undefined;
      if (aVal instanceof Prisma.Decimal) aVal = aVal.toNumber();
      if (bVal instanceof Prisma.Decimal) bVal = bVal.toNumber();
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return params.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return params.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const start = (params.page - 1) * params.limit;
    const paged = list.slice(start, start + params.limit);

    return {
      items: paged.map((l) => this.enrichLead(l)),
      total,
    };
  }

  async updateLead(id: string, data: UpdateLeadRecordInput): Promise<LeadWithDetails> {
    const existing = this.leads.get(id);
    if (!existing) throw new Error(`Lead ${id} not found`);

    const updated: Lead = {
      ...existing,
      ...(data.clientName !== undefined && { clientName: data.clientName }),
      ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail }),
      ...(data.clientPhone !== undefined && { clientPhone: data.clientPhone }),
      ...(data.expectedDealValue !== undefined && {
        expectedDealValue: new Prisma.Decimal(data.expectedDealValue.toString()),
      }),
      ...(data.actualDealValue !== undefined && {
        actualDealValue:
          data.actualDealValue !== null ? new Prisma.Decimal(data.actualDealValue.toString()) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    };

    this.leads.set(id, updated);
    return this.enrichLead(updated);
  }

  async transitionLeadStatus(id: string, transition: TransitionStatusRecordInput): Promise<LeadWithDetails> {
    const existing = this.leads.get(id);
    if (!existing) throw new Error(`Lead ${id} not found`);

    const updated: Lead = {
      ...existing,
      status: transition.status,
      ...(transition.wonAt !== undefined && { wonAt: transition.wonAt }),
      ...(transition.actualDealValue !== undefined &&
        transition.actualDealValue !== null && {
          actualDealValue: new Prisma.Decimal(transition.actualDealValue.toString()),
        }),
      ...(transition.lostReasonId !== undefined && { lostReasonId: transition.lostReasonId }),
      ...(transition.lostDetails !== undefined && { lostDetails: transition.lostDetails }),
      updatedAt: new Date(),
    };

    this.leads.set(id, updated);

    const historyRecord: LeadStatusHistoryWithUser = {
      id: crypto.randomUUID(),
      leadId: id,
      changedById: transition.changedById,
      previousStatus: transition.previousStatus,
      newStatus: transition.status,
      transitionNote: transition.transitionNote ?? null,
      createdAt: new Date(),
      changedBy: this.users.get(transition.changedById)
        ? {
            id: transition.changedById,
            fullName: this.users.get(transition.changedById)!.fullName,
            email: this.users.get(transition.changedById)!.email,
            role: this.users.get(transition.changedById)!.role,
          }
        : undefined,
    };

    const currentHistory = this.history.get(id) ?? [];
    currentHistory.unshift(historyRecord);
    this.history.set(id, currentHistory);

    return this.enrichLead(updated);
  }

  async assignLead(id: string, assignment: AssignLeadRecordInput): Promise<LeadWithDetails> {
    const existing = this.leads.get(id);
    if (!existing) throw new Error(`Lead ${id} not found`);

    const updated: Lead = {
      ...existing,
      ...(assignment.coordinatorId !== undefined && { coordinatorId: assignment.coordinatorId }),
      ...(assignment.agentId !== undefined && { agentId: assignment.agentId }),
      ...(assignment.statusChange && { status: assignment.statusChange.newStatus }),
      updatedAt: new Date(),
    };

    this.leads.set(id, updated);

    if (assignment.statusChange || assignment.transitionNote) {
      const historyRecord: LeadStatusHistoryWithUser = {
        id: crypto.randomUUID(),
        leadId: id,
        changedById: assignment.changedById,
        previousStatus: assignment.statusChange ? assignment.statusChange.previousStatus : existing.status,
        newStatus: assignment.statusChange ? assignment.statusChange.newStatus : existing.status,
        transitionNote: assignment.transitionNote ?? 'Lead reassignment update',
        createdAt: new Date(),
        changedBy: this.users.get(assignment.changedById)
          ? {
              id: assignment.changedById,
              fullName: this.users.get(assignment.changedById)!.fullName,
              email: this.users.get(assignment.changedById)!.email,
              role: this.users.get(assignment.changedById)!.role,
            }
          : undefined,
      };

      const currentHistory = this.history.get(id) ?? [];
      currentHistory.unshift(historyRecord);
      this.history.set(id, currentHistory);
    }

    return this.enrichLead(updated);
  }

  async getLeadStatusHistory(leadId: string): Promise<LeadStatusHistoryWithUser[]> {
    const hist = this.history.get(leadId) ?? [];
    return [...hist].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private enrichLead(lead: Lead): LeadWithDetails {
    const partner = this.users.get(lead.partnerId);
    const coordinator = lead.coordinatorId ? this.users.get(lead.coordinatorId) : null;
    const agent = lead.agentId ? this.users.get(lead.agentId) : null;
    const service = this.services.get(lead.serviceId);
    const history = this.history.get(lead.id) ?? [];

    return {
      ...lead,
      partner: partner
        ? {
            id: partner.id,
            fullName: partner.fullName,
            email: partner.email,
            companyName: partner.companyName,
          }
        : undefined,
      coordinator: coordinator
        ? {
            id: coordinator.id,
            fullName: coordinator.fullName,
            email: coordinator.email,
          }
        : null,
      agent: agent
        ? {
            id: agent.id,
            fullName: agent.fullName,
            email: agent.email,
          }
        : null,
      service: service
        ? {
            id: service.id,
            name: service.name,
            slug: service.slug,
          }
        : null,
      statusHistory: [...history],
    };
  }
}

// Global repository singleton
let defaultReferralRepository: IReferralRepository =
  process.env.NODE_ENV === 'test' ? new InMemoryReferralRepository() : new PrismaReferralRepository();

export const getReferralRepository = (): IReferralRepository => defaultReferralRepository;

export const setReferralRepository = (repo: IReferralRepository): void => {
  defaultReferralRepository = repo;
};
