import type { Product, PriceEntry, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

const API_BASE_URL = 'https://pricetrackr-api.inbox-alexbell.workers.dev'; // Set your Cloudflare Worker URL here
const USE_LOCAL_STORAGE = !API_BASE_URL;

const STORAGE_KEYS = {
  PRODUCTS: 'pricetrackr_products',
  CATEGORIES: 'pricetrackr_categories',
};

export const api = {
  async getProducts(): Promise<Product[]> {
    if (USE_LOCAL_STORAGE) {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    }

    const response = await fetch(`${API_BASE_URL}/api/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async getProduct(id: string): Promise<Product> {
    if (USE_LOCAL_STORAGE) {
      const products = await this.getProducts();
      const product = products.find(p => p.id === id);
      if (!product) throw new Error('Product not found');
      return product;
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  async createProduct(product: { name: string; url?: string; imageUrl?: string; category: string; price: number; store?: string; notes?: string }): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prices: [{ price: product.price, store: product.store, date: new Date().toISOString().split('T')[0] }],
      createdAt: new Date().toISOString(),
    };

    if (USE_LOCAL_STORAGE) {
      const products = await this.getProducts();
      products.push(newProduct);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      return newProduct;
    }

    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  async updateProduct(id: string, updates: Partial<Product> & { price?: number; store?: string }): Promise<Product> {
    if (USE_LOCAL_STORAGE) {
      const products = await this.getProducts();
      const index = products.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Product not found');
      
      const product = products[index];
      
      if (updates.price !== undefined) {
        const newPriceEntry: PriceEntry = {
          price: updates.price,
          store: updates.store || product.store,
          date: new Date().toISOString().split('T')[0],
        };
        product.prices = product.prices || [];
        product.prices.push(newPriceEntry);
      }
      
      if (updates.price !== undefined) delete updates.price;
      if (updates.store !== undefined) delete updates.store;
      
      products[index] = { ...product, ...updates };
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      return products[index];
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update product');
    return response.json();
  },

  async deleteProduct(id: string): Promise<void> {
    if (USE_LOCAL_STORAGE) {
      const products = await this.getProducts();
      const filtered = products.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete product');
  },

  async addPrice(id: string, priceData: { price: number; store?: string; date?: string }): Promise<Product> {
    const entry: PriceEntry = {
      price: priceData.price,
      store: priceData.store,
      date: priceData.date || new Date().toISOString().split('T')[0],
    };

    if (USE_LOCAL_STORAGE) {
      const products = await this.getProducts();
      const product = products.find(p => p.id === id);
      if (!product) throw new Error('Product not found');
      product.prices = product.prices || [];
      product.prices.push(entry);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      return product;
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${id}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error('Failed to add price');
    return response.json();
  },

  async getCategories(): Promise<Category[]> {
    if (USE_LOCAL_STORAGE) {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const storedCategories: Category[] = data ? JSON.parse(data) : [];
      
      const mergedCategories = [...storedCategories];
      let hasChanges = false;
      
      for (const defaultCat of DEFAULT_CATEGORIES) {
        if (!mergedCategories.find(c => c.id === defaultCat.id)) {
          mergedCategories.push(defaultCat);
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(mergedCategories));
      }
      
      return mergedCategories;
    }

    const response = await fetch(`${API_BASE_URL}/api/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const newCategory: Category = {
      ...category,
      id: `cat_${Date.now()}`,
    };

    if (USE_LOCAL_STORAGE) {
      const categories = await this.getCategories();
      categories.push(newCategory);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      return newCategory;
    }

    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory),
    });
    if (!response.ok) throw new Error('Failed to create category');
    return response.json();
  },

  async deleteCategory(id: string): Promise<void> {
    if (USE_LOCAL_STORAGE) {
      const categories = await this.getCategories();
      const filtered = categories.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete category');
  },
};
