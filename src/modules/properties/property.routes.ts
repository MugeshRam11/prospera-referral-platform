import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize, validateBody } from '../../middleware';
import { PROPERTY_LIFECYCLE_STATUSES, propertyService } from './property.service';

const router = Router();

const importPropertiesSchema = z.object({
  items: z
    .array(
      z.object({
        externalSource: z.string().max(50).optional(),
        externalId: z.string().max(128).optional(),
        title: z.string().min(2).max(255),
        projectName: z.string().max(255).optional(),
        developer: z.string().max(255).optional(),
        location: z.string().min(2).max(255),
        classification: z.enum(['OFF_PLAN', 'READY', 'RESALE']).default('OFF_PLAN'),
        propertyType: z.string().min(2).max(100),
        unitType: z.string().max(100).optional(),
        bedrooms: z.string().max(50).optional(),
        areaSqFt: z.coerce.number().positive().optional(),
        priceAed: z.coerce.number().positive().optional(),
        currency: z.string().length(3).default('AED'),
        availability: z.string().max(40).optional(),
        images: z.array(z.string().url()).max(20).optional(),
      })
    )
    .min(1)
    .max(50),
});

const transitionPropertySchema = z.object({
  status: z.enum(PROPERTY_LIFECYCLE_STATUSES),
  editorialSummary: z.string().max(2000).optional(),
});

router.get('/published', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await propertyService.listPublished({
      location: typeof req.query.location === 'string' ? req.query.location : undefined,
      classification: typeof req.query.classification === 'string' ? req.query.classification : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/admin',
  authenticate,
  authorize([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await propertyService.listAdmin(
        typeof req.query.status === 'string' ? req.query.status : undefined
      );
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/admin/import',
  authenticate,
  authorize([Role.ADMIN]),
  validateBody(importPropertiesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await propertyService.importProperties(req.body.items, req.user!.id);
      res.status(201).json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/admin/:id/status',
  authenticate,
  authorize([Role.ADMIN]),
  validateBody(transitionPropertySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await propertyService.transitionStatus(
        String(req.params.id),
        req.body.status,
        req.user!.id,
        req.body.editorialSummary
      );
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }
);

export const propertyRouter: Router = router;
