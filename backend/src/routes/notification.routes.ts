import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserNotifications, markNotificationRead,
  markAllNotificationsRead, getUnreadCount
} from '../services/notification.service';

const router = Router();

router.use(authenticate);

router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await getUnreadCount(req.user!.userId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/mark-all-read', async (req: Request, res: Response) => {
  try {
    await markAllNotificationsRead(req.user!.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await getUserNotifications(req.user!.userId);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    await markNotificationRead(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
