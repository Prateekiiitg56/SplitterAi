import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base so dist/ works when served from a sub-path (the project preview).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
