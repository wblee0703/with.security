import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Ensure LOGO+WITHTECH.png is copied to public directory for reliable static serving
try {
  const rootLogo = path.resolve(__dirname, 'LOGO+WITHTECH.png');
  const publicDir = path.resolve(__dirname, 'public');
  const srcDir = path.resolve(__dirname, 'src');
  if (fs.existsSync(rootLogo)) {
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    fs.copyFileSync(rootLogo, path.resolve(publicDir, 'LOGO+WITHTECH.png'));
    fs.copyFileSync(rootLogo, path.resolve(srcDir, 'LOGO+WITHTECH.png'));
    const androidDrawableDir = path.resolve(__dirname, 'android/app/src/main/res/drawable');
    if (fs.existsSync(androidDrawableDir)) {
      fs.copyFileSync(rootLogo, path.resolve(androidDrawableDir, 'logo_withtech.png'));
    }
  }
} catch (e) {
  console.error('Error syncing logo file:', e);
}

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    hmr: {
      clientPort: 3000
    },
    open: true
  }
});
