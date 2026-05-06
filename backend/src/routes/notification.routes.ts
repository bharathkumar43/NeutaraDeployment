import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserNotifications, markNotificationRead,
  markAllNotificationsRead, getUnreadCount
} from '../services/notification.service';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  const notifications = await getUserNotifications(req.user!.userId);
  res.json({ success: true, data: notifications });
});

router.get('/unread-count', async (req: Request, res: Response) => {
  const count = await getUnreadCount(req.user!.userId);
  res.json({ success: true, data: { count } });
});

router.put('/:id/read', async (req: Request, res: Response) => {
  await markNotificationRead(req.params.id, req.user!.userId);
  res.json({ success: true });
});

router.put('/mark-all-read', async (req: Request, res: Response) => {
  await markAllNotificationsRead(req.user!.userId);
  res.json({ success: true });
});

export default router;
