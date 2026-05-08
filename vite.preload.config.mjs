import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
      external: ['electron'],
    },
  },
});