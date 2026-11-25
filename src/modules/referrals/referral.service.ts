import { LeadStatus, Role, AccountStatus, Service, AgentType, AgencyRole } from '@prisma/client';
import {
  IReferralRepository,
  getReferralRepository,
  LeadWithDetails,
  LeadStatusHistoryWithUser,
  LeadFilterCriteria,
} from './referral.repository';
import {
  AgencyDecision,
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
    } else if (actor.role === Role.AGENT) {
      // Independent Agents, Agency Owners, Agency Admins, and Agency Members submit with own attribution
      partnerId = actor.id;
    } else if (actor.role === Role.ADMIN) {
      // Admin can specify partnerId if provided, or default to admin
      if (input.partnerId) {
        const partnerUser = await this.repo.findUserById(input.partnerId);
        if (!partnerUser || (partnerUser.role !== Role.REFERRAL_PARTNER && partnerUser.role !== Role.AGENT)) {
          throw new AppError(400, 'Specified partnerId does not correspond to a valid partner or agent');
        }
        partnerId = partnerUser.id;
      }
    } else {
      throw new AppError(403, 'Coordinators are focused on lead triage and assignment and cannot create referrals');
    }

    // Validate service exists and is active
    const service = await this.repo.findServiceById(input.serviceId);
    if (!service || !service.isActive) {
      throw new AppError(404, 'Selected service is invalid or inactive');
    }

    if (input.demoPropertyId && !/property|real-estate/i.test(service.slug)) {
      throw new AppError(400, 'Choose a real estate service for this illustrative listing');
    }
    // Check partner's assigned coordinator (auto-routing)
    const partner = await this.repo.findUserById(partnerId);
    const assignedCoordinatorId = partner?.coordinatorId ?? null;

    // Generate unique human-readable reference number: REF-YYYY-XXXXXX
    const referenceNo = await this.generateReferenceNo();
    const agencyMember = actor.role === Role.AGENT && (actor.agentType === AgentType.AGENCY_MEMBER || !!actor.agencyId);
    if (agencyMember && !actor.agencyId) throw new AppError(403, 'Active agency membership required');
    if (partnerId !== actor.id && partner?.agentType === AgentType.AGENCY_MEMBER) {
      throw new AppError(403, 'Agency referrals must be submitted by the member');
    }
    if (!input.asDraft && !input.consent) throw new AppError(400, 'Confirm client consent before submission');
    const pending = agencyMember && !input.asDraft;
    const initialStatus = input.asDraft || pending ? LeadStatus.DRAFT : LeadStatus.SUBMITTED;
    const transitionNote = pending ? 'Submitted for agency review' : input.asDraft ? 'Draft referral created' : 'Submitted to Prospera';

    return this.repo.createLead({
      requirements: input.requirements,
      demoPropertyId: input.demoPropertyId,
      submissionKey: input.submissionKey,
      originatingAgencyId: agencyMember ? actor.agencyId : null,
      agencyReviewStage: pending ? 'PENDING_AGENCY_APPROVAL' : null,
      consentAt: !input.asDraft && input.consent ? new Date() : null,
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
      status: initialStatus,
      changedById: actor.id,
      transitionNote,
    });
  }

  /**
   * Get all active services with commission rules
   */
  async getServices(): Promise<Service[]> {
    return this.repo.listActiveServices();
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
    const filter: LeadFilterCriteria = {
      status: query.status,
      serviceId: query.serviceId,
      search: query.search,
    };

    // Strict role-based query isolation
    if (actor.role === Role.REFERRAL_PARTNER) {
      filter.partnerId = actor.id;
    } else if (actor.role === Role.AGENT) {
      if (
        actor.agentType === AgentType.AGENCY_MEMBER &&
        (actor.agencyRole === AgencyRole.AGENCY_OWNER || actor.agencyRole === AgencyRole.AGENCY_ADMIN) &&
        actor.agencyId
      ) {
        filter.agencyId = actor.agencyId;
      } else {
        filter.userId = actor.id;
      }
    } else if (actor.role === Role.COORDINATOR) {
      filter.intakeCoordinatorId = actor.id;
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
    const filter: LeadFilterCriteria = {
      status: query.status,
      serviceId: query.serviceId,
      search: query.search,
      partnerId: actor.role === Role.REFERRAL_PARTNER ? actor.id : undefined,
      intakeCoordinatorId: actor.role === Role.COORDINATOR ? actor.id : undefined,
      coordinatorId: actor.role === Role.COORDINATOR ? actor.id : undefined,
      userId: actor.role === Role.AGENT ? actor.id : undefined,
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

    this.assertReadAccess(lead, actor);
    if (lead.agencyReviewStage === 'PENDING_AGENCY_APPROVAL' ||
        (lead.originatingAgencyId && lead.status === 'DRAFT' && lead.partnerId !== actor.id) ||
        (lead.agencyReviewStage === 'AGENCY_APPROVED' && actor.id === lead.partnerId)) {
      throw new AppError(403, 'Only your draft or returned agency referral can be edited');
    }
    // Ownership & permission boundaries
    const isSubmitter = lead.partnerId === actor.id;
    if (actor.role === Role.REFERRAL_PARTNER || (actor.role === Role.AGENT && isSubmitter)) {
      if (!isSubmitter) {
        throw new AppError(404, 'Referral not found');
      }

      // Submitter can only edit before deal is assigned or advanced
      const editableStatuses: LeadStatus[] = [LeadStatus.DRAFT, LeadStatus.SUBMITTED];
      if (!editableStatuses.includes(lead.status)) {
        throw new AppError(
          400,
          `Referral cannot be edited in '${lead.status}' status. Only DRAFT or SUBMITTED leads may be modified.`
        );
      }

      // Submitters cannot modify actual deal value
      if (input.actualDealValue !== undefined) {
        throw new AppError(403, 'Submitters are not authorized to update actual deal value');
      }
    } else if (actor.role === Role.AGENT) {
      if (lead.agentId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }
      // Handling agents can only update notes
      if (
        input.requirements !== undefined ||
        input.actualDealValue !== undefined ||
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
      revision: lead.revision,
      requirements: input.requirements,
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

    this.assertReadAccess(lead, actor);
    if (lead.agencyReviewStage === 'PENDING_AGENCY_APPROVAL') {
      throw new AppError(403, 'Agency review is required');
    }
    const submittingDraft = lead.status === 'DRAFT' && input.status === 'SUBMITTED';
    const agencySubmission = submittingDraft && (!!lead.originatingAgencyId ||
      actor.agentType === AgentType.AGENCY_MEMBER || !!actor.agencyId);
    if (agencySubmission && (!actor.agencyId || (lead.originatingAgencyId && lead.originatingAgencyId !== actor.agencyId))) {
      throw new AppError(403, 'An active membership of the originating agency is required');
    }
    if (lead.status === 'DRAFT' && input.status === 'SUBMITTED' && (lead.partnerId !== actor.id || !input.consent)) {
      throw new AppError(403, 'Only the submitter can confirm consent and submit the draft');
    }
    if (input.status === 'ASSIGNED') throw new AppError(400, 'Use the assignment action to choose an agent');
    if (input.actualDealValue != null && input.status !== 'WON') throw new AppError(400, 'Actual value requires a won referral');
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
    const isSubmitter = lead.partnerId === actor.id;
    if (
      actor.role === Role.REFERRAL_PARTNER ||
      (actor.role === Role.AGENT && isSubmitter && (previousStatus === LeadStatus.DRAFT || targetStatus === LeadStatus.CANCELLED))
    ) {
      if (!isSubmitter) {
        throw new AppError(404, 'Referral not found');
      }

      // Submitters can only submit from DRAFT or CANCEL their own lead
      const submitterAllowed =
        (previousStatus === LeadStatus.DRAFT && targetStatus === LeadStatus.SUBMITTED) ||
        ((previousStatus === LeadStatus.DRAFT || previousStatus === LeadStatus.SUBMITTED) &&
          targetStatus === LeadStatus.CANCELLED);

      if (!submitterAllowed) {
        throw new AppError(
          403,
          `Submitters cannot transition referrals from '${previousStatus}' to '${targetStatus}'`
        );
      }
    } else if (actor.role === Role.AGENT) {
      if (lead.agentId !== actor.id) {
        throw new AppError(404, 'Referral not found');
      }

      // Handling agents manage pipeline stages on assigned leads
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
      revision: lead.revision,
      status: agencySubmission ? LeadStatus.DRAFT : targetStatus,
      originatingAgencyId: agencySubmission ? actor.agencyId! : undefined,
      agencyReviewStage: agencySubmission ? 'PENDING_AGENCY_APPROVAL' : undefined,
      consentAt: input.consent && targetStatus === 'SUBMITTED' ? new Date() : undefined,
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
  async reviewAgencyReferral(id: string, input: AgencyDecision, actor: AuthenticatedUser) {
    const lead = await this.getReferralById(id, actor);
    if (actor.role !== Role.AGENT || !actor.agencyId || actor.agencyId !== lead.originatingAgencyId ||
        actor.id === lead.partnerId || (actor.agencyRole !== AgencyRole.AGENCY_ADMIN && actor.agencyRole !== AgencyRole.AGENCY_OWNER)) {
      throw new AppError(403, 'An agency owner or administrator must review a referral from a different member');
    }
    if (lead.agencyReviewStage !== 'PENDING_AGENCY_APPROVAL' || lead.status !== 'DRAFT' || !lead.consentAt) {
      throw new AppError(409, 'Referral is not awaiting agency review with recorded consent');
    }
    const approved = input.decision === 'approve';
    return this.repo.transitionLeadStatus(id, {
      revision: lead.revision, changedById: actor.id, previousStatus: lead.status,
      status: approved ? LeadStatus.SUBMITTED : LeadStatus.DRAFT,
      agencyReviewStage: approved ? 'AGENCY_APPROVED' : 'AGENCY_CHANGES_REQUESTED',
      transitionNote: approved ? 'Referral approved and forwarded to Prospera' : input.reason,
    });
  }

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

    this.assertReadAccess(lead, actor);
    if (lead.status === 'DRAFT') throw new AppError(409, 'Referral has not entered Prospera intake');
    const terminalStatuses: LeadStatus[] = [
      LeadStatus.WON,
      LeadStatus.LOST,
      LeadStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(lead.status)) {
      throw new AppError(400, `Cannot assign referral in terminal '${lead.status}' status`);
    }

    if (actor.role === Role.COORDINATOR && input.coordinatorId !== undefined && input.coordinatorId !== actor.id) {
      throw new AppError(403, 'Coordinators can claim intake only for their own desk');
    }
    if (input.expectedRevision !== undefined && input.expectedRevision !== lead.revision) {
      throw new AppError(409, 'Referral changed. Refresh and review before assigning.');
    }
    if (lead.agentId && input.agentId !== undefined && input.agentId !== lead.agentId &&
        (!input.agentId || !input.assignmentNote?.trim() || input.expectedRevision === undefined)) {
      throw new AppError(409, 'Reassignment requires a replacement agent, current revision and reason');
    }
    if (input.agentId === lead.agentId && (input.coordinatorId ?? lead.coordinatorId) === lead.coordinatorId) return lead;
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
        agent.agentType !== AgentType.INDEPENDENT ||
        agent.accountStatus !== AccountStatus.ACTIVE
      ) {
        throw new AppError(400, 'Assigned sales agent is invalid, inactive, or not an active agent');
      }
    }

    // If status is currently SUBMITTED, auto-advance to ASSIGNED
    let statusChange: { previousStatus: LeadStatus; newStatus: LeadStatus } | undefined;
    if (lead.status === LeadStatus.SUBMITTED && input.agentId) {
      statusChange = {
        previousStatus: LeadStatus.SUBMITTED,
        newStatus: LeadStatus.ASSIGNED,
      };
    }

    return this.repo.assignLead(id, {
      revision: lead.revision,
      coordinatorId: actor.role === Role.COORDINATOR ? actor.id : input.coordinatorId,
      agentId: input.agentId === lead.agentId ? undefined : input.agentId,
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
    if (actor.role === Role.COORDINATOR && (lead.status === 'DRAFT' || (lead.coordinatorId && lead.coordinatorId !== actor.id))) {
      throw new AppError(404, 'Referral not found');
    }
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
      // 1. Personal access: lead created by this agent or assigned to this agent
      if (lead.partnerId === actor.id || lead.agentId === actor.id) {
        return;
      }

      // 2. Agency leadership access: Agency Owner or Agency Admin can view referrals from their agency
      if (
        actor.agentType === AgentType.AGENCY_MEMBER &&
        (actor.agencyRole === AgencyRole.AGENCY_OWNER || actor.agencyRole === AgencyRole.AGENCY_ADMIN) &&
        actor.agencyId
      ) {
        const leadAgencyId = lead.originatingAgencyId;
        if (leadAgencyId && leadAgencyId === actor.agencyId) {
          return;
        }
      }

      throw new AppError(404, 'Referral not found');
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
