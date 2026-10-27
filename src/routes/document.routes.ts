import { Router } from 'express';
import { KycController } from '../modules/kyc/kyc.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const controller = new KycController();

router.use(authenticate);

// Authorized private document streaming / download
router.get('/:id/download', (req, res, next) => controller.downloadDocument(req, res, next));

export const documentRouter = router;
