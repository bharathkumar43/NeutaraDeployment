import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { createAuditLog } from '../services/audit.service';
import { notifyRoleUsers, createNotification } from '../services/notification.service';
import logger from '../utils/logger';

const DEPLOYMENT_SELECT = `
  SELECT dr.*,
    u.name  AS raised_by_name,
    u.email AS raised_by_email,
    u.role  AS raised_by_role,
    u.team  AS raised_by_team
  FROM deployment_requests dr
  LEFT JOIN users u ON dr.raised_by = u.id
`;

export const createDeployment = async (req: Request, res: Response): Promise<void> => {
  const {
    deployment_title, project_name, job_id, branch_name, environment,
    ticket_link, description, priority, status,
    risk_level, downtime_required, db_migration, requested_deploy_date,
    repository, service_name, base_branch, commit_sha, artifact_version,
    pull_request_link, pr_approved_by, feature_flags, config_changes, dependencies,
    requested_by_name, team,
  } = req.body;
  const raised_by   = req.user!.userId;
  const finalStatus = status === 'draft' ? 'draft' : 'pending_qa_approval';
  const newId       = uuidv4();

  const extraMeta = JSON.stringify({
    repository, service_name, base_branch, commit_sha, artifact_version,
    pull_request_link, pr_approved_by, feature_flags, config_changes,
    dependencies, requested_by_name, team,
  });

  try {
    const submittedAt = finalStatus === 'pending_qa_approval' ? new Date() : null;
    await query(
      `INSERT INTO deployment_requests
         (id, deployment_title, project_name, job_id, branch_name, environment,
          ticket_link, description, priority, raised_by, status, submitted_at,
          risk_level, downtime_required, db_migration, requested_deploy_date, extra_meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, deployment_title, project_name, job_id || null, branch_name, environment,
       ticket_link || null, description, priority, raised_by, finalStatus, submittedAt,
       risk_level || null, downtime_required ? 1 : 0, db_migration ? 1 : 0,
       requested_deploy_date || null, extraMeta]
    );

    const result     = await query(`${DEPLOYMENT_SELECT} WHERE dr.id = ?`, [newId]);
    const deployment = result.rows[0];

    await createAuditLog({
      deploymentId: newId,
      action:       finalStatus === 'draft' ? 'DRAFT_CREATED' : 'SUBMITTED_FOR_QA',
      performedBy:  raised_by,
      newStatus:    finalStatus,
      comment:      `Deployment request created with status: ${finalStatus}`,
      ipAddress:    req.ip,
    });

    if (finalStatus === 'pending_qa_approval') {
      await notifyRoleUsers('qa', {
        deploymentId: newId,
        title:   'New Deployment Request Pending QA Approval',
        message: `"${deployment_title}" submitted for QA review. Priority: ${priority.toUpperCase()}`,
        type:    'info',
      });
    }

    res.status(201).json({ success: true, data: deployment });
  } catch (err) {
    logger.error('Create deployment error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateDraft = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const {
    deployment_title, project_name, job_id, branch_name, environment,
    ticket_link, description, priority, status,
    risk_level, downtime_required, db_migration, requested_deploy_date,
    repository, service_name, base_branch, commit_sha, artifact_version,
    pull_request_link, pr_approved_by, feature_flags, config_changes, dependencies,
    requested_by_name, team,
  } = req.body;
  const extraMeta = JSON.stringify({
    repository, service_name, base_branch, commit_sha, artifact_version,
    pull_request_link, pr_approved_by, feature_flags, config_changes,
    dependencies, requested_by_name, team,
  });

  try {
    const existing = await query(`SELECT * FROM deployment_requests WHERE id = ?`, [id]);
    if (!existing.rows[0]) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }

    const dep = existing.rows[0];
    if (dep.raised_by !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Not authorized to edit this deployment' }); return;
    }
    if (!['draft', 'rejected_by_qa'].includes(dep.status as string) && req.user!.role !== 'admin') {
      res.status(400).json({ success: false, message: 'Cannot edit deployment in current status' }); return;
    }

    const finalStatus = status === 'pending_qa_approval' ? 'pending_qa_approval' : 'draft';
    await query(
      `UPDATE deployment_requests
       SET deployment_title = ?, project_name = ?, job_id = ?, branch_name = ?, environment = ?,
           ticket_link = ?, description = ?, priority = ?, status = ?,
           risk_level = ?, downtime_required = ?, db_migration = ?,
           requested_deploy_date = ?, extra_meta = ?,
           submitted_at = CASE WHEN ? = 'pending_qa_approval' THEN NOW() ELSE submitted_at END
       WHERE id = ?`,
      [deployment_title, project_name, job_id || null, branch_name, environment,
       ticket_link || null, description, priority, finalStatus,
       risk_level || null, downtime_required ? 1 : 0, db_migration ? 1 : 0,
       requested_deploy_date || null, extraMeta,
       finalStatus, id]
    );

    const result = await query(`${DEPLOYMENT_SELECT} WHERE dr.id = ?`, [id]);

    await createAuditLog({
      deploymentId: id,
      action:       finalStatus === 'pending_qa_approval' ? 'RESUBMITTED_FOR_QA' : 'DRAFT_UPDATED',
      performedBy:  userId,
      oldStatus:    dep.status as string,
      newStatus:    finalStatus,
      ipAddress:    req.ip,
    });

    if (finalStatus === 'pending_qa_approval') {
      await notifyRoleUsers('qa', {
        deploymentId: id,
        title:   'Deployment Request Pending QA Approval',
        message: `"${deployment_title}" submitted for QA review.`,
        type:    'info',
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Update draft error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDeployments = async (req: Request, res: Response): Promise<void> => {
  const { status, environment, priority, search, page = '1', limit = '20' } = req.query;
  const userId   = req.user!.userId;
  const role     = req.user!.role;
  const pageNum  = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (role === 'dev') { conditions.push(`dr.raised_by = ?`); params.push(userId); }
    if (status)         { conditions.push(`dr.status = ?`);      params.push(status); }
    if (environment)    { conditions.push(`FIND_IN_SET(?, REPLACE(dr.environment, ', ', ','))`); params.push(environment); }
    if (priority)       { conditions.push(`dr.priority = ?`);    params.push(priority); }
    if (search) {
      conditions.push(`(dr.deployment_title LIKE ? OR dr.project_name LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM deployment_requests dr ${where}`, params);
    const total       = parseInt(String(countResult.rows[0].total));

    const result = await query(
      `${DEPLOYMENT_SELECT} ${where} ORDER BY dr.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data:    result.rows,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    logger.error('Get deployments error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDeploymentById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await query(`${DEPLOYMENT_SELECT} WHERE dr.id = ?`, [id]);
    if (!result.rows[0]) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }

    const [qaResult, infraResult, ackResult, auditResult] = await Promise.all([
      query(`SELECT qa.*, u.name AS qa_user_name, u.email AS qa_user_email
             FROM deployment_qa_approvals qa LEFT JOIN users u ON qa.qa_user_id = u.id
             WHERE qa.deployment_id = ? ORDER BY qa.created_at DESC`, [id]),
      query(`SELECT il.*, u.name AS infra_user_name, u.email AS infra_user_email
             FROM deployment_infra_logs il LEFT JOIN users u ON il.infra_user_id = u.id
             WHERE il.deployment_id = ? ORDER BY il.created_at DESC`, [id]),
      query(`SELECT da.*, u.name AS acknowledged_by_name
             FROM deployment_acknowledgments da LEFT JOIN users u ON da.acknowledged_by = u.id
             WHERE da.deployment_id = ? ORDER BY da.acknowledged_at DESC`, [id]),
      query(`SELECT al.*, u.name AS performed_by_name, u.role AS performed_by_role
             FROM audit_logs al LEFT JOIN users u ON al.performed_by = u.id
             WHERE al.deployment_id = ? ORDER BY al.created_at ASC`, [id]),
    ]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        qa_approvals:    qaResult.rows,
        infra_logs:      infraResult.rows,
        acknowledgments: ackResult.rows,
        audit_trail:     auditResult.rows,
      },
    });
  } catch (err) {
    logger.error('Get deployment by ID error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const role   = req.user!.role;
  try {
    const where  = role === 'dev' ? `WHERE raised_by = ?` : '';
    const params = role === 'dev' ? [userId] : [];

    const result = await query(
      `SELECT
         COUNT(*)                                                              AS total,
         SUM(status = 'pending_qa_approval')                                  AS pending_qa,
         SUM(status IN ('pending_infra_deployment','deployment_in_progress'))  AS pending_infra,
         SUM(status = 'deployment_failed')                                     AS failed,
         SUM(status = 'successfully_completed')                                AS completed,
         SUM(priority = 'critical')                                            AS critical,
         SUM(status = 'pending_dev_acknowledgment')                            AS pending_acknowledgment,
         SUM(status = 'draft')                                                 AS drafts
       FROM deployment_requests ${where}`,
      params
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Dashboard stats error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getJobsList = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`SELECT id, job_id, job_name, project_name FROM jobs WHERE is_active = 1 ORDER BY job_name ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBranchesList = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`SELECT id, branch_name, project_name FROM branches WHERE is_active = 1 ORDER BY branch_name ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
