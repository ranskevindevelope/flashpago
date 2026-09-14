import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        // Chunks propios para librerías pesadas: al cambiar código del
        // dashboard, el navegador no vuelve a descargar recharts/react.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) return 'charts';
          if (id.includes('react-dom') || id.includes('scheduler')) return 'react';
          // Aparte: solo lo usa Registro.jsx (lazy en App.jsx); en "vendor"
          // arrastraría ese peso a todo el mundo.
          if (id.includes('framer-motion') || id.includes('/motion/') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
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
