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

async function getAllProducts(env) {
  const productIds = await env.PRICETRACKR.get('products', 'json');
  if (!productIds) return [];
  
  const products = await Promise.all(
    productIds.map(async (id) => {
      const product = await env.PRICETRACKR.get(`product:${id}`, 'json');
      return product;
    })
  );
  
  return products.filter(Boolean);
}

async function saveProducts(env, products) {
  const ids = products.map(p => p.id);
  await env.PRICETRACKR.put('products', JSON.stringify(ids));
  
  await Promise.all(
    products.map(async (product) => {
      await env.PRICETRACKR.put(`product:${product.id}`, JSON.stringify(product));
    })
  );
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Routes
  if (path === '/api/products') {
    if (method === 'GET') {
      const products = await getAllProducts(env);
      return jsonResponse(products);
    }
    
    if (method === 'POST') {
      try {
        const body = await request.json();
        const products = await getAllProducts(env);
        
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
        await saveProducts(env, products);
        
        return jsonResponse(newProduct, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
  }
  
  // Product by ID
  if (path.match(/^\/api\/products\/(.+)$/)) {
    const id = path.match(/^\/api\/products\/(.+)$/)[1];
    const products = await getAllProducts(env);
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
        const updatedProducts = products.map(p => 
          p.id === id ? { ...p, ...body } : p
        );
        await saveProducts(env, updatedProducts);
        return jsonResponse(updatedProducts.find(p => p.id === id));
      } catch (e) {
        return errorResponse('Invalid request body');
      }
    }
    
    if (method === 'DELETE') {
      const filtered = products.filter(p => p.id !== id);
      await saveProducts(env, filtered);
      return jsonResponse({ success: true });
    }
  }
  
  // Add price to product
  if (path.match(/^\/api\/products\/(.+)\/prices$/) && method === 'POST') {
    const id = path.match(/^\/api\/products\/(.+)\/prices$/)[1];
    const products = await getAllProducts(env);
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
      
      await saveProducts(env, products);
      return jsonResponse(product);
    } catch (e) {
      return errorResponse('Invalid request body');
    }
  }
  
  // Categories
  if (path === '/api/categories') {
    if (method === 'GET') {
      const categories = await env.PRICETRACKR.get('categories', 'json');
      return jsonResponse(categories || []);
    }
    
    if (method === 'POST') {
      try {
        const body = await request.json();
        const categories = await env.PRICETRACKR.get('categories', 'json') || [];
        const newCategory = {
          id: body.id || `cat_${Date.now()}`,
          name: body.name,
          icon: body.icon || '📦'
        };
        categories.push(newCategory);
        await env.PRICETRACKR.put('categories', JSON.stringify(categories));
        return jsonResponse(newCategory, 201);
      } catch (e) {
        return errorResponse('Invalid request body');
      }
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
