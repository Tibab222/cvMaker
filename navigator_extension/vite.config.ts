import { defineConfig } from 'vite';
import { resolve } from 'path';
import { mkdirSync, existsSync, cpSync, rmSync } from 'fs';

// function relocateHtmlPlugin(browser: string): Plugin {
//   return {
//     name: 'relocate-html-output',
//     closeBundle() {
//       const outDir = resolve(__dirname, `dist/${browser}`);
//       const nestedHtml = resolve(outDir, 'src/sidebar/sidebar.html');
//       const targetHtml = resolve(outDir, 'sidebar/sidebar.html');

//       if (existsSync(nestedHtml)) {
//         const targetDir = dirname(targetHtml);
//         if (!existsSync(targetDir)) {
//           mkdirSync(targetDir, { recursive: true });
//         }

//         renameSync(nestedHtml, targetHtml);

//         const srcDir = resolve(outDir, 'src');
//         if (existsSync(srcDir)) {
//           rmSync(srcDir, { recursive: true, force: true });
//         }
//       }

//       const manifestSrc = resolve(__dirname, `platforms/${browser}/manifest.json`);
//       const manifestDest = resolve(outDir, 'manifest.json');

//       if (existsSync(manifestSrc)) {
//         copyFileSync(manifestSrc, manifestDest);
//         console.log(`\n Manifest copied -> dist/${browser}/manifest.json`);
//       }
//     }
//   };
// }

const r = (p: string) => resolve(__dirname, p);

// mode = "<browser>-<target>", ex: "chrome-content", "firefox-sidebar"
export default defineConfig(({ mode }) => {
  const [browser, target] = mode.split('-') as [string, 'sidebar' | 'content' | 'background'];
  const outDir = r(`dist/${browser}`);

  const copyStaticAssets = () => ({
    name: 'copy-platform-assets',
    closeBundle() {
      const platformDir = r(`platforms/${browser}`);
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      const htmlToCopy = target === 'sidebar' ? outDir + '/src/sidebar/sidebar.html' : null;
      if (htmlToCopy && existsSync(htmlToCopy)) {
        const targetHtml = resolve(outDir, 'sidebar/sidebar.html');
        const targetDir = resolve(outDir, 'sidebar');
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }
        cpSync(htmlToCopy, targetHtml);
        rmSync(htmlToCopy, { force: true });
        // Remove the empty 'src' directory if it exists
        const srcDir = resolve(outDir, 'src');
        if (existsSync(srcDir)) {
          rmSync(srcDir, { recursive: true, force: true });
        }
        console.log(`\nCopied HTML for ${browser} -> dist/${browser}/sidebar/sidebar.html`);
      }
      if (existsSync(platformDir)) {
        console.log(`platformDir: ${platformDir}; outDir: ${outDir}`);
        cpSync(platformDir, outDir, { recursive: true });
        console.log(`\nCopied assets for ${browser} -> dist/${browser}/`);
      }
    }
  });

  const base = {
    resolve: { alias: { '@': r('./src') } }
  };

  if (target === 'sidebar') {
    return {
      ...base,
      build: {
        outDir,
        emptyOutDir: true,
        rollupOptions: {
          input: { 'sidebar/sidebar': r('src/sidebar/sidebar.html') },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]'
          }
        }
      },
      plugins: [copyStaticAssets()]
    };
  }

  const entry = target === 'content' ? 'src/content/index.ts' : 'src/background/index.ts';

  return {
    ...base,
    build: {
      outDir,
      emptyOutDir: false, // ne pas écraser ce que le build sidebar a produit
      rollupOptions: {
        input: r(entry),
        output: {
          format: 'iife',
          entryFileNames: `${target}/index.js`,
          inlineDynamicImports: true
        }
      }
    }
  };
});