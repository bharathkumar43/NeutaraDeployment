import { Router } from 'express';
import { login, azureLogin, azureExchange, getProfile, listUsers, createUser, updateUser } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/login',          login);
router.post('/azure',          azureLogin);
router.post('/azure-exchange', azureExchange);
router.get('/profile',         authenticate, getProfile);
router.get('/users',           authenticate, listUsers);
router.post('/users',          authenticate, authorize('admin'), createUser);
router.patch('/users/:id',     authenticate, authorize('admin'), updateUser);

export default router;
