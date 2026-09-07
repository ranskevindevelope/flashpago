import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        // Separar las librerías pesadas en chunks propios: al cambiar código
        // del dashboard el navegador no tiene que volver a descargar recharts
        // ni react, que casi nunca cambian.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) return 'charts';
          if (id.includes('react-dom') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
