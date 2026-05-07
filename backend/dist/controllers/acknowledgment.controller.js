"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAcknowledgment = exports.getPendingAcknowledgments = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const audit_service_1 = require("../services/audit.service");
const notification_service_1 = require("../services/notification.service");
const logger_1 = __importDefault(require("../utils/logger"));
const getPendingAcknowledgments = async (req, res) => {
    const userId = req.user.userId;
    try {
        const result = await (0, connection_1.query)(`SELECT dr.*, u.name AS raised_by_name, u.team AS raised_by_team,
              il.screenshot_path, il.completion_comments AS infra_comments,
              il.completed_at AS deployed_at, iu.name AS infra_user_name
       FROM deployment_requests dr
       LEFT JOIN users u  ON dr.raised_by     = u.id
       LEFT JOIN deployment_infra_logs il ON il.deployment_id = dr.id AND il.deployment_status = 'success'
       LEFT JOIN users iu ON il.infra_user_id = iu.id
       WHERE dr.status = 'pending_dev_acknowledgment' AND dr.raised_by = ?
       ORDER BY dr.updated_at DESC
       LIMIT 50`, [userId]);
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        logger_1.default.error('Get pending acknowledgments error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPendingAcknowledgments = getPendingAcknowledgments;
const submitAcknowledgment = async (req, res) => {
    const { id } = req.params;
    const { acknowledgment_comment, status } = req.body;
    const userId = req.user.userId;
    if (!acknowledgment_comment) {
        res.status(400).json({ success: false, message: 'Acknowledgment comment is required' });
        return;
    }
    if (!['acknowledged', 'issue_raised'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be acknowledged or issue_raised' });
        return;
    }
    try {
        const depResult = await (0, connection_1.query)(`SELECT * FROM deployment_requests WHERE id = ?`, [id]);
        const dep = depResult.rows[0];
        if (!dep) {
            res.status(404).json({ success: false, message: 'Deployment not found' });
            return;
        }
        if (dep.status !== 'pending_dev_acknowledgment') {
            res.status(400).json({ success: false, message: 'Deployment is not pending acknowledgment' });
            return;
        }
        if (dep.raised_by !== userId) {
            res.status(403).json({ success: false, message: 'Only the original requester can acknowledge' });
            return;
        }
        await (0, connection_1.query)(`INSERT INTO deployment_acknowledgments (id, deployment_id, acknowledged_by, acknowledgment_comment, status, acknowledged_at)
       VALUES (?, ?, ?, ?, ?, NOW())`, [(0, uuid_1.v4)(), id, userId, acknowledgment_comment, status]);
        const newStatus = status === 'acknowledged' ? 'successfully_completed' : 'issue_raised';
        await (0, connection_1.query)(`UPDATE deployment_requests SET status = ? WHERE id = ?`, [newStatus, id]);
        await (0, audit_service_1.createAuditLog)({
            deploymentId: id,
            action: status === 'acknowledged' ? 'DEPLOYMENT_ACKNOWLEDGED' : 'ISSUE_RAISED',
            performedBy: userId, oldStatus: dep.status, newStatus,
            comment: acknowledgment_comment, ipAddress: req.ip,
        });
        if (status === 'acknowledged') {
            await (0, notification_service_1.notifyRoleUsers)('admin', { deploymentId: id, title: 'Deployment Successfully Completed', message: `"${dep.deployment_title}" acknowledged and completed.`, type: 'success' });
            await (0, notification_service_1.notifyRoleUsers)('infra', { deploymentId: id, title: 'Deployment Acknowledged', message: `"${dep.deployment_title}" acknowledged by Dev team.`, type: 'success' });
        }
        else {
            await (0, notification_service_1.notifyRoleUsers)('infra', { deploymentId: id, title: 'Issue Raised for Deployment', message: `Issue raised for "${dep.deployment_title}". ${acknowledgment_comment}`, type: 'error' });
        }
        res.json({ success: true, data: { status: newStatus }, message: status === 'acknowledged' ? 'Acknowledged successfully' : 'Issue reported' });
    }
    catch (err) {
        logger_1.default.error('Submit acknowledgment error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.submitAcknowledgment = submitAcknowledgment;
//# sourceMappingURL=acknowledgment.controller.js.map