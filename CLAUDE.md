# Calcvera — Project Memory

Read this file first in every session. It is the single source of truth for this project. Follow it without re-asking. If a task conflicts with this file, say so in one line and follow this file unless the owner says otherwise.

## 1. Identity

- **Name:** Calcvera ("calc" + "vera", truth: accurate calculators)
- **Domain:** calc-vera.com
- **Tagline:** Money calculators that get your country's rules right.
- **Email:** hello@calc-vera.com
- **What it is:** free, fast, country-specific finance calculators, each with a short guide that explains the result.
- **Audience:** adults in the US, UK, Canada and Australia making loan, debt, tax, savings and retirement decisions. India and Pakistan are added later for extra volume.
- **Business model:** display ads (AdSense first, then Journey by Mediavine, then Raptive), plus clearly disclosed affiliate links.
- **Voice:** clear, calm, neutral, plain English (grade 8). Educational, never financial advice. No hype, no emoji.

## 2. Rollout order

1. **Phase 1:** US + UK, the 10 launch calculators in section 12
2. **Phase 2 (month 4–6):** Canada + Australia
3. **Phase 3 (later):** India + Pakistan
4. Keep at least 50% of traffic from US/UK/CA/AU/NZ (Raptive requirement).
5. CA and AU start early with one calculator each (FHSA, novated lease); their full rollout stays in Phase 2.

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
| Brand assets | Dev-only: sharp + png-to-ico (`scripts/brand/build-icons.mjs`); Python fontTools for outlined logo text (`scripts/brand/make-brand-svgs.py`) |

New dependencies need a one-line reason and the owner's approval. Prefer zero runtime dependencies.

## 4. Commands

```
npm run dev           # local dev server
npm test              # Vitest, must pass before any commit
npm run build         # static build to dist/
npm run preview       # preview the build
npm run check         # astro check (types)
npm run check:verify  # lists VERIFY markers; fails if any [VERIFY] remains in a guide
npm run indexnow      # tell IndexNow (Bing etc.) about pages; --days=N, --since=DATE or URLs. Runs automatically
                      # after each push to main (.github/workflows/indexnow.yml, pages changed in 2 days)
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
                            CountryBanner, CountrySwitcher, Breadcrumbs, FAQ, RelatedCalculators,
                            Field, SelectField, CheckboxField (form fields with data-field/data-msg/data-when),
                            Header (search, menu), Footer, ThemeToggle, LogoMark, Icon, Flag
  layouts/                  BaseLayout.astro, CalculatorLayout.astro, PageLayout.astro
  lib/                      format.ts (Intl), charts.ts (SVG builders), storage.ts (localStorage),
                            calcUi.ts (shared live-update wiring for calculators: model.ts builds the view),
                            icons.ts (line-icon set + engine/category icon maps), countUp.ts (display-only)
  scripts/site.ts           all site-wide browser behaviour in one module (header, search, theme, fade-ups,
                            TOC, calculator display polish); loaded once from BaseLayout
  middleware.ts             wraps each guide H2 section in <section class="guide-section" data-section>
  content.config.ts         guides collection schema
  content/guides/[country]/ one .md guide per calculator, file name = slug
  pages/                    index, [country]/index, [country]/[slug], about, contact, privacy,
                            terms, disclaimer, methodology, 404
  styles/tokens.css         design tokens (light + dark); fonts.css (self-hosted fonts); global.css (components)
tests/engines/              one test file per engine
scripts/check-verify.mjs    VERIFY marker report
scripts/brand/              make-brand-svgs.py + build-icons.mjs (logo, favicons, share image)
docs/redesign-brief.md      the owner's UI/brand brief and decision log: read before any UI work
public/                     robots.txt, ads.txt, _headers, fonts/, brand/ (logo files), icon.svg, favicon.ico,
                            apple-touch-icon.png, icon-*.png, manifest.webmanifest, og-default.png
```

## 6. Architecture rules

- **Engines are pure:** input object in, result object out. No DOM, no formatting, no country lookups inside an engine. Country values are passed in.
- **Countries are data:** every country-specific number lives in `src/countries/*.ts`, never in an engine or component.
- **One registry:** a calculator page exists only if it is listed in `registry.ts` for that country and not marked `draft: true`. Pages are generated with `getStaticPaths` from the registry. Drafts get no page, no links and no sitemap entry; remove `draft` only when section 16 is met.
- **Shared UI:** every calculator page uses CalculatorShell + ResultSummary + AdSlot + FAQ + RelatedCalculators. No one-off page layouts.
- **No server, no cookies set by us, no user data sent anywhere.** All math runs in the browser.
- **localStorage** only for the remembered country, dismissed banner and theme choice, always wrapped in try/catch.

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
- Unfilled figures are `null` (type `Pending<T>`) with their VERIFY comment. Engines and pages read them only through `requireFigure()`, which fails the build while a figure is still null.
- Each country config holds `taxYear`, and every tax calculator page shows "Updated for the [tax year] tax year".
- Update windows: US in January, UK and Australia by April/July (new tax years), Canada in January, Pakistan after the June budget, India after the February budget.

## 9. URLs and naming

- Calculator URL: `/[country]/[slug]/`, country codes `us uk ca au in pk`, lowercase.
- Slugs: lowercase, hyphenated, end in `-calculator` (e.g. `used-car-loan-calculator`). Never change a published slug; if you must, add a 301 redirect.
- Files: engines camelCase (`takeHomePay.ts`), components PascalCase (`SvgChart.astro`), guides = slug (`take-home-pay-calculator.md`).
- Trailing slash on all URLs.

## 10. SEO standards (every calculator page)

- **Title:** built by `calculatorTitle()` in registry.ts: `{Country adjective} {Calculator Name} {tax year if usesTaxYear}: {titleHook} | Calcvera`, at most 60 characters. Drops "| Calcvera", then the hook, if too long. Every registry entry needs a `titleHook` (what the page gives you, e.g. "Salary After Tax"). `tests/seo.test.ts` enforces length, uniqueness and the country prefix.
- **H1:** the guide's `h1`, starting with the country adjective (US, UK, Canadian, Australian), e.g. "UK Take-Home Pay Calculator". Enforced by `tests/seo.test.ts`.
- **Meta description:** under 155 characters, says what it calculates and for whom.
- **Canonical:** self-referencing absolute URL.
- **hreflang:** link equivalent pages across countries (`en-us`, `en-gb`, `en-ca`, `en-au`, `en-in`, `en-pk`) plus `x-default`: the US version; or the page itself if it exists in one country only; or the homepage. Country hubs use the homepage.
- **JSON-LD:** WebApplication (applicationCategory FinanceApplication, offers price 0) + FAQPage + BreadcrumbList.
- **Internal links:** 3–5 related calculators from the registry, plus a breadcrumb to the country hub.
- **Sitemap:** generated automatically; every new page is included, with `lastmod` from the guide's `updated` date (hubs and the homepage take their newest guide date). Bump `updated` whenever a guide or its figures change.
- **Author:** calculator pages show "By M. Maaz Ali" (links to /about/) and carry `author` in the WebApplication JSON-LD.
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

**Next (Phase 1 continued):** US/UK debt-snowball-calculator (built 19 Oct 2026, engine debtSnowball), compound-interest-calculator (built 20 Oct 2026), savings-goal-calculator (built 20 Oct 2026), rent-vs-buy-calculator (built 20 Oct 2026); US roth-ira-calculator, heloc-payment-calculator, paycheck-calculator; UK isa-savings-calculator, pension-tax-relief-calculator, mortgage-overpayment-calculator.

**Batch 2 (built 16 Oct 2026; live in the registry):**

| # | Country | Slug | Engine | Inputs | Outputs |
| --- | --- | --- | --- | --- | --- |
| B1 | US | debt-to-income-ratio-calculator | dti | Gross monthly income; rent or mortgage; car loans; student loans; credit card minimums; other monthly debts | Front-end and back-end DTI %; what common lender ranges mean; how much debt to cut to reach a target ratio |
| B2 | US | car-affordability-calculator | loan (inverse) | Monthly budget, down payment, trade-in value, amount owed on trade-in, APR, term, sales tax %, fees | Maximum car price, loan amount, total interest |
| B3 | US | debt-consolidation-calculator | debtPayoff + loan | Up to 10 debts (balance, APR, monthly payment), new loan APR, term, origination fee % | Current payoff time and interest; new payment and interest; total savings or extra cost; break-even month |
| B4 | UK | redundancy-pay-calculator | redundancyPay | Age, full years of service, weekly pay before tax, region (England/Scotland/Wales or Northern Ireland) | Statutory amount; tax-free portion note. Rule: half a week's pay per year under 22, one week for 22 to 40, one and a half weeks for 41+, max 20 years, weekly pay capped. Caps and tax-free limit from uk.ts |
| B5 | UK | inheritance-tax-calculator | inheritanceTax | Estate value, debts and funeral costs, gifts in last 7 years, home passed to direct descendants (yes/no + value), married/civil partner, transferred unused allowances, % left to charity | Nil-rate band, residence nil-rate band after taper, taxable amount, tax due (standard rate, or reduced rate if the charity condition is met) |
| B6 | US | quarterly-estimated-tax-calculator | selfEmploymentTax | Net self-employment income, filing status, other income, deductions (standard or itemized amount) | Self-employment tax, estimated federal income tax, total, the 4 quarterly payments with due dates. Federal only; say on the page that state tax is out of scope |
| B7 | CA | fhsa-calculator | fhsa | Starting balance, annual contribution, years, expected return %, province, marginal tax rate (or income to estimate it), unused carry-forward room | Projected balance, total contributions, total tax refunds, a warning when annual or lifetime limits are hit |
| B8 | AU | novated-lease-calculator | novatedLease | Annual salary, car price, lease term, interest rate, annual running costs, electric vehicle (FBT-exempt) yes/no | Pre-tax and post-tax deductions, change in take-home pay, total cost vs buying outright with savings. Residual uses the ATO minimum residual for the term |

**Phase 2:** CA rrsp-vs-tfsa-calculator, income-tax-calculator, cpp-calculator, land-transfer-tax-calculator, mortgage-payment-calculator. AU super-calculator, take-home-pay-calculator, stamp-duty-calculator, hecs-help-repayment-calculator, home-loan-repayment-calculator.

**Phase 3:** IN emi-calculator, sip-calculator, ppf-calculator, income-tax-calculator. PK salary-tax-calculator, zakat-calculator, loan-calculator.

## 13. Design standards

Full spec: `docs/redesign-brief.md` ("a private bank's annual report crossed with a precision instrument"). Tokens live in `src/styles/tokens.css`; never hard-code colours in components.

- **Colour:** navy #0F2A4A anchor (50–950 scale), one jade accent (#12B886 fills, #087A58 text on light), amber #E8A33D for interest/cost, warm paper #F7F7F4 page, white cards, hairlines #E4E6EA, ink #0E1B2C, muted #5B6676. Dark mode from deep navy (#0A1626 page, #0F2036 cards), never black. Every text pair passes WCAG AA (ratios noted in tokens.css).
- **Theme:** light/dark follow the OS; the header toggle (system/light/dark) sets `data-theme` on <html>, applied before paint by an inline head script.
- **Type:** self-hosted variable WOFF2 (Latin): Fraunces (headings, wordmark), Inter (UI, body), JetBrains Mono (formulas), with metric-matched fallbacks so fonts never shift layout. All numbers use tabular figures. Fluid scale with clamp(); prose about 68ch, line height 1.65.
- **Surfaces:** 8px grid, radius 16px cards / 10px inputs / pill chips, hairline borders plus soft layered shadows. Signature graph-paper grid motif (`.grid-motif`) behind page heads only.
- **Results:** deep navy card (dark mode: raised surface with jade hairline), big primary figure, secondary figures in tiles. Charts: principal navy, interest amber, then jade, steel blue.
- **Icons:** one line set in `src/lib/icons.ts` (1.5 stroke), each calculator has an engine icon, each category a tinted tile. SVG flags (no emoji).
- **Logo:** concept A, an equals sign whose lower bar turns into a check mark. Files in `public/brand/`; rebuild icons with `scripts/brand/`.
- **Motion:** 150–250ms ease-out, card lift on hover, one-time fade-up below the fold, count-up after user changes only. Everything respects prefers-reduced-motion.
- **Layout:** mobile-first; inputs left and results right (sticky) from 1024px; slim result bar on phones. Tap targets at least 44px.

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
