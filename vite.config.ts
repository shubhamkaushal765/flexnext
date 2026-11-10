import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      // build only: plugin-react injects an inline preamble script in dev
      name: 'csp',
      apply: 'build',
      transformIndexHtml: () => [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ],
    },
  ],
})
