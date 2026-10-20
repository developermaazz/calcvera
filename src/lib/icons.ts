/**
 * One line-icon set (24-unit grid, 1.5 stroke, round caps), hand-drawn in the Lucide style and inlined as SVG,
 * so no icon font or third-party request is needed. Render with <Icon name="…" />.
 */
import type { Category, EngineName } from '../calculators/registry';

export const ICONS = {
  // Calculators and categories
  banknote: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  car: '<path d="M5 17H4a1 1 0 0 1-1-1v-3.2a2 2 0 0 1 .6-1.4L6 9l1.6-3.2a2 2 0 0 1 1.8-1.1h5.2a2 2 0 0 1 1.8 1.1L18 9l2.4 2.4a2 2 0 0 1 .6 1.4V16a1 1 0 0 1-1 1h-1M9.5 17h5M6 9h12"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
  repeat: '<path d="M17 2.5l3.5 3.5L17 9.5"/><path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5"/><path d="M7 21.5L3.5 18 7 14.5"/><path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
  trendDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M21 11v6h-6"/>',
  trendUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1.5 1.5 0 0 1 1.5 1.5v3"/><path d="M3 6v12a2 2 0 0 0 2 2h14a1.5 1.5 0 0 0 1.5-1.5v-3"/><path d="M21.5 12.5H18a1.75 1.75 0 0 0 0 3.5h3.5z"/>',
  home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>',
  homeKey: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><circle cx="10.5" cy="14.5" r="2"/><path d="M12.5 14.5h3.5M15 14.5v1.8"/>',
  cap: '<path d="M22 9.5L12 4.5 2 9.5l10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9.5v6"/>',
  tag: '<path d="M3 12.2V4a1 1 0 0 1 1-1h8.2a1 1 0 0 1 .7.3l8.5 8.5a1 1 0 0 1 0 1.4l-8.2 8.2a1 1 0 0 1-1.4 0L3.3 12.9a1 1 0 0 1-.3-.7z"/><path d="M7.5 7.5h.01"/>',
  percent: '<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M19 5L5 19"/>',
  layers: '<path d="M12 2.5l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7M3 12.5h18"/>',
  landmark: '<path d="M3 21h18M5 21v-10M9.5 21v-10M14.5 21v-10M19 21v-10"/><path d="M2.5 9L12 3l9.5 6z"/>',
  receipt: '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5-2 1.5-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  barsDown: '<path d="M3.5 20.5h17"/><rect x="5" y="4.5" width="3.5" height="13" rx="1"/><rect x="10.25" y="9" width="3.5" height="8.5" rx="1"/><rect x="15.5" y="13" width="3.5" height="4.5" rx="1"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  scale: '<path d="M12 3.5v17M7 20.5h10M5 7h14"/><path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/><path d="M19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  payslip: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5M8 16h3M15 15.5h1.5"/>',
  shieldPlus: '<path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6z"/><path d="M12 8v8M9.5 10.5h5M9.5 13.5h5"/>',
  homeDown: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M12 11v6M9.5 14.5L12 17l2.5-2.5"/>',
  shieldPound: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M13.8 9.2a2 2 0 0 0-3.6 1.2v4.1M9 12.5h4M9 15.5h6"/>',
  sunrise: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5.2 9.2l1.6 1.6M18.8 9.2l-1.6 1.6M2 14h2M20 14h2"/>',
  homeLine: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M8.5 17.5l2.5-2.5 2 2 3-3.5"/>',
  sprout: '<path d="M12 21v-8"/><path d="M12 13C12 8.6 9 6 4 6c0 4.4 3 7 8 7z"/><path d="M12 15c0-3.6 2.4-6 6.5-6 0 3.6-2.4 6-6.5 6z"/>',
  // Interface
  search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.5-4.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  device: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
  sigma: '<path d="M18 5H6l6.5 7L6 19h12"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><path d="M7 15h10"/>',
  lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
  hash: '<path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
} as const;

export type IconName = keyof typeof ICONS;

export const ENGINE_ICONS: Record<EngineName, IconName> = {
  loan: 'banknote',
  creditCardPayoff: 'card',
  personalLoanPayoff: 'trendDown',
  usedCarLoan: 'car',
  takeHomePay: 'wallet',
  stampDuty: 'home',
  autoRefinance: 'repeat',
  retirementMatch: 'trendUp',
  studentLoan: 'cap',
  carFinance: 'car',
  dti: 'percent',
  carAffordability: 'tag',
  debtConsolidation: 'layers',
  debtSnowball: 'barsDown',
  compoundInterest: 'sprout',
  savingsGoal: 'target',
  rentVsBuy: 'scale',
  paycheck: 'payslip',
  pensionTaxRelief: 'shieldPlus',
  mortgageOverpayment: 'homeDown',
  isaSavings: 'shieldPound',
  rothIra: 'sunrise',
  heloc: 'homeLine',
  redundancyPay: 'briefcase',
  inheritanceTax: 'landmark',
  selfEmploymentTax: 'receipt',
  fhsa: 'homeKey',
  novatedLease: 'car',
};

export const CATEGORY_ICONS: Record<Category, IconName> = {
  loans: 'banknote',
  debt: 'card',
  tax: 'receipt',
  savings: 'sprout',
  retirement: 'trendUp',
  property: 'home',
};

/** Tint for each category's icon tile (CSS custom property names from tokens.css). */
export const CATEGORY_TINTS: Record<Category, 'navy' | 'jade' | 'amber'> = {
  loans: 'navy',
  debt: 'amber',
  tax: 'navy',
  savings: 'jade',
  retirement: 'jade',
  property: 'amber',
};
