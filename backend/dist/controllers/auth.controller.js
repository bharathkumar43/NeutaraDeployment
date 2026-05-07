"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.listUsers = exports.getProfile = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const jwt_1 = require("../utils/jwt");
const logger_1 = __importDefault(require("../utils/logger"));
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
    }
    try {
        const result = await (0, connection_1.query)(`SELECT id, name, email, password_hash, role, team, avatar_url, is_active
       FROM users WHERE email = ?`, [email.toLowerCase()]);
        const user = result.rows[0];
        if (!user || !user.is_active) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        await (0, connection_1.query)(`UPDATE users SET last_login = NOW() WHERE id = ?`, [user.id]);
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });
        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team, avatar_url: user.avatar_url },
            },
        });
    }
    catch (err) {
        logger_1.default.error('Login error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const result = await (0, connection_1.query)(`SELECT id, name, email, role, team, avatar_url, last_login, created_at FROM users WHERE id = ?`, [req.user.userId]);
        if (!result.rows[0]) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        logger_1.default.error('Get profile error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getProfile = getProfile;
const listUsers = async (req, res) => {
    try {
        const { role } = req.query;
        let sql = `SELECT id, name, email, role, team, is_active FROM users WHERE is_active = 1`;
        const params = [];
        if (role) {
            sql += ` AND role = ?`;
            params.push(role);
        }
        sql += ` ORDER BY name ASC`;
        const result = await (0, connection_1.query)(sql, params);
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        logger_1.default.error('List users error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.listUsers = listUsers;
const createUser = async (req, res) => {
    const { name, email, password, role, team } = req.body;
    if (!name || !email || !password || !role) {
        res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
        return;
    }
    try {
        const existing = await (0, connection_1.query)(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            res.status(409).json({ success: false, message: 'Email already registered' });
            return;
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        const newId = (0, uuid_1.v4)();
        await (0, connection_1.query)(`INSERT INTO users (id, name, email, password_hash, role, team) VALUES (?, ?, ?, ?, ?, ?)`, [newId, name, email.toLowerCase(), hash, role, team || null]);
        const created = await (0, connection_1.query)(`SELECT id, name, email, role, team FROM users WHERE id = ?`, [newId]);
        res.status(201).json({ success: true, data: created.rows[0] });
    }
    catch (err) {
        logger_1.default.error('Create user error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.createUser = createUser;
//# sourceMappingURL=auth.controller.js.map