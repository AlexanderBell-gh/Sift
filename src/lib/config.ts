// Zero-dependency app config. Import from here (not ./api) when you only
// need API_BASE, so fuse.js + catalog JSON stay out of the initial chunk.
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://siftapi.blackmesa.workers.dev';
