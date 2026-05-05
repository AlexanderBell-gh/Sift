const DEFAULT_CATEGORIES = [
  { id: 'chilled', name: 'Chilled', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Beverages', icon: '🥤' },
  { id: 'produce', name: 'Produce', icon: '🥬' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'bakery', name: 'Bakery', icon: '🥖' },
  { id: 'pantry', name: 'Pantry', icon: '🥫' },
  { id: 'condiments', name: 'Condiments', icon: '🧂' },
  { id: 'other', name: 'Other', icon: '📦' },
];

import {
  isValidUser,
  isValidMagicLink,
  hashPassword,
  verifyPassword,
  generateToken,
  createUserId,
  createJWT,
  verifyJWT,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  saveUser,
  deleteUser,
} from './auth.js';

// PriceTrackr Cloudflare Worker API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...corsHeaders,
    },
  });
}

function renderAdminDashboard(stats, users, auditLogs, health, analytics) {
  const theme = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0A; color: #fafafa; line-height: 1.5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .header h1 { font-size: 24px; font-weight: 600; background: linear-gradient(90deg, #74da86, #4ade80); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .user-info { color: #a1a1aa; font-size: 14px; }
      .tabs { display: flex; gap: 4px; background: #18181b; padding: 4px; border-radius: 12px; margin-bottom: 24px; }
      .tab { padding: 10px 20px; border: none; background: transparent; color: #a1a1aa; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
      .tab.active { background: #27272a; color: #fff; }
      .tab:hover:not(.active) { color: #fff; }
      .card { background: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
      .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #e4e4e7; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
      .stat { background: #27272a; border-radius: 10px; padding: 16px; }
      .stat-value { font-size: 28px; font-weight: 700; color: #74da86; font-variant-numeric: tabular-nums; }
      .stat-label { font-size: 13px; color: #a1a1aa; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 14px; }
      th { color: #71717a; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
      td { color: #e4e4e7; }
      .badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; margin-left: 4px; }
      .badge-admin { background: rgba(116, 218, 134, 0.2); color: #74da86; }
      .badge-user { background: rgba(161, 161, 170, 0.2); color: #a1a1aa; }
      .badge-trial { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
      .btn { padding: 8px 16px; border-radius: 8px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
      .btn-danger { background: #dc2626; color: #fff; }
      .btn-danger:hover { background: #b91c1c; }
      .btn-success { background: #74da86; color: #000; }
      .btn-success:hover { background: #4ade80; }
      .actions { display: flex; gap: 8px; }
      .flash { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
      .flash-success { background: rgba(116, 218, 134, 0.2); color: #74da86; }
      .flash-error { background: rgba(220, 38, 38, 0.2); color: #fca5a5; }
      .empty { text-align: center; padding: 40px; color: #71717a; }
      .activity-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .activity-icon { width: 32px; height: 32px; border-radius: 8px; background: #27272a; display: flex; align-items: center; justify-content: center; font-size: 14px; }
      .activity-details { flex: 1; }
      .activity-details strong { color: #e4e4e7; }
      .activity-time { color: #71717a; font-size: 12px; }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
    </style>
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - PriceTrackr</title>
  ${theme}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Admin Dashboard</h1>
      <div class="user-info">PriceTrackr Admin</div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="overview">Overview</button>
      <button class="tab" data-tab="users">Users</button>
      <button class="tab" data-tab="activity">Activity</button>
      <button class="tab" data-tab="health">Health</button>
    </div>
    <div id="flash" style="display:none"></div>
    <div id="overview" class="tab-content active">
      <div class="stats-grid">
        <div class="stat"><div class="stat-value">${stats?.totalUsers || 0}</div><div class="stat-label">Total Users</div></div>
        <div class="stat"><div class="stat-value">${stats?.regularUsers || 0}</div><div class="stat-label">Registered Users</div></div>
        <div class="stat"><div class="stat-value">${stats?.trialUsers || 0}</div><div class="stat-label">Trial Users</div></div>
        <div class="stat"><div class="stat-value">${stats?.totalProducts || 0}</div><div class="stat-label">Products</div></div>
        <div class="stat"><div class="stat-value">${stats?.totalPrices || 0}</div><div class="stat-label">Price Entries</div></div>
        <div class="stat"><div class="stat-value">${health?.storage?.estimatedMB || '0MB'}</div><div class="stat-label">Storage Used</div></div>
      </div>
    </div>
    <div id="users" class="tab-content">
      <div class="card">
        <h2>Users (${users?.length || 0})</h2>
        ${users?.length ? `<table><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead><tbody>` +
          users.map(u => `<tr><td>${u.username}</td><td>${u.email}</td><td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span>${u.isTrial ? '<span class="badge badge-trial">trial</span>' : ''}</td><td>${new Date(u.createdAt).toLocaleDateString()}</td><td><div class="actions">${u.role !== 'admin' ? `<button class="btn btn-success" onclick="promoteUser('${u.id}')">Promote</button>` : ''}${u.role === 'admin' ? `<button class="btn btn-danger" onclick="demoteUser('${u.id}')">Demote</button>` : ''}${!u.isTrial ? `<button class="btn btn-danger" onclick="deleteUser('${u.id}')">Delete</button>` : ''}</div></td></tr>`).join('') +
          '</tbody></table>' : '<div class="empty">No users found</div>'}
      </div>
    </div>
    <div id="activity" class="tab-content">
      <div class="card">
        <h2>Activity Log</h2>
        ${auditLogs?.length ? auditLogs.map(log => `<div class="activity-item"><div class="activity-icon">${log.action.includes('delete') ? '🗑️' : '⚙️'}</div><div class="activity-details"><strong>${log.adminUsername || 'Admin'}</strong> ${log.details}</div><div class="activity-time">${new Date(log.timestamp).toLocaleString()}</div></div>`).join('') : '<div class="empty">No activity yet</div>'}
      </div>
    </div>
    <div id="health" class="tab-content">
      <div class="stats-grid">
        <div class="stat"><div class="stat-value" style="color:${health?.avgLatencyMs < 200 ? '#74da86' : health?.avgLatencyMs < 500 ? '#fbbf24' : '#fca5a5'}">${health?.avgLatencyMs || 0}ms</div><div class="stat-label">Avg Latency</div></div>
        <div class="stat"><div class="stat-value">${health?.requests?.today || 0}</div><div class="stat-label">Requests Today</div></div>
        <div class="stat"><div class="stat-value">${health?.errorCount || 0}</div><div class="stat-label">Total Errors</div></div>
        <div class="stat"><div class="stat-value">${health?.uptime || 'N/A'}</div><div class="stat-label">Uptime</div></div>
      </div>
    </div>
  </div>
  <script>
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
    function showFlash(msg, type) {
      const flash = document.getElementById('flash');
      flash.textContent = msg;
      flash.className = 'flash ' + (type === 'error' ? 'flash-error' : 'flash-success');
      flash.style.display = 'block';
      setTimeout(() => flash.style.display = 'none', 3000);
    }
    async function apiCall(url, options = {}) {
      const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
      return res.json();
    }
    async function promoteUser(id) {
      const res = await apiCall('/api/admin/users/' + id + '/role', { method: 'PUT', body: JSON.stringify({ role: 'admin' }) });
      if (res.error) showFlash(res.error, 'error');
      else showFlash('User promoted to admin', 'success');
    }
    async function demoteUser(id) {
      const res = await apiCall('/api/admin/users/' + id + '/role', { method: 'PUT', body: JSON.stringify({ role: 'user' }) });
      if (res.error) showFlash(res.error, 'error');
      else showFlash('User demoted to user', 'success');
    }
    async function deleteUser(id) {
      if (!confirm('Delete this user and all their data?')) return;
      const res = await apiCall('/api/admin/users/' + id, { method: 'DELETE' });
      if (res.error) showFlash(res.error, 'error');
      else showFlash('User deleted', 'success');
    }
  </script>
</body>
</html>`;
  return html;
}

function isValidProduct(product) {
  return (
    product &&
    typeof product.id === 'string' &&
    typeof product.name === 'string' &&
    typeof product.category === 'string' &&
    Array.isArray(product.prices)
  );
}

function isValidCategory(category) {
  return (
    category &&
    typeof category.id === 'string' &&
    typeof category.name === 'string' &&
    typeof category.icon === 'string'
  );
}

async function getAllProducts(env, userId) {
  const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json');
  if (!productIds) return [];
  
  const products = await Promise.all(
    productIds.map(async (id) => {
      const product = await env.PRICETRACKR.get(`user:${userId}:product:${id}`, 'json');
      return product;
    })
  );
  
  const validProducts = products.filter(isValidProduct);
  const validIds = validProducts.map(p => p.id);
  
  if (validIds.length !== productIds.length) {
    await env.PRICETRACKR.put(`user:${userId}:products`, JSON.stringify(validIds));
  }
  
  return validProducts;
}

async function saveProducts(env, userId, products) {
  const ids = products.map(p => p.id);
  await env.PRICETRACKR.put(`user:${userId}:products`, JSON.stringify(ids));
  
  await Promise.all(
    products.map(async (product) => {
      await env.PRICETRACKR.put(`user:${userId}:product:${product.id}`, JSON.stringify(product));
    })
  );
}

async function deleteUserData(env, userId) {
  const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json');
  if (productIds && Array.isArray(productIds)) {
    await Promise.all(
      productIds.map(async (id) => {
        await env.PRICETRACKR.delete(`user:${userId}:product:${id}`);
      })
    );
  }
  await env.PRICETRACKR.delete(`user:${userId}:products`);
  await env.PRICETRACKR.delete(`user:${userId}:categories`);
}

async function scrapeImageFromUrl(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PriceTrackr/1.0)' },
    });
    const html = await response.text();
    
    let match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (match) return match[1];
    
    match = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (match) return match[1];
    
    match = html.match(/<meta[^>]*property=["']product:image["'][^>]*content=["']([^"']+)["']/i);
    if (match) return match[1];
    
    return '';
  } catch (e) {
    console.error('Image scrape error:', e);
    return '';
  }
}

const MAX_AUDIT_LOGS = 1000;

async function logAudit(env, entry) {
  const logs = await env.PRICETRACKR.get('audit_logs', 'json') || [];
  logs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...entry,
    timestamp: Date.now(),
  });
  if (logs.length > MAX_AUDIT_LOGS) {
    logs.length = MAX_AUDIT_LOGS;
  }
  await env.PRICETRACKR.put('audit_logs', JSON.stringify(logs));
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

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

// Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Admin Dashboard (served as HTML)
  if (path === '/admin') {
    const auth = await authenticate(request, env);
    if (!auth || auth.role !== 'admin') {
      const loginUrl = new URL(request.url);
      loginUrl.pathname = '/';
      loginUrl.search = '?redirect=' + encodeURIComponent(request.url);
      return new Response(null, {
        status: 302,
        headers: { 'Location': loginUrl.toString() }
      });
    }

    // Gather stats directly from KV
    const userIds = await env.USERS.get('users', 'json') || [];
    let totalProducts = 0;
    let totalPrices = 0;
    let trialUsers = 0;
    let regularUsers = 0;

    for (const userId of userIds) {
      const u = await getUserById(env, userId);
      if (u) {
        if (u.isTrial) trialUsers++;
        else regularUsers++;

        const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json') || [];
        totalProducts += productIds.length;

        for (const prodId of productIds) {
          const product = await env.PRICETRACKR.get(`user:${userId}:product:${prodId}`, 'json');
          if (product && product.prices) {
            totalPrices += product.prices.length;
          }
        }
      }
    }

    const stats = { totalUsers: userIds.length, regularUsers, trialUsers, totalProducts, totalPrices };

    // Gather users
    const users = await Promise.all(userIds.map(id => getUserById(env, id)));
    const userList = users.filter(u => u).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      isTrial: u.isTrial,
      createdAt: u.createdAt
    }));

    // Health data
    const healthData = await env.PRICETRACKR.get('admin:health', 'json') || { requests: { today: 0, yesterday: 0, total: 0 }, avgLatencyMs: 0, errorCount: 0, uptime: 'N/A', storage: { keys: 0, estimatedBytes: 0, estimatedMB: '0MB' } };

    const auditLogs = await env.PRICETRACKR.get('audit_logs', 'json') || [];

    return htmlResponse(renderAdminDashboard(stats, userList, auditLogs.map(l => ({ ...l, adminUsername: l.adminUsername || 'Admin' })), healthData, null));
  }

  // Auth Routes
  if (path === '/api/auth/register') {
    if (method === 'POST') {
      try {
        const body = await request.json();
        const { email, username, password } = body;

        if (!email || !username || !password) {
          return errorResponse('Email, username, and password are required');
        }

        if (password.length < 6) {
          return errorResponse('Password must be at least 6 characters');
        }

        const existingEmail = await getUserByEmail(env, email);
        if (existingEmail) {
          return errorResponse('Email already in use');
        }

        const existingUsername = await getUserByUsername(env, username);
        if (existingUsername) {
          return errorResponse('Username already in use');
        }

        const passwordHash = await hashPassword(password);
        const user = {
          id: createUserId(),
          email,
          username,
          passwordHash,
          role: 'user',
          preferences: {
            currency: body.currency || 'USD',
            defaultStore: body.defaultStore || null,
          },
          createdAt: new Date().toISOString(),
        };

        await saveUser(env, user);
        const token = await createJWT(user, env);

        return jsonResponse({ user: { id: user.id, email: user.email, username: user.username, role: user.role, preferences: user.preferences, trialExpiresAt: null }, token }, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  if (path === '/api/auth/register-admin') {
    if (method === 'POST') {
      try {
        const body = await request.json();
        const { email, username, password, adminSecret } = body;

        if (!adminSecret || adminSecret !== env.ADMIN_SECRET) {
          return errorResponse('Invalid admin secret', 403);
        }

        if (!email || !username || !password) {
          return errorResponse('Email, username, and password are required');
        }

        if (password.length < 6) {
          return errorResponse('Password must be at least 6 characters');
        }

        const existingEmail = await getUserByEmail(env, email);
        if (existingEmail) {
          return errorResponse('Email already in use');
        }

        const existingUsername = await getUserByUsername(env, username);
        if (existingUsername) {
          return errorResponse('Username already in use');
        }

        const passwordHash = await hashPassword(password);
        const user = {
          id: createUserId(),
          email,
          username,
          passwordHash,
          role: 'admin',
          preferences: {
            currency: body.currency || 'USD',
            defaultStore: body.defaultStore || null,
          },
          createdAt: new Date().toISOString(),
        };

        await saveUser(env, user);
        const token = await createJWT(user, env);

        return jsonResponse({ user: { id: user.id, email: user.email, username: user.username, role: user.role, preferences: user.preferences }, token }, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  if (path === '/api/auth/login') {
    if (method === 'POST') {
      try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
          return errorResponse('Username and password are required');
        }

        const user = await getUserByUsername(env, username);
        if (!user) {
          return errorResponse('Invalid credentials');
        }

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) {
          return errorResponse('Invalid credentials');
        }

        const token = await createJWT(user, env);

        return jsonResponse({ user: { id: user.id, email: user.email, username: user.username, role: user.role, preferences: user.preferences, trialExpiresAt: null }, token });
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  if (path === '/api/auth/trial') {
    if (method === 'POST') {
      try {
        const body = await request.json();
        const { username } = body;

        const trialUsername = username || `trial_${Date.now()}`;
        const trialEmail = `${trialUsername}@trial.pricetrackr`;
        const trialPassword = generateToken();

        const trialPasswordHash = await hashPassword(trialPassword);
        const TRIAL_HOURS = 12;
        const trialExpiresAt = Date.now() + TRIAL_HOURS * 60 * 60 * 1000;

        const user = {
          id: createUserId(),
          email: trialEmail,
          username: trialUsername,
          passwordHash: trialPasswordHash,
          role: 'user',
          isTrial: true,
          trialExpiresAt,
          preferences: {
            currency: 'USD',
            defaultStore: null,
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
            isTrial: true,
            trialExpiresAt,
            preferences: user.preferences
          },
          token,
          trialHoursRemaining: TRIAL_HOURS
        }, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  if (path === '/api/auth/me') {
    if (method === 'GET') {
      const auth = await requireAuth(request, env);
      if (auth && auth.error) return auth;

      const user = await getUserById(env, auth.userId);
      if (!user) {
        return errorResponse('User not found', 404);
      }

        return jsonResponse({ id: user.id, email: user.email, username: user.username, role: user.role, isTrial: user.isTrial || false, trialExpiresAt: user.trialExpiresAt || null, preferences: user.preferences, createdAt: user.createdAt });
    }

    if (method === 'PUT') {
      const auth = await requireAuth(request, env);
      if (auth && auth.error) return auth;

      try {
        const body = await request.json();
        const user = await getUserById(env, auth.userId);

        if (!user) {
          return errorResponse('User not found', 404);
        }

        if (body.preferences) {
          user.preferences = { ...user.preferences, ...body.preferences };
        }

        if (body.currentPassword && body.newPassword) {
          const passwordValid = await verifyPassword(body.currentPassword, user.passwordHash);
          if (!passwordValid) {
            return errorResponse('Current password is incorrect');
          }
          if (body.newPassword.length < 6) {
            return errorResponse('New password must be at least 6 characters');
          }
          user.passwordHash = await hashPassword(body.newPassword);
        }

        if (body.newEmail && body.password) {
          const passwordValid = await verifyPassword(body.password, user.passwordHash);
          if (!passwordValid) {
            return errorResponse('Password is incorrect');
          }
          const existingUser = await getUserByEmail(env, body.newEmail);
          if (existingUser && existingUser.id !== user.id) {
            return errorResponse('Email already in use');
          }
          await env.USERS.delete(`email:${user.email.toLowerCase()}`);
          user.email = body.newEmail;
          await env.USERS.put(`email:${user.email.toLowerCase()}`, user.id);
        }

        await saveUser(env, user);

      return jsonResponse({ id: user.id, email: user.email, username: user.username, role: user.role, isTrial: user.isTrial || false, trialExpiresAt: user.trialExpiresAt || null, preferences: user.preferences, createdAt: user.createdAt });
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }

    if (method === 'DELETE') {
      const auth = await requireAuth(request, env);
      if (auth && auth.error) return auth;

      try {
        const user = await getUserById(env, auth.userId);
        if (!user) {
          return errorResponse('User not found', 404);
        }

        if (!user.isTrial) {
          const body = await request.json();
          if (!body.password) {
            return errorResponse('Password is required to delete account');
          }
          const passwordValid = await verifyPassword(body.password, user.passwordHash);
          if (!passwordValid) {
            return errorResponse('Password is incorrect');
          }
        }

        await deleteUserData(env, auth.userId);
        await deleteUser(env, auth.userId);

        return jsonResponse({ success: true });
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  // Products
  if (path === '/api/products') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;

    if (method === 'GET') {
      const products = await getAllProducts(env, userId);
      return jsonResponse(products);
    }
    
    if (method === 'POST') {
      try {
        const body = await request.json();
        const products = await getAllProducts(env, userId);
        
        const newProduct = {
          id: body.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: body.name,
          url: body.url,
          imageUrl: body.imageUrl,
          category: body.category || 'other',
          store: body.store,
          notes: body.notes,
          prices: body.prices || [{ price: body.price, store: body.store, date: new Date().toISOString().split('T')[0] }],
          createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        await saveProducts(env, userId, products);
        
        return jsonResponse(newProduct, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }
  
  // Product by ID
  const productMatch = path.match(/^\/api\/products\/(.+)$/);
  if (productMatch) {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const id = productMatch[1];
    const products = await getAllProducts(env, userId);
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return errorResponse('Product not found', 404);
    }
    
    if (method === 'GET') {
      return jsonResponse(product);
    }
    
    if (method === 'PUT') {
      try {
        const body = await request.json();
        
        const updatedProducts = products.map(p => {
          if (p.id !== id) return p;
          
          const updated = { ...p };
          
          if (body.price !== undefined) {
            const existingPrices = p.prices || [];
            const latestPrice = existingPrices.length > 0 
              ? existingPrices[existingPrices.length - 1].price 
              : null;
            
            if (latestPrice === null || Math.abs(body.price - latestPrice) > 0.001) {
              const newPriceEntry = {
                price: body.price,
                store: body.store || p.store,
                date: new Date().toISOString().split('T')[0]
              };
              updated.prices = [...existingPrices, newPriceEntry];
            }
          }
          
          if (body.store !== undefined) {
            updated.store = body.store;
          }
          
          if (body.name !== undefined) updated.name = body.name;
          if (body.url !== undefined) updated.url = body.url;
          if (body.imageUrl !== undefined) updated.imageUrl = body.imageUrl;
          if (body.category !== undefined) updated.category = body.category;
          if (body.notes !== undefined) updated.notes = body.notes;
          
          return updated;
        });
        
        await saveProducts(env, userId, updatedProducts);
        return jsonResponse(updatedProducts.find(p => p.id === id));
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
    
    if (method === 'DELETE') {
      await env.PRICETRACKR.delete(`user:${userId}:product:${id}`);
      const filtered = products.filter(p => p.id !== id);
      if (filtered.length === 0) {
        await env.PRICETRACKR.delete(`user:${userId}:products`);
      } else {
        await saveProducts(env, userId, filtered);
      }
      return jsonResponse({ success: true });
    }
  }
  
  // Add price to product
  const priceMatch = path.match(/^\/api\/products\/(.+)\/prices$/);
  if (priceMatch && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const id = priceMatch[1];
    const products = await getAllProducts(env, userId);
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return errorResponse('Product not found', 404);
    }
    
    try {
      const body = await request.json();
      product.prices = product.prices || [];
      product.prices.push({
        price: body.price,
        store: body.store,
        date: body.date || new Date().toISOString().split('T')[0]
      });
      
      await saveProducts(env, userId, products);
      return jsonResponse(product);
    } catch (e) {
      return errorResponse('Invalid request body');
    }
  }
  
  // Categories
  if (path === '/api/categories') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;

    if (method === 'GET') {
      const rawCategories = await env.PRICETRACKR.get(`user:${userId}:categories`, 'json');
      const categories = Array.isArray(rawCategories) ? rawCategories.filter(isValidCategory) : [];
      return jsonResponse(categories.length > 0 ? categories : DEFAULT_CATEGORIES);
    }
    
    if (method === 'POST') {
      try {
        const body = await request.json();
        const rawCategories = await env.PRICETRACKR.get(`user:${userId}:categories`, 'json');
        const categories = Array.isArray(rawCategories) ? rawCategories.filter(isValidCategory) : [...DEFAULT_CATEGORIES];
        const newCategory = {
          id: body.id || `cat_${Date.now()}`,
          name: body.name,
          icon: body.icon || '📦'
        };
        if (!isValidCategory(newCategory)) {
          return errorResponse('Invalid category data');
        }
        categories.push(newCategory);
        await env.PRICETRACKR.put(`user:${userId}:categories`, JSON.stringify(categories));
        return jsonResponse(newCategory, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  // Delete category
  const categoryMatch = path.match(/^\/api\/categories\/(.+)$/);
  if (categoryMatch && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const id = categoryMatch[1];
    const rawCategories = await env.PRICETRACKR.get(`user:${userId}:categories`, 'json');
    const categories = Array.isArray(rawCategories) ? rawCategories.filter(isValidCategory) : [...DEFAULT_CATEGORIES];
    const filtered = categories.filter(c => c.id !== id);
    await env.PRICETRACKR.put(`user:${userId}:categories`, JSON.stringify(filtered));
    return jsonResponse({ success: true });
  }

  // Admin Routes - require admin role in JWT
  async function requireAdmin(request, env) {
    const auth = await authenticate(request, env);
    if (!auth) {
      return errorResponse('Authentication required', 401);
    }
    if (auth.role !== 'admin') {
      return errorResponse('Admin access denied', 403);
    }
    return auth;
  }

  // Admin stats
  if (path === '/api/admin/stats') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userIds = await env.USERS.get('users', 'json') || [];
    let totalProducts = 0;
    let totalPrices = 0;
    let trialUsers = 0;
    let regularUsers = 0;

    for (const userId of userIds) {
      const user = await getUserById(env, userId);
      if (user) {
        if (user.isTrial) trialUsers++;
        else regularUsers++;

        const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json') || [];
        totalProducts += productIds.length;

        for (const prodId of productIds) {
          const product = await env.PRICETRACKR.get(`user:${userId}:product:${prodId}`, 'json');
          if (product && product.prices) {
            totalPrices += product.prices.length;
          }
        }
      }
    }

    return jsonResponse({
      totalUsers: userIds.length,
      regularUsers,
      trialUsers,
      totalProducts,
      totalPrices,
    });
  }

  // Admin users list
  if (path === '/api/admin/users') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userIds = await env.USERS.get('users', 'json') || [];
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const filter = url.searchParams.get('filter') || 'users';

    const usersWithStats = await Promise.all(
      userIds.map(async (userId) => {
        const user = await getUserById(env, userId);
        if (!user) return null;

        const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json') || [];
        const productCount = productIds.length;

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isTrial: user.isTrial || false,
          trialExpiresAt: user.trialExpiresAt || null,
          createdAt: user.createdAt,
          productCount,
        };
      })
    );

    let filteredUsers = usersWithStats.filter(u => u !== null);

    if (filter === 'users') {
      filteredUsers = filteredUsers.filter(u => !u.isTrial);
    } else if (filter === 'trials') {
      filteredUsers = filteredUsers.filter(u => u.isTrial);
    }

    if (search) {
      filteredUsers = filteredUsers.filter(u => 
        u.username.toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search)
      );
    }

    const total = filteredUsers.length;
    const start = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(start, start + limit);

    return jsonResponse({
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  // Admin user detail
  const adminUserMatch = path.match(/^\/api\/admin\/users\/(.+)$/);
  if (adminUserMatch && method === 'GET') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userId = adminUserMatch[1];
    const user = await getUserById(env, userId);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json') || [];
    let totalPrices = 0;
    const products = [];

    for (const prodId of productIds) {
      const product = await env.PRICETRACKR.get(`user:${userId}:product:${prodId}`, 'json');
      if (product) {
        totalPrices += (product.prices?.length || 0);
        products.push({
          id: product.id,
          name: product.name,
          category: product.category,
          store: product.store,
          priceCount: product.prices?.length || 0,
        });
      }
    }

    return jsonResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isTrial: user.isTrial || false,
      trialExpiresAt: user.trialExpiresAt || null,
      preferences: user.preferences,
      createdAt: user.createdAt,
      productCount: productIds.length,
      totalPrices,
      products,
    });
  }

  // Admin delete user
  if (adminUserMatch && method === 'DELETE') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userId = adminUserMatch[1];
    const user = await getUserById(env, userId);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    await deleteUserData(env, userId);
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

  // Admin update user role
  const roleMatch = path.match(/^\/api\/admin\/users\/(.+)\/role$/);
  if (roleMatch && method === 'PUT') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const targetUserId = roleMatch[1];
    const targetUser = await getUserById(env, targetUserId);
    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    try {
      const body = await request.json();
      const newRole = body.role;

      if (!newRole || (newRole !== 'admin' && newRole !== 'user')) {
        return errorResponse('Invalid role. Must be "admin" or "user"');
      }

      if (newRole === 'user' && targetUser.role === 'admin') {
        const userIds = await env.USERS.get('users', 'json') || [];
        let adminCount = 0;
        for (const uid of userIds) {
          const u = await getUserById(env, uid);
          if (u && u.role === 'admin' && u.id !== targetUserId) {
            adminCount++;
          }
        }
        if (adminCount === 0) {
          return errorResponse('Cannot demote the last admin');
        }
      }

      const oldRole = targetUser.role;
      targetUser.role = newRole;
      await saveUser(env, targetUser);

      const adminUser = await getUserById(env, admin.userId);
      await logAudit(env, {
        action: 'admin.role_change',
        adminId: admin.userId,
        adminUsername: adminUser?.username || 'unknown',
        targetUserId: targetUserId,
        targetUsername: targetUser.username,
        details: `changed ${targetUser.username} from ${oldRole} to ${newRole}`,
      });

      return jsonResponse({ success: true, role: newRole });
    } catch (e) {
      return errorResponse('Invalid request body');
    }
  }

  // Admin audit logs
  if (path === '/api/admin/audit') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const logs = await env.PRICETRACKR.get('audit_logs', 'json') || [];
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const actionFilter = url.searchParams.get('action') || '';
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let filtered = logs;

    if (actionFilter) {
      filtered = filtered.filter(l => l.action === actionFilter);
    }

    if (search) {
      filtered = filtered.filter(l => 
        l.adminUsername.toLowerCase().includes(search) ||
        l.targetUsername?.toLowerCase().includes(search)
      );
    }

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter(l => l.timestamp >= startMs);
    }

    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86400000;
      filtered = filtered.filter(l => l.timestamp <= endMs);
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paginatedLogs = filtered.slice(start, start + limit);

    return jsonResponse({
      logs: paginatedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  // Admin analytics
  if (path === '/api/admin/analytics') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userIds = await env.USERS.get('users', 'json') || [];
    const categoryCount = {};
    const storeCount = {};
    let totalProductCount = 0;
    let totalPriceEntries = 0;
    let regularUsers = 0;
    let trialUsers = 0;
    const userRegistrations = {};
    const productCreations = {};

    for (const userId of userIds) {
      const user = await getUserById(env, userId);
      if (user) {
        if (user.isTrial) trialUsers++;
        else regularUsers++;

        if (user.createdAt) {
          const date = user.createdAt.split('T')[0];
          userRegistrations[date] = (userRegistrations[date] || 0) + 1;
        }
      }

      const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json') || [];
      totalProductCount += productIds.length;

      for (const prodId of productIds) {
        const product = await env.PRICETRACKR.get(`user:${userId}:product:${prodId}`, 'json');
        if (product) {
          const cat = product.category || 'other';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
          
          if (product.store) {
            storeCount[product.store] = (storeCount[product.store] || 0) + 1;
          }
          
          totalPriceEntries += product.prices?.length || 0;

          if (product.createdAt) {
            const date = product.createdAt.split('T')[0];
            productCreations[date] = (productCreations[date] || 0) + 1;
          }
        }
      }
    }

    const formatTimeSeries = (obj) => {
      return Object.entries(obj)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    };

    return jsonResponse({
      categoryDistribution: categoryCount,
      storeDistribution: storeCount,
      totalProducts: totalProductCount,
      totalPriceEntries,
      userCount: userIds.length,
      regularUsers,
      trialUsers,
      userRegistrations: formatTimeSeries(userRegistrations),
      productCreations: formatTimeSeries(productCreations),
    });
  }

  // Admin health
  if (path === '/api/admin/health') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const todayKey = `admin:requests:${today}`;
    const yesterdayKey = `admin:requests:${yesterday}`;
    const errorKey = 'admin:errors';
    const versionKey = 'admin:version';

    const [todayReqs, yesterdayReqs, errorCount, version] = await Promise.all([
      env.PRICETRACKR.get(todayKey, 'json'),
      env.PRICETRACKR.get(yesterdayKey, 'json'),
      env.PRICETRACKR.get(errorKey, 'json'),
      env.PRICETRACKR.get(versionKey),
    ]);

    const safeToday = todayReqs || { count: 0, totalLatency: 0 };
    const safeYesterday = yesterdayReqs || { count: 0, totalLatency: 0 };
    const safeError = errorCount || { count: 0, lastError: null };

    let totalRequests = 0;
    try {
      const allKeys = await env.PRICETRACKR.list({ prefix: 'admin:requests:' }) || { keys: [] };
      for (const key of allKeys.keys || []) {
        const data = await env.PRICETRACKR.get(key.name, 'json');
        if (data && data.count) totalRequests += data.count;
      }
    } catch (e) {
      console.error('Failed to get request stats:', e);
    }

    const avgLatency = safeToday.count > 0 ? Math.round((safeToday.totalLatency || 0) / safeToday.count) : 0;

    const userIds = await env.USERS.get('users', 'json') || [];
    const userCount = (userIds || []).length;
    let productCount = 0;
    let keyCount = 0;
    let estimatedBytes = 0;
    try {
      for (const userId of (userIds || [])) {
        const productIds = (await env.PRICETRACKR.get(`user:${userId}:products`, 'json')) || [];
        keyCount += 1 + (productIds || []).length;
        productCount += (productIds || []).length;
        for (const pid of (productIds || [])) {
          const p = await env.PRICETRACKR.get(`user:${userId}:product:${pid}`, 'json');
          if (p) estimatedBytes += JSON.stringify(p).length;
        }
      }
      estimatedBytes += JSON.stringify(userIds || []).length;
    } catch (e) {
      console.error('Failed to calculate storage:', e);
    }

    const status = safeError.count > 10 ? 'degraded' : 'healthy';
    const uptimePercent = totalRequests > 0 ? (((totalRequests - safeError.count) / totalRequests) * 100).toFixed(1) : '100.0';

    return jsonResponse({
      status,
      requests: {
        today: safeToday.count,
        yesterday: safeYesterday.count,
        total: totalRequests,
      },
      avgLatencyMs: avgLatency,
      errorCount: safeError.count,
      uptime: uptimePercent,
      storage: {
        keys: keyCount,
        estimatedBytes,
        estimatedMB: (estimatedBytes / (1024 * 1024)).toFixed(2),
      },
      version: version || '1.0.0',
      userCount,
      productCount,
      workerRegion: 'EU', // Cloudflare doesn't expose this in runtime
    });
  }

  // Admin trials list
  if (path === '/api/admin/trials') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userIds = await env.USERS.get('users', 'json') || [];
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    const trialsWithStats = await Promise.all(
      userIds.map(async (userId) => {
        const user = await getUserById(env, userId);
        if (!user || !user.isTrial) return null;

        const productIds = await env.PRICETRACKR.get(`user:${userId}:products`, 'json') || [];
        const productCount = productIds.length;
        const isExpired = user.trialExpiresAt && user.trialExpiresAt < Date.now();

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          trialExpiresAt: user.trialExpiresAt,
          isExpired,
          productCount,
        };
      })
    );

    let filteredTrials = trialsWithStats.filter(t => t !== null);

    if (status === 'active') {
      filteredTrials = filteredTrials.filter(t => !t.isExpired);
    } else if (status === 'expired') {
      filteredTrials = filteredTrials.filter(t => t.isExpired);
    }

    if (search) {
      filteredTrials = filteredTrials.filter(t =>
        t.username.toLowerCase().includes(search)
      );
    }

    const total = filteredTrials.length;
    const start = (page - 1) * limit;
    const paginatedTrials = filteredTrials.slice(start, start + limit);

    return jsonResponse({
      trials: paginatedTrials,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  // Admin trials cleanup
  if (path === '/api/admin/trials/cleanup' && method === 'DELETE') {
    const admin = await requireAdmin(request, env);
    if (admin && admin.error) return admin;

    const userIds = await env.USERS.get('users', 'json') || [];
    let deletedCount = 0;

    for (const userId of userIds) {
      const user = await getUserById(env, userId);
      if (user && user.isTrial && user.trialExpiresAt && user.trialExpiresAt < Date.now()) {
        await deleteUserData(env, userId);
        await deleteUser(env, userId);
        deletedCount++;
      }
    }

    const adminUser = await getUserById(env, admin.userId);
    await logAudit(env, {
      action: 'admin.trials_cleanup',
      adminId: admin.userId,
      adminUsername: adminUser?.username || 'unknown',
      details: `deleted ${deletedCount} expired trial accounts`,
    });

    return jsonResponse({ deletedCount });
  }

  // Product search via Serper API (web search)
  if (path === '/api/search/products' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;

    try {
      const body = await request.json();
      const { q } = body;

      if (!q || typeof q !== 'string') {
        return errorResponse('Query is required');
      }

      if (!env.SERPER_API_KEY) {
        return errorResponse('Search service not configured', 503);
      }

      const [searchRes, imagesRes] = await Promise.all([
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: q + ' UK supermarket price',
            num: 10,
          }),
        }),
        fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: q,
            num: 10,
          }),
        }),
      ]);

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error('Serper search error:', searchRes.status, errText);
        return errorResponse('Search failed', searchRes.status);
      }

      const searchData = await searchRes.json();
      const results = (searchData.organic || []).map((item) => ({
        title: item.title || '',
        url: item.link || item.url || '',
        snippet: item.snippet || '',
      }));

      let imageUrl = '';
      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        const images = imagesData.images || [];
        if (images.length > 0) {
          imageUrl = images[0].imageUrl || images[0].link || '';
        }
      }

      return jsonResponse({ results, imageUrl });
    } catch (e) {
      console.error('Search error:', e);
      return errorResponse('Search failed');
    }
  }

  // Scrape product image from URL
  if (path === '/api/scrape-product' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;

    try {
      const body = await request.json();
      const { url } = body;

      if (!url || typeof url !== 'string') {
        return errorResponse('URL is required');
      }

      const imageUrl = await scrapeImageFromUrl(url);
      return jsonResponse({ imageUrl });
    } catch (e) {
      console.error('Product scrape error:', e);
      return errorResponse('Failed to scrape product');
    }
  }

  // Image search via Serper API
  if (path === '/api/images' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;

    try {
      const body = await request.json();
      const { q } = body;

      if (!q || typeof q !== 'string') {
        return errorResponse('Query is required');
      }

      if (!env.SERPER_API_KEY) {
        return errorResponse('Image search service not configured', 503);
      }

      const response = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: q,
          num: 20,
        }),
      });

      if (!response.ok) {
        return errorResponse('Failed to fetch images', response.status);
      }

      const data = await response.json();
      const images = (data.images || []).map((img) => ({
        title: img.title || '',
        imageUrl: img.imageUrl || img.link || '',
        source: img.source || '',
        sourceUrl: img.sourceUrl || img.link || '',
      }));

      return jsonResponse({ images });
    } catch (e) {
      return errorResponse('Failed to search images');
    }
  }

return errorResponse('Not found', 404);
}

function renderAdminDashboard(stats, users, auditLogs, health, analytics) {
  const theme = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0A0A0A; color: #fafafa; line-height: 1.5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
      .header h1 { font-size: 24px; font-weight: 600; background: linear-gradient(90deg, #74da86, #4ade80); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .user-info { color: #a1a1aa; font-size: 14px; }
      .tabs { display: flex; gap: 4px; background: #18181b; padding: 4px; border-radius: 12px; margin-bottom: 24px; }
      .tab { padding: 10px 20px; border: none; background: transparent; color: #a1a1aa; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
      .tab.active { background: #27272a; color: #fff; }
      .tab:hover:not(.active) { color: #fff; }
      .card { background: #18181b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
      .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #e4e4e7; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
      .stat { background: #27272a; border-radius: 10px; padding: 16px; }
      .stat-value { font-size: 28px; font-weight: 700; color: #74da86; font-variant-numeric: tabular-nums; }
      .stat-label { font-size: 13px; color: #a1a1aa; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 14px; }
      th { color: #71717a; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
      td { color: #e4e4e7; }
      .badge { display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; }
      .badge-admin { background: rgba(116, 218, 134, 0.2); color: #74da86; }
      .badge-user { background: rgba(161, 161, 170, 0.2); color: #a1a1aa; }
      .badge-trial { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
      .btn { padding: 8px 16px; border-radius: 8px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
      .btn-danger { background: #dc2626; color: #fff; }
      .btn-danger:hover { background: #b91c1c; }
      .btn-success { background: #74da86; color: #000; }
      .btn-success:hover { background: #4ade80; }
      .actions { display: flex; gap: 8px; }
      .flash { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; }
      .flash-success { background: rgba(116, 218, 134, 0.2); color: #74da86; }
      .flash-error { background: rgba(220, 38, 38, 0.2); color: #fca5a5; }
      .empty { text-align: center; padding: 40px; color: #71717a; }
      .activity-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .activity-icon { width: 32px; height: 32px; border-radius: 8px; background: #27272a; display: flex; align-items: center; justify-content: center; font-size: 14px; }
      .activity-details { flex: 1; }
      .activity-details strong { color: #e4e4e7; }
      .activity-time { color: #71717a; font-size: 12px; }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
    </style>
  `;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard - PriceTrackr</title>
  ${theme}
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Admin Dashboard</h1>
      <div class="user-info">PriceTrackr Admin</div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="overview">Overview</button>
      <button class="tab" data-tab="users">Users</button>
      <button class="tab" data-tab="activity">Activity</button>
      <button class="tab" data-tab="health">Health</button>
    </div>

    <div id="flash" style="display:none"></div>

    <div id="overview" class="tab-content active">
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${stats?.totalUsers || 0}</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats?.regularUsers || 0}</div>
          <div class="stat-label">Registered Users</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats?.trialUsers || 0}</div>
          <div class="stat-label">Trial Users</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats?.totalProducts || 0}</div>
          <div class="stat-label">Products</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats?.totalPrices || 0}</div>
          <div class="stat-label">Price Entries</div>
        </div>
        <div class="stat">
          <div class="stat-value">${health?.storage?.estimatedMB || '0MB'}</div>
          <div class="stat-label">Storage Used</div>
        </div>
      </div>
    </div>

    <div id="users" class="tab-content">
      <div class="card">
        <h2>Users (${users?.length || 0})</h2>
        ${users?.length ? `
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span>${u.isTrial ? '<span class="badge badge-trial">trial</span>' : ''}</td>
                <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <div class="actions">
                    ${u.role !== 'admin' ? `<button class="btn btn-success" onclick="promoteUser('${u.id}')">Promote</button>` : ''}
                    ${u.role === 'admin' ? `<button class="btn btn-danger" onclick="demoteUser('${u.id}')">Demote</button>` : ''}
                    ${!u.isTrial ? `<button class="btn btn-danger" onclick="deleteUser('${u.id}')">Delete</button>` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<div class="empty">No users found</div>'}
      </div>
    </div>

    <div id="activity" class="tab-content">
      <div class="card">
        <h2>Activity Log</h2>
        ${auditLogs?.length ? auditLogs.map(log => `
          <div class="activity-item">
            <div class="activity-icon">${log.action.includes('delete') ? '����' : '⚙️'}</div>
            <div class="activity-details">
              <strong>${log.adminUsername}</strong> ${log.details}
            </div>
            <div class="activity-time">${new Date(log.timestamp).toLocaleString()}</div>
          </div>
        `).join('') : '<div class="empty">No activity yet</div>'}
      </div>
    </div>

    <div id="health" class="tab-content">
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value" style="${health?.avgLatencyMs < 200 ? 'color:#74da86' : health?.avgLatencyMs < 500 ? 'color:#fbbf24' : 'color:#fca5a5'}">${health?.avgLatencyMs || 0}ms</div>
          <div class="stat-label">Avg Latency</div>
        </div>
        <div class="stat">
          <div class="stat-value">${health?.requests?.today || 0}</div>
          <div class="stat-label">Requests Today</div>
        </div>
        <div class="stat">
          <div class="stat-value">${health?.errorCount || 0}</div>
          <div class="stat-label">Total Errors</div>
        </div>
        <div class="stat">
          <div class="stat-value">${health?.uptime || 'N/A'}</div>
          <div class="stat-label">Uptime</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });

    function showFlash(msg, type) {
      const flash = document.getElementById('flash');
      flash.textContent = msg;
      flash.className = 'flash ' + (type === 'error' ? 'flash-error' : 'flash-success');
      flash.style.display = 'block';
      setTimeout(() => flash.style.display = 'none', 3000);
    }

    async function apiCall(url, options = {}) {
      const res = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
      });
      return res.json();
    }

    async function promoteUser(id) {
      const res = await apiCall('/api/admin/users/' + id + '/role', {
        method: 'PUT',
        body: JSON.stringify({ role: 'admin' })
      });
      if (res.error) showFlash(res.error, 'error');
      else showFlash('User promoted to admin', 'success');
    }

    async function demoteUser(id) {
      const res = await apiCall('/api/admin/users/' + id + '/role', {
        method: 'PUT',
        body: JSON.stringify({ role: 'user' })
      });
      if (res.error) showFlash(res.error, 'error');
      else showFlash('User demoted to user', 'success');
    }

    async function deleteUser(id) {
      if (!confirm('Delete this user and all their data?')) return;
      const res = await apiCall('/api/admin/users/' + id, { method: 'DELETE' });
      if (res.error) showFlash(res.error, 'error');
      else showFlash('User deleted', 'success');
    }
  </script>
</body>
</html>
  `;
  return html;
}

export default {
  async fetch(request, env) {
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const todayKey = `admin:requests:${today}`;

    try {
      const response = await handleRequest(request, env);
      const latency = Date.now() - startTime;
      const data = await env.PRICETRACKR.get(todayKey, 'json') || { count: 0, totalLatency: 0 };
      data.count += 1;
      data.totalLatency += latency;
      await env.PRICETRACKR.put(todayKey, JSON.stringify(data));
      return response;
    } catch (e) {
      const errorKey = 'admin:errors';
      const errorData = await env.PRICETRACKR.get(errorKey, 'json') || { count: 0, lastError: null };
      errorData.count += 1;
      errorData.lastError = new Date().toISOString();
      await env.PRICETRACKR.put(errorKey, JSON.stringify(errorData));
      return errorResponse('Internal server error', 500);
    }
  },
};
