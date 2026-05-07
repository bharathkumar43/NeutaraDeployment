"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const deployment_routes_1 = __importDefault(require("./deployment.routes"));
const qa_routes_1 = __importDefault(require("./qa.routes"));
const infra_routes_1 = __importDefault(require("./infra.routes"));
const acknowledgment_routes_1 = __importDefault(require("./acknowledgment.routes"));
const notification_routes_1 = __importDefault(require("./notification.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/deployments', deployment_routes_1.default);
router.use('/qa', qa_routes_1.default);
router.use('/infra', infra_routes_1.default);
router.use('/acknowledgments', acknowledgment_routes_1.default);
router.use('/notifications', notification_routes_1.default);
router.get('/health', (_req, res) => {
    res.json({ success: true, message: 'Neutara Deployment API is running', timestamp: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=index.js.map