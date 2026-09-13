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
          // Aparte del resto: solo lo usa Registro.jsx (animaciones de
          // CodigoOTP), y ese ya carga perezoso (React.lazy en App.jsx). Si
          // cae en "vendor" arrastra ese peso a todo el mundo aunque nunca
          // visiten el registro.
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
