import { Router } from 'express';
import {
  createDeployment, updateDraft, getDeployments, getDeploymentById,
  getDashboardStats, getJobsList, getBranchesList, sendDeploymentScopeEmail,
  getNextRequestNumber, deleteDeployment
} from '../controllers/deployment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats/dashboard', getDashboardStats);
router.get('/meta/jobs', getJobsList);
router.get('/meta/branches', getBranchesList);
router.get('/meta/next-number', getNextRequestNumber);
router.post('/send-scope-email', sendDeploymentScopeEmail);

router.get('/', getDeployments);
router.get('/:id', getDeploymentById);
router.post('/', authorize('dev', 'admin'), createDeployment);
router.put('/:id', authorize('dev', 'admin'), updateDraft);
router.delete('/:id', authorize('dev', 'admin'), deleteDeployment);

export default router;
