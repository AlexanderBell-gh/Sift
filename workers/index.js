import {
  isValidUser,
  hashPassword,
  verifyPassword,
  generateToken,
  createUserId,
  createJWT,
  verifyJWT,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  getUserByGoogleId,
  saveUser,
  deleteUser,
  base64UrlToArrayBuffer,
} from './auth.js';
import { queryAll, queryOne, execute, batch } from './db.js';



const ALLOWED_ORIGINS = [
  'https://siftsearch.pages.dev',
  'http://localhost:5173',
  'http://localhost:3000',
];

let corsHeaders = {};

function setCorsHeaders(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  corsHeaders = {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}



function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function normalizeDateString(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const d = parsed.getDate();
    const m = parsed.getMonth() + 1;
    const y = parsed.getFullYear();
    return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
  }
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${y}`;
  }
  return null;
}

async function logAudit(env, entry) {
  const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await execute(
    env,
    `INSERT INTO audit_logs (id, action, admin_id, admin_username, target_user_id, target_username, details, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.action,
      entry.adminId,
      entry.adminUsername,
      entry.targetUserId || null,
      entry.targetUsername || null,
      entry.details || null,
      Date.now(),
    ]
  );
}

async function ensureRateLimitTable(env) {
  await execute(
    env,
    `CREATE TABLE IF NOT EXISTS rate_limits (
       key TEXT PRIMARY KEY,
       count INTEGER NOT NULL,
       reset_at INTEGER NOT NULL
     )`
  );
  await execute(env, 'CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at)');
}

async function checkRateLimit(env, key, max, windowMs) {
  await ensureRateLimitTable(env);
  const now = Date.now();
  const resetAt = now + windowMs;
  const row = await queryOne(
    env,
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= ? THEN ? ELSE rate_limits.reset_at END
     RETURNING count, reset_at`,
    [key, resetAt, now, now, resetAt]
  );
  if (row && row.count > max) {
    return { ok: false, retryAfter: Math.max(0, (row.reset_at || now) - now) };
  }
  return { ok: true };
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || '0.0.0.0';
}

async function authenticate(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const tokenMatch = cookie.match(/auth_token=([^;]+)/);

  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const token = tokenMatch?.[1] || bearerToken;
  if (!token) return null;

  const payload = await verifyJWT(token, env);
  if (!payload) return null;

  return payload;
}

async function requireAuth(request, env) {
  const auth = await authenticate(request, env);
  if (!auth) {
    return errorResponse('Authentication required', 401);
  }
  return auth;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function getCachedResults(env, query) {
  const hash = hashString(query.toLowerCase().trim());
  const row = await queryOne(
    env,
    'SELECT results, created_at FROM search_cache WHERE query_hash = ?',
    [hash]
  );
  if (!row) return null;
  const age = Date.now() - row.created_at;
  if (age > 24 * 60 * 60 * 1000) return null;
  try {
    return JSON.parse(row.results);
  } catch {
    return null;
  }
}

async function setCachedResults(env, query, results) {
  const hash = hashString(query.toLowerCase().trim());
  await execute(
    env,
    `INSERT INTO search_cache (query_hash, query, results, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(query_hash) DO UPDATE SET results = excluded.results, created_at = excluded.created_at`,
    [hash, query, JSON.stringify(results), Date.now()]
  );
}

// Google ID token verification
let googleCertsCache = null;
let googleCertsExpiry = 0;

async function getGooglePublicKeys() {
  if (googleCertsCache && Date.now() < googleCertsExpiry) return googleCertsCache;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const data = await res.json();
  googleCertsCache = data.keys;
  googleCertsExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return googleCertsCache;
}

async function verifyGoogleIdToken(idToken, clientId) {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(atob(headerB64));
    const kid = header.kid;
    if (!kid) return null;

    const keys = await getGooglePublicKeys();
    const jwk = keys.find(k => k.kid === kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256' },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const message = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToArrayBuffer(sigB64);

    const valid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      signature,
      message
    );

    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));

    if (payload.aud !== clientId) return null;
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') return null;
    if (payload.exp * 1000 < Date.now()) return null;

    return payload;
  } catch (e) {
    console.error('Google token verification error:', e);
    return null;
  }
}

function reassembleWatchlistItem(r) {
  return {
    id: r.id,
    product_id: r.product_id,
    product_name: r.product_name,
    store: r.store,
    store_logo: r.store_logo,
    image_url: r.image_url,
    unit: r.unit,
    category: r.category,
    prices: {
      normal: r.normal_price,
      loyalty: r.loyalty_price,
      unit_price: r.unit_price,
      currency: r.currency,
    },
    loyalty_type: r.loyalty_type,
    offer_expires_at: r.offer_expires_at,
    product_url: r.product_url,
    is_on_offer: !!r.is_on_offer,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

async function handleRequest(request, env) {
  setCorsHeaders(request);
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ===== AUTH ROUTES =====

  if (path === '/api/auth/register' && method === 'POST') {
    try {
      const body = await request.json();
      const { email, username, password } = body;

      if (!email || !username || !password) {
        return errorResponse('Email, username, and password are required');
      }
      if (!isValidEmail(email)) {
        return errorResponse('Invalid email format');
      }
      if (!isValidPassword(password)) {
        return errorResponse('Password must be at least 8 characters with at least one letter and one number');
      }

      if (await getUserByEmail(env, email)) {
        return errorResponse('Email already in use');
      }
      if (await getUserByUsername(env, username)) {
        return errorResponse('Username already in use');
      }

      const user = {
        id: createUserId(),
        email,
        username,
        passwordHash: await hashPassword(password),
        role: 'user',
        isTrial: false,
        trialExpiresAt: null,
        searchCount: 0,
        preferences: {
          currency: body.currency || 'USD',
          defaultStore: body.defaultStore || null,
        },
        createdAt: new Date().toISOString(),
      };

      await saveUser(env, user);
      const token = await createJWT(user, env);

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isTrial: false,
          trialExpiresAt: null,
          searchCount: 0,
          remainingSearches: null,
          preferences: user.preferences,
        },
        token,
      }, 201);
    } catch (e) {
      console.error('Register error:', e);
      return errorResponse('Invalid request body');
    }
  }

  if (path === '/api/auth/register-admin' && method === 'POST') {
    try {
      const rl = await checkRateLimit(env, `register_admin:${getClientIp(request)}`, 5, 15 * 60 * 1000);
      if (!rl.ok) {
        return errorResponse(`Too many attempts. Try again in ${Math.ceil(rl.retryAfter / 1000)}s`, 429);
      }

      const body = await request.json();
      const { email, username, password, adminSecret } = body;

      if (!adminSecret || !env.ADMIN_SECRET) {
        return errorResponse('Invalid admin secret', 403);
      }
      const secretMatch = crypto.timingSafeEqual(
        new TextEncoder().encode(adminSecret),
        new TextEncoder().encode(env.ADMIN_SECRET)
      );
      if (!secretMatch) {
        return errorResponse('Invalid admin secret', 403);
      }
      if (!email || !username || !password) {
        return errorResponse('Email, username, and password are required');
      }
      if (!isValidEmail(email)) {
        return errorResponse('Invalid email format');
      }
      if (!isValidPassword(password)) {
        return errorResponse('Password must be at least 8 characters with at least one letter and one number');
      }

      if (await getUserByEmail(env, email)) {
        return errorResponse('Email already in use');
      }
      if (await getUserByUsername(env, username)) {
        return errorResponse('Username already in use');
      }

      const user = {
        id: createUserId(),
        email,
        username,
        passwordHash: await hashPassword(password),
        role: 'admin',
        isTrial: false,
        searchCount: 0,
        preferences: {
          currency: body.currency || 'USD',
          defaultStore: body.defaultStore || null,
        },
        createdAt: new Date().toISOString(),
      };

      await saveUser(env, user);
      const token = await createJWT(user, env);

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          preferences: user.preferences,
        },
        token,
      }, 201);
    } catch (e) {
      console.error('Register admin error:', e);
      return errorResponse('Invalid request body');
    }
  }

  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return errorResponse('Username and password are required');
      }

      const user = await getUserByUsername(env, username);
      const dummyHash = '$dummy$dummy';
      const passwordValid = user
        ? await verifyPassword(password, user.passwordHash)
        : await verifyPassword(password, dummyHash);
      if (!user || !passwordValid) {
        return errorResponse('Invalid credentials');
      }

      const token = await createJWT(user, env);

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isTrial: user.isTrial || false,
          trialExpiresAt: user.trialExpiresAt || null,
          preferences: user.preferences,
        },
        token,
      });
    } catch (e) {
      console.error('Login error:', e);
      return errorResponse('Invalid request body');
    }
  }

  if (path === '/api/auth/trial' && method === 'POST') {
    try {
      let username = null;
      try {
        const body = await request.json();
        username = body?.username || null;
      } catch {
        // No body - fine, generate random username
      }

      const trialUsername = username || `trial_${crypto.randomUUID().slice(0, 8)}`;
      const trialEmail = `${trialUsername}@trial.sift`;

      if (await getUserByUsername(env, trialUsername)) {
        return errorResponse('Username already in use');
      }

      const TRIAL_HOURS = 24;
      const trialExpiresAt = Date.now() + TRIAL_HOURS * 60 * 60 * 1000;

      const user = {
        id: createUserId(),
        email: trialEmail,
        username: trialUsername,
        passwordHash: await hashPassword(generateToken()),
        role: 'user',
        isTrial: true,
        trialExpiresAt,
        preferences: { currency: 'USD', defaultStore: null },
        createdAt: new Date().toISOString(),
      };

      await saveUser(env, user);
      const token = await createJWT(user, env);

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isTrial: true,
          trialExpiresAt,
          preferences: user.preferences,
        },
        token,
        trialHoursRemaining: TRIAL_HOURS,
      }, 201);
    } catch (e) {
      console.error('Trial error:', e);
      return errorResponse('Invalid request body');
    }
  }

  if (path === '/api/auth/google' && method === 'POST') {
    if (!env.GOOGLE_CLIENT_ID) {
      return errorResponse('Google sign-in not configured', 501);
    }
    try {
      const body = await request.json();
      const { idToken } = body;
      if (!idToken) return errorResponse('ID token required');

      const googlePayload = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);
      if (!googlePayload) return errorResponse('Invalid Google token');

      const existingUser = await getUserByGoogleId(env, googlePayload.sub);

      if (existingUser) {
        const token = await createJWT(existingUser, env);
        return jsonResponse({
          user: {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            role: existingUser.role,
            isTrial: existingUser.isTrial || false,
            trialExpiresAt: existingUser.trialExpiresAt || null,
          },
          token,
        });
      }

      const displayName = googlePayload.name || `user_${googlePayload.sub.slice(0, 8)}`;
      const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || `g_${googlePayload.sub.slice(0, 8)}`;
      let username = baseUsername;
      let suffix = 1;
      while (await getUserByUsername(env, username)) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      const email = googlePayload.email || `${googlePayload.sub}@google.sift`;

      const user = {
        id: createUserId(),
        googleId: googlePayload.sub,
        email,
        username,
        passwordHash: await hashPassword(generateToken()),
        role: 'user',
        isTrial: false,
        preferences: { currency: 'GBP', defaultStore: null },
        createdAt: new Date().toISOString(),
      };

      await saveUser(env, user);
      const token = await createJWT(user, env);

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isTrial: false,
          trialExpiresAt: null,
        },
        token,
      }, 201);
    } catch (e) {
      console.error('Google auth error:', e);
      return errorResponse('Google sign-in failed');
    }
  }

  if (path === '/api/auth/me') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;

    if (method === 'GET') {
      const user = await getUserById(env, auth.userId);
      if (!user) return errorResponse('User not found', 404);
      return jsonResponse({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isTrial: user.isTrial || false,
        trialExpiresAt: user.trialExpiresAt || null,
        preferences: user.preferences,
        createdAt: user.createdAt,
      });
    }

    if (method === 'PUT') {
      try {
        const body = await request.json();
        const user = await getUserById(env, auth.userId);
        if (!user) return errorResponse('User not found', 404);

        if (body.preferences) {
          user.preferences = { ...user.preferences, ...body.preferences };
        }

        if (body.currentPassword && body.newPassword) {
          if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
            return errorResponse('Current password is incorrect');
          }
          if (!isValidPassword(body.newPassword)) {
            return errorResponse('New password must be at least 8 characters with at least one letter and one number');
          }
          user.passwordHash = await hashPassword(body.newPassword);
        }

        if (body.newEmail && body.currentPassword) {
          if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
            return errorResponse('Password is incorrect');
          }
          if (!isValidEmail(body.newEmail)) {
            return errorResponse('Invalid email format');
          }
          const existing = await getUserByEmail(env, body.newEmail);
          if (existing && existing.id !== user.id) {
            return errorResponse('Email already in use');
          }
          user.email = body.newEmail;
        }

        await saveUser(env, user);

        return jsonResponse({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isTrial: user.isTrial || false,
          trialExpiresAt: user.trialExpiresAt || null,
          preferences: user.preferences,
          createdAt: user.createdAt,
        });
      } catch (e) {
        console.error('Update me error:', e);
        return errorResponse('Invalid request body');
      }
    }

    if (method === 'DELETE') {
      try {
        const user = await getUserById(env, auth.userId);
        if (!user) return errorResponse('User not found', 404);

        if (!user.isTrial) {
          const body = await request.json();
          if (!body.password) {
            return errorResponse('Password is required to delete account');
          }
          if (!(await verifyPassword(body.password, user.passwordHash))) {
            return errorResponse('Password is incorrect');
          }
        }

        await deleteUser(env, auth.userId);
        return jsonResponse({ success: true });
      } catch (e) {
        console.error('Delete account error:', e);
        return errorResponse('Invalid request body');
      }
    }
  }

  // ===== ADMIN =====

  async function requireAdmin(request, env) {
    const auth = await authenticate(request, env);
    if (!auth) return errorResponse('Authentication required', 401);
    if (auth.role !== 'admin') return errorResponse('Admin access denied', 403);
    return auth;
  }

  if (path === '/api/admin/stats') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userStats = await queryOne(
      env,
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_trial = 1 THEN 1 ELSE 0 END) as trial,
         SUM(CASE WHEN is_trial = 0 THEN 1 ELSE 0 END) as regular
       FROM users`
    );
    const watchlistCount = (await queryOne(env, 'SELECT COUNT(*) as c FROM watchlist'))?.c || 0;
    const priceHistoryCount = (await queryOne(env, 'SELECT COUNT(*) as c FROM price_history'))?.c || 0;

    return jsonResponse({
      totalUsers: userStats?.total || 0,
      regularUsers: userStats?.regular || 0,
      trialUsers: userStats?.trial || 0,
      totalProducts: watchlistCount,
      totalPrices: priceHistoryCount,
    });
  }

  if (path === '/api/admin/users') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const filter = url.searchParams.get('filter') || 'users';

    const where = [];
    const params = [];
    if (filter === 'users') where.push('is_trial = 0');
    else if (filter === 'trials') where.push('is_trial = 1');
    if (search) {
      where.push('(LOWER(username) LIKE ? OR LOWER(email) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const total = (await queryOne(env, `SELECT COUNT(*) as c FROM users ${whereClause}`, params))?.c || 0;
    const rows = await queryAll(
      env,
      `SELECT u.id, u.email, u.username, u.role, u.is_trial, u.trial_expires_at, u.created_at,
              (SELECT COUNT(*) FROM watchlist WHERE user_id = u.id) as product_count
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    const users = rows.map((r) => ({
      id: r.id,
      email: r.email,
      username: r.username,
      role: r.role,
      isTrial: !!r.is_trial,
      trialExpiresAt: r.trial_expires_at,
      createdAt: r.created_at,
      productCount: r.product_count,
    }));

    return jsonResponse({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  const adminUserMatch = path.match(/^\/api\/admin\/users\/(.+)$/);
  if (adminUserMatch && method === 'GET') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userId = adminUserMatch[1];
    const user = await getUserById(env, userId);
    if (!user) return errorResponse('User not found', 404);

    const productRows = await queryAll(
      env,
      `SELECT w.id, w.product_name as name, w.store, w.product_id,
              (SELECT COUNT(*) FROM price_history WHERE product_id = w.product_id) as price_count
       FROM watchlist w WHERE w.user_id = ?`,
      [userId]
    );
    const products = productRows.map((p) => ({
      id: p.id,
      name: p.name,
      store: p.store,
      priceCount: p.price_count,
    }));
    const totalPrices = products.reduce((s, p) => s + p.priceCount, 0);

    return jsonResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isTrial: user.isTrial || false,
      trialExpiresAt: user.trialExpiresAt || null,
      preferences: user.preferences,
      createdAt: user.createdAt,
      productCount: products.length,
      totalPrices,
      products,
    });
  }

  if (adminUserMatch && method === 'DELETE') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userId = adminUserMatch[1];
    if (userId === admin.userId) {
      return errorResponse('Cannot delete your own admin account');
    }

    const user = await getUserById(env, userId);
    if (!user) return errorResponse('User not found', 404);

    if (user.role === 'admin') {
      const adminCount = (await queryOne(
        env,
        `SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND id != ?`,
        [userId]
      ))?.c || 0;
      if (adminCount === 0) {
        return errorResponse('Cannot delete the last admin');
      }
    }

    await deleteUser(env, userId);

    const adminUser = await getUserById(env, admin.userId);
    await logAudit(env, {
      action: 'admin.user_delete',
      adminId: admin.userId,
      adminUsername: adminUser?.username || 'unknown',
      targetUserId: userId,
      targetUsername: user.username,
      details: `deleted user ${user.username}`,
    });

    return jsonResponse({ success: true });
  }

  const roleMatch = path.match(/^\/api\/admin\/users\/(.+)\/role$/);
  if (roleMatch && method === 'PUT') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const targetUserId = roleMatch[1];
    const targetUser = await getUserById(env, targetUserId);
    if (!targetUser) return errorResponse('User not found', 404);

    try {
      const body = await request.json();
      const newRole = body.role;
      if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
        return errorResponse('Invalid role. Must be "admin" or "user"');
      }

      if (newRole === 'user' && targetUser.role === 'admin') {
        const result = await execute(
          env,
          `UPDATE users SET role = 'user' WHERE id = ? AND role = 'admin'
           AND (SELECT COUNT(*) FROM users WHERE role = 'admin' AND id != ?) > 0`,
          [targetUserId, targetUserId]
        );
        if (result.meta?.changes === 0) {
          return errorResponse('Cannot demote the last admin');
        }
      } else {
        await execute(env, 'UPDATE users SET role = ? WHERE id = ?', [newRole, targetUserId]);
      }

      const adminUser = await getUserById(env, admin.userId);
      await logAudit(env, {
        action: 'admin.role_change',
        adminId: admin.userId,
        adminUsername: adminUser?.username || 'unknown',
        targetUserId,
        targetUsername: targetUser.username,
        details: `changed ${targetUser.username} from ${targetUser.role} to ${newRole}`,
      });

      return jsonResponse({ success: true, role: newRole });
    } catch (e) {
      console.error('Role update error:', e);
      return errorResponse('Invalid request body');
    }
  }

  if (path === '/api/admin/audit') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const actionFilter = url.searchParams.get('action') || '';
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const where = [];
    const params = [];
    if (actionFilter) {
      where.push('action = ?');
      params.push(actionFilter);
    }
    if (search) {
      where.push('(LOWER(admin_username) LIKE ? OR LOWER(target_username) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (startDate) {
      where.push('timestamp >= ?');
      params.push(new Date(startDate).getTime());
    }
    if (endDate) {
      where.push('timestamp <= ?');
      params.push(new Date(endDate).getTime() + 86400000);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const total = (await queryOne(env, `SELECT COUNT(*) as c FROM audit_logs ${whereClause}`, params))?.c || 0;
    const rows = await queryAll(
      env,
      `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    return jsonResponse({
      logs: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (path === '/api/admin/analytics') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userStats = await queryOne(
      env,
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_trial = 1 THEN 1 ELSE 0 END) as trial,
         SUM(CASE WHEN is_trial = 0 THEN 1 ELSE 0 END) as regular
       FROM users`
    );

    const storeRows = await queryAll(
      env,
      'SELECT store, COUNT(*) as count FROM watchlist WHERE store IS NOT NULL GROUP BY store'
    );
    const storeDistribution = Object.fromEntries(storeRows.map((r) => [r.store, r.count]));

    const totalProducts = (await queryOne(env, 'SELECT COUNT(*) as c FROM watchlist'))?.c || 0;
    const totalPriceEntries = (await queryOne(env, 'SELECT COUNT(*) as c FROM price_history'))?.c || 0;
    const userRegRows = await queryAll(
      env,
      `SELECT date(created_at) as date, COUNT(*) as count FROM users GROUP BY date(created_at) ORDER BY date`
    );

    return jsonResponse({
      storeDistribution,
      totalProducts,
      totalPriceEntries,
      userCount: userStats?.total || 0,
      regularUsers: userStats?.regular || 0,
      trialUsers: userStats?.trial || 0,
      userRegistrations: userRegRows,
    });
  }

  if (path === '/api/admin/trials') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    const where = ['is_trial = 1'];
    const params = [];
    if (status === 'active') {
      where.push('(trial_expires_at IS NULL OR trial_expires_at > ?)');
      params.push(Date.now());
    } else if (status === 'expired') {
      where.push('trial_expires_at IS NOT NULL AND trial_expires_at <= ?');
      params.push(Date.now());
    }
    if (search) {
      where.push('LOWER(username) LIKE ?');
      params.push(`%${search}%`);
    }
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const total = (await queryOne(env, `SELECT COUNT(*) as c FROM users ${whereClause}`, params))?.c || 0;
    const rows = await queryAll(
      env,
      `SELECT u.id, u.username, u.email, u.created_at, u.trial_expires_at,
              (SELECT COUNT(*) FROM watchlist WHERE user_id = u.id) as product_count
       FROM users u ${whereClause}
       ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    const now = Date.now();
    const trials = rows.map((r) => ({
      id: r.id,
      username: r.username,
      email: r.email,
      createdAt: r.created_at,
      trialExpiresAt: r.trial_expires_at,
      isExpired: r.trial_expires_at != null && r.trial_expires_at < now,
      productCount: r.product_count,
    }));

    return jsonResponse({
      trials,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (path === '/api/admin/trials/cleanup' && method === 'DELETE') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const result = await execute(
      env,
      'DELETE FROM users WHERE is_trial = 1 AND trial_expires_at IS NOT NULL AND trial_expires_at <= ?',
      [Date.now()]
    );
    const deletedCount = result.meta?.changes || 0;

    const adminUser = await getUserById(env, admin.userId);
    await logAudit(env, {
      action: 'admin.trials_cleanup',
      adminId: admin.userId,
      adminUsername: adminUser?.username || 'unknown',
      details: `deleted ${deletedCount} expired trial accounts`,
    });

    return jsonResponse({ deletedCount });
  }

  // ===== SEARCH =====

  if (path === '/api/search/suggest' && method === 'GET') {
    return jsonResponse({ suggestions: [] });
  }

  if (path === '/api/search' && method === 'GET') {
    const q = url.searchParams.get('q');
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return errorResponse('Query parameter q is required');
    }
    const auth = await authenticate(request, env);
    if (!auth) {
      return errorResponse('Authentication required', 401);
    }

    try {
      const cached = await getCachedResults(env, q);
      if (cached) {
        return jsonResponse({ results: cached, cached: true });
      }

      return jsonResponse({ results: [], cached: false });
    } catch (e) {
      console.error('Search error:', e);
      return errorResponse('Search failed');
    }
  }

  // ===== WATCHLIST =====

  if (path === '/api/watchlist/ids' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (!auth?.userId) return auth;

    try {
      const rows = await queryAll(
        env,
        'SELECT id, product_id FROM watchlist WHERE user_id = ?',
        [auth.userId]
      );
      return jsonResponse(rows);
    } catch (e) {
      console.error('Watchlist IDs error:', e);
      return errorResponse('Failed to fetch pinned IDs');
    }
  }

  if (path === '/api/watchlist' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (!auth?.userId) return auth;

    try {
      const rows = await queryAll(
        env,
        'SELECT * FROM watchlist WHERE user_id = ? ORDER BY updated_at DESC',
        [auth.userId]
      );
      const items = rows.map(r => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.product_name,
        store: r.store,
        store_logo: r.store_logo,
        image_url: r.image_url,
        unit: r.unit,
        category: r.category,
        prices: {
          normal: r.normal_price,
          loyalty: r.loyalty_price,
          unit_price: r.unit_price,
          currency: r.currency,
        },
        loyalty_type: r.loyalty_type,
        offer_expires_at: r.offer_expires_at,
        product_url: r.product_url,
        is_on_offer: !!r.is_on_offer,
        notes: r.notes,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
      return jsonResponse(items);
    } catch (e) {
      console.error('Watchlist GET error:', e);
      return errorResponse('Failed to fetch watchlist');
    }
  }

  if (path === '/api/watchlist' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (!auth?.userId) return auth;

    try {
      const body = await request.json();
      const result = body.result;
      if (!result || !result.id || !result.name || !result.store) {
        return errorResponse('Invalid product data');
      }

      const existing = await queryOne(
        env,
        'SELECT id FROM watchlist WHERE user_id = ? AND product_id = ?',
        [auth.userId, result.id]
      );
      if (existing) {
        return jsonResponse({ id: existing.id, already_pinned: true });
      }

      const user = await getUserById(env, auth.userId);
      if (user && user.isTrial) {
        const countRow = await queryOne(
          env,
          'SELECT COUNT(DISTINCT product_id) as cnt FROM watchlist WHERE user_id = ?',
          [auth.userId]
        );
        if (countRow && countRow.cnt >= 5) {
          return jsonResponse({ blocked: true, reason: 'watchlist_limit' }, 403);
        }
      }

      const now = Date.now();
      const id = `wl_${now}_${Math.random().toString(36).substr(2, 9)}`;

      await execute(
        env,
         `INSERT INTO watchlist (id, user_id, product_id, product_name, store, store_logo, image_url, unit, normal_price, loyalty_price, unit_price, currency, loyalty_type, offer_expires_at, product_url, is_on_offer, category, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          auth.userId,
          result.id,
          result.name,
          result.store,
          result.store_logo || '',
          result.image_url || '',
          result.unit || null,
          result.prices?.normal ?? null,
          result.prices?.loyalty ?? null,
          result.prices?.unit_price ?? null,
          result.prices?.currency || 'GBP',
          result.loyalty_type || null,
          normalizeDateString(result.offer_expires_at),
          result.product_url || '',
          result.is_on_offer ? 1 : 0,
          result.category || null,
          null,
          now,
          now,
        ]
      );

      const row = await queryOne(env, 'SELECT * FROM watchlist WHERE id = ?', [id]);
      if (row) {
        return jsonResponse({
          id: row.id,
          product_id: row.product_id,
          product_name: row.product_name,
          store: row.store,
          store_logo: row.store_logo,
          image_url: row.image_url,
          unit: row.unit,
          prices: {
            normal: row.normal_price,
            loyalty: row.loyalty_price,
            unit_price: row.unit_price,
            currency: row.currency,
          },
          loyalty_type: row.loyalty_type,
          offer_expires_at: row.offer_expires_at,
          product_url: row.product_url,
          is_on_offer: !!row.is_on_offer,
          category: row.category,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }, 201);
      }
      return jsonResponse({ id }, 201);
    } catch (e) {
      console.error('Watchlist POST error:', e);
      return errorResponse('Failed to add to watchlist');
    }
  }

  if (path.match(/^\/api\/watchlist\/.+\/refresh$/) && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (!auth?.userId) return auth;

    const itemId = path.split('/')[3];
    try {
      const item = await queryOne(
        env,
        'SELECT * FROM watchlist WHERE id = ? AND user_id = ?',
        [itemId, auth.userId]
      );
      if (!item) return errorResponse('Watchlist item not found', 404);

      return errorResponse('Search not available', 503);
      await execute(
        env,
        `INSERT INTO price_history (id, product_id, store, normal_price, loyalty_price, unit_price, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [historyId, item.product_id, item.store, item.normal_price, item.loyalty_price, item.unit_price, Date.now()]
      );

      await execute(
        env,
        `UPDATE watchlist SET
          normal_price = ?, loyalty_price = ?, unit_price = ?,
          image_url = COALESCE(NULLIF(?, ''), image_url),
          offer_expires_at = COALESCE(?, offer_expires_at),
          is_on_offer = ?, updated_at = ?
         WHERE id = ?`,
        [
          newNormal, newLoyalty, newUnit,
          matchedResult.image_url,
          normalizeDateString(matchedResult.offer_expires_at) || item.offer_expires_at,
          matchedResult.is_on_offer ? 1 : (item.is_on_offer),
          Date.now(),
          itemId,
        ]
      );

      if (priceChanged && newNormal !== null && oldPrices.normal !== null && newNormal < oldPrices.normal) {
        const alertId = `al_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await execute(
          env,
          `INSERT INTO alerts (id, user_id, watchlist_id, type, message, old_price, new_price, triggered_at, read)
           VALUES (?, ?, ?, 'price_drop', ?, ?, ?, ?, 0)`,
          [alertId, auth.userId, itemId, `Price dropped: £${oldPrices.normal.toFixed(2)} → £${newNormal.toFixed(2)}`, oldPrices.normal, newNormal, Date.now()]
        );
      }

      const updated = await queryOne(env, 'SELECT * FROM watchlist WHERE id = ?', [itemId]);
      return jsonResponse({
        item: reassembleWatchlistItem(updated),
        priceChanged,
        previousPrices: priceChanged ? oldPrices : null,
      });
    } catch (e) {
      console.error('Watchlist refresh error:', e);
      return errorResponse('Failed to refresh item');
    }
  }

  const watchlistItemMatch = path.match(/^\/api\/watchlist\/(.+)$/);
  if (watchlistItemMatch && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (!auth?.userId) return auth;

    const itemId = watchlistItemMatch[1];
    try {
      const row = await queryOne(
        env,
        'SELECT id FROM watchlist WHERE id = ? AND user_id = ?',
        [itemId, auth.userId]
      );
      if (!row) return errorResponse('Watchlist item not found', 404);

      await execute(env, 'DELETE FROM watchlist WHERE id = ?', [itemId]);
      return jsonResponse({ success: true });
    } catch (e) {
      console.error('Watchlist DELETE error:', e);
      return errorResponse('Failed to remove from watchlist');
    }
  }

  // ===== ALERTS =====

  if (path === '/api/alerts' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (!auth?.userId) return auth;

    try {
      const rows = await queryAll(
        env,
        'SELECT * FROM alerts WHERE user_id = ? ORDER BY triggered_at DESC LIMIT 50',
        [auth.userId]
      );
      const unreadCount = rows.filter(r => !r.read).length;
      return jsonResponse({
        alerts: rows.map(r => ({
          id: r.id,
          user_id: r.user_id,
          watchlist_id: r.watchlist_id,
          type: r.type,
          message: r.message,
          old_price: r.old_price,
          new_price: r.new_price,
          triggered_at: r.triggered_at,
          read: !!r.read,
        })),
        unreadCount,
      });
    } catch (e) {
      console.error('Alerts GET error:', e);
      return errorResponse('Failed to fetch alerts');
    }
  }

  if (path.match(/^\/api\/alerts\/.+\/read$/) && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (!auth?.userId) return auth;

    const alertId = path.split('/')[3];
    try {
      const row = await queryOne(
        env,
        'SELECT id FROM alerts WHERE id = ? AND user_id = ?',
        [alertId, auth.userId]
      );
      if (!row) return errorResponse('Alert not found', 404);

      await execute(env, 'UPDATE alerts SET read = 1 WHERE id = ?', [alertId]);
      return jsonResponse({ success: true });
    } catch (e) {
      console.error('Alert read error:', e);
      return errorResponse('Failed to mark alert as read');
    }
  }

  return errorResponse('Not found', 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      console.error('Unhandled error:', e);
      return errorResponse('Internal server error', 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  },
};

async function handleScheduled(env) {
  const MAX_ITEMS_PER_USER = 10;
  const MAX_ITEMS_TOTAL = 100;
  const FRESHNESS_MS = 6 * 60 * 60 * 1000;
  const DELAY_MS = 500;
  const MAX_CONSECUTIVE_FAILURES = 3;

  const users = await queryAll(env, 'SELECT DISTINCT user_id FROM watchlist');
  let totalRefreshed = 0;
  let totalAlerts = 0;

  for (const { user_id } of users) {
    if (totalRefreshed >= MAX_ITEMS_TOTAL) break;

    const items = await queryAll(
      env,
      'SELECT * FROM watchlist WHERE user_id = ? ORDER BY updated_at ASC LIMIT ?',
      [user_id, MAX_ITEMS_PER_USER]
    );

    let consecutiveFailures = 0;

    for (const item of items) {
      if (totalRefreshed >= MAX_ITEMS_TOTAL) break;

      const age = Date.now() - item.updated_at;
      if (age < FRESHNESS_MS) continue;

      // Search backend removed; no price refresh available
      continue;
    }
  }

  console.log(`Cron: refreshed ${totalRefreshed} items, created ${totalAlerts} alerts`);
}
