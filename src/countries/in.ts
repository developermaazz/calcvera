import type { CountryConfig } from './types';

// Phase 3 (CLAUDE.md section 2). Tax year 2026-27 under the Income-tax Act, 2025.
export const india: CountryConfig = {
  code: 'in',
  name: 'India',
  shortName: 'India',
  adjective: 'Indian',
  hreflang: 'en-in',
  locale: 'en-IN',
  currency: 'INR',
  currencySymbol: '₹',
  taxYear: '2026–27',
  launched: true,
  detect: {
    timezones: ['Asia/Kolkata', 'Asia/Calcutta'],
    languages: ['en-IN', 'hi-IN'],
  },
  incomeTax: {
    label: 'Income tax, new regime',
    // VERIFY: Income-tax Act, 2025 section 19 Table Sl. No. 2 (standard deduction ₹75,000 where tax is computed under section
    // 202(1)), as amended by the Finance Act 2026: https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf
    // (web.archive.org copy of 12 Jun 2026). Checked 21 Oct 2026.
    allowance: 75_000,
    allowanceLabel: 'Standard deduction (salaried)',
    bands: [
      // VERIFY: Finance Bill 2026 memorandum, "Tax rates under section 202" for tax year 2026-27 ("There is no change proposed in
      // tax rates"): https://www.indiabudget.gov.in/doc/memo.pdf. Checked 21 Oct 2026.
      { from: 0, to: 400_000, rate: 0 },
      { from: 400_000, to: 800_000, rate: 0.05 },
      { from: 800_000, to: 1_200_000, rate: 0.1 },
      { from: 1_200_000, to: 1_600_000, rate: 0.15 },
      { from: 1_600_000, to: 2_000_000, rate: 0.2 },
      { from: 2_000_000, to: 2_400_000, rate: 0.25 },
      { from: 2_400_000, to: null, rate: 0.3 },
    ],
  },
  defaults: {
    inEmi: { amount: 2_500_000, ratePercent: 8.5, years: 20 },
    inSip: { monthly: 10_000, returnPercent: 12, years: 15 },
    inPpf: { yearly: 150_000 },
    inIncomeTax: { salary: 1_500_000, oldDeductions: 200_000 },
  },
  in: {
    tax: {
      newRegime: {
        // Same as incomeTax.bands above (section 202; Finance Bill 2026 memorandum).
        bands: [
          { from: 0, to: 400_000, rate: 0 },
          { from: 400_000, to: 800_000, rate: 0.05 },
          { from: 800_000, to: 1_200_000, rate: 0.1 },
          { from: 1_200_000, to: 1_600_000, rate: 0.15 },
          { from: 1_600_000, to: 2_000_000, rate: 0.2 },
          { from: 2_000_000, to: 2_400_000, rate: 0.25 },
          { from: 2_400_000, to: null, rate: 0.3 },
        ],
        // VERIFY: Income-tax Act, 2025 section 19 Table Sl. No. 2 (₹75,000 under section 202(1); ₹50,000 otherwise). Checked 21 Oct 2026.
        standardDeduction: 75_000,
        // VERIFY: Income-tax Act, 2025 section 156(2): up to ₹60,000 if total income does not exceed ₹12 lakh; above that, relief
        // so that tax does not exceed the income above ₹12 lakh. Checked 21 Oct 2026.
        rebate: { upTo: 1_200_000, max: 60_000, marginalRelief: true },
        // VERIFY: Finance Bill 2026 memorandum (section 202 surcharge: 10% over ₹50 lakh, 15% over ₹1 crore, 25% over ₹2 crore;
        // marginal relief). Checked 21 Oct 2026.
        surcharge: [
          { over: 5_000_000, rate: 0.1 },
          { over: 10_000_000, rate: 0.15 },
          { over: 20_000_000, rate: 0.25 },
        ],
      },
      oldRegime: {
        // VERIFY: Finance Bill 2026 memorandum, Part I-B of the First Schedule for tax year 2026-27 (under 60: nil to ₹2.5 lakh;
        // 60 to 79: nil to ₹3 lakh; 80+: nil to ₹5 lakh; 5%, 20%, 30%). Checked 21 Oct 2026.
        bands: {
          under60: [
            { from: 0, to: 250_000, rate: 0 },
            { from: 250_000, to: 500_000, rate: 0.05 },
            { from: 500_000, to: 1_000_000, rate: 0.2 },
            { from: 1_000_000, to: null, rate: 0.3 },
          ],
          from60: [
            { from: 0, to: 300_000, rate: 0 },
            { from: 300_000, to: 500_000, rate: 0.05 },
            { from: 500_000, to: 1_000_000, rate: 0.2 },
            { from: 1_000_000, to: null, rate: 0.3 },
          ],
          from80: [
            { from: 0, to: 500_000, rate: 0 },
            { from: 500_000, to: 1_000_000, rate: 0.2 },
            { from: 1_000_000, to: null, rate: 0.3 },
          ],
        },
        standardDeduction: 50_000,
        // VERIFY: Income-tax Act, 2025 section 156(1) (₹12,500 if total income does not exceed ₹5 lakh). Checked 21 Oct 2026.
        rebate: { upTo: 500_000, max: 12_500, marginalRelief: false },
        // VERIFY: Finance Bill 2026 memorandum, Part I-B surcharge (10% over ₹50 lakh, 15% over ₹1 crore, 25% over ₹2 crore, 37%
        // over ₹5 crore). Checked 21 Oct 2026.
        surcharge: [
          { over: 5_000_000, rate: 0.1 },
          { over: 10_000_000, rate: 0.15 },
          { over: 20_000_000, rate: 0.25 },
          { over: 50_000_000, rate: 0.37 },
        ],
      },
      // VERIFY: Finance Bill 2026 memorandum (Health and Education Cess 4% of income-tax including surcharge). Checked 21 Oct 2026.
      cessRate: 0.04,
    },
    ppf: {
      // VERIFY: Ministry of Finance (Department of Economic Affairs) office memorandum of 30 Sep 2026: small savings rates for
      // 1 Oct to 31 Dec 2026 unchanged, PPF 7.1% compounded yearly (https://dea.gov.in/budget-division/475). Confirmed on India
      // Post's live Saving Schemes page ("Public Provident Fund Account (PPF) Rate of Interest: 7.1% per annum (compounded
      // yearly)"): https://www.indiapost.gov.in/banking-services/savings. Checked 21 Oct 2026.
      ratePercent: 7.1,
      rateQuarter: 'October–December 2026',
      // VERIFY: India Post, Post Office Public Provident Fund (PPF) Account (minimum ₹500, maximum ₹1,50,000 a year; 15 years;
      // can be extended for 5 years): https://www.indiapost.gov.in/. Checked 21 Oct 2026.
      minDeposit: 500,
      maxDeposit: 150_000,
      termYears: 15,
      extensionYears: 5,
    },
  },
};
