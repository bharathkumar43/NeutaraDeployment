"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnreadCount = exports.markAllNotificationsRead = exports.markNotificationRead = exports.getUserNotifications = exports.notifyRoleUsers = exports.createNotification = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = __importDefault(require("../utils/logger"));
const createNotification = async (payload) => {
    try {
        await (0, connection_1.query)(`INSERT INTO notifications (id, user_id, deployment_id, title, message, type)
       VALUES (?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), payload.userId, payload.deploymentId || null, payload.title, payload.message, payload.type]);
    }
    catch (err) {
        logger_1.default.error('Failed to create notification', err);
    }
};
exports.createNotification = createNotification;
const notifyRoleUsers = async (role, payload) => {
    try {
        const users = await (0, connection_1.query)(`SELECT id FROM users WHERE role = ? AND is_active = 1`, [role]);
        await Promise.all(users.rows.map((u) => (0, exports.createNotification)({ userId: u.id, ...payload })));
    }
    catch (err) {
        logger_1.default.error('Failed to notify role users', err);
    }
};
exports.notifyRoleUsers = notifyRoleUsers;
const getUserNotifications = async (userId, limit = 20) => {
    const result = await (0, connection_1.query)(`SELECT n.*, dr.deployment_title
     FROM notifications n
     LEFT JOIN deployment_requests dr ON n.deployment_id = dr.id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ?`, [userId, parseInt(String(limit))]);
    return result.rows;
};
exports.getUserNotifications = getUserNotifications;
const markNotificationRead = async (id, userId) => {
    await (0, connection_1.query)(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (userId) => {
    await (0, connection_1.query)(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
};
exports.markAllNotificationsRead = markAllNotificationsRead;
const getUnreadCount = async (userId) => {
    const result = await (0, connection_1.query)(`SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0`, [userId]);
    return parseInt(String(result.rows[0].cnt));
};
exports.getUnreadCount = getUnreadCount;
//# sourceMappingURL=notification.service.js.map