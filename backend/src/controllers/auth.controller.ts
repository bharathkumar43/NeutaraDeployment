import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { generateToken } from '../utils/jwt';
import logger from '../utils/logger';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }
  try {
    const result = await query(
      `SELECT id, name, email, password_hash, role, team, avatar_url, is_active
       FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password_hash as string);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    await query(`UPDATE users SET last_login = NOW() WHERE id = ?`, [user.id]);
    const token = generateToken({
      userId: user.id as string,
      email:  user.email as string,
      role:   user.role as string,
      name:   user.name as string,
    });
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team, avatar_url: user.avatar_url },
      },
    });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, email, role, team, avatar_url, last_login, created_at FROM users WHERE id = ?`,
      [req.user!.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Get profile error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    let sql = `SELECT id, name, email, role, team, is_active FROM users WHERE is_active = 1`;
    const params: unknown[] = [];
    if (role) { sql += ` AND role = ?`; params.push(role); }
    sql += ` ORDER BY name ASC`;
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('List users error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, team } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    return;
  }
  try {
    const existing = await query(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }
    const hash   = await bcrypt.hash(password, 10);
    const newId  = uuidv4();
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, team) VALUES (?, ?, ?, ?, ?, ?)`,
      [newId, name, email.toLowerCase(), hash, role, team || null]
    );
    const created = await query(`SELECT id, name, email, role, team FROM users WHERE id = ?`, [newId]);
    res.status(201).json({ success: true, data: created.rows[0] });
  } catch (err) {
    logger.error('Create user error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
