/**
 * Tells IndexNow (Bing, Yandex, Seznam, Naver and others) which pages are new or changed, so they're
 * crawled quickly. Reads the live sitemap, so run it after a deploy has finished.
 *
 *   node scripts/indexnow.mjs                    every URL in the sitemap (first run, or after big changes)
 *   node scripts/indexnow.mjs --since=2026-10-20 only URLs whose sitemap lastmod is on or after that date
 *   node scripts/indexnow.mjs --days=2           only URLs with a lastmod in the last 2 days
 *   node scripts/indexnow.mjs https://calc-vera.com/us/loan-calculator/ …   just these URLs
 *   add --dry-run to print the list without sending it
 *
 * The key is public by design: IndexNow checks it against https://calc-vera.com/{key}.txt.
 * Only submit pages that are new or changed; resubmitting unchanged pages is discouraged.
 */
const SITE = 'https://calc-vera.com';
const KEY = '42f78994166db3c1c391f7c111a9030c';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const dryRun = args.includes('--dry-run');
const explicit = args.filter((a) => a.startsWith('http'));

async function text(url) {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

async function sitemapEntries() {
  const index = await text(`${SITE}/sitemap-index.xml`);
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const entries = [];
  for (const map of maps) {
    const xml = await text(map);
    for (const m of xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) {
      entries.push({ url: m[1], lastmod: m[2] ? m[2].slice(0, 10) : null });
    }
  }
  return entries;
}

async function main() {
  // The key file must be live before IndexNow will accept anything.
  const live = (await text(`${SITE}/${KEY}.txt`)).trim();
  if (live !== KEY) throw new Error(`Key file at ${SITE}/${KEY}.txt does not match the key.`);

  let urls;
  if (explicit.length > 0) {
    urls = explicit;
  } else {
    const entries = await sitemapEntries();
    let since = flag('since');
    const days = flag('days');
    if (!since && days) since = new Date(Date.now() - Number(days) * 86_400_000).toISOString().slice(0, 10);
    urls = since ? entries.filter((e) => e.lastmod && e.lastmod >= since).map((e) => e.url) : entries.map((e) => e.url);
  }
  urls = [...new Set(urls)].filter((u) => u.startsWith(`${SITE}/`));

  if (urls.length === 0) {
    console.log('Nothing new or changed to submit.');
    return;
  }
  console.log(`${dryRun ? 'Would submit' : 'Submitting'} ${urls.length} URL(s):\n  ${urls.join('\n  ')}`);
  if (dryRun) return;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
  });
  // 200 = accepted, 202 = accepted and the key will be checked shortly.
  console.log(`IndexNow responded ${res.status} ${res.statusText}`);
  if (res.status !== 200 && res.status !== 202) {
    console.log(await res.text());
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
