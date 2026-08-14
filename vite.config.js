import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// Ensure LOGO+WITHTECH.png is copied to public directory for reliable static serving
try {
  const rootLogo = path.resolve(__dirname, 'LOGO+WITHTECH.png');
  const publicDir = path.resolve(__dirname, 'public');
  const srcDir = path.resolve(__dirname, 'src');
  if (fs.existsSync(rootLogo)) {
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    fs.copyFileSync(rootLogo, path.resolve(publicDir, 'LOGO+WITHTECH.png'));
    fs.copyFileSync(rootLogo, path.resolve(srcDir, 'LOGO+WITHTECH.png'));
  }
} catch (e) {
  console.error('Error syncing logo file:', e);
}

function backendDbServerPlugin() {
  let dbProcess = null;
  return {
    name: 'backend-db-server',
    configureServer(server) {
      console.log('🚀 Starting Backend MySQL API Server (node server/db.js)...');
      dbProcess = spawn('node', ['server/db.js'], {
        stdio: 'inherit',
        shell: true
      });

      process.on('exit', () => {
        if (dbProcess) dbProcess.kill();
      });

      server.httpServer?.on('close', () => {
        if (dbProcess) {
          console.log('🛑 Closing Backend MySQL Server...');
          dbProcess.kill();
        }
      });
    }
  };
}

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  base: './',
  plugins: [react(), backendDbServerPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
