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
  saveUser,
  deleteUser,
} from './auth.js';
import { queryAll, queryOne, execute, batch } from './db.js';

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

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.url || undefined,
    imageUrl: row.image_url || undefined,
    category: row.category,
    store: row.store || undefined,
    notes: row.notes || undefined,
    prices: [],
    createdAt: row.created_at,
  };
}

function rowToPrice(row) {
  return {
    price: row.price,
    store: row.store || undefined,
    date: row.date,
  };
}

async function listProducts(env, userId) {
  const productRows = await queryAll(
    env,
    'SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  if (productRows.length === 0) return [];

  const productIds = productRows.map((p) => p.id);
  const placeholders = productIds.map(() => '?').join(',');
  const priceRows = await queryAll(
    env,
    `SELECT * FROM prices WHERE product_id IN (${placeholders}) ORDER BY date ASC, created_at ASC`,
    productIds
  );

  const byProduct = {};
  for (const p of priceRows) {
    if (!byProduct[p.product_id]) byProduct[p.product_id] = [];
    byProduct[p.product_id].push(rowToPrice(p));
  }

  return productRows
    .map((row) => {
      const product = rowToProduct(row);
      product.prices = byProduct[row.id] || [];
      return product;
    })
    .filter(isValidProduct);
}

async function getProduct(env, userId, productId) {
  const row = await queryOne(env, 'SELECT * FROM products WHERE id = ? AND user_id = ?', [productId, userId]);
  if (!row) return null;
  const product = rowToProduct(row);
  const priceRows = await queryAll(
    env,
    'SELECT * FROM prices WHERE product_id = ? ORDER BY date ASC, created_at ASC',
    [productId]
  );
  product.prices = priceRows.map(rowToPrice);
  return isValidProduct(product) ? product : null;
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

async function enrichWithGemma(results, apiKey) {
  const data = results.slice(0, 5).map(r => ({ title: r.title, snippet: r.snippet?.slice(0, 200), url: r.url }));
  const prompt = JSON.stringify(data);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'Extract product data from search results. Respond with [JSON_START] then a JSON array of extracted items, then [JSON_END]. Fields: {"cleanName":"product name or null","extractedPrice":1.99 or null,"brand":"brand name or null","size":"500g or null","suggestedCategory":"chilled or null","store":"Tesco or null"}. Categories: chilled, snacks, beverages, produce, frozen, bakery, pantry, condiments, other.' }]
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemma API error:', res.status, errText);
      return null;
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const match = text.match(/\[JSON_START\](.*?)\[JSON_END\]/s);
    if (!match) return null;

    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (parsed[0]?.cleanName === undefined && parsed[0]?.extractedPrice === undefined) return null;

    return parsed;
  } catch (e) {
    console.error('Gemma enrichment failed:', e?.message || e);
    return null;
  }
}

async function handleRequest(request, env) {
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
      if (password.length < 6) {
        return errorResponse('Password must be at least 6 characters');
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
          trialExpiresAt: null,
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
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return errorResponse('Invalid credentials');
      }

      const token = await createJWT(user, env);

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          preferences: user.preferences,
          trialExpiresAt: null,
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
      const body = await request.json();
      const { username } = body;

      const trialUsername = username || `trial_${Date.now()}`;
      const trialEmail = `${trialUsername}@trial.pricetrackr`;

      if (await getUserByUsername(env, trialUsername)) {
        return errorResponse('Username already in use');
      }

      const TRIAL_HOURS = 12;
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
          if (body.newPassword.length < 6) {
            return errorResponse('New password must be at least 6 characters');
          }
          user.passwordHash = await hashPassword(body.newPassword);
        }

        if (body.newEmail && body.password) {
          if (!(await verifyPassword(body.password, user.passwordHash))) {
            return errorResponse('Password is incorrect');
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

  // ===== PRODUCTS =====

  if (path === '/api/products') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;

    if (method === 'GET') {
      const products = await listProducts(env, userId);
      return jsonResponse(products);
    }

    if (method === 'POST') {
      try {
        const body = await request.json();
        const today = new Date().toISOString().split('T')[0];
        const createdAt = new Date().toISOString();
        const productId = generateId('prod');
        const priceId = generateId('price');

        const stmts = [
          {
            sql: `INSERT INTO products (id, user_id, name, url, image_url, category, store, notes, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [
              productId,
              userId,
              body.name,
              body.url || null,
              body.imageUrl || null,
              body.category || 'other',
              body.store || null,
              body.notes || null,
              createdAt,
            ],
          },
          {
            sql: `INSERT INTO prices (id, product_id, user_id, price, store, date) VALUES (?, ?, ?, ?, ?, ?)`,
            params: [
              priceId,
              productId,
              userId,
              body.price,
              body.store || null,
              today,
            ],
          },
        ];

        await batch(env, stmts);

        return jsonResponse({
          id: productId,
          name: body.name,
          url: body.url,
          imageUrl: body.imageUrl,
          category: body.category || 'other',
          store: body.store,
          notes: body.notes,
          prices: [{ price: body.price, store: body.store, date: today }],
          createdAt,
        }, 201);
      } catch (e) {
        console.error('Create product error:', e);
        return errorResponse('Invalid request body');
      }
    }
  }

  if (path === '/api/products/batch' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;

    try {
      const body = await request.json();
      const { products: incomingProducts } = body;

      if (!Array.isArray(incomingProducts) || incomingProducts.length === 0) {
        return errorResponse('Products array is required');
      }

      const today = new Date().toISOString().split('T')[0];
      const createdAt = new Date().toISOString();

      const stmts = [];
      const createdProducts = [];

      for (const item of incomingProducts) {
        const productId = generateId('prod');
        const priceId = generateId('price');
        const store = item.store || null;
        const date = item.date || today;

        stmts.push({
          sql: `INSERT INTO products (id, user_id, name, url, image_url, category, store, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            productId,
            userId,
            item.name,
            item.url || null,
            item.imageUrl || null,
            item.category || 'other',
            store,
            item.notes || null,
            createdAt,
          ],
        });
        stmts.push({
          sql: `INSERT INTO prices (id, product_id, user_id, price, store, date) VALUES (?, ?, ?, ?, ?, ?)`,
          params: [priceId, productId, userId, item.price, store, date],
        });

        createdProducts.push({
          id: productId,
          name: item.name,
          url: item.url || '',
          imageUrl: item.imageUrl || '',
          category: item.category || 'other',
          store,
          notes: item.notes || '',
          prices: [{ price: item.price, store, date }],
          createdAt,
        });
      }

      await batch(env, stmts);

      return jsonResponse({ products: createdProducts }, 201);
    } catch (e) {
      console.error('Batch create error:', e);
      return errorResponse('Invalid request body');
    }
  }

  const priceMatch = path.match(/^\/api\/products\/(.+)\/prices$/);
  if (priceMatch && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const productId = priceMatch[1];
    const product = await getProduct(env, userId, productId);
    if (!product) return errorResponse('Product not found', 404);

    try {
      const body = await request.json();
      const priceId = generateId('price');
      await execute(
        env,
        `INSERT INTO prices (id, product_id, user_id, price, store, date) VALUES (?, ?, ?, ?, ?, ?)`,
        [priceId, productId, userId, body.price, body.store || null, body.date || new Date().toISOString().split('T')[0]]
      );
      const updated = await getProduct(env, userId, productId);
      return jsonResponse(updated);
    } catch (e) {
      console.error('Add price error:', e);
      return errorResponse('Invalid request body');
    }
  }

  const deletePriceMatch = path.match(/^\/api\/products\/(.+)\/prices\/(\d+)$/);
  if (deletePriceMatch && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const productId = deletePriceMatch[1];
    const priceIndex = parseInt(deletePriceMatch[2], 10);

    const product = await getProduct(env, userId, productId);
    if (!product) return errorResponse('Product not found', 404);
    if (!product.prices || product.prices.length <= priceIndex) {
      return errorResponse('Price not found', 404);
    }

    const priceRows = await queryAll(
      env,
      'SELECT id FROM prices WHERE product_id = ? ORDER BY date ASC, created_at ASC',
      [productId]
    );
    if (priceRows[priceIndex]) {
      await execute(env, 'DELETE FROM prices WHERE id = ?', [priceRows[priceIndex].id]);
    }
    const updated = await getProduct(env, userId, productId);
    return jsonResponse(updated);
  }

  const productMatch = path.match(/^\/api\/products\/(.+)$/);
  if (productMatch) {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const productId = productMatch[1];
    const product = await getProduct(env, userId, productId);
    if (!product) return errorResponse('Product not found', 404);

    if (method === 'GET') {
      return jsonResponse(product);
    }

    if (method === 'PUT') {
      try {
        const body = await request.json();
        const updates = [];
        const params = [];

        if (body.price !== undefined) {
          const latest = await queryOne(
            env,
            'SELECT price FROM prices WHERE product_id = ? ORDER BY date DESC, created_at DESC LIMIT 1',
            [productId]
          );
          if (!latest || Math.abs(body.price - latest.price) > 0.001) {
            const priceId = generateId('price');
            await execute(
              env,
              `INSERT INTO prices (id, product_id, user_id, price, store, date) VALUES (?, ?, ?, ?, ?, ?)`,
              [priceId, productId, userId, body.price, body.store || product.store || null, new Date().toISOString().split('T')[0]]
            );
          }
        }

        const fieldMap = {
          name: body.name,
          url: body.url,
          imageUrl: body.imageUrl,
          category: body.category,
          store: body.store,
          notes: body.notes,
        };
        const colMap = { name: 'name', url: 'url', imageUrl: 'image_url', category: 'category', store: 'store', notes: 'notes' };

        for (const [k, v] of Object.entries(fieldMap)) {
          if (v !== undefined) {
            updates.push(`${colMap[k]} = ?`);
            params.push(v);
          }
        }

        if (updates.length > 0) {
          params.push(productId);
          await execute(env, `UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        const updated = await getProduct(env, userId, productId);
        return jsonResponse(updated);
      } catch (e) {
        console.error('Update product error:', e);
        return errorResponse('Invalid request body');
      }
    }

    if (method === 'DELETE') {
      await execute(env, 'DELETE FROM products WHERE id = ? AND user_id = ?', [productId, userId]);
      return jsonResponse({ success: true });
    }
  }

  // ===== CATEGORIES =====

  if (path === '/api/categories') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;

    if (method === 'GET') {
      const rows = await queryAll(
        env,
        'SELECT id, name, icon FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY name',
        [userId]
      );
      const categories = rows.length > 0 ? rows : DEFAULT_CATEGORIES;
      return jsonResponse(categories);
    }

    if (method === 'POST') {
      try {
        const body = await request.json();
        const newCategory = {
          id: body.id || `cat_${Date.now()}`,
          name: body.name,
          icon: body.icon || '📦',
        };
        if (!isValidCategory(newCategory)) {
          return errorResponse('Invalid category data');
        }
        await execute(
          env,
          `INSERT INTO categories (id, user_id, name, icon) VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon`,
          [newCategory.id, userId, newCategory.name, newCategory.icon]
        );
        return jsonResponse(newCategory, 201);
      } catch (e) {
        console.error('Create category error:', e);
        return errorResponse('Invalid request body');
      }
    }
  }

  const categoryMatch = path.match(/^\/api\/categories\/(.+)$/);
  if (categoryMatch && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const id = categoryMatch[1];
    await execute(
      env,
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return jsonResponse({ success: true });
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
    const productCount = (await queryOne(env, 'SELECT COUNT(*) as c FROM products'))?.c || 0;
    const priceCount = (await queryOne(env, 'SELECT COUNT(*) as c FROM prices'))?.c || 0;

    return jsonResponse({
      totalUsers: userStats?.total || 0,
      regularUsers: userStats?.regular || 0,
      trialUsers: userStats?.trial || 0,
      totalProducts: productCount,
      totalPrices: priceCount,
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
              (SELECT COUNT(*) FROM products WHERE user_id = u.id) as product_count
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
      `SELECT p.id, p.name, p.category, p.store,
              (SELECT COUNT(*) FROM prices WHERE product_id = p.id) as price_count
       FROM products p WHERE p.user_id = ?`,
      [userId]
    );
    const products = productRows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
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
    const user = await getUserById(env, userId);
    if (!user) return errorResponse('User not found', 404);

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
        const adminCount = (await queryOne(
          env,
          `SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND id != ?`,
          [targetUserId]
        ))?.c || 0;
        if (adminCount === 0) {
          return errorResponse('Cannot demote the last admin');
        }
      }

      const oldRole = targetUser.role;
      await execute(env, 'UPDATE users SET role = ? WHERE id = ?', [newRole, targetUserId]);

      const adminUser = await getUserById(env, admin.userId);
      await logAudit(env, {
        action: 'admin.role_change',
        adminId: admin.userId,
        adminUsername: adminUser?.username || 'unknown',
        targetUserId,
        targetUsername: targetUser.username,
        details: `changed ${targetUser.username} from ${oldRole} to ${newRole}`,
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
    const categoryRows = await queryAll(
      env,
      'SELECT category, COUNT(*) as count FROM products GROUP BY category'
    );
    const categoryDistribution = Object.fromEntries(categoryRows.map((r) => [r.category, r.count]));

    const storeRows = await queryAll(
      env,
      'SELECT store, COUNT(*) as count FROM products WHERE store IS NOT NULL GROUP BY store'
    );
    const storeDistribution = Object.fromEntries(storeRows.map((r) => [r.store, r.count]));

    const totalProducts = (await queryOne(env, 'SELECT COUNT(*) as c FROM products'))?.c || 0;
    const totalPriceEntries = (await queryOne(env, 'SELECT COUNT(*) as c FROM prices'))?.c || 0;
    const userRegRows = await queryAll(
      env,
      `SELECT date(created_at) as date, COUNT(*) as count FROM users GROUP BY date(created_at) ORDER BY date`
    );
    const productCreaRows = await queryAll(
      env,
      `SELECT date(created_at) as date, COUNT(*) as count FROM products GROUP BY date(created_at) ORDER BY date`
    );

    return jsonResponse({
      categoryDistribution,
      storeDistribution,
      totalProducts,
      totalPriceEntries,
      userCount: userStats?.total || 0,
      regularUsers: userStats?.regular || 0,
      trialUsers: userStats?.trial || 0,
      userRegistrations: userRegRows,
      productCreations: productCreaRows,
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
              (SELECT COUNT(*) FROM products WHERE user_id = u.id) as product_count
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

  // ===== SEARCH / SCRAPE =====

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
          body: JSON.stringify({ q: q + ' UK supermarket price', num: 10 }),
        }),
        fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q, num: 10 }),
        }),
      ]);

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error('Serper search error:', searchRes.status, errText);
        return errorResponse('Search failed', searchRes.status);
      }

      const searchData = await searchRes.json();
      let results = (searchData.organic || []).map((item) => ({
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

      let gemmaError = '';
      if (env.GEMMA_API_KEY && results.length > 0) {
        try {
          const enriched = await enrichWithGemma(results, env.GEMMA_API_KEY);
          if (enriched && Array.isArray(enriched)) {
            results = results.map((r, i) => ({
              ...r,
              ...(enriched[i] || {}),
            }));
          } else {
            gemmaError = 'Google API currently unavailable';
          }
        } catch (e) {
          console.error('Gemma enrichment failed:', e);
          gemmaError = 'Google API currently unavailable';
        }
      }

      const responseData = { results, imageUrl };
      if (gemmaError) responseData.gemmaError = gemmaError;
      return jsonResponse(responseData);
    } catch (e) {
      console.error('Search error:', e);
      return errorResponse('Search failed');
    }
  }

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
        body: JSON.stringify({ q, num: 20 }),
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
      console.error('Image search error:', e);
      return errorResponse('Failed to search images');
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
};
