import { LeadStatus, Role, AccountStatus } from '@prisma/client';
import {
  IReferralRepository,
  getReferralRepository,
  LeadWithDetails,
  LeadStatusHistoryWithUser,
} from './referral.repository';
import {
  CreateReferralInput,
  UpdateReferralInput,
  TransitionStatusInput,
  AssignReferralInput,
  ListReferralsQuery,
} from './referral.schemas';
import { AuthenticatedUser } from '../../types';
import { AppError } from '../auth/auth.service';
import crypto from 'crypto';

export class ReferralService {
  private explicitRepo?: IReferralRepository;

  constructor(repo?: IReferralRepository) {
    this.explicitRepo = repo;
  }

  private get repo(): IReferralRepository {
    return this.explicitRepo ?? getReferralRepository();
  }

  /**
   * Create a new referral/lead
   */
  async createReferral(
    input: CreateReferralInput,
    actor: AuthenticatedUser
  ): Promise<LeadWithDetails> {
    if (actor.accountStatus !== AccountStatus.ACTIVE) {
      throw new AppError(
        403,
        `Account status '${actor.accountStatus}' is not permitted to create referrals. Active approval required.`
      );
    }

    // Determine partner attribution
    let partnerId = actor.id;
    if (actor.role === Role.REFERRAL_PARTNER) {
      // Referral partner can only submit on their own behalf
      partnerId = actor.id;
    } else if (actor.role === Role.ADMIN || actor.role === Role.COORDINATOR) {
      // Admin/Coordinator can specify partnerId if provided
      if (input.partnerId) {
        const partnerUser = await this.repo.findUserById(input.partnerId);
        if (!partnerUser || partnerUser.role !== Role.REFERRAL_PARTNER) {
          throw new AppError(400, 'Specified partnerId does not correspond to a valid referral partner');
        }
        partnerId = partnerUser.id;
      }
    } else {
      throw new AppError(403, 'Agents are not authorized to create referrals');
    }

    // Validate service exists and is active
    const service = await this.repo.findServiceById(input.serviceId);
    if (!service || !service.isActive) {
      throw new AppError(404, 'Selected service is invalid or inactive');
    }

    // Check partner's assigned coordinator (auto-routing)
    const partner = await this.repo.findUserById(partnerId);
    const assignedCoordinatorId = partner?.coordinatorId ?? null;

    // Duplicate detection (idempotency guard)
    // Prevent duplicate lead submissions for same partner + client phone in active status
    const existing = await this.repo.listLeads({
      filter: {
        partnerId,
        search: input.clientPhone,
      },
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const activeStatuses: LeadStatus[] = [
      LeadStatus.SUBMITTED,
      LeadStatus.ASSIGNED,
      LeadStatus.CONTACTED,
    ];

    const hasDuplicate = existing.items.some(
      (l) => l.clientPhone === input.clientPhone && activeStatuses.includes(l.status)
    );

    if (hasDuplicate) {
      throw new AppError(
        409,
        `An active referral already exists for client phone ${input.clientPhone}`
      );
    }

    // Generate unique human-readable reference number: REF-YYYY-XXXXXX
    const referenceNo = await this.generateReferenceNo();

    return this.repo.createLead({
      referenceNo,
      partnerId,
      coordinatorId: assignedCoordinatorId,
      agentId: null,
      serviceId: input.serviceId,
      clientName: input.clientName,
      clientEmail: input.clientEmail ?? null,
      clientPhone: input.clientPhone,
      expectedDealValue: input.expectedDealValue,
      currency: input.currency ?? 'AED',
      notes: input.notes ?? null,
      status: LeadStatus.SUBMITTED,
      changedById: actor.id,
      transitionNote: 'Initial referral creation',
    });
  }

  /**
   * View a referral by ID with strict ownership and access boundaries
   */
  async getReferralById(id: string, actor: AuthenticatedUser): Promise<LeadWithDetails> {
    const lead = await this.repo.findLeadById(id);
    if (!lead) {
      throw new AppError(404, 'Referral not found');
    }

    this.assertReadAccess(lead, actor);
    return lead;
  }

  /**
   * List referrals with pagination, filtering, and role-based data isolation
   */
  async listReferrals(
    query: ListReferralsQuery,
    actor: AuthenticatedUser
  ): Promise<{
    items: LeadWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filter = {
      status: query.status,
      serviceId: query.serviceId,
      search: query.search,
      partnerId: undefined as string | undefined,
      coordinatorId: undefined as string | undefined,
      agentId: undefined as string | undefined,
    };

    // Strict role-based query isolation
    if (actor.role === Role.REFERRAL_PARTNER) {
      filter.partnerId = actor.id;
    } else if (actor.role === Role.AGENT) {
      filter.agentId = actor.id;
    } else if (actor.role === Role.COORDINATOR) {
      // Coordinator sees leads where coordinatorId matches, or can view unassigned leads
      // If coordinator specifically filters, allow it, otherwise default to their scope
    }

    const { items, total } = await this.repo.listLeads({
      filter,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  /**
   * View the authenticated user's own referrals
   */
  async getMyReferrals(
    query: ListReferralsQuery,
    actor: AuthenticatedUser
  ): Promise<{
    items: LeadWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const filter = {
      status: query.status,
      serviceId: query.serviceId,
      search: query.search,
      partnerId: actor.role === Role.REFERRAL_PARTNER ? actor.id : undefined,
      agentId: actor.role === Role.AGENT ? actor.id : undefined,
      coordinatorId: actor.role === Role.COORDINATOR ? actor.id : undefined,
    };

    const { items, total } = await this.repo.listLeads({
      filter,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  /**
   * Update permitted referral fields
   */
  async updateReferral(
    id: string,
    input: UpdateReferralInput,
    actor: AuthenticatedUser
  ): Promise<LeadWithDetails> {
    const lead = await this.repo.findLeadById(id);
    if (!lead) {
      throw new AppError(404, 'Referral not found');
    }

    // Ownership & permission boundaries
    if (actor.role === Role.REFERRAL_PARTNER) {
      if (lead.partnerId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }

      // Partner can only edit before deal is assigned or advanced
      const editableStatuses: LeadStatus[] = [LeadStatus.DRAFT, LeadStatus.SUBMITTED];
      if (!editableStatuses.includes(lead.status)) {
        throw new AppError(
          400,
          `Referral cannot be edited in '${lead.status}' status. Only DRAFT or SUBMITTED leads may be modified.`
        );
      }

      // Partners cannot modify actual deal value
      if (input.actualDealValue !== undefined) {
        throw new AppError(403, 'Referral partners are not authorized to update actual deal value');
      }
    } else if (actor.role === Role.AGENT) {
      if (lead.agentId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }
      // Agents can only update notes
      if (
        input.clientName !== undefined ||
        input.clientEmail !== undefined ||
        input.clientPhone !== undefined ||
        input.expectedDealValue !== undefined
      ) {
        throw new AppError(403, 'Agents can only update notes on assigned referrals');
      }
    } else if (actor.role !== Role.ADMIN && actor.role !== Role.COORDINATOR) {
      throw new AppError(403, 'Unauthorized to update this referral');
    }

    // Terminal states cannot be updated
    const terminalStatuses: LeadStatus[] = [
      LeadStatus.WON,
      LeadStatus.LOST,
      LeadStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(lead.status)) {
      throw new AppError(400, `Cannot update referral in terminal '${lead.status}' status`);
    }

    return this.repo.updateLead(id, {
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      expectedDealValue: input.expectedDealValue,
      actualDealValue: input.actualDealValue,
      notes: input.notes,
    });
  }

  /**
   * Transition referral status (State Machine enforcement)
   */
  async transitionStatus(
    id: string,
    input: TransitionStatusInput,
    actor: AuthenticatedUser
  ): Promise<LeadWithDetails> {
    const lead = await this.repo.findLeadById(id);
    if (!lead) {
      throw new AppError(404, 'Referral not found');
    }

    const previousStatus = lead.status;
    const targetStatus = input.status;

    // Terminal states cannot be transitioned out of
    const terminalStatuses: LeadStatus[] = [
      LeadStatus.WON,
      LeadStatus.LOST,
      LeadStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(previousStatus)) {
      throw new AppError(
        400,
        `Cannot transition referral from terminal '${previousStatus}' status`
      );
    }

    // Role-based transition permissions
    if (actor.role === Role.REFERRAL_PARTNER) {
      if (lead.partnerId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }

      // Partners can only submit from DRAFT or CANCEL their own lead
      const partnerAllowed =
        (previousStatus === LeadStatus.DRAFT && targetStatus === LeadStatus.SUBMITTED) ||
        ((previousStatus === LeadStatus.DRAFT || previousStatus === LeadStatus.SUBMITTED) &&
          targetStatus === LeadStatus.CANCELLED);

      if (!partnerAllowed) {
        throw new AppError(
          403,
          `Referral partners cannot transition referrals from '${previousStatus}' to '${targetStatus}'`
        );
      }
    } else if (actor.role === Role.AGENT) {
      if (lead.agentId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }

      // Agents manage pipeline stages on assigned leads
      const agentAllowedStatuses: LeadStatus[] = [
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.PROPOSAL_SENT,
        LeadStatus.NEGOTIATION,
        LeadStatus.WON,
        LeadStatus.LOST,
      ];

      if (!agentAllowedStatuses.includes(targetStatus)) {
        throw new AppError(
          403,
          `Agents are not authorized to transition referrals to '${targetStatus}'`
        );
      }
    } else if (actor.role !== Role.ADMIN && actor.role !== Role.COORDINATOR) {
      throw new AppError(403, 'Unauthorized to transition referral status');
    }

    // Valid state transitions graph
    const validTransitions: Record<LeadStatus, LeadStatus[]> = {
      [LeadStatus.DRAFT]: [LeadStatus.SUBMITTED, LeadStatus.CANCELLED],
      [LeadStatus.SUBMITTED]: [LeadStatus.ASSIGNED, LeadStatus.CONTACTED, LeadStatus.LOST, LeadStatus.CANCELLED],
      [LeadStatus.ASSIGNED]: [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.LOST, LeadStatus.CANCELLED],
      [LeadStatus.CONTACTED]: [
        LeadStatus.QUALIFIED,
        LeadStatus.PROPOSAL_SENT,
        LeadStatus.NEGOTIATION,
        LeadStatus.WON,
        LeadStatus.LOST,
        LeadStatus.CANCELLED,
      ],
      [LeadStatus.QUALIFIED]: [
        LeadStatus.PROPOSAL_SENT,
        LeadStatus.NEGOTIATION,
        LeadStatus.WON,
        LeadStatus.LOST,
        LeadStatus.CANCELLED,
      ],
      [LeadStatus.PROPOSAL_SENT]: [
        LeadStatus.NEGOTIATION,
        LeadStatus.WON,
        LeadStatus.LOST,
        LeadStatus.CANCELLED,
      ],
      [LeadStatus.NEGOTIATION]: [LeadStatus.WON, LeadStatus.LOST, LeadStatus.CANCELLED],
      [LeadStatus.WON]: [],
      [LeadStatus.LOST]: [],
      [LeadStatus.CANCELLED]: [],
    };

    if (!validTransitions[previousStatus].includes(targetStatus)) {
      throw new AppError(
        400,
        `Invalid status transition from '${previousStatus}' to '${targetStatus}'`
      );
    }

    // WON transition setup
    let wonAt: Date | null = null;
    let actualDealValue = input.actualDealValue ?? lead.actualDealValue;

    if (targetStatus === LeadStatus.WON) {
      wonAt = new Date();
      if (!actualDealValue) {
        // Fall back to expectedDealValue if actual was not explicitly provided
        actualDealValue = lead.expectedDealValue;
      }
    }

    return this.repo.transitionLeadStatus(id, {
      status: targetStatus,
      previousStatus,
      changedById: actor.id,
      transitionNote: input.transitionNote,
      actualDealValue,
      wonAt,
      lostReasonId: input.lostReasonId,
      lostDetails: input.lostDetails,
    });
  }

  /**
   * Assign or reassign a referral to Coordinator or Agent
   */
  async assignReferral(
    id: string,
    input: AssignReferralInput,
    actor: AuthenticatedUser
  ): Promise<LeadWithDetails> {
    if (actor.role !== Role.ADMIN && actor.role !== Role.COORDINATOR) {
      throw new AppError(403, 'Only administrators and coordinators are authorized to assign referrals');
    }

    const lead = await this.repo.findLeadById(id);
    if (!lead) {
      throw new AppError(404, 'Referral not found');
    }

    const terminalStatuses: LeadStatus[] = [
      LeadStatus.WON,
      LeadStatus.LOST,
      LeadStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(lead.status)) {
      throw new AppError(400, `Cannot assign referral in terminal '${lead.status}' status`);
    }

    // Validate coordinator target
    if (input.coordinatorId) {
      const coordinator = await this.repo.findUserById(input.coordinatorId);
      if (
        !coordinator ||
        (coordinator.role !== Role.COORDINATOR && coordinator.role !== Role.ADMIN) ||
        coordinator.accountStatus !== AccountStatus.ACTIVE
      ) {
        throw new AppError(400, 'Assigned coordinator is invalid, inactive, or not authorized');
      }
    }

    // Validate agent target
    if (input.agentId) {
      const agent = await this.repo.findUserById(input.agentId);
      if (
        !agent ||
        agent.role !== Role.AGENT ||
        agent.accountStatus !== AccountStatus.ACTIVE
      ) {
        throw new AppError(400, 'Assigned sales agent is invalid, inactive, or not an active agent');
      }
    }

    // If status is currently SUBMITTED, auto-advance to ASSIGNED
    let statusChange: { previousStatus: LeadStatus; newStatus: LeadStatus } | undefined;
    if (lead.status === LeadStatus.SUBMITTED && (input.agentId || input.coordinatorId)) {
      statusChange = {
        previousStatus: LeadStatus.SUBMITTED,
        newStatus: LeadStatus.ASSIGNED,
      };
    }

    return this.repo.assignLead(id, {
      coordinatorId: input.coordinatorId,
      agentId: input.agentId,
      changedById: actor.id,
      transitionNote: input.assignmentNote ?? 'Referral assigned',
      statusChange,
    });
  }

  /**
   * Retrieve status transition history for a referral
   */
  async getReferralHistory(
    id: string,
    actor: AuthenticatedUser
  ): Promise<LeadStatusHistoryWithUser[]> {
    const lead = await this.repo.findLeadById(id);
    if (!lead) {
      throw new AppError(404, 'Referral not found');
    }

    this.assertReadAccess(lead, actor);
    return this.repo.getLeadStatusHistory(id);
  }

  /**
   * Enforce read access permissions
   */
  private assertReadAccess(lead: LeadWithDetails, actor: AuthenticatedUser): void {
    if (actor.role === Role.ADMIN || actor.role === Role.COORDINATOR) {
      return;
    }

    if (actor.role === Role.REFERRAL_PARTNER) {
      if (lead.partnerId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }
      return;
    }

    if (actor.role === Role.AGENT) {
      if (lead.agentId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }
      return;
    }

    throw new AppError(403, 'Access denied to this referral');
  }

  /**
   * Helper to generate unique human-readable reference number
   */
  private async generateReferenceNo(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempts = 0; attempts < 10; attempts++) {
      const random = crypto.randomInt(100000, 1000000).toString();
      const referenceNo = `REF-${year}-${random}`;
      const existing = await this.repo.findLeadByReferenceNo(referenceNo);
      if (!existing) {
        return referenceNo;
      }
    }
    return `REF-${year}-${Date.now().toString().slice(-6)}`;
  }
}
