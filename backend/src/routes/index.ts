import { Router } from 'express';
import authRoutes from './auth.routes';
import deploymentRoutes from './deployment.routes';
import qaRoutes from './qa.routes';
import infraRoutes from './infra.routes';
import ackRoutes from './acknowledgment.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/deployments', deploymentRoutes);
router.use('/qa', qaRoutes);
router.use('/infra', infraRoutes);
router.use('/acknowledgments', ackRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Neutara Deployment API is running', timestamp: new Date().toISOString() });
});

export default router;
