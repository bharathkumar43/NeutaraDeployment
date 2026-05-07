import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';

interface AuditEntry {
  deploymentId: string;
  action:       string;
  performedBy:  string;
  oldStatus?:   string;
  newStatus?:   string;
  comment?:     string;
  metadata?:    Record<string, unknown>;
  ipAddress?:   string;
}

export const createAuditLog = async (entry: AuditEntry): Promise<void> => {
  await query(
    `INSERT INTO audit_logs (id, deployment_id, action, performed_by, old_status, new_status, comment, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      uuidv4(),
      entry.deploymentId,
      entry.action,
      entry.performedBy,
      entry.oldStatus  || null,
      entry.newStatus  || null,
      entry.comment    || null,
      entry.metadata   ? JSON.stringify(entry.metadata) : null,
      entry.ipAddress  || null,
    ]
  );
};

export const getAuditLogs = async (deploymentId: string) => {
  const result = await query(
    `SELECT al.*, u.name AS performed_by_name, u.role AS performed_by_role
     FROM audit_logs al
     LEFT JOIN users u ON al.performed_by = u.id
     WHERE al.deployment_id = $1
     ORDER BY al.created_at ASC`,
    [deploymentId]
  );
  return result.rows;
};
