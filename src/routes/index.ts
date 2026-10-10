import { Router } from 'express';
import { healthRouter } from './health.routes';

const router = Router();

router.use('/', healthRouter);

export const apiRouter = router;
