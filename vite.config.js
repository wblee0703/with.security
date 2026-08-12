import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';

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
  base: './',
  plugins: [react(), backendDbServerPlugin()],
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
