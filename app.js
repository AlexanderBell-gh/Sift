// PriceTrackr - Main Application Logic

const STORAGE_KEYS = {
    PRODUCTS: 'pricetrackr_products',
    CATEGORIES: 'pricetrackr_categories',
    THEME: 'pricetrackr_theme'
};

const DEFAULT_CATEGORIES = [
    { id: 'dairy', name: 'Dairy', icon: '🥛' },
    { id: 'snacks', name: 'Snacks', icon: '🍿' },
    { id: 'beverages', name: 'Beverages', icon: '🥤' },
    { id: 'produce', name: 'Produce', icon: '🥬' },
    { id: 'meat', name: 'Meat', icon: '🥩' },
    { id: 'frozen', name: 'Frozen', icon: '🧊' },
    { id: 'other', name: 'Other', icon: '📦' }
];

// App State
let state = {
    products: [],
    categories: [],
    currentCategory: 'all',
    searchQuery: '',
    editingProduct: null,
    detailProduct: null
};

// DOM Elements
const elements = {
    searchInput: document.getElementById('searchInput'),
    productGrid: document.getElementById('productGrid'),
    emptyState: document.getElementById('emptyState'),
    productCount: document.getElementById('productCount'),
    avgPrice: document.getElementById('avgPrice'),
    themeToggle: document.getElementById('themeToggle'),
    addProductBtn: document.getElementById('addProductBtn'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    productModal: document.getElementById('productModal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalContent: document.getElementById('modalContent'),
    modalTitle: document.getElementById('modalTitle'),
    productForm: document.getElementById('productForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    priceModal: document.getElementById('priceModal'),
    priceModalBackdrop: document.getElementById('priceModalBackdrop'),
    priceForm: document.getElementById('priceForm'),
    closePriceModalBtn: document.getElementById('closePriceModalBtn'),
    cancelPriceBtn: document.getElementById('cancelPriceBtn'),
    detailModal: document.getElementById('detailModal'),
    detailModalBackdrop: document.getElementById('detailModalBackdrop'),
    detailModalContent: document.getElementById('detailModalContent'),
    closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
    categoryModal: document.getElementById('categoryModal'),
    categoryModalBackdrop: document.getElementById('categoryModalBackdrop'),
    categoryForm: document.getElementById('categoryForm'),
    closeCategoryModalBtn: document.getElementById('closeCategoryModalBtn'),
    cancelCategory: document.getElementById('cancelCategory'),
    addCategoryBtn: document.getElementById('addCategoryBtn')
};

// Initialize App
function init() {
    loadData();
    initTheme();
    renderCategories();
    renderProducts();
    setupEventListeners();
}

// Data Management
function loadData() {
    const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);

    state.products = storedProducts ? JSON.parse(storedProducts) : [];
    state.categories = storedCategories ? JSON.parse(storedCategories) : DEFAULT_CATEGORIES;
    
    if (!storedCategories) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
}

function saveProducts() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(state.products));
}

function saveCategories() {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories));
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
}

// Generate unique ID
function generateId() {
    return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Fetch product image from URL
async function fetchProductImage(url) {
    if (!url) return null;
    
    try {
        // Try to get the URL directly (for direct image links)
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok && response.headers.get('content-type')?.includes('image')) {
            return url;
        }
    } catch (e) {
        console.log('Direct image fetch failed, trying proxy...');
    }
    
    // If direct fetch fails, return the URL as-is
    // The img tag will handle display, or we can use a fallback
    return url;
}

// Get category icon
function getCategoryIcon(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    return category ? category.icon : '📦';
}

// Get category badge class
function getCategoryBadgeClass(categoryId) {
    return `badge badge-${categoryId}`;
}

// Format price
function formatPrice(price) {
    return `£${parseFloat(price).toFixed(2)}`;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Calculate price change
function calculatePriceChange(prices) {
    if (prices.length < 2) return { change: 0, percent: 0, direction: 'neutral' };
    
    const current = prices[prices.length - 1].price;
    const previous = prices[prices.length - 2].price;
    const change = current - previous;
    const percent = previous !== 0 ? ((change / previous) * 100).toFixed(1) : 0;
    
    return {
        change,
        percent,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
}

// Render categories
function renderCategories() {
    const container = document.querySelector('.category-chip.active').parentElement;
    const chips = container.querySelectorAll('.category-chip');
    
    chips.forEach(chip => {
        if (chip.dataset.category === 'all' || chip.id === 'addCategoryBtn') return;
        chip.remove();
    });
    
    // Add custom categories
    state.categories.forEach(category => {
        if (!DEFAULT_CATEGORIES.find(c => c.id === category.id)) {
            const chip = document.createElement('button');
            chip.className = 'category-chip';
            chip.dataset.category = category.id;
            chip.textContent = `${category.icon} ${category.name}`;
            container.insertBefore(chip, document.getElementById('addCategoryBtn'));
        }
    });
    
    // Reattach event listeners
    setupCategoryListeners();
}

function setupCategoryListeners() {
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.currentCategory = chip.dataset.category;
            renderProducts();
        });
    });
}

// Render products
function renderProducts() {
    let filtered = [...state.products];
    
    // Filter by category
    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === state.currentCategory);
    }
    
    // Filter by search
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.store?.toLowerCase().includes(query)
        );
    }
    
    // Sort by most recent price
    filtered.sort((a, b) => {
        const aDate = a.prices?.[a.prices.length - 1]?.date || 0;
        const bDate = b.prices?.[b.prices.length - 1]?.date || 0;
        return new Date(bDate) - new Date(aDate);
    });
    
    // Update stats
    elements.productCount.textContent = `${filtered.length} Product${filtered.length !== 1 ? 's' : ''}`;
    
    if (filtered.length > 0) {
        const total = filtered.reduce((sum, p) => {
            const price = p.prices?.[p.prices.length - 1]?.price || 0;
            return sum + parseFloat(price);
        }, 0);
        elements.avgPrice.textContent = `Avg: ${formatPrice(total / filtered.length)}`;
    } else {
        elements.avgPrice.textContent = 'Avg: £0.00';
    }
    
    // Show/hide empty state
    if (filtered.length === 0) {
        elements.productGrid.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.productGrid.classList.remove('hidden');
        elements.emptyState.classList.add('hidden');
        
        // Render cards
        elements.productGrid.innerHTML = filtered.map(product => {
            const latestPrice = product.prices?.[product.prices.length - 1];
            const currentPrice = latestPrice?.price || 0;
            const { change, percent, direction } = calculatePriceChange(product.prices || []);
            
            const priceClass = direction === 'up' ? 'price-up' : direction === 'down' ? 'price-down' : 'price-neutral';
            const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
            
            return `
                <div class="product-card cursor-pointer" data-id="${product.id}">
                    <div class="product-image">
                        ${product.imageUrl ? 
                            `<img src="${product.imageUrl}" alt="${product.name}" onerror="this.parentElement.innerHTML='${getCategoryIcon(product.category)}'">` :
                            `<span class="text-5xl">${getCategoryIcon(product.category)}</span>`
                        }
                    </div>
                    <div class="p-5">
                        <div class="flex items-start justify-between mb-2">
                            <h3 class="font-semibold text-lg truncate flex-1">${product.name}</h3>
                            <span class="${getCategoryBadgeClass(product.category)} ml-2">${getCategoryIcon(product.category)}</span>
                        </div>
                        ${product.store ? `<p class="text-sm text-slate-500 dark:text-slate-400 mb-3">🏪 ${product.store}</p>` : ''}
                        
                        <div class="flex items-end justify-between mb-3">
                            <div>
                                <p class="text-2xl font-bold">${formatPrice(currentPrice)}</p>
                            </div>
                            <div class="text-right">
                                ${direction !== 'neutral' ? `
                                    <p class="${priceClass} font-semibold text-sm">
                                        ${arrow} ${formatPrice(Math.abs(change))} (${percent}%)
                                    </p>
                                ` : `
                                    <p class="price-neutral text-sm">→ No change</p>
                                `}
                            </div>
                        </div>
                        
                        <!-- Mini Sparkline -->
                        ${(product.prices?.length || 0) > 1 ? `
                            <div class="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 overflow-hidden">
                                <svg class="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    ${renderSparkline(product.prices || [], direction)}
                                </svg>
                            </div>
                        ` : `
                            <div class="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 flex items-center justify-center text-slate-400 text-xs">
                                Need more data for chart
                            </div>
                        `}
                        
                        <div class="flex items-center justify-between text-xs text-slate-500">
                            <span>${product.prices?.length || 0} price${(product.prices?.length || 0) !== 1 ? 's' : ''}</span>
                            <span>${latestPrice ? formatDate(latestPrice.date) : 'No prices'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const product = state.products.find(p => p.id === card.dataset.id);
                openDetailModal(product);
            });
        });
    }
}

// Render sparkline SVG
function renderSparkline(prices, direction) {
    if (prices.length < 2) return '';
    
    const pricesOnly = prices.map(p => parseFloat(p.price));
    const min = Math.min(...pricesOnly);
    const max = Math.max(...pricesOnly);
    const range = max - min || 1;
    
    const points = pricesOnly.map((price, i) => {
        const x = (i / (pricesOnly.length - 1)) * 100;
        const y = 40 - ((price - min) / range) * 35;
        return `${x},${y}`;
    }).join(' ');
    
    const color = direction === 'up' ? '#EF4444' : direction === 'down' ? '#22C55E' : '#64748B';
    
    return `
        <polyline 
            fill="none" 
            stroke="${color}" 
            stroke-width="2" 
            points="${points}"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    `;
}

// Modal Management
function openModal(product = null) {
    state.editingProduct = product;
    elements.modalTitle.textContent = product ? 'Edit Product' : 'Add Product';
    
    if (product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productUrl').value = product.url || '';
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.prices?.[product.prices.length - 1]?.price || '';
        document.getElementById('productStore').value = product.store || '';
        document.getElementById('productNotes').value = product.notes || '';
    } else {
        elements.productForm.reset();
        document.getElementById('productId').value = '';
    }
    
    elements.productModal.classList.remove('hidden');
    setTimeout(() => {
        elements.modalContent.classList.remove('opacity-0', 'scale-95');
        elements.modalContent.classList.add('opacity-100', 'scale-100');
    }, 10);
}

function closeModal() {
    elements.modalContent.classList.remove('opacity-100', 'scale-100');
    elements.modalContent.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        elements.productModal.classList.add('hidden');
    }, 200);
    state.editingProduct = null;
}

function openPriceModal(productId) {
    document.getElementById('priceProductId').value = productId;
    document.getElementById('newPriceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('newPrice').value = '';
    document.getElementById('newPriceStore').value = '';
    elements.priceModal.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('priceModalContent').classList.remove('opacity-0', 'scale-95');
        document.getElementById('priceModalContent').classList.add('opacity-100', 'scale-100');
    }, 10);
}

function closePriceModal() {
    document.getElementById('priceModalContent').classList.remove('opacity-100', 'scale-100');
    document.getElementById('priceModalContent').classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        elements.priceModal.classList.add('hidden');
    }, 200);
}

function openDetailModal(product) {
    state.detailProduct = product;
    const latestPrice = product.prices?.[product.prices.length - 1];
    const { change, direction } = calculatePriceChange(product.prices || []);
    
    document.getElementById('detailName').textContent = product.name;
    document.getElementById('detailCategory').innerHTML = `<span class="${getCategoryBadgeClass(product.category)}">${getCategoryIcon(product.category)} ${state.categories.find(c => c.id === product.category)?.name || 'Other'}</span>`;
    document.getElementById('detailUrl').textContent = product.url || '';
    document.getElementById('detailUrl').classList.toggle('hidden', !product.url);
    
    // Image
    const imageContainer = document.getElementById('detailImage');
    if (product.imageUrl) {
        imageContainer.innerHTML = `<img src="${product.imageUrl}" alt="${product.name}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<span class=\\'text-4xl\\'>${getCategoryIcon(product.category)}</span>'">`;
    } else {
        imageContainer.innerHTML = `<span class="text-4xl">${getCategoryIcon(product.category)}</span>`;
    }
    
    // Price
    document.getElementById('detailPrice').textContent = formatPrice(latestPrice?.price || 0);
    
    const changeEl = document.getElementById('detailChange');
    if (direction === 'up') {
        changeEl.textContent = `↑ ${formatPrice(change)}`;
        changeEl.className = 'text-xl font-semibold text-red-500';
    } else if (direction === 'down') {
        changeEl.textContent = `↓ ${formatPrice(Math.abs(change))}`;
        changeEl.className = 'text-xl font-semibold text-green-500';
    } else {
        changeEl.textContent = '→ No change';
        changeEl.className = 'text-xl font-semibold text-slate-400';
    }
    
    // Price log
    const priceLog = document.getElementById('priceLog');
    if (product.prices?.length) {
        priceLog.innerHTML = [...product.prices].reverse().map((p, i) => `
            <div class="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div>
                    <p class="font-semibold">${formatPrice(p.price)}</p>
                    <p class="text-sm text-slate-500">${p.store || 'Unknown store'}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm">${formatDate(p.date)}</p>
                    ${i > 0 ? `<p class="text-xs ${parseFloat(p.price) < product.prices[product.prices.length - 2 - i]?.price ? 'text-green-500' : 'text-red-500'}">
                        ${parseFloat(p.price) < product.prices[product.prices.length - 2 - i]?.price ? '↓' : '↑'}
                    </p>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        priceLog.innerHTML = '<p class="text-slate-400 text-center py-4">No price history</p>';
    }
    
    // Actions
    document.getElementById('addPriceToProduct').onclick = () => {
        closeDetailModal();
        openPriceModal(product.id);
    };
    
    document.getElementById('editProductBtn').onclick = () => {
        closeDetailModal();
        openModal(product);
    };
    
    document.getElementById('deleteProductBtn').onclick = () => {
        if (confirm('Are you sure you want to delete this product?')) {
            state.products = state.products.filter(p => p.id !== product.id);
            saveProducts();
            closeDetailModal();
            renderProducts();
        }
    };
    
    elements.detailModal.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('detailModalContent').classList.remove('opacity-0', 'scale-95');
        document.getElementById('detailModalContent').classList.add('opacity-100', 'scale-100');
    }, 10);
}

function closeDetailModal() {
    document.getElementById('detailModalContent').classList.remove('opacity-100', 'scale-100');
    document.getElementById('detailModalContent').classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        elements.detailModal.classList.add('hidden');
    }, 200);
    state.detailProduct = null;
}

function openCategoryModal() {
    elements.categoryModal.classList.remove('hidden');
}

function closeCategoryModal() {
    elements.categoryModal.classList.add('hidden');
    document.getElementById('categoryName').value = '';
}

// Product CRUD
function saveProduct(e) {
    e.preventDefault();
    
    const id = document.getElementById('productId').value || generateId();
    const name = document.getElementById('productName').value.trim();
    const url = document.getElementById('productUrl').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const store = document.getElementById('productStore').value.trim();
    const notes = document.getElementById('productNotes').value.trim();
    
    const existingProduct = state.products.find(p => p.id === id);
    
    // Handle image URL
    let imageUrl = url;
    // If URL looks like an image directly, use it
    if (url && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url)) {
        imageUrl = url;
    }
    
    const newPriceEntry = {
        price: price,
        store: store,
        date: new Date().toISOString().split('T')[0]
    };
    
    if (existingProduct) {
        // Update existing product
        existingProduct.name = name;
        existingProduct.url = url;
        existingProduct.imageUrl = imageUrl;
        existingProduct.category = category;
        existingProduct.store = store;
        existingProduct.notes = notes;
        
        // Add new price if different from last
        const lastPrice = existingProduct.prices?.[existingProduct.prices.length - 1];
        if (!lastPrice || parseFloat(lastPrice.price) !== price || lastPrice.store !== store) {
            existingProduct.prices = existingProduct.prices || [];
            existingProduct.prices.push(newPriceEntry);
        }
    } else {
        // Create new product
        const newProduct = {
            id,
            name,
            url,
            imageUrl,
            category,
            store,
            notes,
            prices: [newPriceEntry],
            createdAt: new Date().toISOString()
        };
        state.products.push(newProduct);
    }
    
    saveProducts();
    closeModal();
    renderProducts();
}

function addPriceEntry(e) {
    e.preventDefault();
    
    const productId = document.getElementById('priceProductId').value;
    const price = parseFloat(document.getElementById('newPrice').value);
    const store = document.getElementById('newPriceStore').value.trim();
    const date = document.getElementById('newPriceDate').value;
    
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    product.prices = product.prices || [];
    product.prices.push({
        price,
        store,
        date
    });
    
    // Update store if provided
    if (store && !product.store) {
        product.store = store;
    }
    
    saveProducts();
    closePriceModal();
    renderProducts();
}

function addCategory(e) {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value.trim();
    if (!name) return;
    
    const id = 'cat_' + Date.now();
    const icon = '📦';
    
    state.categories.push({ id, name, icon });
    saveCategories();
    renderCategories();
    
    // Add to dropdown
    const select = document.getElementById('productCategory');
    const option = document.createElement('option');
    option.value = id;
    option.textContent = `${icon} ${name}`;
    select.appendChild(option);
    
    closeCategoryModal();
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Add product buttons
    elements.addProductBtn.addEventListener('click', () => openModal());
    elements.emptyAddBtn.addEventListener('click', () => openModal());
    
    // Modal controls
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.modalBackdrop.addEventListener('click', closeModal);
    
    // Product form
    elements.productForm.addEventListener('submit', saveProduct);
    
    // Price modal
    elements.closePriceModalBtn.addEventListener('click', closePriceModal);
    elements.cancelPriceBtn.addEventListener('click', closePriceModal);
    elements.priceModalBackdrop.addEventListener('click', closePriceModal);
    elements.priceForm.addEventListener('submit', addPriceEntry);
    
    // Detail modal
    elements.closeDetailModalBtn.addEventListener('click', closeDetailModal);
    elements.detailModalBackdrop.addEventListener('click', closeDetailModal);
    
    // Category modal
    elements.addCategoryBtn.addEventListener('click', openCategoryModal);
    elements.closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
    elements.categoryModalBackdrop.addEventListener('click', closeCategoryModal);
    elements.cancelCategory.addEventListener('click', closeCategoryModal);
    elements.categoryForm.addEventListener('submit', addCategory);
    
    // Search
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value;
            renderProducts();
        }, 300);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closePriceModal();
            closeDetailModal();
            closeCategoryModal();
        }
    });
    
    // Initialize category listeners
    setupCategoryListeners();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
