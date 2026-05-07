"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qa_controller_1 = require("../controllers/qa.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/pending', (0, auth_1.authorize)('qa', 'admin'), qa_controller_1.getPendingQARequests);
router.post('/deployments/:id/approve', (0, auth_1.authorize)('qa', 'admin'), qa_controller_1.processQAApproval);
exports.default = router;
//# sourceMappingURL=qa.routes.js.map