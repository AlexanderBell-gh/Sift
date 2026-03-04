const DEFAULT_CATEGORIES = [
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Beverages', icon: '🥤' },
  { id: 'produce', name: 'Produce', icon: '🥬' },
  { id: 'meat', name: 'Meat', icon: '🥩' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'bakery', name: 'Bakery', icon: '🥖' },
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
  'Access-Control-Allow-Headers': 'Content-Type',
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

async function authenticate(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const tokenMatch = cookie.match(/auth_token=([^;]+)/);
  
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  const token = tokenMatch?.[1] || bearerToken;
  if (!token) return null;

  const payload = await verifyJWT(token);
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
        const token = await createJWT(user);

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
        const token = await createJWT(user);

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

        const token = await createJWT(user);

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
        const TRIAL_DAYS = 1;
        const trialExpiresAt = Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000;

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
        const token = await createJWT(user);

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
          trialDaysRemaining: TRIAL_DAYS
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

        await saveUser(env, user);

      return jsonResponse({ id: user.id, email: user.email, username: user.username, role: user.role, isTrial: user.isTrial || false, trialExpiresAt: user.trialExpiresAt || null, preferences: user.preferences, createdAt: user.createdAt });
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }

    if (method === 'DELETE') {
      const auth = await requireAuth(request, env);
      if (auth && auth.error) return auth;

      await deleteUser(env, auth.userId);

      return jsonResponse({ success: true });
    }
  }

  if (path === '/api/auth/magic/send') {
    if (method === 'POST') {
      try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
          return errorResponse('Email is required');
        }

        const user = await getUserByEmail(env, email);
        if (!user) {
          return jsonResponse({ message: 'If that email exists, a magic link has been sent' });
        }

        const token = generateToken();
        const magicLink = {
          token,
          userId: user.id,
          expiresAt: Date.now() + 15 * 60 * 1000,
        };

        await env.USERS.put(`magic:${token}`, JSON.stringify(magicLink), { expirationTtl: 900 });

        const magicLinkUrl = `${new URL(request.url).origin}/auth/magic/verify?token=${token}`;

        return jsonResponse({ message: 'Magic link sent', magicLink: magicLinkUrl, token });
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }

  if (path === '/api/auth/magic/verify') {
    if (method === 'POST') {
      try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
          return errorResponse('Token is required');
        }

        const magicLinkData = await env.USERS.get(`magic:${token}`, 'json');
        if (!magicLinkData || !isValidMagicLink(magicLinkData)) {
          return errorResponse('Invalid or expired token');
        }

        await env.USERS.delete(`magic:${token}`);

        const user = await getUserById(env, magicLinkData.userId);
        if (!user) {
          return errorResponse('User not found');
        }

        const jwt = await createJWT(user);

        return jsonResponse({ user: { id: user.id, email: user.email, username: user.username, role: user.role, isTrial: user.isTrial || false, trialExpiresAt: user.trialExpiresAt || null, preferences: user.preferences }, token: jwt });
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
  if (path.match(/^\/api\/products\/(.+)$/)) {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const id = path.match(/^\/api\/products\/(.+)$/)[1];
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
            const newPriceEntry = {
              price: body.price,
              store: body.store || p.store,
              date: new Date().toISOString().split('T')[0]
            };
            updated.prices = p.prices || [];
            updated.prices.push(newPriceEntry);
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
      const filtered = products.filter(p => p.id !== id);
      await saveProducts(env, userId, filtered);
      return jsonResponse({ success: true });
    }
  }
  
  // Add price to product
  if (path.match(/^\/api\/products\/(.+)\/prices$/) && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const id = path.match(/^\/api\/products\/(.+)\/prices$/)[1];
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
  if (path.match(/^\/api\/categories\/(.+)$/) && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;
    const userId = auth.userId;
    const id = path.match(/^\/api\/categories\/(.+)$/)[1];
    const rawCategories = await env.PRICETRACKR.get(`user:${userId}:categories`, 'json');
    const categories = Array.isArray(rawCategories) ? rawCategories.filter(isValidCategory) : [...DEFAULT_CATEGORIES];
    const filtered = categories.filter(c => c.id !== id);
    await env.PRICETRACKR.put(`user:${userId}:categories`, JSON.stringify(filtered));
    return jsonResponse({ success: true });
  }

  return errorResponse('Not found', 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return errorResponse('Internal server error', 500);
    }
  },
};
