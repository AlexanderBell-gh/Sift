import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Sift — Grocery Price Tracker',
    description: 'Extract product data from UK supermarkets and add to your Sift watchlist.',
    permissions: ['activeTab', 'storage'],
    host_permissions: [
      'https://www.tesco.com/*',
      'https://www.sainsburys.co.uk/*',
      'https://siftapi.blackmesa.workers.dev/*',
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'Sift',
    },
    icons: {
      '16': 'icon16.png',
      '48': 'icon48.png',
      '128': 'icon128.png',
    },
  },
});
