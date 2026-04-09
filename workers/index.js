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

  // Fetch product details from URL
  if (path === '/api/products/fetch' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth && auth.error) return auth;

    try {
      const body = await request.json();
      const productUrl = body.url;

      if (!productUrl) {
        return errorResponse('URL is required');
      }

      const store = detectStoreFromUrl(productUrl);
      const productData = await fetchProductDetails(productUrl, store);

      return jsonResponse(productData);
    } catch (e) {
      console.error('Fetch product error:', e);
      return errorResponse('Failed to fetch product details: ' + e.message);
    }
  }

  return errorResponse('Not found', 404);
}

function detectStoreFromUrl(url) {
  if (!url) return null;
  const urlLower = url.toLowerCase();
  
  const storePatterns = {
    "Sainsbury's": ['sainsburys', 'sainsbury'],
    'Tesco': ['tesco'],
    'Morrisons': ['morrisons'],
    'ASDA': ['asda'],
    'M&S': ['marksandspencer', 'marksand', 'mand s'],
    'Waitrose': ['waitrose'],
    'Ocado': ['ocado'],
    'Aldi': ['aldi'],
    'Lidl': ['lidl'],
    'Iceland': ['iceland'],
    'Co-op': ['coop', 'co-op', 'cooperative'],
  };

  for (const [store, patterns] of Object.entries(storePatterns)) {
    for (const pattern of patterns) {
      if (urlLower.includes(pattern)) {
        return store;
      }
    }
  }
  return null;
}

async function fetchProductDetails(productUrl, store) {
  const response = await fetch(productUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page (HTTP ${response.status}). The URL may be invalid or require login.`);
  }

  const html = await response.text();
  return parseProductHtml(html, store, productUrl);
}

function parseProductHtml(html, store, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let name = '';
  let price = null;
  let imageUrl = '';

  const selectors = getStoreSelectors(store);

  for (const selector of selectors.name) {
    const el = doc.querySelector(selector);
    if (el) {
      name = el.textContent.trim();
      break;
    }
  }

  for (const selector of selectors.price) {
    const el = doc.querySelector(selector);
    if (el) {
      const priceText = el.textContent.trim();
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(',', ''));
        break;
      }
    }
  }

  for (const selector of selectors.image) {
    const el = doc.querySelector(selector);
    if (el) {
      imageUrl = el.src || el.href || el.getAttribute('data-src') || '';
      break;
    }
  }

  if (!name) {
    throw new Error('Could not extract product name. The page structure may not be supported.');
  }

  return { name, price, imageUrl, store: detectStoreFromUrl(url), url };
}

function getStoreSelectors(store) {
  const allSelectors = {
    name: ['h1[data-testid="product-title"]', '[data-testid="product-title"]', '.product-title', '.product-name', '[itemprop="name"]', 'h1.productTitle', '#productTitle', 'h1'],
    price: ['[data-testid="price"]', '.price', '.product-price', '[itemprop="price"]', '.priceNow', '.actualPrice', '#priceblock_ourprice', '.a-price .a-offscreen'],
    image: ['[data-testid="product-image"] img', '#landingImage', '.product-image img', '[itemprop="image"]', '.zoomWindow', '#main-image'],
  };

  const storeSpecific = {
    "Sainsbury's": { name: ['.product-title', 'h1'], price: ['.priceControl', '.price-per-weight', '[data-testid="price"]'], image: ['.product-image img', '.productImage'] },
    'Tesco': { name: ['.product-tile--title', 'h1'], price: ['.price-wrap', '.price', '[data-testid="price"]'], image: ['.product-image img', '.product-image'] },
    'ASDA': { name: ['.product-title', 'h1'], price: ['.price', '.prod-price'], image: ['.product-image img'] },
    'M&S': { name: ['.product-name', 'h1'], price: ['.price', '.price-m'], image: ['.product-image img'] },
    'Waitrose': { name: ['.productTitle', 'h1'], price: ['.price', '.priceWrap'], image: ['.product-image img'] },
  };

  if (store && storeSpecific[store]) {
    return {
      name: [...storeSpecific[store].name, ...allSelectors.name],
      price: [...storeSpecific[store].price, ...allSelectors.price],
      image: [...storeSpecific[store].image, ...allSelectors.image],
    };
  }

  return allSelectors;
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
