"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const infra_controller_1 = require("../controllers/infra.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/queue', (0, auth_1.authorize)('infra', 'admin'), infra_controller_1.getInfraQueue);
router.post('/deployments/:id/start', (0, auth_1.authorize)('infra', 'admin'), infra_controller_1.startDeployment);
router.post('/deployments/:id/complete', (0, auth_1.authorize)('infra', 'admin'), upload_1.upload.single('screenshot'), infra_controller_1.completeDeployment);
exports.default = router;
//# sourceMappingURL=infra.routes.js.map