import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Independent visual preview: no production HTML, PWA, auth, analytics or backend.
export default defineConfig({
  root: path.resolve(__dirname, 'preview/gifts'),
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { host: '127.0.0.1', port: 8081 },
  build: { outDir: path.resolve(__dirname, 'dist-gifts-preview'), emptyOutDir: true },
});
