"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.createAuditLog = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const createAuditLog = async (entry) => {
    await (0, connection_1.query)(`INSERT INTO audit_logs (id, deployment_id, action, performed_by, old_status, new_status, comment, metadata, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        (0, uuid_1.v4)(),
        entry.deploymentId,
        entry.action,
        entry.performedBy,
        entry.oldStatus || null,
        entry.newStatus || null,
        entry.comment || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ipAddress || null,
    ]);
};
exports.createAuditLog = createAuditLog;
const getAuditLogs = async (deploymentId) => {
    const result = await (0, connection_1.query)(`SELECT al.*, u.name AS performed_by_name, u.role AS performed_by_role
     FROM audit_logs al
     LEFT JOIN users u ON al.performed_by = u.id
     WHERE al.deployment_id = ?
     ORDER BY al.created_at ASC`, [deploymentId]);
    return result.rows;
};
exports.getAuditLogs = getAuditLogs;
//# sourceMappingURL=audit.service.js.map