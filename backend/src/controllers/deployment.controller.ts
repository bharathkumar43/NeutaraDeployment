import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { createAuditLog } from '../services/audit.service';
import { notifyRoleUsers, createNotification } from '../services/notification.service';
import { sendScopeEmail, sendQASubmissionEmail, sendDevSubmissionConfirmationEmail } from '../services/email.service';
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
    repository, service_name, base_branch, commit_sha, env_name,
    pull_request_link, pr_approved_by, feature_flags, config_changes, dependencies,
    requested_by_name, team,
    deployment_scope, single_project_name, multi_project_names,
  } = req.body;
  const raised_by   = req.user!.userId;
  const finalStatus = status === 'draft' ? 'draft' : 'pending_qa_approval';
  const newId       = uuidv4();

  const extraMeta = JSON.stringify({
    repository, service_name, base_branch, commit_sha, env_name,
    pull_request_link, pr_approved_by, feature_flags, config_changes,
    dependencies, requested_by_name, team,
    deployment_scope, single_project_name, multi_project_names,
  });

  try {
    const submittedAt = finalStatus === 'pending_qa_approval' ? new Date() : null;
    const numResult   = await query(
      `SELECT 'DPR' || LPAD((COUNT(*) + 1)::text, 4, '0') AS num FROM deployment_requests`
    );
    const requestNumber = numResult.rows[0].num as string;

    await query(
      `INSERT INTO deployment_requests
         (id, request_number, deployment_title, project_name, job_id, branch_name, environment,
          ticket_link, description, priority, raised_by, status, submitted_at,
          risk_level, downtime_required, db_migration, requested_deploy_date, extra_meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [newId, requestNumber, deployment_title, project_name, job_id || null, branch_name, environment,
       ticket_link || null, description, priority, raised_by, finalStatus, submittedAt,
       risk_level || null, downtime_required ? true : false, db_migration ? true : false,
       requested_deploy_date || null, extraMeta]
    );

    const result     = await query(`${DEPLOYMENT_SELECT} WHERE dr.id = $1`, [newId]);
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
      sendQASubmissionEmail({
        requestNumber:   requestNumber,
        deploymentTitle: deployment_title,
        environment,
        priority,
        raisedByName:    String(deployment.raised_by_name  || raised_by),
        raisedByEmail:   String(deployment.raised_by_email || ''),
        description,
      }).catch((e) => logger.error('QA submission email error', e));
      sendDevSubmissionConfirmationEmail({
        requestNumber:   requestNumber,
        deploymentTitle: deployment_title,
        environment,
        priority,
        devName:         req.user!.name,
        devEmail:        req.user!.email,
        description,
      }).catch((e) => logger.error('Dev submission confirmation email error', e));
    }

    res.status(201).json({ success: true, data: deployment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Create deployment error', { message: msg, stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ success: false, message: 'Server error', detail: msg });
  }
};

export const updateDraft = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const {
    deployment_title, project_name, job_id, branch_name, environment,
    ticket_link, description, priority, status,
    risk_level, downtime_required, db_migration, requested_deploy_date,
    repository, service_name, base_branch, commit_sha, env_name,
    pull_request_link, pr_approved_by, feature_flags, config_changes, dependencies,
    requested_by_name, team,
    deployment_scope, single_project_name, multi_project_names,
  } = req.body;
  const extraMeta = JSON.stringify({
    repository, service_name, base_branch, commit_sha, env_name,
    pull_request_link, pr_approved_by, feature_flags, config_changes,
    dependencies, requested_by_name, team,
    deployment_scope, single_project_name, multi_project_names,
    // Clear any stale infra review fields on resubmission
    infra_review_action:   null,
    infra_review_comments: null,
    infra_reviewed_by:     null,
  });

  try {
    const existing = await query(`SELECT * FROM deployment_requests WHERE id = $1`, [id]);
    if (!existing.rows[0]) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }

    const dep = existing.rows[0];
    if (dep.raised_by !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Not authorized to edit this deployment' }); return;
    }
    if (!['draft', 'rejected_by_qa', 'rejected_by_infra'].includes(dep.status as string) && req.user!.role !== 'admin') {
      res.status(400).json({ success: false, message: 'Cannot edit deployment in current status' }); return;
    }

    const finalStatus = status === 'pending_qa_approval' ? 'pending_qa_approval' : 'draft';
    await query(
      `UPDATE deployment_requests
       SET deployment_title = $1, project_name = $2, job_id = $3, branch_name = $4, environment = $5,
           ticket_link = $6, description = $7, priority = $8, status = $9,
           risk_level = $10, downtime_required = $11, db_migration = $12,
           requested_deploy_date = $13, extra_meta = $14,
           submitted_at = CASE WHEN $15 = 'pending_qa_approval' THEN NOW() ELSE submitted_at END
       WHERE id = $16`,
      [deployment_title, project_name, job_id || null, branch_name, environment,
       ticket_link || null, description, priority, finalStatus,
       risk_level || null, downtime_required ? true : false, db_migration ? true : false,
       requested_deploy_date || null, extraMeta,
       finalStatus, id]
    );

    const result = await query(`${DEPLOYMENT_SELECT} WHERE dr.id = $1`, [id]);

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
      const updated = result.rows[0];
      sendQASubmissionEmail({
        requestNumber:   String(updated.request_number || ''),
        deploymentTitle: deployment_title,
        environment,
        priority,
        raisedByName:    String(updated.raised_by_name  || userId),
        raisedByEmail:   String(updated.raised_by_email || ''),
        description,
      }).catch((e) => logger.error('QA resubmit email error', e));
      sendDevSubmissionConfirmationEmail({
        requestNumber:   String(updated.request_number || ''),
        deploymentTitle: deployment_title,
        environment,
        priority,
        devName:         req.user!.name,
        devEmail:        req.user!.email,
        description,
      }).catch((e) => logger.error('Dev resubmit confirmation email error', e));
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

    if (role === 'dev') { params.push(userId);       conditions.push(`dr.raised_by = $${params.length}`); }
    if (status)         { params.push(status);        conditions.push(`dr.status = $${params.length}`); }
    if (environment)    { params.push(environment);   conditions.push(`dr.environment = $${params.length}`); }
    if (priority)       { params.push(priority);      conditions.push(`dr.priority = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      conditions.push(`(dr.deployment_title LIKE $${params.length - 1} OR dr.project_name LIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM deployment_requests dr ${where}`, params);
    const total       = parseInt(String(countResult.rows[0].total));

    params.push(limitNum, offset);
    const result = await query(
      `${DEPLOYMENT_SELECT} ${where} ORDER BY dr.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data:    result.rows,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Get deployments error', { message: msg, stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ success: false, message: 'Server error', detail: process.env.NODE_ENV !== 'production' ? msg : undefined });
  }
};

export const getDeploymentById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await query(`${DEPLOYMENT_SELECT} WHERE dr.id = $1`, [id]);
    if (!result.rows[0]) { res.status(404).json({ success: false, message: 'Deployment not found' }); return; }

    const [qaResult, infraResult, ackResult, auditResult] = await Promise.all([
      query(`SELECT qa.*, u.name AS qa_user_name, u.email AS qa_user_email
             FROM deployment_qa_approvals qa LEFT JOIN users u ON qa.qa_user_id = u.id
             WHERE qa.deployment_id = $1 ORDER BY qa.created_at DESC`, [id]),
      query(`SELECT il.*, u.name AS infra_user_name, u.email AS infra_user_email
             FROM deployment_infra_logs il LEFT JOIN users u ON il.infra_user_id = u.id
             WHERE il.deployment_id = $1 ORDER BY il.created_at DESC`, [id]),
      query(`SELECT da.*, u.name AS acknowledged_by_name
             FROM deployment_acknowledgments da LEFT JOIN users u ON da.acknowledged_by = u.id
             WHERE da.deployment_id = $1 ORDER BY da.acknowledged_at DESC`, [id]),
      query(`SELECT al.*, u.name AS performed_by_name, u.role AS performed_by_role
             FROM audit_logs al LEFT JOIN users u ON al.performed_by = u.id
             WHERE al.deployment_id = $1 ORDER BY al.created_at ASC`, [id]),
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
    const where  = role === 'dev' ? `WHERE raised_by = $1` : '';
    const params = role === 'dev' ? [userId] : [];

    const result = await query(
      `SELECT
         COUNT(*)                                                                                       AS total,
         COUNT(*) FILTER (WHERE status = 'pending_qa_approval')                                        AS pending_qa,
         COUNT(*) FILTER (WHERE status IN ('pending_infra_deployment','deployment_in_progress'))        AS pending_infra,
         COUNT(*) FILTER (WHERE status = 'deployment_failed')                                          AS failed,
         COUNT(*) FILTER (WHERE status = 'successfully_completed')                                     AS completed,
         COUNT(*) FILTER (WHERE priority = 'critical')                                                 AS critical,
         COUNT(*) FILTER (WHERE status = 'pending_dev_acknowledgment')                                 AS pending_acknowledgment,
         COUNT(*) FILTER (WHERE status = 'draft')                                                      AS drafts
       FROM deployment_requests ${where}`,
      params
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Dashboard stats error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getNextRequestNumber = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT 'DPR' || LPAD((COUNT(*) + 1)::text, 4, '0') AS next_number FROM deployment_requests`
    );
    res.json({ success: true, data: { next_number: result.rows[0].next_number } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getJobsList = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`SELECT id, job_id, job_name, project_name FROM jobs WHERE is_active = true ORDER BY job_name ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBranchesList = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`SELECT id, branch_name, project_name FROM branches WHERE is_active = true ORDER BY branch_name ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteDeployment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const role   = req.user!.role;

  try {
    const existing = await query(
      `SELECT id, raised_by, status, deployment_title FROM deployment_requests WHERE id = $1`, [id]
    );
    if (!existing.rows[0]) {
      res.status(404).json({ success: false, message: 'Deployment not found' });
      return;
    }
    const dep = existing.rows[0];

    // Admins can delete anything. Developers can only delete their own requests
    // that haven't been touched by QA yet (draft or pending_qa_approval).
    if (role !== 'admin') {
      if (dep.raised_by !== userId) {
        res.status(403).json({ success: false, message: 'You can only delete your own deployment requests' });
        return;
      }
      if (!['draft', 'pending_qa_approval'].includes(dep.status as string)) {
        res.status(400).json({ success: false, message: 'Cannot delete a request after QA has reviewed it' });
        return;
      }
    }

    // Audit log must be created BEFORE delete — the FK goes away after deletion
    await createAuditLog({
      deploymentId: id,
      action: 'DELETED',
      performedBy: userId,
      oldStatus: dep.status as string,
      newStatus: 'deleted',
      comment: `"${dep.deployment_title}" deleted by ${role}`,
      ipAddress: req.ip,
    });

    await query(`DELETE FROM deployment_requests WHERE id = $1`, [id]);

    res.json({ success: true, message: 'Deployment deleted successfully' });
  } catch (err) {
    logger.error('Delete deployment error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const sendDeploymentScopeEmail = async (req: Request, res: Response): Promise<void> => {
  const { deployment_title, team } = req.body;
  const user = req.user!;

  if (!deployment_title) {
    res.status(400).json({ success: false, message: 'deployment_title is required' });
    return;
  }

  try {
    await sendScopeEmail({
      deploymentTitle: deployment_title,
      requesterName:   user.name,
      requesterEmail:  user.email,
      teamName:        team || 'N/A',
    });
    res.json({ success: true, message: 'Scope email sent successfully' });
  } catch (err) {
    logger.error('Send scope email error', err);
    res.status(500).json({ success: false, message: 'Failed to send email. Check Microsoft Graph API configuration (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, EMAIL_SENDER, SCOPE_EMAIL_RECIPIENT).' });
  }
};
