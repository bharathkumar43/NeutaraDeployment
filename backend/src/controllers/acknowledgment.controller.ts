import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { createAuditLog } from '../services/audit.service';
import { notifyRoleUsers } from '../services/notification.service';
import logger from '../utils/logger';

export const getPendingAcknowledgments = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const result = await query(
      `SELECT dr.*, u.name AS raised_by_name, u.team AS raised_by_team,
              il.screenshot_path, il.completion_comments AS infra_comments,
              il.completed_at AS deployed_at, iu.name AS infra_user_name
       FROM deployment_requests dr
       LEFT JOIN users u  ON dr.raised_by     = u.id
       LEFT JOIN deployment_infra_logs il ON il.deployment_id = dr.id AND il.deployment_status = 'success'
       LEFT JOIN users iu ON il.infra_user_id = iu.id
       WHERE dr.status = 'pending_dev_acknowledgment' AND dr.raised_by = $1
       ORDER BY dr.updated_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('Get pending acknowledgments error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const submitAcknowledgment = async (req: Request, res: Response): Promise<void> => {
  const { id }                             = req.params;
  const { acknowledgment_comment, status } = req.body;
  const userId                             = req.user!.userId;

  if (!acknowledgment_comment) {
    res.status(400).json({ success: false, message: 'Acknowledgment comment is required' }); return;
  }
  if (!['acknowledged', 'issue_raised'].includes(status)) {
    res.status(400).json({ success: false, message: 'Status must be acknowledged or issue_raised' }); return;
  }

  try {
    const depResult = await query(`SELECT * FROM deployment_requests WHERE id = $1`, [id]);
    const dep = depResult.rows[0];
    if (!dep) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }
    if (dep.status !== 'pending_dev_acknowledgment') {
      res.status(400).json({ success: false, message: 'Deployment is not pending acknowledgment' }); return;
    }
    if (dep.raised_by !== userId) {
      res.status(403).json({ success: false, message: 'Only the original requester can acknowledge' }); return;
    }

    await query(
      `INSERT INTO deployment_acknowledgments (id, deployment_id, acknowledged_by, acknowledgment_comment, status, acknowledged_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), id, userId, acknowledgment_comment, status]
    );

    const newStatus = status === 'acknowledged' ? 'successfully_completed' : 'issue_raised';
    await query(`UPDATE deployment_requests SET status = $1 WHERE id = $2`, [newStatus, id]);

    await createAuditLog({
      deploymentId: id,
      action:       status === 'acknowledged' ? 'DEPLOYMENT_ACKNOWLEDGED' : 'ISSUE_RAISED',
      performedBy:  userId, oldStatus: dep.status as string, newStatus,
      comment: acknowledgment_comment, ipAddress: req.ip,
    });

    if (status === 'acknowledged') {
      await notifyRoleUsers('admin', { deploymentId: id, title: 'Deployment Successfully Completed', message: `"${dep.deployment_title}" acknowledged and completed.`, type: 'success' });
      await notifyRoleUsers('infra', { deploymentId: id, title: 'Deployment Acknowledged', message: `"${dep.deployment_title}" acknowledged by Dev team.`, type: 'success' });
    } else {
      await notifyRoleUsers('infra', { deploymentId: id, title: 'Issue Raised for Deployment', message: `Issue raised for "${dep.deployment_title}". ${acknowledgment_comment}`, type: 'error' });
    }

    res.json({ success: true, data: { status: newStatus }, message: status === 'acknowledged' ? 'Acknowledged successfully' : 'Issue reported' });
  } catch (err) {
    logger.error('Submit acknowledgment error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
