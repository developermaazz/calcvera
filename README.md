# Calcvera

Country-specific finance calculators at [calc-vera.com](https://calc-vera.com). Astro (static) + TypeScript + Vitest, hosted on Cloudflare. Project rules live in [CLAUDE.md](CLAUDE.md).

## Run it locally

Needs Node.js LTS (20+) and Git.

```bash
npm install          # once
npm run dev          # http://localhost:4321
npm test             # engine tests
npm run check        # type check
npm run build        # static site in dist/
npm run preview      # serve dist/ locally
npm run check:verify # unverified facts report
```

## Put it on GitHub

1. Create an empty repository named `calcvera` on github.com. Don't add a README or .gitignore.
2. In this folder:

```bash
git init -b main
git add .
git commit -m "chore: initial Calcvera foundation with loan calculator"
git remote add origin https://github.com/<your-username>/calcvera.git
git push -u origin main
```

## Deploy free on Cloudflare (Workers static assets)

1. Sign in at dash.cloudflare.com and go to **Workers & Pages → Create → Import a repository**.
2. Connect GitHub and pick the `calcvera` repo.
3. Build settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (reads `wrangler.jsonc`, which serves `dist/` and the custom 404 page)
4. Deploy. You get a `calcvera.<account>.workers.dev` URL. Every push to `main` redeploys automatically.

## Connect calc-vera.com

1. Buy the domain (Cloudflare Registrar is simplest; elsewhere is fine).
2. If it's registered elsewhere, add the site to Cloudflare (**Add a domain**) and change the nameservers at your registrar to the two Cloudflare gives you. Wait until the domain shows **Active**.
3. Open the Worker → **Settings → Domains & Routes → Add → Custom domain** → `calc-vera.com`. Add `www.calc-vera.com` too.
4. Redirect `www` to the bare domain: **Rules → Redirect Rules** → wildcard pattern from `https://www.calc-vera.com/*` to `https://calc-vera.com/${1}`, status 301, preserve query string.
5. HTTPS is automatic.

## After the site is live

1. **Search Console:** add a Domain property for `calc-vera.com`, verify with the DNS TXT record (one click if DNS is on Cloudflare), and submit `https://calc-vera.com/sitemap-index.xml`.
2. **Analytics:** create a GA4 property and put the measurement ID in `GA_ID` in `src/config/site.ts`.
3. **AdSense (after 10–15 full calculator pages):** set `ADSENSE_CLIENT` and the slot IDs in `src/config/site.ts`, paste your line into `public/ads.txt`, and turn on Google's consent message for UK/EEA visitors in AdSense under **Privacy & messaging**.
