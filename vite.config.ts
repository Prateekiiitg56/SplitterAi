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
  server: {
    port: 5173,
    host: true,
    // Agents write into these while a run is in flight; reloading on those writes would wipe the UI's run state.
    watch: { ignored: ['**/workspace_output/**', '**/workspace/**', '**/backend/**'] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Match the three package itself; a bare 'three' also caught @designcodeio/threeui's CSS,
            // which made every route eagerly load the WebGL chunk.
            if (id.includes('/node_modules/three/')) {
              return 'vendor-three'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('lucide-react') || id.includes('@phosphor-icons')) {
              return 'vendor-icons'
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            return 'vendor-libs'
          }
        },
      },
    },
  },
})
