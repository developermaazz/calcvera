import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * One guide per calculator per country: src/content/guides/[country]/[slug].md.
 * Entry ids are "us/loan-calculator". The calculator page fails to build if its guide is missing.
 */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    /** H1 with the main search phrase. */
    h1: z.string(),
    /** Meta description, under 155 characters. */
    description: z.string().max(155),
    /** One sentence under the H1 saying what the calculator does. */
    intro: z.string(),
    updated: z.coerce.date(),
    faqs: z
      .array(z.object({ q: z.string(), a: z.string() }))
      .min(5)
      .max(8),
    sources: z.array(z.object({ name: z.string(), url: z.url() })).default([]),
  }),
});

export const collections = { guides };
