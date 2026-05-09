import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { generateToken } from '../utils/jwt';
import { decodeAzureToken } from '../utils/azureAuth';
import { UserRole } from '../types';
import logger from '../utils/logger';

// Shared helper — looks up or auto-creates a @cloudfuze.com user, returns our JWT
async function resolveAzureUser(email: string, displayName: string): Promise<{ token: string; user: Record<string, unknown> }> {
  const result = await query(
    `SELECT id, name, email, role, team, avatar_url, is_active FROM users WHERE email = $1`,
    [email]
  );
  let user = result.rows[0];

  if (user) {
    if (!user.is_active) throw Object.assign(new Error('Your account has been deactivated. Please contact the admin.'), { status: 403 });
  } else {
    if (!email.endsWith('@cloudfuze.com')) throw Object.assign(new Error('Access denied. Only @cloudfuze.com accounts can sign in.'), { status: 403 });
    const newId = uuidv4();
    await query(
      `INSERT INTO users (id, name, email, role, auth_type) VALUES ($1, $2, $3, 'dev', 'azure')`,
      [newId, displayName, email]
    );
    user = { id: newId, name: displayName, email, role: 'dev', team: null, avatar_url: null, is_active: true };
  }

  await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

  const token = generateToken({
    userId: user.id as string,
    email:  user.email as string,
    role:   user.role as UserRole,
    name:   user.name as string,
  });

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team, avatar_url: user.avatar_url } };
}

// ─── Traditional login (admin only) ──────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required' });
    return;
  }
  try {
    const result = await query(
      `SELECT id, name, email, password_hash, role, team, avatar_url, is_active, auth_type
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    if (user.auth_type !== 'password' || !user.password_hash) {
      res.status(401).json({ success: false, message: 'This account uses Microsoft sign-in. Please use the "Sign in with Microsoft" button.' });
      return;
    }
    const isMatch = await bcrypt.compare(password, user.password_hash as string);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);
    const token = generateToken({
      userId: user.id as string,
      email:  user.email as string,
      role:   user.role as UserRole,
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

// ─── Azure AD login ───────────────────────────────────────────────────────────
// Logic:
//   1. Email found in users table          → use assigned role (qa / infra / admin / dev / viewer)
//   2. Email NOT found + @cloudfuze.com    → auto-register as dev and sign in
//   3. Email NOT found + other domain      → deny access
//   4. Account is deactivated              → deny access
export const azureLogin = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ success: false, message: 'Azure ID token is required' });
    return;
  }
  try {
    const payload = decodeAzureToken(idToken);
    const email = (payload.preferred_username || payload.email || '').toLowerCase();
    const displayName = payload.name || email.split('@')[0];

    if (!email) {
      res.status(401).json({ success: false, message: 'Could not extract email from Azure token' });
      return;
    }

    const result = await query(
      `SELECT id, name, email, role, team, avatar_url, is_active FROM users WHERE email = $1`,
      [email]
    );
    let user = result.rows[0];

    if (user) {
      if (!user.is_active) {
        res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact the admin.',
        });
        return;
      }
    } else {
      // Unknown email — only allow @cloudfuze.com, default role is dev
      if (!email.endsWith('@cloudfuze.com')) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Only @cloudfuze.com accounts can sign in.',
        });
        return;
      }

      const newId = uuidv4();
      await query(
        `INSERT INTO users (id, name, email, role, auth_type) VALUES ($1, $2, $3, 'dev', 'azure')`,
        [newId, displayName, email]
      );
      user = { id: newId, name: displayName, email, role: 'dev', team: null, avatar_url: null, is_active: true };
    }

    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    const token = generateToken({
      userId: user.id as string,
      email:  user.email as string,
      role:   user.role as UserRole,
      name:   user.name as string,
    });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, team: user.team, avatar_url: user.avatar_url },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Azure login error — token validation failed', { message });
    res.status(401).json({
      success: false,
      message: `Token validation failed: ${message}`,
    });
  }
};

// ─── Azure server-side code exchange (works with "Web" platform in Azure) ─────
// Frontend sends the auth code → backend exchanges it for tokens using the
// client secret (server-to-server call — no CORS restrictions).
export const azureExchange = async (req: Request, res: Response): Promise<void> => {
  const { code, redirectUri } = req.body;
  if (!code || !redirectUri) {
    res.status(400).json({ success: false, message: 'code and redirectUri are required' });
    return;
  }

  const TENANT_ID     = process.env.AZURE_TENANT_ID!;
  const CLIENT_ID     = process.env.AZURE_CLIENT_ID!;
  const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;

  if (!CLIENT_SECRET) {
    res.status(500).json({ success: false, message: 'AZURE_CLIENT_SECRET is not configured on the server' });
    return;
  }

  try {
    // Exchange the auth code for tokens — server-side, no CORS issues
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri:  redirectUri,
          grant_type:    'authorization_code',
          scope:         'openid profile email',
        }).toString(),
      }
    );

    const tokenData = await tokenRes.json() as { id_token?: string; error_description?: string };

    if (!tokenRes.ok || !tokenData.id_token) {
      logger.error('Azure token exchange failed', tokenData);
      res.status(401).json({ success: false, message: tokenData.error_description || 'Microsoft authentication failed' });
      return;
    }

    const payload      = decodeAzureToken(tokenData.id_token);
    const email        = (payload.preferred_username || payload.email || '').toLowerCase();
    const displayName  = payload.name || email.split('@')[0];

    if (!email) {
      res.status(401).json({ success: false, message: 'Could not extract email from Microsoft token' });
      return;
    }

    const { token, user } = await resolveAzureUser(email, displayName);
    res.json({ success: true, data: { token, user } });
  } catch (err: unknown) {
    const status  = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Authentication failed';
    logger.error('Azure exchange error', { message });
    res.status(status).json({ success: false, message });
  }
};

// ─── Get profile ──────────────────────────────────────────────────────────────
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, email, role, team, avatar_url, last_login, created_at FROM users WHERE id = $1`,
      [req.user!.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Get profile error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── List users ───────────────────────────────────────────────────────────────
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;
    let sql = `SELECT id, name, email, role, team, is_active, auth_type FROM users WHERE 1=1`;
    const params: unknown[] = [];
    if (role) { sql += ` AND role = $${params.length + 1}`; params.push(role); }
    sql += ` ORDER BY name ASC`;
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('List users error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Create user (admin assigns email + role, no password needed for Azure users) ─
export const createUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, role, team, password } = req.body;
  if (!name || !email || !role) {
    res.status(400).json({ success: false, message: 'Name, email, and role are required' });
    return;
  }
  try {
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const newId = uuidv4();
    let passwordHash: string | null = null;
    let authType = 'azure';

    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
      authType = 'password';
    }

    await query(
      `INSERT INTO users (id, name, email, password_hash, role, team, auth_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId, name, email.toLowerCase(), passwordHash, role, team || null, authType]
    );
    const created = await query(
      `SELECT id, name, email, role, team, auth_type FROM users WHERE id = $1`,
      [newId]
    );
    res.status(201).json({ success: true, data: created.rows[0] });
  } catch (err) {
    logger.error('Create user error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── Update user role / team (admin only) ────────────────────────────────────
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role, team, is_active } = req.body;

  const updates: string[] = [];
  const params: unknown[] = [];

  if (role !== undefined) { params.push(role); updates.push(`role = $${params.length}`); }
  if (team !== undefined) { params.push(team); updates.push(`team = $${params.length}`); }
  if (is_active !== undefined) { params.push(is_active); updates.push(`is_active = $${params.length}`); }

  if (updates.length === 0) {
    res.status(400).json({ success: false, message: 'No fields to update' });
    return;
  }

  params.push(id);
  try {
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length}
       RETURNING id, name, email, role, team, is_active`,
      params
    );
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error('Update user error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
