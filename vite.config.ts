/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
  ],
  test: {
    environment: 'jsdom',
    // Lets Testing Library register its automatic cleanup between tests.
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    port: 5173,
    host: true,
    // Agents write into these while a run is in flight; reloading on those writes would wipe the UI's run state.
    watch: { ignored: ['**/workspace_output/**', '**/workspace/**', '**/backend/**'] },
  },
  build: {
    rollupOptions: {
      output: {
        // Only React gets a fixed vendor chunk (every route needs it). Everything else is left to the
        // bundler so libraries used by one lazy page or component (animejs, highlight.js)
        // stay in that page's chunk instead of a shared one every route downloads.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          // Only the lazy Landing page uses three; its own chunk keeps Landing's code under the size warning.
          if (/[\/]node_modules[\/]three[\/]/.test(id)) {
            return 'vendor-three'
          }
        },
      },
    },
  },
})
