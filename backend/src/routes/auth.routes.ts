import { Router } from 'express';
import { login, getProfile, listUsers, createUser } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.get('/users', authenticate, listUsers);
router.post('/users', authenticate, authorize('admin'), createUser);

export default router;
