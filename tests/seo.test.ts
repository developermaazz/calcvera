import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CALCULATORS, MAX_TITLE_LENGTH, calculatorTitle, forCountry, liveCountries } from '../src/calculators/registry';
import { COUNTRIES } from '../src/countries';

/** SEO rules from CLAUDE.md section 10, checked for every live calculator page. */

const pages = CALCULATORS.flatMap((calc) => liveCountries(calc).map((code) => ({ calc: forCountry(calc, code), country: COUNTRIES[code]! })));
const guide = (code: string, slug: string) => readFileSync(new URL(`../src/content/guides/${code}/${slug}.md`, import.meta.url), 'utf8');
const field = (text: string, name: string) => new RegExp(`^${name}: (["']?)(.*?)\\1\\r?$`, 'm').exec(text)?.[2] ?? '';

describe('calculator page titles', () => {
  it('are at most 60 characters, unique, and lead with the country and calculator name', () => {
    const titles = pages.map(({ calc, country }) => calculatorTitle(calc, country.adjective, country.taxYear, 'Calcvera'));
    for (const [i, title] of titles.entries()) {
      const { calc, country } = pages[i]!;
      expect(title.length, title).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
      expect(title.startsWith(`${country.adjective} ${calc.name}`), title).toBe(true);
    }
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('include the tax year on tax calculators', () => {
    for (const { calc, country } of pages.filter((p) => p.calc.usesTaxYear)) {
      expect(calculatorTitle(calc, country.adjective, country.taxYear, 'Calcvera')).toContain(country.taxYear);
    }
  });

  it('example titles', () => {
    const find = (slug: string) => CALCULATORS.find((c) => c.slug === slug)!;
    expect(calculatorTitle(find('loan-calculator'), 'US', '2026', 'Calcvera')).toBe('US Loan Calculator: Monthly Payment & Interest | Calcvera');
    expect(calculatorTitle(find('take-home-pay-calculator'), 'UK', '2026/27', 'Calcvera')).toBe('UK Take-Home Pay Calculator 2026/27: Salary After Tax');
  });
});

describe('guides', () => {
  it('have an H1 that starts with the country and a description under 155 characters', () => {
    for (const { calc, country } of pages) {
      const text = guide(country.code, calc.slug);
      expect(field(text, 'h1').startsWith(`${country.adjective} `), `${country.code}/${calc.slug}`).toBe(true);
      expect(field(text, 'description').length, `${country.code}/${calc.slug}`).toBeLessThanOrEqual(155);
    }
  });
});
