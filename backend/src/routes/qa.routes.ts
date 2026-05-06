import { Router } from 'express';
import { getPendingQARequests, processQAApproval } from '../controllers/qa.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/pending', authorize('qa', 'admin'), getPendingQARequests);
router.post('/deployments/:id/approve', authorize('qa', 'admin'), processQAApproval);

export default router;
