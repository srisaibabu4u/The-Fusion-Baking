import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When running `netlify dev`, Netlify proxies /api/* to the functions.
// When running plain `vite`, point /api at a running `netlify dev` on 8888.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: process.env.NETLIFY_DEV ? undefined : { '/api': 'http://localhost:8888' },
  },
})
