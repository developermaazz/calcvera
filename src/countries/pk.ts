import type { CountryConfig } from './types';

// Phase 3 (CLAUDE.md section 2). Tax year 2027 runs from 1 July 2026 to 30 June 2027.
export const pk: CountryConfig = {
  code: 'pk',
  name: 'Pakistan',
  shortName: 'Pakistan',
  adjective: 'Pakistani',
  hreflang: 'en-pk',
  locale: 'en-PK',
  currency: 'PKR',
  currencySymbol: 'Rs',
  taxYear: '2027',
  launched: true,
  detect: {
    timezones: ['Asia/Karachi'],
    languages: ['en-PK', 'ur-PK'],
  },
  incomeTax: {
    label: 'Income tax on salary',
    allowance: 600_000,
    allowanceLabel: 'Tax-free salary',
    bands: [
      // VERIFY: FBR Circular No. 2 of 2026-27, "Finance Act 2026 - explanation of important amendments" (Division I, Part I, First
      // Schedule, clause (2)): https://download1.fbr.gov.pk/Docs/202698139527880CircularNo.2of2026-27.pdf. Checked 21 Oct 2026.
      { from: 0, to: 600_000, rate: 0 },
      { from: 600_000, to: 1_200_000, rate: 0.01 },
      { from: 1_200_000, to: 2_200_000, rate: 0.11 },
      { from: 2_200_000, to: 3_200_000, rate: 0.2 },
      { from: 3_200_000, to: 4_100_000, rate: 0.25 },
      { from: 4_100_000, to: 5_600_000, rate: 0.29 },
      { from: 5_600_000, to: 7_000_000, rate: 0.32 },
      { from: 7_000_000, to: null, rate: 0.35 },
    ],
  },
  defaults: {
    loan: { amount: 1_000_000, aprPercent: 16, termYears: 3 },
    pkSalary: { monthlySalary: 200_000 },
    pkZakat: { cash: 600_000 },
  },
  pk: {
    salaryTax: {
      current: {
        label: 'Tax year 2027',
        // VERIFY: FBR Circular No. 2 of 2026-27 (salary rates substituted by the Finance Act 2026) and FBR Withholding Tax Rates Card
        // 2027 (https://download1.fbr.gov.pk/Docs/202681113864992WithholdingTaxRatesCard2027.pdf). Checked 21 Oct 2026.
        bands: [
          { from: 0, base: 0, rate: 0 },
          { from: 600_000, base: 0, rate: 0.01 },
          { from: 1_200_000, base: 6_000, rate: 0.11 },
          { from: 2_200_000, base: 116_000, rate: 0.2 },
          { from: 3_200_000, base: 316_000, rate: 0.25 },
          { from: 4_100_000, base: 541_000, rate: 0.29 },
          { from: 5_600_000, base: 976_000, rate: 0.32 },
          { from: 7_000_000, base: 1_424_000, rate: 0.35 },
        ],
        // VERIFY: same circular, section 8 ("the nine percent surcharge has been withdrawn in the case of a salaried individual").
        surcharge: null,
      },
      previous: {
        label: 'Tax year 2026',
        // VERIFY: FBR Circular No. 01 of 2025-26 (Income Tax), section 5:
        // https://download1.fbr.gov.pk/Docs/2025841183918948CircularNo01of2025-26IncomeTax.pdf. Checked 21 Oct 2026.
        bands: [
          { from: 0, base: 0, rate: 0 },
          { from: 600_000, base: 0, rate: 0.01 },
          { from: 1_200_000, base: 6_000, rate: 0.11 },
          { from: 2_200_000, base: 116_000, rate: 0.23 },
          { from: 3_200_000, base: 345_000, rate: 0.3 },
          { from: 4_100_000, base: 615_000, rate: 0.35 },
        ],
        // VERIFY: FBR Circular No. 2 of 2026-27, section 8 (salaried surcharge was 9% where taxable income exceeds Rs 10 million).
        surcharge: { over: 10_000_000, rate: 0.09 },
      },
    },
    zakat: {
      // VERIFY: Zakat and Ushr Ordinance, 1980, section 2(xva) (nisab: the value of 612.32 grams of silver, as notified each Zakat
      // year, or 87.48 grams of gold where the assets are only gold) and First Schedule (2.5%):
      // https://pakistancode.gov.pk/pdffiles/administratorfd19eec0a97080f151dac2a8406dea88.pdf. Checked 21 Oct 2026.
      rate: 0.025,
      silverNisabGrams: 612.32,
      goldNisabGrams: 87.48,
      // VERIFY: Ministry of Poverty Alleviation and Social Safety letter of 16 Feb 2026 to the State Bank of Pakistan (Nisab of
      // Zakat for Zakat Year 1446-1447 A.H.: Rs 503,529): https://www.sbp.org.pk/assets/documents/circulars/CL3-Notification_(2).pdf.
      // Checked 21 Oct 2026.
      officialNisab: 503_529,
      officialZakatYear: '1446–1447 AH',
    },
  },
};
