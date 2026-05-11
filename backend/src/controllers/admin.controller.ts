import { Request, Response } from 'express';
import { query } from '../database/connection';
import logger from '../utils/logger';

export const getUserStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.team,
        COUNT(DISTINCT dr.id)                                                                                AS total_raised,
        COUNT(DISTINCT dr.id) FILTER (WHERE dr.status = 'successfully_completed')                           AS deployed,
        COUNT(DISTINCT dr.id) FILTER (WHERE dr.status IN (
          'pending_qa_approval','pending_infra_deployment','deployment_in_progress','pending_dev_acknowledgment'
        ))                                                                                                  AS in_progress,
        COUNT(DISTINCT dr.id) FILTER (WHERE dr.status = 'deployment_failed')                                AS failed,
        COUNT(DISTINCT dr.id) FILTER (WHERE dr.status = 'rejected_by_qa')                                   AS rejected_by_qa,
        COUNT(DISTINCT dr.id) FILTER (WHERE dr.status = 'draft')                                            AS drafts,
        COUNT(DISTINCT qa.deployment_id) FILTER (WHERE qa.approval_status = 'sent_back')                    AS sent_back
      FROM users u
      LEFT JOIN deployment_requests dr  ON dr.raised_by      = u.id
      LEFT JOIN deployment_qa_approvals qa ON qa.deployment_id = dr.id
      WHERE u.is_active = true
      GROUP BY u.id, u.name, u.email, u.role, u.team
      ORDER BY COUNT(DISTINCT dr.id) DESC, u.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('Admin user stats error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const { action, user_id, date_from, date_to, search, page = '1', limit = '30' } = req.query;
  const pageNum  = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 30));
  const offset   = (pageNum - 1) * limitNum;

  try {
    const conditions: string[] = [];
    const params: unknown[]    = [];

    if (action)    { params.push(action);    conditions.push(`al.action = $${params.length}`); }
    if (user_id)   { params.push(user_id);   conditions.push(`al.performed_by = $${params.length}`); }
    if (date_from) { params.push(date_from); conditions.push(`al.created_at >= $${params.length}`); }
    if (date_to)   { params.push(date_to);   conditions.push(`al.created_at <= $${params.length}::date + interval '1 day'`); }
    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      conditions.push(`(dr.deployment_title ILIKE $${params.length - 1} OR u.name ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) AS total
       FROM audit_logs al
       LEFT JOIN users u              ON al.performed_by  = u.id
       LEFT JOIN deployment_requests dr ON al.deployment_id = dr.id
       ${where}`,
      params
    );
    const total = parseInt(String(countResult.rows[0].total));

    params.push(limitNum, offset);
    const result = await query(
      `SELECT
         al.id,
         al.deployment_id,
         dr.request_number,
         dr.deployment_title,
         al.action,
         al.performed_by,
         u.name  AS performed_by_name,
         u.role  AS performed_by_role,
         al.old_status,
         al.new_status,
         al.comment,
         al.ip_address,
         al.created_at
       FROM audit_logs al
       LEFT JOIN users u              ON al.performed_by  = u.id
       LEFT JOIN deployment_requests dr ON al.deployment_id = dr.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data:    result.rows,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    logger.error('Admin audit logs error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
