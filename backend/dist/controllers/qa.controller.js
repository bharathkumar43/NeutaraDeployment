"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processQAApproval = exports.getPendingQARequests = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const audit_service_1 = require("../services/audit.service");
const notification_service_1 = require("../services/notification.service");
const logger_1 = __importDefault(require("../utils/logger"));
const getPendingQARequests = async (req, res) => {
    const { environment, priority, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    try {
        const conditions = [`dr.status = 'pending_qa_approval'`];
        const params = [];
        if (environment) {
            conditions.push(`FIND_IN_SET(?, REPLACE(dr.environment, ', ', ','))`);
            params.push(environment);
        }
        if (priority) {
            conditions.push(`dr.priority = ?`);
            params.push(priority);
        }
        if (search) {
            conditions.push(`(dr.deployment_title LIKE ? OR dr.project_name LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }
        const where = `WHERE ${conditions.join(' AND ')}`;
        const countResult = await (0, connection_1.query)(`SELECT COUNT(*) AS total FROM deployment_requests dr ${where}`, params);
        const result = await (0, connection_1.query)(`SELECT dr.*, u.name AS raised_by_name, u.team AS raised_by_team
       FROM deployment_requests dr
       LEFT JOIN users u ON dr.raised_by = u.id
       ${where}
       ORDER BY
         CASE dr.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         dr.submitted_at ASC
       LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
        res.json({
            success: true,
            data: result.rows,
            pagination: { total: parseInt(String(countResult.rows[0].total)), page: pageNum, limit: limitNum },
        });
    }
    catch (err) {
        logger_1.default.error('Get pending QA error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPendingQARequests = getPendingQARequests;
const processQAApproval = async (req, res) => {
    const { id } = req.params;
    const { approval_status, qa_ticket_link, qa_description, qa_comments } = req.body;
    const qaUserId = req.user.userId;
    if (!approval_status || !qa_comments) {
        res.status(400).json({ success: false, message: 'Approval status and comments are required' });
        return;
    }
    try {
        const depResult = await (0, connection_1.query)(`SELECT * FROM deployment_requests WHERE id = ?`, [id]);
        if (!depResult.rows[0]) {
            res.status(404).json({ success: false, message: 'Deployment not found' });
            return;
        }
        const dep = depResult.rows[0];
        if (dep.status !== 'pending_qa_approval') {
            res.status(400).json({ success: false, message: 'Deployment is not pending QA approval' });
            return;
        }
        const statusMap = {
            approved: 'pending_infra_deployment',
            rejected: 'rejected_by_qa',
            sent_back: 'draft',
        };
        const newStatus = statusMap[approval_status];
        if (!newStatus) {
            res.status(400).json({ success: false, message: 'Invalid approval status' });
            return;
        }
        await (0, connection_1.query)(`INSERT INTO deployment_qa_approvals (id, deployment_id, qa_user_id, qa_ticket_link, qa_description, qa_comments, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), id, qaUserId, qa_ticket_link || null, qa_description || null, qa_comments, approval_status]);
        await (0, connection_1.query)(`UPDATE deployment_requests SET status = ? WHERE id = ?`, [newStatus, id]);
        await (0, audit_service_1.createAuditLog)({
            deploymentId: id, action: `QA_${approval_status.toUpperCase()}`,
            performedBy: qaUserId, oldStatus: dep.status, newStatus,
            comment: qa_comments, ipAddress: req.ip,
        });
        const msgs = {
            approved: { title: 'QA Approved — Pending Infra Deployment', message: `"${dep.deployment_title}" approved by QA.`, type: 'success' },
            rejected: { title: 'QA Rejected Your Deployment Request', message: `"${dep.deployment_title}" rejected. ${qa_comments}`, type: 'error' },
            sent_back: { title: 'Deployment Sent Back for Revision', message: `"${dep.deployment_title}" sent back. ${qa_comments}`, type: 'warning' },
        };
        await (0, notification_service_1.createNotification)({ userId: dep.raised_by, deploymentId: id, ...msgs[approval_status] });
        if (approval_status === 'approved') {
            await (0, notification_service_1.notifyRoleUsers)('infra', {
                deploymentId: id,
                title: 'New Deployment Ready for Infrastructure',
                message: `"${dep.deployment_title}" approved by QA. Ready for deployment.`,
                type: 'info',
            });
        }
        res.json({ success: true, message: `Deployment ${approval_status} successfully`, data: { status: newStatus } });
    }
    catch (err) {
        logger_1.default.error('QA approval error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.processQAApproval = processQAApproval;
//# sourceMappingURL=qa.controller.js.map