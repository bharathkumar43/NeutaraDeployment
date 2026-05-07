"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeDeployment = exports.startDeployment = exports.getInfraQueue = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const audit_service_1 = require("../services/audit.service");
const notification_service_1 = require("../services/notification.service");
const logger_1 = __importDefault(require("../utils/logger"));
const path_1 = __importDefault(require("path"));
const getInfraQueue = async (req, res) => {
    const { environment, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    try {
        const conditions = [`dr.status IN ('pending_infra_deployment','deployment_in_progress')`];
        const params = [];
        if (environment) {
            conditions.push(`FIND_IN_SET(?, REPLACE(dr.environment, ', ', ','))`);
            params.push(environment);
        }
        const where = `WHERE ${conditions.join(' AND ')}`;
        const countResult = await (0, connection_1.query)(`SELECT COUNT(*) AS total FROM deployment_requests dr ${where}`, params);
        const result = await (0, connection_1.query)(`SELECT dr.*, u.name AS raised_by_name, u.team AS raised_by_team,
              il.id AS log_id, il.deployment_status AS infra_status, il.infra_user_id
       FROM deployment_requests dr
       LEFT JOIN users u ON dr.raised_by = u.id
       LEFT JOIN deployment_infra_logs il
         ON il.deployment_id = dr.id AND il.deployment_status = 'in_progress'
       ${where}
       ORDER BY
         CASE dr.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         dr.updated_at ASC
       LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
        res.json({
            success: true,
            data: result.rows,
            pagination: { total: parseInt(String(countResult.rows[0].total)), page: pageNum, limit: limitNum },
        });
    }
    catch (err) {
        logger_1.default.error('Infra queue error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getInfraQueue = getInfraQueue;
const startDeployment = async (req, res) => {
    const { id } = req.params;
    const { deployment_notes } = req.body;
    const infraUserId = req.user.userId;
    try {
        const depResult = await (0, connection_1.query)(`SELECT * FROM deployment_requests WHERE id = ?`, [id]);
        const dep = depResult.rows[0];
        if (!dep) {
            res.status(404).json({ success: false, message: 'Deployment not found' });
            return;
        }
        if (dep.status !== 'pending_infra_deployment') {
            res.status(400).json({ success: false, message: 'Deployment is not in pending infra state' });
            return;
        }
        const logId = (0, uuid_1.v4)();
        await (0, connection_1.query)(`INSERT INTO deployment_infra_logs (id, deployment_id, infra_user_id, deployment_notes, deployment_status)
       VALUES (?, ?, ?, ?, 'in_progress')`, [logId, id, infraUserId, deployment_notes || 'Deployment started']);
        await (0, connection_1.query)(`UPDATE deployment_requests SET status = 'deployment_in_progress' WHERE id = ?`, [id]);
        await (0, audit_service_1.createAuditLog)({
            deploymentId: id, action: 'DEPLOYMENT_STARTED', performedBy: infraUserId,
            oldStatus: 'pending_infra_deployment', newStatus: 'deployment_in_progress', ipAddress: req.ip,
        });
        await (0, notification_service_1.createNotification)({
            userId: dep.raised_by, deploymentId: id,
            title: 'Deployment In Progress',
            message: `"${dep.deployment_title}" deployment has started by the Infra team.`,
            type: 'info',
        });
        const logResult = await (0, connection_1.query)(`SELECT * FROM deployment_infra_logs WHERE id = ?`, [logId]);
        res.json({ success: true, data: logResult.rows[0] });
    }
    catch (err) {
        logger_1.default.error('Start deployment error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.startDeployment = startDeployment;
const completeDeployment = async (req, res) => {
    const { id } = req.params;
    const { deployment_status, completion_comments, deployment_notes } = req.body;
    const infraUserId = req.user.userId;
    const file = req.file;
    if (!['success', 'failed'].includes(deployment_status)) {
        res.status(400).json({ success: false, message: 'deployment_status must be success or failed' });
        return;
    }
    try {
        const depResult = await (0, connection_1.query)(`SELECT * FROM deployment_requests WHERE id = ?`, [id]);
        const dep = depResult.rows[0];
        if (!dep) {
            res.status(404).json({ success: false, message: 'Deployment not found' });
            return;
        }
        if (!['deployment_in_progress', 'pending_infra_deployment'].includes(dep.status)) {
            res.status(400).json({ success: false, message: 'Deployment is not in a deployable state' });
            return;
        }
        const screenshotPath = file ? path_1.default.join('uploads', file.filename) : null;
        const screenshotName = file ? file.originalname : null;
        const existingLog = await (0, connection_1.query)(`SELECT id FROM deployment_infra_logs
       WHERE deployment_id = ? AND infra_user_id = ? AND deployment_status = 'in_progress'
       LIMIT 1`, [id, infraUserId]);
        if (existingLog.rows[0]) {
            await (0, connection_1.query)(`UPDATE deployment_infra_logs
         SET deployment_status = ?, screenshot_path = ?, screenshot_original_name = ?,
             completion_comments = ?, deployment_notes = COALESCE(?, deployment_notes),
             completed_at = NOW()
         WHERE id = ?`, [deployment_status, screenshotPath, screenshotName,
                completion_comments || null, deployment_notes || null, existingLog.rows[0].id]);
        }
        else {
            await (0, connection_1.query)(`INSERT INTO deployment_infra_logs
           (id, deployment_id, infra_user_id, deployment_notes, screenshot_path,
            screenshot_original_name, deployment_status, completion_comments, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [(0, uuid_1.v4)(), id, infraUserId, deployment_notes || 'Deployment completed',
                screenshotPath, screenshotName, deployment_status, completion_comments || null]);
        }
        const newStatus = deployment_status === 'success' ? 'pending_dev_acknowledgment' : 'deployment_failed';
        await (0, connection_1.query)(`UPDATE deployment_requests SET status = ? WHERE id = ?`, [newStatus, id]);
        await (0, audit_service_1.createAuditLog)({
            deploymentId: id,
            action: deployment_status === 'success' ? 'DEPLOYMENT_COMPLETED' : 'DEPLOYMENT_FAILED',
            performedBy: infraUserId, oldStatus: dep.status, newStatus,
            comment: completion_comments, ipAddress: req.ip,
        });
        await (0, notification_service_1.createNotification)({
            userId: dep.raised_by, deploymentId: id,
            title: deployment_status === 'success' ? 'Deployment Successful — Action Required' : 'Deployment Failed',
            message: deployment_status === 'success'
                ? `"${dep.deployment_title}" deployed successfully. Please acknowledge.`
                : `"${dep.deployment_title}" deployment failed. ${completion_comments}`,
            type: deployment_status === 'success' ? 'success' : 'error',
        });
        res.json({ success: true, data: { status: newStatus }, message: `Deployment marked as ${deployment_status}` });
    }
    catch (err) {
        logger_1.default.error('Complete deployment error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.completeDeployment = completeDeployment;
//# sourceMappingURL=infra.controller.js.map