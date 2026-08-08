import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        home: './template/home.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
