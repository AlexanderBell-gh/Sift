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

async function scrapeProductPage(url, browserEnv) {
  try {
    const { launch } = await import('@cloudflare/playwright');
    const browser = await launch(browserEnv);
    const page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    
    const pageContent = await page.content();
    if (pageContent.includes('Access Denied') || pageContent.includes('Challenge') || pageContent.includes('Just a moment')) {
      await browser.close();
      throw new Error('Page blocked by Cloudflare');
    }
    
    await page.waitForTimeout(2000);
    
    const data = await page.evaluate(() => {
      const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
      const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || '';
      
      // Layer 1: JSON-LD Structured Data (most reliable)
      let name = '';
      let price = 0;
      let currency = 'GBP';
      let image = '';
      
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
          try {
            const json = JSON.parse(script.textContent);
            const findProduct = (obj) => {
              if (!obj) return null;
              if (obj['@type'] === 'Product' || obj['@type'] === 'http://schema.org/Product') return obj;
              if (Array.isArray(obj)) return obj.find(findProduct);
              if (obj['@graph']) return findProduct(obj['@graph']);
              return null;
            };
            const product = findProduct(json);
            if (product) {
              if (product.name && !name) name = product.name;
              if (product.image && !image) {
                image = Array.isArray(product.image) ? product.image[0] : product.image;
              }
              const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
              if (offer) {
                if (offer.price !== undefined && !price) {
                  price = parseFloat(offer.price);
                }
                if (offer.priceCurrency && !currency) {
                  currency = offer.priceCurrency;
                }
              }
            }
          } catch {}
        });
      } catch {}
      
      // Layer 2: DOM fallback (with unit price filters)
      if (!price) {
        const priceSelectors = [
          '[itemprop="price"]',
          '.price',
          '[data-price]',
          '.product-price',
          '.pricePerUnit',
          '[data-qa="price"]',
          '.current-price',
          '.product-unit-price',
          '.pricelockup',
          '.sale-price',
          '.offer-price',
          '.now-price',
          '.actual-price',
          'span[class*="price"]',
          '.ts-price',
        ];
        
        const mainProductSelectors = [
          '.product-detail',
          '.pdp-product',
          '.product-main',
          '.product-info',
          '.product-information',
          '[data-testid="product-info"]',
          '.pdp-summary',
          '.product-header',
          'main',
          '.content-main',
        ];
        
        const unitPricePatterns = [
          'per kg', 'per 100g', 'per 100ml', 'per litre', 'per pack', 'per each', '/kg', '/l', '/100g', '/100ml', 'per 500g', 'per 750ml'
        ];
        
        const isUnitPrice = (text) => {
          const lower = text.toLowerCase();
          return unitPricePatterns.some(p => lower.includes(p));
        };
        
        let priceText = '';
        
        // Try main product area first
        for (const containerSel of mainProductSelectors) {
          const container = document.querySelector(containerSel);
          if (container) {
            for (const sel of priceSelectors) {
              const el = container.querySelector(sel);
              const text = el?.textContent?.trim() || '';
              if (text && !isUnitPrice(text)) {
                priceText = text;
                break;
              }
            }
            if (priceText) break;
          }
        }
        
        // Fallback: any price on page (with filter)
        if (!priceText) {
          for (const sel of priceSelectors) {
            const el = document.querySelector(sel);
            const text = el?.textContent?.trim() || '';
            if (text && !isUnitPrice(text)) {
              priceText = text;
              break;
            }
          }
        }
        
        if (priceText) {
          const priceMatch = priceText.replace(/[£,$]/g, '').match(/[\d.]+/);
          price = priceMatch ? parseFloat(priceMatch[0]) : 0;
          currency = priceText.includes('£') ? 'GBP' : (priceText.includes('$') ? 'USD' : 'GBP');
        }
      }
      
      // Name fallback
      if (!name) {
        name = getText('h1') || getText('[itemprop="name"]') || getText('.product-title') || getText('.product-name');
      }
      
      // Image fallback
      if (!image) {
        image = getAttr('[itemprop="image"]', 'src') 
          || getAttr('meta[property="og:image"]', 'content')
          || getAttr('.product-image img', 'src')
          || getAttr('[data-product-image]', 'src');
      }
      
      return {
        name,
        price,
        currency,
        image: image || '',
      };
    });
    
    await browser.close();
    return data;
  } catch (e) {
    throw e;
  }
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

    for (const userId of userIds) {
      const user = await getUserById(env, userId);
      if (user) {
        if (user.isTrial) trialUsers++;
        else regularUsers++;
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
        }
      }
    }

    return jsonResponse({
      categoryDistribution: categoryCount,
      storeDistribution: storeCount,
      totalProducts: totalProductCount,
      totalPriceEntries,
      userCount: userIds.length,
      regularUsers,
      trialUsers,
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

      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: q + ' UK supermarket price',
          num: 10,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Serper search error:', response.status, errText);
        return errorResponse('Search failed', response.status);
      }

      const data = await response.json();
      const results = (data.organic || []).map((item) => ({
        title: item.title || '',
        url: item.link || item.url || '',
        snippet: item.snippet || '',
      }));

      console.log('Search results:', results.length);
      return jsonResponse({ results });
    } catch (e) {
      console.error('Search error:', e);
      return errorResponse('Search failed');
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

// Product scrape via Playwright
  if (path === '/api/scrape/product' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;

    try {
      const body = await request.json();
      const { url } = body;

      if (!url || typeof url !== 'string') {
        return errorResponse('URL is required');
      }

      let data = null;
      let fromCache = false;

      try {
        const parsedUrl = new URL(url);
        const cacheKey = `scrape:cache:${parsedUrl.hostname}:${parsedUrl.pathname}`;
        const cached = await env.PRICETRACKR.get(cacheKey, 'json');

        if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          data = cached.data;
          fromCache = true;
        } else {
          data = await scrapeProductPage(url, env.MYBROWSER);
          if (data && (data.name || data.price || data.image)) {
            await env.PRICETRACKR.put(cacheKey, JSON.stringify({
              data,
              timestamp: Date.now(),
            }), { expirationTtl: 24 * 60 * 60 });
          }
        }
      } catch (scrapeErr) {
        console.error('Product scrape error:', scrapeErr);
        const cacheKey = `scrape:cache:${new URL(url).hostname}:${new URL(url).pathname}`;
        const cached = await env.PRICETRACKR.get(cacheKey, 'json');
        if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          data = cached.data;
          fromCache = true;
        }
      }

      if (!data) {
        return errorResponse('Failed to gather product info, enter manually', 500);
      }

      return jsonResponse({
        name: data.name || '',
        url: url,
        price: data.price || 0,
        currency: data.currency || 'GBP',
        imageUrl: data.image || '',
        inStock: undefined,
        store: '',
        fromCache,
      });
    } catch (e) {
      console.error('Product scrape error:', e);
      return errorResponse('Failed to gather product info, enter manually');
    }
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
