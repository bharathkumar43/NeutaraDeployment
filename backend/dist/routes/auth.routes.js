"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.login);
router.get('/profile', auth_1.authenticate, auth_controller_1.getProfile);
router.get('/users', auth_1.authenticate, auth_controller_1.listUsers);
router.post('/users', auth_1.authenticate, (0, auth_1.authorize)('admin'), auth_controller_1.createUser);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map