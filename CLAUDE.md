# Calcvera — Project Memory

Read this file first in every session. It is the single source of truth for this project. Follow it without re-asking. If a task conflicts with this file, say so in one line and follow this file unless the owner says otherwise.

## 1. Identity

- **Name:** Calcvera ("calc" + "vera", truth: accurate calculators)
- **Domain:** calcvera.com
- **Tagline:** Money calculators that get your country's rules right.
- **Email:** hello@calcvera.com
- **What it is:** free, fast, country-specific finance calculators, each with a short guide that explains the result.
- **Audience:** adults in the US, UK, Canada and Australia making loan, debt, tax, savings and retirement decisions. India and Pakistan are added later for extra volume.
- **Business model:** display ads (AdSense first, then Journey by Mediavine, then Raptive), plus clearly disclosed affiliate links.
- **Voice:** clear, calm, neutral, plain English (grade 8). Educational, never financial advice. No hype, no emoji.

## 2. Rollout order

1. **Phase 1:** US + UK, the 10 launch calculators in section 12
2. **Phase 2 (month 4–6):** Canada + Australia
3. **Phase 3 (later):** India + Pakistan
4. Keep at least 50% of traffic from US/UK/CA/AU/NZ (Raptive requirement).

## 3. Tech stack (fixed, do not swap without the owner's approval)

| Layer | Choice |
| --- | --- |
| Framework | Astro, static output only (`output: 'static'`), no SSR |
| Language | TypeScript, `strict: true` (pinned to TypeScript 6: `astro check` does not support 7 yet) |
| Styling | Plain CSS with custom properties; one global stylesheet + scoped component styles |
| Interactivity | Astro islands with vanilla TS only; no React/Vue/Svelte |
| Charts | Hand-written SVG; no chart libraries |
| Tests | Vitest |
| SEO | @astrojs/sitemap; hand-written JSON-LD; hreflang in BaseLayout |
| Hosting | GitHub repo → Cloudflare (Workers static assets) |
| Analytics | Google Analytics 4 + Google Search Console |
| Package manager | npm, Node.js LTS |

New dependencies need a one-line reason and the owner's approval. Prefer zero runtime dependencies.

## 4. Commands

```
npm run dev           # local dev server
npm test              # Vitest, must pass before any commit
npm run build         # static build to dist/
npm run preview       # preview the build
npm run check         # astro check (types)
npm run check:verify  # lists VERIFY markers; fails if any [VERIFY] remains in a guide
```

## 5. Folder structure

```
src/
  config/site.ts            site name, domain, email, ADSENSE_CLIENT ('' until approved), GA ID
  engines/                  pure calculator math, one file per calculator type (loan.ts, takeHomePay.ts)
  countries/                us.ts, uk.ts, ca.ts, au.ts, in.ts, pk.ts + types.ts (CountryConfig) + index.ts
  calculators/registry.ts   every calculator: slug, engine, countries, category, title, related slugs
  calculators/<engine>/     engine UI (LoanCalculator.astro) + view.ts (result → display strings/markup)
  components/               CalculatorShell, ResultSummary, SvgChart, AmortizationTable, AdSlot,
                            CountryBanner, CountrySwitcher, Breadcrumbs, FAQ, RelatedCalculators
  layouts/                  BaseLayout.astro, CalculatorLayout.astro, PageLayout.astro
  lib/                      format.ts (Intl), charts.ts (SVG builders), storage.ts (localStorage)
  content.config.ts         guides collection schema
  content/guides/[country]/ one .md guide per calculator, file name = slug
  pages/                    index, [country]/index, [country]/[slug], about, contact, privacy,
                            terms, disclaimer, methodology, 404
  styles/global.css         design tokens + base styles
tests/engines/              one test file per engine
scripts/check-verify.mjs    VERIFY marker report
public/                     robots.txt, ads.txt, favicon.svg, _headers, og-default.png
```

## 6. Architecture rules

- **Engines are pure:** input object in, result object out. No DOM, no formatting, no country lookups inside an engine. Country values are passed in.
- **Countries are data:** every country-specific number lives in `src/countries/*.ts`, never in an engine or component.
- **One registry:** a calculator page exists only if it is listed in `registry.ts` for that country. Pages are generated with `getStaticPaths` from the registry.
- **Shared UI:** every calculator page uses CalculatorShell + ResultSummary + AdSlot + FAQ + RelatedCalculators. No one-off page layouts.
- **No server, no cookies set by us, no user data sent anywhere.** All math runs in the browser.
- **localStorage** only for the remembered country and dismissed banner, always wrapped in try/catch.

## 7. Calculator standards

- **Live results:** recalculate on every input change; no "Calculate" button.
- **Defaults:** realistic default values so a result shows on page load.
- **Validation:** never show NaN, Infinity or negative money. Show a friendly inline message next to the field. Clamp to sensible min/max.
- **Precision:** calculate at full precision; round only when displaying. Money to 2 decimals (0 decimals for large summary figures over 10,000 when space is tight).
- **Formatting:** use `Intl.NumberFormat` with the country's locale and currency. Percentages with up to 2 decimals.
- **Loans:** monthly rate = APR / 12 for US/UK/AU personal and auto loans. The final payment is adjusted so the balance ends at exactly 0. Handle 0% APR separately (principal / months).
- **Canada mortgages:** fixed-rate mortgages compound semi-annually, not monthly. Convert to an effective monthly rate.
- **Outputs on every calculator:** the main figure, a one-sentence plain-English summary, a breakdown (chart and/or table), and a "How this is calculated" box with the formula.
- **Dates:** payoff dates from the current month; display as "March 2029".
- **Accessibility:** every input has a visible `<label>`, units shown next to the input, results in an `aria-live="polite"` region, full keyboard use, focus states visible.

## 8. Country config and accuracy rules

- Every tax band, allowance, limit or rate has a comment: `// VERIFY: <official source URL> (tax year)`.
- Official sources only: US IRS.gov / SSA.gov; UK GOV.UK / HMRC; Canada canada.ca / CRA; Australia ATO.gov.au; India incometax.gov.in; Pakistan FBR.gov.pk.
- Never invent or guess a tax figure. If unknown, stop and ask the owner for the official figure.
- Each country config holds `taxYear`, and every tax calculator page shows "Updated for the [tax year] tax year".
- Update windows: US in January, UK and Australia by April/July (new tax years), Canada in January, Pakistan after the June budget, India after the February budget.

## 9. URLs and naming

- Calculator URL: `/[country]/[slug]/`, country codes `us uk ca au in pk`, lowercase.
- Slugs: lowercase, hyphenated, end in `-calculator` (e.g. `used-car-loan-calculator`). Never change a published slug; if you must, add a 301 redirect.
- Files: engines camelCase (`takeHomePay.ts`), components PascalCase (`SvgChart.astro`), guides = slug (`take-home-pay-calculator.md`).
- Trailing slash on all URLs.

## 10. SEO standards (every calculator page)

- **Title:** `{Calculator Name} ({Country}) | Calcvera`, under 60 characters. Drop "| Calcvera" if over.
- **H1:** the calculator name with the main search phrase, e.g. "UK Take-Home Pay Calculator".
- **Meta description:** under 155 characters, says what it calculates and for whom.
- **Canonical:** self-referencing absolute URL.
- **hreflang:** link equivalent pages across countries (`en-us`, `en-gb`, `en-ca`, `en-au`, `en-in`, `en-pk`) plus `x-default` pointing to the US version (or the homepage if no US version exists).
- **JSON-LD:** WebApplication (applicationCategory FinanceApplication, offers price 0) + FAQPage + BreadcrumbList.
- **Internal links:** 3–5 related calculators from the registry, plus a breadcrumb to the country hub.
- **Sitemap:** generated automatically; every new page is included.
- **Never auto-redirect by location.** CountryBanner only suggests.

## 11. Guide content standards

- **Length:** 800–1,300 words below the calculator.
- **Structure, in order:** How to use this calculator → Worked example (real numbers from our own engine) → How it's calculated → 4–6 tips → FAQ (5–8 questions from Google "People also ask") → Related calculators → "Last updated [Month Year]" + sources.
- **Facts:** every rate, limit or law links to an official source. Mark unchecked facts `[VERIFY]` in drafts; none may remain at publish.
- **No:** invented statistics, filler intros, "in today's world", keyword stuffing, promises of savings, personal financial advice.
- **Spelling:** US pages use US spelling and $; UK pages use UK spelling and £; CA/AU/IN/PK use their own currency and local terms (e.g. "superannuation", "EMI", "zakat").
- Every page ends with the disclaimer component.

## 12. Calculator backlog (build in this order)

**Launch set (Phase 1, US + UK):**

| # | Country | Slug | Engine |
| --- | --- | --- | --- |
| 1 | US, UK | loan-calculator | loan |
| 2 | US | used-car-loan-calculator | loan + trade-in/tax |
| 3 | US | auto-loan-refinance-calculator | refinance |
| 4 | US, UK | credit-card-payoff-calculator | debtPayoff |
| 5 | US | personal-loan-payoff-calculator | loan + extra payments |
| 6 | US | 401k-match-calculator | retirementMatch |
| 7 | UK | take-home-pay-calculator | takeHomePay |
| 8 | UK | stamp-duty-calculator | propertyTax |
| 9 | UK | student-loan-repayment-calculator | studentLoan |
| 10 | UK | car-finance-calculator | loan + balloon (PCP) |

**Next (Phase 1 continued):** US/UK debt-snowball-calculator, compound-interest-calculator, savings-goal-calculator, rent-vs-buy-calculator; US roth-ira-calculator, heloc-payment-calculator, paycheck-calculator; UK isa-savings-calculator, pension-tax-relief-calculator, mortgage-overpayment-calculator.

**Phase 2:** CA rrsp-vs-tfsa-calculator, income-tax-calculator, cpp-calculator, land-transfer-tax-calculator, mortgage-payment-calculator. AU super-calculator, take-home-pay-calculator, stamp-duty-calculator, hecs-help-repayment-calculator, home-loan-repayment-calculator.

**Phase 3:** IN emi-calculator, sip-calculator, ppf-calculator, income-tax-calculator. PK salary-tax-calculator, zakat-calculator, loan-calculator.

## 13. Design standards

```
--color-navy:   #0F2A4A   headings, header, primary text on light
--color-green:  #1F8A5B   primary buttons, positive figures, links on hover
--color-ink:    #1C2430   body text
--color-muted:  #5B6675   secondary text
--color-line:   #DDE3EA   borders, dividers
--color-bg:     #F7F9FB   page background
--color-card:   #FFFFFF   calculator and content cards
--color-warn:   #B7791F   validation messages
--color-error:  #C53030   errors only
```

- Dark mode via `prefers-color-scheme`, same tokens redefined.
- **Type:** system font stack (no web fonts). Body 17px / 1.6, H1 32px (28px mobile), H2 24px.
- **Spacing:** 8px scale (8, 16, 24, 32, 48). Content width max 760px; calculator card max 960px.
- **Layout:** mobile-first; at 900px+ inputs left, results right. Results visible without scrolling on mobile after the first input group.
- **Contrast:** WCAG AA minimum. Tap targets at least 44px.

## 14. Performance budget (per page)

- Lighthouse performance, accessibility, SEO, best practices: 95+
- LCP under 2.0s on mobile, CLS under 0.05
- Page JavaScript under 30 KB gzipped (excluding ads)
- No layout shift from ads: AdSlot reserves fixed height

## 15. Ads and affiliate rules

- AdSense code loads only when `ADSENSE_CLIENT` in `site.ts` is set.
- Placements: one AdSlot directly below results, one or two inside the guide, Auto ads for mobile anchor. Never inside or overlapping the calculator, never styled like our buttons.
- Never click our own ads or ask anyone to.
- Affiliate links: `rel="sponsored noopener"`, a visible disclosure line above the first affiliate link on the page, and listed in the Disclaimer page.

## 16. Testing and definition of done

A calculator is done only when all of these are true:

- [ ] Engine has at least 6 Vitest tests, including edge cases (0% rate, minimum term, extra payment, max values, empty input)
- [ ] 3 results checked against a trusted external calculator, values noted in the test file comments
- [ ] No `[VERIFY]` left in config or guide
- [ ] Registered in `registry.ts` with related slugs
- [ ] Guide follows section 11
- [ ] Title, meta, canonical, hreflang and JSON-LD present
- [ ] `npm test`, `npm run check` and `npm run build` pass
- [ ] Checked on a phone-width screen

## 17. Git

- Branch `main` deploys to production. Work on short branches named `calc/<slug>` or `fix/<topic>`.
- Commit messages: `feat(uk): add stamp-duty-calculator`, `fix(engine-loan): final payment rounding`, `content(us): update 401k guide`, `chore: ...`.

## 18. How the AI assistant works on this project (token-saving rules)

- Do not re-explain the project, stack or rules; they are in this file.
- Read only the files needed for the task. Use the registry and folder structure above to find them.
- When changing code, show only new or changed files, or a diff for large files. Never reprint unchanged files.
- Reuse existing engines and components before writing new ones.
- Ask at most one question, only when a fact cannot be found here or in the code (usually an official tax figure).
- After finishing, report in 3 lines max: what changed, test result, anything left to verify.
- When a rule here is outdated or a decision changes, propose the exact edit to this file.

## 19. Never

- Never invent tax figures, statistics, sources or reviews.
- Never auto-redirect visitors by location or show Google different content than users.
- Never add tracking beyond GA4, or collect personal data.
- Never mass-generate pages without full guides and tests.
- Never present results as financial advice.
