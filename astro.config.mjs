import { defineConfig } from 'astro/config';

export default defineConfig({
  srcDir: './src/site',
  publicDir: './public',
  outDir: './dist',
  output: 'static',
  site: 'https://haomeile.rip',
  build: { format: 'directory', inlineStylesheets: 'never' },
});
