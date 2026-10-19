/**
 * Wraps each H2 of a calculator guide, and the content under it, in
 * <section class="guide-section" data-section="{heading id}"> so the worked example and tips can be styled
 * as cards. Structure only: headings and text are unchanged. Runs at build time for static pages (and on
 * each request in `npm run dev`).
 */
import { defineMiddleware } from 'astro:middleware';

const START = '<div class="guide-body">';
const END = '<div class="guide-end"';

export function wrapGuideSections(html: string): string {
  const start = html.indexOf(START);
  const end = html.indexOf(END, start);
  if (start < 0 || end < 0) return html;
  const bodyStart = start + START.length;
  const body = html.slice(bodyStart, end);
  const parts = body.split(/(?=<h2[\s>])/);
  const wrapped = parts
    .map((part) => {
      if (!part.startsWith('<h2')) return part;
      const id = /^<h2[^>]*\sid="([^"]+)"/.exec(part)?.[1] ?? '';
      return `<section class="guide-section" data-section="${id}">${part}</section>`;
    })
    .join('');
  return html.slice(0, bodyStart) + wrapped + html.slice(end);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('text/html') || !/^\/[a-z]{2}\/[^/]+-calculator\/$/.test(context.url.pathname)) return response;
  const html = await response.text();
  return new Response(wrapGuideSections(html), { status: response.status, headers: response.headers });
});
