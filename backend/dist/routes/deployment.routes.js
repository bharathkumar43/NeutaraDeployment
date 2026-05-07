"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deployment_controller_1 = require("../controllers/deployment.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/stats/dashboard', deployment_controller_1.getDashboardStats);
router.get('/meta/jobs', deployment_controller_1.getJobsList);
router.get('/meta/branches', deployment_controller_1.getBranchesList);
router.get('/', deployment_controller_1.getDeployments);
router.get('/:id', deployment_controller_1.getDeploymentById);
router.post('/', (0, auth_1.authorize)('dev', 'admin'), deployment_controller_1.createDeployment);
router.put('/:id', (0, auth_1.authorize)('dev', 'admin'), deployment_controller_1.updateDraft);
exports.default = router;
//# sourceMappingURL=deployment.routes.js.map