// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * lastmod for the sitemap: each calculator page uses its guide's "updated" date; a country hub and the
 * homepage use the newest guide date they list. Other pages get no lastmod.
 */
function guideDates() {
  const dates = new Map();
  const root = new URL('./src/content/guides/', import.meta.url);
  for (const country of readdirSync(root)) {
    for (const file of readdirSync(new URL(`${country}/`, root))) {
      const text = readFileSync(new URL(`${country}/${file}`, root), 'utf8');
      const updated = /^updated:\s*(\d{4}-\d{2}-\d{2})/m.exec(text)?.[1];
      if (updated) dates.set(`/${country}/${file.replace(/\.md$/, '')}/`, updated);
    }
  }
  return dates;
}
const GUIDE_DATES = guideDates();
/** @param {string} prefix */
const newest = (prefix) => [...GUIDE_DATES].filter(([path]) => path.startsWith(prefix)).map(([, d]) => d).sort().at(-1);

export default defineConfig({
  site: 'https://calc-vera.com',
  output: 'static',
  trailingSlash: 'always',
  // Inline the stylesheet: saves a render-blocking request on first paint (CLAUDE.md section 14: LCP < 2s).
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const isHub = /^\/[a-z]{2}\/$/.test(path);
        const lastmod = GUIDE_DATES.get(path) ?? (isHub ? newest(path) : path === '/' ? newest('/') : undefined);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
