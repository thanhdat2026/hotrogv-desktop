import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // base: './' → tạo relative paths cho assets (./assets/...)
      // Cần cho Electron (file:// protocol). Web Vercel vẫn hoạt động OK.
      base: './',
      define: {
        // Expose VITE_ prefixed env vars to client code
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
        'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || ''),
        // 9Router config
        'import.meta.env.VITE_9ROUTER_URL': JSON.stringify(env.VITE_9ROUTER_URL || ''),
        'import.meta.env.VITE_9ROUTER_KEY': JSON.stringify(env.VITE_9ROUTER_KEY || ''),
        'import.meta.env.VITE_9ROUTER_MODEL': JSON.stringify(env.VITE_9ROUTER_MODEL || 'gemini-2.5-flash'),
        'import.meta.env.VITE_9ROUTER_MODELS': JSON.stringify(env.VITE_9ROUTER_MODELS || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Increase chunk size warning limit since this is a large SPA
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
          output: {
            manualChunks: {
              // Split vendor code for better caching
              'vendor-react': ['react', 'react-dom'],
              'vendor-markdown': ['react-markdown', 'remark-math', 'rehype-katex'],
              'vendor-docx': ['docx', 'file-saver'],
              'vendor-pdf': ['pdfjs-dist'],
              'vendor-ai': ['@google/genai'],
            }
          }
        }
      }
    };
});

