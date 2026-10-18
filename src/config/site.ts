export const SITE = {
  name: 'Calcvera',
  domain: 'calc-vera.com',
  url: 'https://calc-vera.com',
  tagline: "Money calculators that get your country's rules right.",
  description:
    'Free, fast finance calculators built for your country: loans, debt, tax, savings and retirement, each with a plain-English guide.',
  email: 'hello@calc-vera.com',
  /** Shown on the About and Privacy pages. */
  owner: 'M. Maaz Ali',
  /** AdSense publisher ID, e.g. 'ca-pub-1234567890123456'. Leave '' until approved: no ad code loads. */
  ADSENSE_CLIENT: '',
  /** AdSense ad unit IDs for manual placements. A slot renders only when its ID and ADSENSE_CLIENT are set. */
  AD_SLOTS: {
    results: '',
    guide: '',
  },
  /** Google Analytics 4 measurement ID, e.g. 'G-XXXXXXXXXX'. Leave '' to load no analytics. */
  GA_ID: '',
  /** Default Open Graph image path in public/, e.g. '/og-default.png'. Leave '' until the image exists. */
  OG_IMAGE: '/og-default.png',
} as const;

export type AdSlotName = keyof typeof SITE.AD_SLOTS;
