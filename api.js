// API Client for PriceTrackr
// This connects to the Cloudflare Worker API
// Falls back to localStorage if API is not configured

const API_BASE_URL = ''; // Set your Cloudflare Worker URL here, e.g., 'https://pricetrackr-api.yourname.workers.dev'

const USE_LOCAL_STORAGE = !API_BASE_URL;

const Api = {
    // Products
    async getProducts() {
        if (USE_LOCAL_STORAGE) {
            const data = localStorage.getItem('pricetrackr_products');
            return data ? JSON.parse(data) : [];
        }
        
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        return response.json();
    },
    
    async getProduct(id) {
        if (USE_LOCAL_STORAGE) {
            const products = await this.getProducts();
            return products.find(p => p.id === id);
        }
        
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
        if (!response.ok) throw new Error('Failed to fetch product');
        return response.json();
    },
    
    async createProduct(product) {
        if (USE_LOCAL_STORAGE) {
            const products = await this.getProducts();
            const newProduct = {
                ...product,
                id: product.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date().toISOString()
            };
            products.push(newProduct);
            localStorage.setItem('pricetrackr_products', JSON.stringify(products));
            return newProduct;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        if (!response.ok) throw new Error('Failed to create product');
        return response.json();
    },
    
    async updateProduct(id, updates) {
        if (USE_LOCAL_STORAGE) {
            const products = await this.getProducts();
            const index = products.findIndex(p => p.id === id);
            if (index === -1) throw new Error('Product not found');
            products[index] = { ...products[index], ...updates };
            localStorage.setItem('pricetrackr_products', JSON.stringify(products));
            return products[index];
        }
        
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update product');
        return response.json();
    },
    
    async deleteProduct(id) {
        if (USE_LOCAL_STORAGE) {
            const products = await this.getProducts();
            const filtered = products.filter(p => p.id !== id);
            localStorage.setItem('pricetrackr_products', JSON.stringify(filtered));
            return { success: true };
        }
        
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete product');
        return response.json();
    },
    
    async addPrice(id, priceData) {
        if (USE_LOCAL_STORAGE) {
            const products = await this.getProducts();
            const product = products.find(p => p.id === id);
            if (!product) throw new Error('Product not found');
            
            product.prices = product.prices || [];
            product.prices.push({
                price: priceData.price,
                store: priceData.store,
                date: priceData.date || new Date().toISOString().split('T')[0]
            });
            
            localStorage.setItem('pricetrackr_products', JSON.stringify(products));
            return product;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/products/${id}/prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(priceData)
        });
        if (!response.ok) throw new Error('Failed to add price');
        return response.json();
    },
    
    // Categories
    async getCategories() {
        if (USE_LOCAL_STORAGE) {
            const data = localStorage.getItem('pricetrackr_categories');
            return data ? JSON.parse(data) : [
                { id: 'dairy', name: 'Dairy', icon: '🥛' },
                { id: 'snacks', name: 'Snacks', icon: '🍿' },
                { id: 'beverages', name: 'Beverages', icon: '🥤' },
                { id: 'produce', name: 'Produce', icon: '🥬' },
                { id: 'meat', name: 'Meat', icon: '🥩' },
                { id: 'frozen', name: 'Frozen', icon: '🧊' },
                { id: 'other', name: 'Other', icon: '📦' }
            ];
        }
        
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        return response.json();
    },
    
    async createCategory(category) {
        if (USE_LOCAL_STORAGE) {
            const categories = await this.getCategories();
            const newCategory = {
                ...category,
                id: category.id || `cat_${Date.now()}`
            };
            categories.push(newCategory);
            localStorage.setItem('pricetrackr_categories', JSON.stringify(categories));
            return newCategory;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(category)
        });
        if (!response.ok) throw new Error('Failed to create category');
        return response.json();
    }
};

// Export for use in app.js
window.PriceTrackrApi = Api;
