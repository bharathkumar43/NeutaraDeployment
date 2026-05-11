import { Router } from 'express';
import { getUserStats, getAuditLogs } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/user-stats',  getUserStats);
router.get('/audit-logs',  getAuditLogs);

export default router;
