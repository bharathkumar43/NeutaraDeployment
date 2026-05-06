import { Router } from 'express';
import { getPendingAcknowledgments, submitAcknowledgment } from '../controllers/acknowledgment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/pending', authorize('dev', 'admin'), getPendingAcknowledgments);
router.post('/deployments/:id/acknowledge', authorize('dev', 'admin'), submitAcknowledgment);

export default router;
