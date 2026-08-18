import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function cspMeta(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://siftapi.blackmesa.workers.dev https://accounts.google.com https://fonts.googleapis.com https://fonts.gstatic.com",
    "frame-src https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
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
  plugins: [react(), cspMeta()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  base: './',
})
