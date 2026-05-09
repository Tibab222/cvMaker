import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.dev.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3', '@xenova/transformers'],
              output: {
                entryFileNames: '[name].mjs',
                format: 'esm',
              }
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          if (options.startup) {
            options.startup();
          } else {
            options.reload();
          }
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs',
                exports: 'none',
              },
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '/shared',
    },
  }
})
