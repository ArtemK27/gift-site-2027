import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) {
            return 'motion';
          }
          if (id.includes('node_modules/three/build/three.core')) {
            return 'three-core';
          }
          if (id.includes('node_modules/three/build/three.module')) {
            return 'three-webgl';
          }
          return undefined;
        },
      },
    },
  },
});
