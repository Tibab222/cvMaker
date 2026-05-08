import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: 'electron/main.dev.ts',
      formats: ['cjs'],
    },
    outDir: '.vite/build',
    rollupOptions: {
      external: ['electron'],
    },
  },
});