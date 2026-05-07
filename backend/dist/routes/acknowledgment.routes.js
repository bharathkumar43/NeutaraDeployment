"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const acknowledgment_controller_1 = require("../controllers/acknowledgment.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/pending', (0, auth_1.authorize)('dev', 'admin'), acknowledgment_controller_1.getPendingAcknowledgments);
router.post('/deployments/:id/acknowledge', (0, auth_1.authorize)('dev', 'admin'), acknowledgment_controller_1.submitAcknowledgment);
exports.default = router;
//# sourceMappingURL=acknowledgment.routes.js.map