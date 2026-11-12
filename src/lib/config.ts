// Zero-dependency app config. Import from here (not ./api) when you only
// need API_BASE, so fuse.js + catalog JSON stay out of the initial chunk.
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://siftapi.blackmesa.workers.dev';

// Legal pages (privacy, cookies, terms, about, license) live on the landing site.
export const LANDING_URL = 'https://siftuk.pages.dev';
