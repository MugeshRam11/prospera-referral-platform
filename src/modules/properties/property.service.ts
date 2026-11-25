import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export const PROPERTY_LIFECYCLE_STATUSES = [
  'IMPORTED',
  'PENDING_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'UNPUBLISHED',
  'ARCHIVED',
] as const;

export type PropertyLifecycleStatus = (typeof PROPERTY_LIFECYCLE_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<PropertyLifecycleStatus, PropertyLifecycleStatus[]> = {
  IMPORTED: ['PENDING_REVIEW', 'REJECTED', 'ARCHIVED'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['UNPUBLISHED', 'ARCHIVED'],
  UNPUBLISHED: ['PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'],
  REJECTED: ['PENDING_REVIEW', 'ARCHIVED'],
  ARCHIVED: [],
};

export interface ImportPropertyInput {
  externalSource?: string;
  externalId?: string;
  title: string;
  projectName?: string;
  developer?: string;
  location: string;
  classification: 'OFF_PLAN' | 'READY' | 'RESALE';
  propertyType: string;
  unitType?: string;
  bedrooms?: string;
  areaSqFt?: number;
  priceAed?: number;
  currency?: string;
  availability?: string;
  images?: string[];
  sourcePayload?: Record<string, unknown>;
}

export function canTransitionPropertyStatus(
  from: PropertyLifecycleStatus,
  to: PropertyLifecycleStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class PropertyService {
  async listPublished(filters: { location?: string; classification?: string; search?: string }) {
    return prisma.propertyListing.findMany({
      where: {
        status: 'PUBLISHED',
        ...(filters.location ? { location: { contains: filters.location, mode: 'insensitive' } } : {}),
        ...(filters.classification ? { classification: filters.classification } : {}),
        ...(filters.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { projectName: { contains: filters.search, mode: 'insensitive' } },
                { location: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async listAdmin(status?: string) {
    return prisma.propertyListing.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async importProperties(items: ImportPropertyInput[], actorUserId: string) {
    const results = [];
    for (const item of items) {
      const source = item.externalSource || 'LEADRAT';
      const externalId = item.externalId || `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const existing = await prisma.propertyListing.findUnique({
        where: { externalSource_externalId: { externalSource: source, externalId } },
      });

      if (existing) {
        const materialPriceChanged =
          item.priceAed !== undefined &&
          existing.priceAed !== null &&
          Number(existing.priceAed) !== Number(item.priceAed);
        const nextStatus = existing.status === 'PUBLISHED' && materialPriceChanged ? 'PENDING_REVIEW' : existing.status;

        const updated = await prisma.propertyListing.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            projectName: item.projectName ?? existing.projectName,
            developer: item.developer ?? existing.developer,
            location: item.location,
            classification: item.classification,
            propertyType: item.propertyType,
            unitType: item.unitType ?? existing.unitType,
            bedrooms: item.bedrooms ?? existing.bedrooms,
            areaSqFt: item.areaSqFt !== undefined ? new Prisma.Decimal(item.areaSqFt) : existing.areaSqFt,
            priceAed: item.priceAed !== undefined ? new Prisma.Decimal(item.priceAed) : existing.priceAed,
            availability: item.availability ?? existing.availability,
            images: item.images ?? (existing.images as Prisma.InputJsonValue),
            sourcePayload: (item.sourcePayload ?? existing.sourcePayload) as Prisma.InputJsonValue,
            status: nextStatus,
            lastSyncedAt: new Date(),
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.propertyListing.create({
          data: {
            externalSource: source,
            externalId,
            title: item.title,
            projectName: item.projectName ?? null,
            developer: item.developer ?? null,
            location: item.location,
            classification: item.classification,
            propertyType: item.propertyType,
            unitType: item.unitType ?? null,
            bedrooms: item.bedrooms ?? null,
            areaSqFt: item.areaSqFt !== undefined ? new Prisma.Decimal(item.areaSqFt) : null,
            priceAed: item.priceAed !== undefined ? new Prisma.Decimal(item.priceAed) : null,
            currency: item.currency || 'AED',
            availability: item.availability || 'AVAILABLE',
            images: item.images ?? [],
            sourcePayload: (item.sourcePayload ?? {}) as Prisma.InputJsonValue,
            status: 'IMPORTED',
            lastSyncedAt: new Date(),
          },
        });
        await prisma.auditLog.create({
          data: {
            actorUserId,
            entityType: 'PROPERTY_LISTING',
            entityId: created.id,
            action: 'PROPERTY_IMPORTED',
            newValues: { status: 'IMPORTED', source, externalId },
          },
        });
        results.push(created);
      }
    }
    return results;
  }

  async transitionStatus(
    id: string,
    targetStatus: PropertyLifecycleStatus,
    actorUserId: string,
    editorialSummary?: string
  ) {
    const existing = await prisma.propertyListing.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Property listing not found'), { statusCode: 404 });
    }
    const current = existing.status as PropertyLifecycleStatus;
    if (!canTransitionPropertyStatus(current, targetStatus)) {
      throw Object.assign(
        new Error(`Invalid property status transition from '${current}' to '${targetStatus}'`),
        { statusCode: 400 }
      );
    }

    const updated = await prisma.propertyListing.update({
      where: { id },
      data: {
        status: targetStatus,
        ...(editorialSummary !== undefined ? { editorialSummary } : {}),
        reviewedById: actorUserId,
        reviewedAt: new Date(),
        ...(targetStatus === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId,
        entityType: 'PROPERTY_LISTING',
        entityId: id,
        action: 'PROPERTY_STATUS_CHANGED',
        oldValues: { status: current },
        newValues: { status: targetStatus },
      },
    });

    return updated;
  }
}

export const propertyService = new PropertyService();
