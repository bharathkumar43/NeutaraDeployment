import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import logger from '../utils/logger';

interface NotificationPayload {
  userId:        string;
  deploymentId?: string;
  title:         string;
  message:       string;
  type:          'info' | 'success' | 'warning' | 'error';
}

export const createNotification = async (payload: NotificationPayload): Promise<void> => {
  try {
    await query(
      `INSERT INTO notifications (id, user_id, deployment_id, title, message, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), payload.userId, payload.deploymentId || null, payload.title, payload.message, payload.type]
    );
  } catch (err) {
    logger.error('Failed to create notification', err);
  }
};

export const notifyRoleUsers = async (role: string, payload: Omit<NotificationPayload, 'userId'>): Promise<void> => {
  try {
    const users = await query(`SELECT id FROM users WHERE role = ? AND is_active = 1`, [role]);
    await Promise.all(users.rows.map((u) => createNotification({ userId: u.id as string, ...payload })));
  } catch (err) {
    logger.error('Failed to notify role users', err);
  }
};

export const getUserNotifications = async (userId: string, limit = 20) => {
  const result = await query(
    `SELECT n.*, dr.deployment_title
     FROM notifications n
     LEFT JOIN deployment_requests dr ON n.deployment_id = dr.id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ?`,
    [userId, parseInt(String(limit))]
  );
  return result.rows;
};

export const markNotificationRead = async (id: string, userId: string): Promise<void> => {
  await query(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  await query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0`, [userId]
  );
  return parseInt(String(result.rows[0].cnt));
};
