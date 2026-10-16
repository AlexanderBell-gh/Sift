import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { devTestsWriter } from './vite-plugin-dev-tests'

function cspMeta(): Plugin {
  // Keep in sync with public/_headers (real header, enforced by Pages).
  // Meta is a fallback only and cannot enforce frame-ancestors.
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://siftapi.blackmesa.workers.dev https://accounts.google.com",
    "frame-src https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ].join('; ')
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), cspMeta(), devTestsWriter()],
  resolve: {
    // Dev test page only: lets the browser import the same *.test.js/ts
    // files `node --test` runs by shimming 'node:test' (describe/it
    // collector) and 'node:assert/strict' (equal/notEqual/deepEqual/ok).
    // node --test and CI never touch Vite, so they are unaffected.
    alias: [
      { find: /^node:test$/, replacement: '/src/lib/dev-test-shims/node-test.ts' },
      { find: /^node:assert\/strict$/, replacement: '/src/lib/dev-test-shims/node-assert.ts' },
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // React framework code changes rarely — cache it apart from app code.
        manualChunks: (id) => {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom') || id.includes('node_modules/react/')) return 'vendor';
        },
      },
    },
  },
  base: './',
})
