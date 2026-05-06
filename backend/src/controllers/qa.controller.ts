import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { createAuditLog } from '../services/audit.service';
import { createNotification, notifyRoleUsers } from '../services/notification.service';
import logger from '../utils/logger';

export const getPendingQARequests = async (req: Request, res: Response): Promise<void> => {
  const { environment, priority, search, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions: string[] = [`dr.status = 'pending_qa_approval'`];
    const params: unknown[]    = [];

    if (environment) { conditions.push(`FIND_IN_SET(?, REPLACE(dr.environment, ', ', ','))`); params.push(environment); }
    if (priority)    { conditions.push(`dr.priority = ?`);    params.push(priority); }
    if (search) {
      conditions.push(`(dr.deployment_title LIKE ? OR dr.project_name LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await query(`SELECT COUNT(*) AS total FROM deployment_requests dr ${where}`, params);

    const result = await query(
      `SELECT dr.*, u.name AS raised_by_name, u.team AS raised_by_team
       FROM deployment_requests dr
       LEFT JOIN users u ON dr.raised_by = u.id
       ${where}
       ORDER BY
         CASE dr.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         dr.submitted_at ASC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data:    result.rows,
      pagination: { total: parseInt(String(countResult.rows[0].total)), page: pageNum, limit: limitNum },
    });
  } catch (err) {
    logger.error('Get pending QA error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const processQAApproval = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { approval_status, qa_ticket_link, qa_description, qa_comments } = req.body;
  const qaUserId = req.user!.userId;

  if (!approval_status || !qa_comments) {
    res.status(400).json({ success: false, message: 'Approval status and comments are required' }); return;
  }

  try {
    const depResult = await query(`SELECT * FROM deployment_requests WHERE id = ?`, [id]);
    if (!depResult.rows[0]) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }

    const dep = depResult.rows[0];
    if (dep.status !== 'pending_qa_approval') {
      res.status(400).json({ success: false, message: 'Deployment is not pending QA approval' }); return;
    }

    const statusMap: Record<string, string> = {
      approved:  'pending_infra_deployment',
      rejected:  'rejected_by_qa',
      sent_back: 'draft',
    };
    const newStatus = statusMap[approval_status];
    if (!newStatus) { res.status(400).json({ success: false, message: 'Invalid approval status' }); return; }

    await query(
      `INSERT INTO deployment_qa_approvals (id, deployment_id, qa_user_id, qa_ticket_link, qa_description, qa_comments, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), id, qaUserId, qa_ticket_link || null, qa_description || null, qa_comments, approval_status]
    );

    await query(`UPDATE deployment_requests SET status = ? WHERE id = ?`, [newStatus, id]);

    await createAuditLog({
      deploymentId: id, action: `QA_${approval_status.toUpperCase()}`,
      performedBy: qaUserId, oldStatus: dep.status as string, newStatus,
      comment: qa_comments, ipAddress: req.ip,
    });

    const msgs: Record<string, { title: string; message: string; type: 'success' | 'error' | 'warning' }> = {
      approved:  { title: 'QA Approved — Pending Infra Deployment', message: `"${dep.deployment_title}" approved by QA.`, type: 'success' },
      rejected:  { title: 'QA Rejected Your Deployment Request',    message: `"${dep.deployment_title}" rejected. ${qa_comments}`, type: 'error' },
      sent_back: { title: 'Deployment Sent Back for Revision',      message: `"${dep.deployment_title}" sent back. ${qa_comments}`, type: 'warning' },
    };

    await createNotification({ userId: dep.raised_by as string, deploymentId: id, ...msgs[approval_status] });

    if (approval_status === 'approved') {
      await notifyRoleUsers('infra', {
        deploymentId: id,
        title: 'New Deployment Ready for Infrastructure',
        message: `"${dep.deployment_title}" approved by QA. Ready for deployment.`,
        type: 'info',
      });
    }

    res.json({ success: true, message: `Deployment ${approval_status} successfully`, data: { status: newStatus } });
  } catch (err) {
    logger.error('QA approval error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
