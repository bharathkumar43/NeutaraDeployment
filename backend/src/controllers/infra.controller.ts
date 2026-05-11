import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { createAuditLog } from '../services/audit.service';
import { createNotification } from '../services/notification.service';
import logger from '../utils/logger';
import path from 'path';

export const getInfraQueue = async (req: Request, res: Response): Promise<void> => {
  const { environment, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions: string[] = [`dr.status IN ('pending_infra_deployment','deployment_in_progress')`];
    const params: unknown[]    = [];

    if (environment) { params.push(environment); conditions.push(`dr.environment = $${params.length}`); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await query(`SELECT COUNT(*) AS total FROM deployment_requests dr ${where}`, params);

    params.push(limitNum, offset);
    const result = await query(
      `SELECT dr.*, u.name AS raised_by_name, u.team AS raised_by_team,
              il.id AS log_id, il.deployment_status AS infra_status, il.infra_user_id
       FROM deployment_requests dr
       LEFT JOIN users u ON dr.raised_by = u.id
       LEFT JOIN deployment_infra_logs il
         ON il.deployment_id = dr.id AND il.deployment_status = 'in_progress'
       ${where}
       ORDER BY
         CASE dr.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         dr.updated_at ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(String(countResult.rows[0].total)), page: pageNum, limit: limitNum },
    });
  } catch (err) {
    logger.error('Infra queue error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const startDeployment = async (req: Request, res: Response): Promise<void> => {
  const { id }                                   = req.params;
  const { deployment_notes, artifact_version }   = req.body;
  const infraUserId                              = req.user!.userId;

  try {
    const depResult = await query(`SELECT * FROM deployment_requests WHERE id = $1`, [id]);
    const dep = depResult.rows[0];
    if (!dep) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }
    if (dep.status !== 'pending_infra_deployment') {
      res.status(400).json({ success: false, message: 'Deployment is not in pending infra state' }); return;
    }

    const logId = uuidv4();
    await query(
      `INSERT INTO deployment_infra_logs
         (id, deployment_id, infra_user_id, deployment_notes, artifact_version, deployment_status)
       VALUES ($1, $2, $3, $4, $5, 'in_progress')`,
      [logId, id, infraUserId, deployment_notes || 'Deployment started', artifact_version || null]
    );

    await query(`UPDATE deployment_requests SET status = 'deployment_in_progress' WHERE id = $1`, [id]);

    await createAuditLog({
      deploymentId: id, action: 'DEPLOYMENT_STARTED', performedBy: infraUserId,
      oldStatus: 'pending_infra_deployment', newStatus: 'deployment_in_progress', ipAddress: req.ip,
    });

    await createNotification({
      userId: dep.raised_by as string, deploymentId: id,
      title: 'Deployment In Progress',
      message: `"${dep.deployment_title}" deployment has started by the Infra team.`,
      type: 'info',
    });

    const logResult = await query(`SELECT * FROM deployment_infra_logs WHERE id = $1`, [logId]);
    res.json({ success: true, data: logResult.rows[0] });
  } catch (err) {
    logger.error('Start deployment error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const completeDeployment = async (req: Request, res: Response): Promise<void> => {
  const { id }                                               = req.params;
  const { deployment_status, completion_comments, deployment_notes } = req.body;
  const infraUserId = req.user!.userId;
  const file        = req.file;

  if (!['success', 'failed'].includes(deployment_status)) {
    res.status(400).json({ success: false, message: 'deployment_status must be success or failed' }); return;
  }

  try {
    const depResult = await query(`SELECT * FROM deployment_requests WHERE id = $1`, [id]);
    const dep = depResult.rows[0];
    if (!dep) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }
    if (!['deployment_in_progress', 'pending_infra_deployment'].includes(dep.status as string)) {
      res.status(400).json({ success: false, message: 'Deployment is not in a deployable state' }); return;
    }

    const screenshotPath = file ? path.join('uploads', file.filename) : null;
    const screenshotName = file ? file.originalname : null;

    const existingLog = await query(
      `SELECT id FROM deployment_infra_logs
       WHERE deployment_id = $1 AND infra_user_id = $2 AND deployment_status = 'in_progress'
       LIMIT 1`,
      [id, infraUserId]
    );

    if (existingLog.rows[0]) {
      await query(
        `UPDATE deployment_infra_logs
         SET deployment_status = $1, screenshot_path = $2, screenshot_original_name = $3,
             completion_comments = $4, deployment_notes = COALESCE($5, deployment_notes),
             completed_at = NOW()
         WHERE id = $6`,
        [deployment_status, screenshotPath, screenshotName,
         completion_comments || null, deployment_notes || null, existingLog.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO deployment_infra_logs
           (id, deployment_id, infra_user_id, deployment_notes, screenshot_path,
            screenshot_original_name, deployment_status, completion_comments, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [uuidv4(), id, infraUserId, deployment_notes || 'Deployment completed',
         screenshotPath, screenshotName, deployment_status, completion_comments || null]
      );
    }

    const newStatus = deployment_status === 'success' ? 'pending_dev_acknowledgment' : 'deployment_failed';
    await query(`UPDATE deployment_requests SET status = $1 WHERE id = $2`, [newStatus, id]);

    await createAuditLog({
      deploymentId: id,
      action: deployment_status === 'success' ? 'DEPLOYMENT_COMPLETED' : 'DEPLOYMENT_FAILED',
      performedBy: infraUserId, oldStatus: dep.status as string, newStatus,
      comment: completion_comments, ipAddress: req.ip,
    });

    await createNotification({
      userId: dep.raised_by as string, deploymentId: id,
      title:   deployment_status === 'success' ? 'Deployment Successful — Action Required' : 'Deployment Failed',
      message: deployment_status === 'success'
        ? `"${dep.deployment_title}" deployed successfully. Please acknowledge.`
        : `"${dep.deployment_title}" deployment failed. ${completion_comments}`,
      type: deployment_status === 'success' ? 'success' : 'error',
    });

    res.json({ success: true, data: { status: newStatus }, message: `Deployment marked as ${deployment_status}` });
  } catch (err) {
    logger.error('Complete deployment error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
