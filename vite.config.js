import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function jsonDiskSyncPlugin() {
  return {
    name: 'json-disk-sync',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/sync-json' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { filename, data } = JSON.parse(body);
              if (['sites.json', 'users.json', 'pledges.json'].includes(filename)) {
                const targetPath = path.resolve(__dirname, 'src/data', filename);
                fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, file: filename }));
                return;
              }
            } catch (err) {
              console.error('Disk Sync Middleware Error:', err);
            }
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false }));
          });
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), jsonDiskSyncPlugin()],
  server: {
    port: 3000,
    open: true
  }
});
