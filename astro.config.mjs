// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://calc-vera.com',
  output: 'static',
  trailingSlash: 'always',
  // Inline the stylesheet: saves a render-blocking request on first paint (CLAUDE.md section 14: LCP < 2s).
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
