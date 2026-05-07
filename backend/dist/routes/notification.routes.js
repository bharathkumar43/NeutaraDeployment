"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notification_service_1 = require("../services/notification.service");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    const notifications = await (0, notification_service_1.getUserNotifications)(req.user.userId);
    res.json({ success: true, data: notifications });
});
router.get('/unread-count', async (req, res) => {
    const count = await (0, notification_service_1.getUnreadCount)(req.user.userId);
    res.json({ success: true, data: { count } });
});
router.put('/:id/read', async (req, res) => {
    await (0, notification_service_1.markNotificationRead)(req.params.id, req.user.userId);
    res.json({ success: true });
});
router.put('/mark-all-read', async (req, res) => {
    await (0, notification_service_1.markAllNotificationsRead)(req.user.userId);
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=notification.routes.js.map