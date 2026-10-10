// ============================================================================
// ISOLATED UNIT TESTS: PrismaReferralRepository (MOCKED PRISMA CLIENT)
//
// Note: These unit tests verify query arguments, atomic transactions,
// and error handling of PrismaReferralRepository using a mocked Prisma Client.
// Real PostgreSQL database integration tests will run in a staging environment.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadStatus } from '../src/types';
import { PrismaReferralRepository } from '../src/modules/referrals/referral.repository';
import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

vi.mock('../src/lib/prisma', () => {
  const mockTx = {
    lead: {
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    leadStatusHistory: {
      create: vi.fn(),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
      lead: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      leadStatusHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      service: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      _mockTx: mockTx,
    },
  };
});

type MockFn = ReturnType<typeof vi.fn>;

interface MockPrismaClient {
  $transaction: MockFn;
  lead: {
    create: MockFn;
    findUnique: MockFn;
    findUniqueOrThrow: MockFn;
    findMany: MockFn;
    count: MockFn;
    update: MockFn;
  };
  leadStatusHistory: {
    create: MockFn;
    findMany: MockFn;
  };
  service: {
    findUnique: MockFn;
  };
  user: {
    findUnique: MockFn;
  };
  _mockTx: {
    lead: {
      create: MockFn;
      findUniqueOrThrow: MockFn;
      update: MockFn;
    };
    leadStatusHistory: {
      create: MockFn;
    };
  };
}

const prismaMock = prisma as unknown as MockPrismaClient;

describe('PrismaReferralRepository (Isolated Mocked Delegate Tests)', () => {
  let repository: PrismaReferralRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaReferralRepository();
  });

  describe('createLead', () => {
    it('should execute inside atomic $transaction creating lead and status history', async () => {
      const mockLead = {
        id: 'lead-1',
        referenceNo: 'REF-2026-123456',
        partnerId: 'partner-1',
        serviceId: 'svc-1',
        clientName: 'Salim Al Ketbi',
        clientPhone: '+971501112233',
        expectedDealValue: new Prisma.Decimal('50000.00'),
        currency: 'AED',
        status: LeadStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock._mockTx.lead.create.mockResolvedValue(mockLead);
      prismaMock._mockTx.leadStatusHistory.create.mockResolvedValue({ id: 'hist-1' });
      prismaMock._mockTx.lead.findUniqueOrThrow.mockResolvedValue(mockLead);

      const result = await repository.createLead({
        referenceNo: 'REF-2026-123456',
        partnerId: 'partner-1',
        serviceId: 'svc-1',
        clientName: 'Salim Al Ketbi',
        clientPhone: '+971501112233',
        expectedDealValue: 50000,
        changedById: 'partner-1',
        transitionNote: 'Initial referral creation',
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock._mockTx.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referenceNo: 'REF-2026-123456',
          partnerId: 'partner-1',
          clientName: 'Salim Al Ketbi',
          status: LeadStatus.SUBMITTED,
        }),
      });
      expect(prismaMock._mockTx.leadStatusHistory.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          changedById: 'partner-1',
          previousStatus: null,
          newStatus: LeadStatus.SUBMITTED,
          transitionNote: 'Initial referral creation',
        },
      });
      expect(result.id).toBe('lead-1');
    });
  });

  describe('findLeadById', () => {
    it('should query lead by ID with all relational includes', async () => {
      const mockLead = { id: 'lead-1', clientName: 'Found Client' };
      prismaMock.lead.findUnique.mockResolvedValue(mockLead);

      const result = await repository.findLeadById('lead-1');

      expect(prismaMock.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        include: expect.objectContaining({
          partner: expect.any(Object),
          coordinator: expect.any(Object),
          agent: expect.any(Object),
          service: expect.any(Object),
          statusHistory: expect.any(Object),
        }),
      });
      expect(result).toEqual(mockLead);
    });
  });

  describe('listLeads', () => {
    it('should apply pagination, partnerId filter, and calculate total', async () => {
      prismaMock.lead.count.mockResolvedValue(10);
      prismaMock.lead.findMany.mockResolvedValue([{ id: 'lead-1' }, { id: 'lead-2' }]);

      const result = await repository.listLeads({
        filter: { partnerId: 'p-1', status: LeadStatus.SUBMITTED },
        page: 2,
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(prismaMock.lead.count).toHaveBeenCalledWith({
        where: { partnerId: 'p-1', status: LeadStatus.SUBMITTED },
      });
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith({
        where: { partnerId: 'p-1', status: LeadStatus.SUBMITTED },
        skip: 2,
        take: 2,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
      expect(result.total).toBe(10);
      expect(result.items.length).toBe(2);
    });
  });

  describe('transitionLeadStatus', () => {
    it('should atomically update status and record status history in transaction', async () => {
      const mockUpdated = { id: 'lead-1', status: LeadStatus.CONTACTED };
      prismaMock._mockTx.lead.update.mockResolvedValue(mockUpdated);
      prismaMock._mockTx.leadStatusHistory.create.mockResolvedValue({ id: 'h-2' });
      prismaMock._mockTx.lead.findUniqueOrThrow.mockResolvedValue(mockUpdated);

      const result = await repository.transitionLeadStatus('lead-1', {
        status: LeadStatus.CONTACTED,
        previousStatus: LeadStatus.ASSIGNED,
        changedById: 'agent-1',
        transitionNote: 'Contacted client via WhatsApp',
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock._mockTx.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { status: LeadStatus.CONTACTED },
      });
      expect(prismaMock._mockTx.leadStatusHistory.create).toHaveBeenCalledWith({
        data: {
          leadId: 'lead-1',
          changedById: 'agent-1',
          previousStatus: LeadStatus.ASSIGNED,
          newStatus: LeadStatus.CONTACTED,
          transitionNote: 'Contacted client via WhatsApp',
        },
      });
      expect(result.status).toBe(LeadStatus.CONTACTED);
    });
  });

  describe('assignLead', () => {
    it('should connect agent and coordinator in transaction', async () => {
      const mockLead = { id: 'lead-1', coordinatorId: 'coord-1', agentId: 'agent-1' };
      prismaMock._mockTx.lead.update.mockResolvedValue(mockLead);
      prismaMock._mockTx.leadStatusHistory.create.mockResolvedValue({ id: 'h-3' });
      prismaMock._mockTx.lead.findUniqueOrThrow.mockResolvedValue(mockLead);

      const result = await repository.assignLead('lead-1', {
        coordinatorId: 'coord-1',
        agentId: 'agent-1',
        changedById: 'coord-1',
        transitionNote: 'Assigned to specialist',
        statusChange: { previousStatus: LeadStatus.SUBMITTED, newStatus: LeadStatus.ASSIGNED },
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock._mockTx.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: {
          coordinator: { connect: { id: 'coord-1' } },
          agent: { connect: { id: 'agent-1' } },
          status: LeadStatus.ASSIGNED,
        },
      });
      expect(result.id).toBe('lead-1');
    });
  });

  describe('Database Error Handling', () => {
    it('should propagate database connection or constraint errors to caller', async () => {
      const dbError = new Error('Database connection reset');
      prismaMock.lead.findUnique.mockRejectedValue(dbError);

      await expect(repository.findLeadById('lead-err')).rejects.toThrow('Database connection reset');
    });
  });
});
