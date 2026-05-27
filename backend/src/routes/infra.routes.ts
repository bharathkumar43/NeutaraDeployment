import { Router } from 'express';
import { getInfraQueue, startDeployment, completeDeployment, infraReview } from '../controllers/infra.controller';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);
router.get('/queue', authorize('infra', 'admin'), getInfraQueue);
router.post('/deployments/:id/start', authorize('infra', 'admin'), startDeployment);
router.post('/deployments/:id/complete', authorize('infra', 'admin'), upload.single('screenshot'), completeDeployment);
router.post('/deployments/:id/review', authorize('infra', 'admin'), infraReview);

export default router;
