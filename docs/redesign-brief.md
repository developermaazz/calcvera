# Redesign brief: rich, premium, trustworthy

Owner's brief for the Calcvera UI redesign (received 19 Oct 2026). Kept here so every future session builds to it.
Where it overrides CLAUDE.md (fonts, colours, theme storage, dev dependencies), this brief wins for UI work.

## Creative direction
"A private bank's annual report crossed with a precision instrument": calm deep navy, warm paper-white backgrounds, crisp hairlines, generous space and big, confident numbers. The numbers are the hero of every page. Quietly premium, never flashy. Polish of Stripe, Mercury or Linear without copying any of them.

## About the product
- Free finance calculators built per country: US, UK, Canada, Australia (USD, GBP, CAD, AUD). Categories: loans, debt, tax and pay, savings, retirement.
- Brand promise: "Money calculators that get your country's rules right." Four pillars: each country's own rules (tax year shown), tested maths, nothing leaves your device (everything runs in the browser), formulas shown.
- "Vera" is Latin for "true"; the brand idea is true, verified numbers.
- Brand colour: navy #0F2A4A (the theme-color). Light and dark colour schemes.
- Templates: homepage; country hubs (/us/, /uk/, /ca/, /au/) listing calculators by category; calculator pages (inputs, live results, principal/interest chart, repayment schedule, formula, long guide, FAQ, related calculators, sources, disclaimer); content pages (About, Methodology, Contact, Privacy, Terms, Disclaimer).

## Hard rules
1. Do not change calculation logic, rounding, default values or input parsing. Restyle, don't rewrite. If any part of this brief would require touching calculation code, skip it and tell the owner.
2. Do not change URLs, titles, meta descriptions, canonical/hreflang tags, structured data, headings or body copy. All content stays in the server-rendered HTML.
3. No third-party requests: self-host fonts and icons; no font CDNs, analytics or external scripts, in keeping with the "nothing leaves your device" promise. (GA4 predates this brief; see the decision log below.)
4. Keep the existing framework and styling approach (Astro + plain CSS custom properties). No UI kits or heavy new dependencies.
5. No fake trust signals: no invented user counts, ratings, testimonials, press logos or security claims. New text is limited to short UI labels in the site's voice (plain English, sentence case).
6. Avoid the generic AI-template look: no purple/indigo gradients, no glassmorphism everywhere, no emoji as icons, no stock photos or 3D blobs, no neon glows.

## Design system
Light and dark tokens in one documented file (`src/styles/tokens.css`).

Colour (tune so every text pair passes WCAG AA):
- Brand: navy #0F2A4A as the anchor, with a 50–950 scale.
- One accent: jade (around #12B886) for fills, icons, positive values and savings; a darker jade for green text on light backgrounds.
- Interest/cost: warm amber (around #E8A33D), mainly in charts.
- Neutrals: warm off-white page (#F7F7F4), white cards, hairline borders (#E4E6EA), ink text (#0E1B2C), muted text (#5B6676).
- Dark mode built from deep navy (around #0A1626 page, #0F2036 cards), never pure black.

Typography:
- Headings: a refined display serif (Fraunces or Instrument Serif), or a premium grotesk like Geist if a serif doesn't work.
- UI and body: Inter or Geist. Formulas: Geist Mono or JetBrains Mono.
- Self-hosted WOFF2, Latin subset, font-display: swap, preload only critical files, no layout shift on font load.
- Every money value, percentage, result and table number uses `font-variant-numeric: tabular-nums`.
- Fluid type scale with clamp(); long-form text about 68ch, line height 1.6–1.7.

Surfaces and details:
- 8px spacing grid, generous whitespace. Radius 16px cards, 10px inputs, pill chips.
- Depth from hairline borders plus soft, layered, low-opacity shadows.
- Signature motif: faint graph-paper grid with a radial fade behind the hero and page headers (ledger nod). Sparingly.
- One line-icon set (Lucide style, inlined SVG, 1.5px stroke). Each calculator gets its own icon; each category a subtly tinted icon tile.
- Jade 2px offset focus ring, branded text selection, `scroll-margin-top` under the sticky header.

Motion:
- 150–250ms ease-out transitions, gentle hover lift on cards, subtle one-time fade-up on scroll.
- No parallax or scroll-jacking. Respect prefers-reduced-motion everywhere.

## Logo
- Original, clean hand-written SVG. Three concepts first, e.g. (a) an equals sign whose lower bar turns into a check mark; (b) a V monogram that doubles as a tick, in a rounded-square "calculator key"; (c) a C drawn as a precise arc with a dot or bar inside.
- No $ or £ signs, coins, piggy banks or generic calculator glyphs. Must read at 16×16px.
- Wordmark "Calcvera" in the heading or UI face, semibold, slightly tightened tracking. Standalone files convert text to outlined paths.
- Deliver logo-horizontal.svg, logo-mark.svg and monochrome versions (currentColor where possible).
- Header: SVG mark plus live-text wordmark, linking home.
- CHECKPOINT: tokens + three concepts on a temporary noindexed /brand-preview page (light and dark); stop for the owner's choice before rolling out.

## Favicons and share image
Generated from the chosen mark by a committed script (e.g. sharp + png-to-ico):
- favicon.ico (16/32/48) and icon.svg with internal `@media (prefers-color-scheme: dark)`. Mark on a filled navy rounded square.
- apple-touch-icon.png 180×180 solid background with padding; icon-192.png, icon-512.png, icon-maskable-512.png (central 80% safe zone).
- manifest.webmanifest (name, short_name, icons, theme_color, background_color).
- Head: `<link rel="icon" href="/favicon.ico" sizes="32x32">`, `<link rel="icon" href="/icon.svg" type="image/svg+xml">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, `<link rel="manifest" href="/manifest.webmanifest">`, theme-color metas for light and dark matching the header.
- Replace og-default.png at the same path (1200×630: logo, tagline, grid motif, navy). Optionally per-calculator OG images at build time.

## Global components
- Header: sticky, translucent with backdrop blur; hairline border on scroll. Logo left. Country switcher as a segmented pill with small SVG flags (not emoji) and country code, current highlighted; on calculator pages each links to the same calculator in that country. Light/dark/system toggle saved in localStorage, applied by a tiny inline head script (no flash). Calculator search on ⌘K / Ctrl+K or "/", filtering the site's own calculator list client-side. Clean menu sheet on mobile.
- Footer: deep navy band with logo, one-line mission, existing link columns, country links, "Educational tools, not financial advice".
- Reusable: breadcrumbs, buttons, chips, cards, segmented controls, accordions, callouts (info, example, warning), tables.

## Homepage
- Hero: keep H1 and subhead; H1 in the display face with a subtle jade highlight on "your country's rules". Beside it (stacked on mobile) a real HTML/SVG result card for the US loan example linking to that calculator: $20,000 at 7.5% APR over 5 years = $400.76 a month, $4,045.54 total interest, mini principal vs interest bar. Grid motif, soft navy/jade glow behind.
- Trust row under the hero: the four pillars with icons.
- Country cards: flag, name, currency chip, calculator count, arrow, hover lift. CA and AU (one calculator each) must look intentional ("1 calculator · more coming").
- Popular calculators: cards with icon, category chip, title, description, arrow that slides on hover.
- "Why Calcvera" bento grid: a real formula snippet, a "runs on your device" SVG illustration, a tax-year chip, a "checked against known answers" list.

## Country hubs
- Header band: flag, H1, chips for currency and tax year, calculator count.
- Sticky category chips jumping to each section; each section has icon tile, name, count, card grid.
- "More calculators are on the way" as a quiet roadmap note.

## Calculator pages (most important; shared components so every calculator gets the upgrade)
- Header: breadcrumbs, H1, intro, meta chips: flag and currency, tax year where relevant, "Last updated", "Tested" chip linking to /methodology/.
- Panel: one elevated card, inputs left and results right from 1024px, results sticky on desktop.
- Inputs: 48px fields with prefix/suffix adornments, clear labels, helper text, "Optional" tag, inline validation, inputmode="decimal". Existing unit selects/radio pairs styled as segmented controls without replacing them. Optional range sliders on main inputs: a slider updates the existing text field and fires its input event; the text field stays the source of truth; values beyond the slider range still allowed. Display formatting never changes values passed to the calculation.
- Results: deep navy card (dark mode: lighter raised surface with jade hairline). Primary result very large, secondary results 3-up grid, plain-English summary beneath with key figures emphasised. Numbers count from previous value in under 400ms after user changes only, never on load. Huge values never overflow. One aria-live="polite" region for the summary. Optional actions: copy result, copy link (inputs in URL, client-side), print.
- Mobile: when results scroll out of view, a slim sticky bottom bar with the primary result and "See breakdown", without covering content.
- Chart: principal navy, interest amber, rounded bar tops, hairline gridlines, chip legend, tooltips on hover and keyboard focus, bars animate in once. Keep the accessible text version.
- Schedule: "By year / By month" segmented control, sticky header, right-aligned tabular numbers, row hover, scrollable monthly view, final row marked "Paid off".
- "How this is calculated": formula card, formula set large, each variable defined beneath as a coloured chip.
- Guide: article typography, H2 anchor links, sticky "On this page" list on desktop, Example as highlighted card, Tips as styled numbered list, FAQ as details/summary accordions, Related as cards, Sources with external-link icons, disclaimer as a quiet info callout.
- Print stylesheet: inputs, results and schedule, black on white, no chrome.

## Content pages
Header band with grid motif, article typography, consistent callouts. Methodology steps as a vertical timeline.

## Quality bar
- WCAG 2.2 AA: full keyboard access (segmented controls as radio groups, search dialog with focus trap and Esc), errors linked with aria-describedby, colour never the only signal, 44×44px touch targets, skip link, correct lang per country.
- Lighthouse mobile ≥ 95 on all four, CLS ≈ 0. Added JS under ~20 KB gzipped, no new runtime libraries.
- Test at 360, 768, 1024, 1440px, light and dark.
- Regression check, US Loan Calculator: $20,000, 7.5% APR, 5 years → $400.76/month, $4,045.54 interest, $24,045.54 total cost, 60 payments; $100 extra/month → 47 months, $3,080.99 interest. Existing tests pass unchanged; spot-check every calculator.

## Order of work
1. Audit the repo and summarise.
2. Tokens and logo concepts on /brand-preview; stop for the owner's choice.
3. Global styles → header and footer → calculator template → homepage → country hubs → content pages → favicons, manifest, OG image → QA.
4. Summary: files changed, new assets, how to regenerate icons, next steps. Remove /brand-preview unless asked to keep it.

## Decision log
- 19 Oct 2026: brief received. Checkpoint 1 (tokens + three logo concepts on /brand-preview) built on branch `fix/redesign-ui`.
- 19 Oct 2026: owner chose logo **A (true equals)** with the Fraunces wordmark. Rolled out site-wide; /brand-preview removed.
- GA4 kept (live before this brief; CLAUDE.md lists it). It is the only third-party request; fonts and icons are self-hosted.
- Markdown rehype plugins need a new package in Astro 7, so guide sections are wrapped in `src/middleware.ts` instead.
- Stylesheet inlined (`build.inlineStylesheets: 'always'`) and site scripts merged into `src/scripts/site.ts` to keep mobile LCP near 2s.
- Not built yet (next steps): range sliders on main inputs, copy result / copy link / print buttons, keyboard-focus chart tooltips, per-calculator OG images.
