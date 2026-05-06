import { Router } from 'express';
import {
  createDeployment, updateDraft, getDeployments, getDeploymentById,
  getDashboardStats, getJobsList, getBranchesList
} from '../controllers/deployment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats/dashboard', getDashboardStats);
router.get('/meta/jobs', getJobsList);
router.get('/meta/branches', getBranchesList);

router.get('/', getDeployments);
router.get('/:id', getDeploymentById);
router.post('/', authorize('dev', 'admin'), createDeployment);
router.put('/:id', authorize('dev', 'admin'), updateDraft);

export default router;
