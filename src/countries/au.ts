import type { CountryConfig } from './types';

// Early start with one calculator; full rollout in Phase 2 (CLAUDE.md section 2).
export const au: CountryConfig = {
  code: 'au',
  name: 'Australia',
  shortName: 'Australia',
  adjective: 'Australian',
  hreflang: 'en-au',
  locale: 'en-AU',
  currency: 'AUD',
  currencySymbol: '$',
  taxYear: '2026–27',
  launched: true,
  detect: {
    timezones: [
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Australia/Adelaide',
      'Australia/Perth',
      'Australia/Hobart',
      'Australia/Darwin',
      'Australia/Canberra',
    ],
    languages: ['en-AU'],
  },
  incomeTax: {
    label: 'Resident income tax',
    // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents (2026–27). Excludes 2% Medicare levy. Checked 16 Oct 2026.
    allowance: 18_200,
    allowanceLabel: 'Tax-free threshold',
    bands: [
      // VERIFY: same ATO page (2026–27). 16% rate falls to 15% from 1 July 2026, then 14% from 1 July 2027. Checked 16 Oct 2026.
      // Bands are expressed as taxable income above the tax-free threshold.
      { from: 0, to: 26_800, rate: 0.15 },
      { from: 26_800, to: 116_800, rate: 0.3 },
      { from: 116_800, to: 171_800, rate: 0.37 },
      { from: 171_800, to: null, rate: 0.45 },
    ],
  },
  defaults: {
    auTakeHome: { salary: 90_000 },
    auHomeLoan: { amount: 600_000, ratePercent: 5.8, termYears: 30 },
    auStampDuty: { value: 750_000 },
    auHelp: { balance: 25_000, income: 85_000, incomeGrowthPercent: 3 },
    auSuper: { age: 30, retirementAge: 67, balance: 50_000, salary: 85_000, salaryGrowthPercent: 3, returnPercent: 7, feesPerYear: 300, inflationPercent: 2.5 },
  },
  au: {
    medicareLevy: {
      // VERIFY: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/what-is-the-medicare-levy (2%). Checked 16 Oct 2026.
      rate: 0.02,
      // VERIFY: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners
      // Latest published single thresholds are for 2025–26 ($28,011 / $35,013). Update when the ATO publishes 2026–27. Checked 16 Oct 2026.
      thresholdsIncomeYear: '2025–26',
      lowIncomeThreshold: 28_011,
      lowIncomeUpperThreshold: 35_013,
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld/medicare-levy-adjustment
      // ("shaded in at the rate of 10% of the excess"). Checked 16 Oct 2026.
      shadeInRate: 0.1,
    },
    // VERIFY: https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset
    // ($700 up to $37,500; less 5c per $1 to $45,000; less 1.5c per $1 to $66,667). Checked 16 Oct 2026.
    lowIncomeTaxOffset: {
      maxOffset: 700,
      firstTaperStart: 37_500,
      firstTaperRate: 0.05,
      secondTaperStart: 45_000,
      secondTaperRate: 0.015,
      cutOut: 66_667,
    },
    // Working Australians tax offset starts in 2027–28, so it doesn't apply to 2026–27:
    // https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/working-australians-tax-offset
    fbt: {
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/fringe-benefits-tax-rates-and-thresholds (47% for FBT years to 31 March 2027). Checked 16 Oct 2026.
      fbtYear: 'year ending 31 March 2027',
      rate: 0.47,
      // VERIFY: same ATO page (flat 20% statutory rate for car benefits). Checked 16 Oct 2026.
      statutoryFraction: 0.2,
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds (fuel-efficient threshold $91,661, 2026–27). Checked 16 Oct 2026.
      evExemptionPriceThreshold: 91_661,
      // VERIFY: https://www.ato.gov.au/about-ato/new-legislation/in-detail/businesses/electric-car-discount-more-sustainable-fbt-treatment-of-electric-cars
      // (full exemption to 31 March 2027; existing leases not affected by the announced change). Checked 16 Oct 2026.
      evExemptionChangesOn: '2027-04-01',
    },
    novatedLease: {
      // VERIFY: https://www.ato.gov.au/law/view/document?docid=aid%2Faid20021004%2F00001 (ATO ID 2002/1004, cars, 8-year effective life)
      // and https://www.ato.gov.au/law/view/document?DocID=TXD%2FTD93142%2FNAT%2FATO%2F00001 (TD 93/142). Checked 16 Oct 2026.
      minimumResidualByTermYears: { 1: 0.6563, 2: 0.5625, 3: 0.4688, 4: 0.375, 5: 0.2813 },
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds (car limit $69,883, 2026–27). Checked 16 Oct 2026.
      carCostLimit: 69_883,
      // VERIFY: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/your-industry/motor-vehicle-and-transport/gst-and-motor-vehicles/purchasing-a-motor-vehicle
      // (GST 10%; credit capped at one-eleventh of the car limit). Checked 16 Oct 2026.
      gstRate: 0.1,
    },
    // The ATO site blocks automated access; the figures below were read from web.archive.org copies of the ATO pages.
    super: {
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee
      // (12% from 1 July 2025; maximum contribution base $270,830 a year for 2026–27). Archive copy 7 Oct 2026. Checked 20 Oct 2026.
      guaranteeRate: 0.12,
      maxContributionBase: 270_830,
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps
      // ($32,500 for 2026–27). Archive copy 17 Sep 2026. Checked 20 Oct 2026.
      concessionalCap: 32_500,
      // VERIFY: same contributions caps page ($130,000 non-concessional cap for 2026–27). Archive copy 17 Sep 2026. Checked 20 Oct 2026.
      nonConcessionalCap: 130_000,
      // VERIFY: https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/how-to-save-more-in-your-super/personal-super-contributions
      // (concessional contributions "are taxed in the fund at a rate of 15%"). Archive copy 15 Aug 2026. Checked 20 Oct 2026.
      contributionsTaxRate: 0.15,
      // VERIFY: https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/super-withdrawal-options
      // (preservation age 60 if born from 1 July 1964). Archive copy 23 Aug 2026. Checked 20 Oct 2026.
      preservationAge: 60,
    },
    help: {
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
      // (2026–27: nil to $69,528; 15c per $1 over $69,528; $9,028 plus 17c per $1 over $129,717; 10% of total repayment income
      // from $186,051). Archive copy 12 Oct 2026. Checked 20 Oct 2026.
      firstThreshold: 69_528,
      firstRate: 0.15,
      secondThreshold: 129_717,
      secondBase: 9_028,
      secondRate: 0.17,
      flatThreshold: 186_051,
      flatRate: 0.1,
      // VERIFY: https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-indexation-rates
      // (2.8% applied 1 June 2026; the lower of CPI and WPI). Archive copy 11 Oct 2026. Checked 20 Oct 2026.
      indexationRate: 0.028,
      indexationYear: '2026',
    },
    stampDuty: {
      year: '2026–27',
      // VERIFY: https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty (Current thresholds and rates, 2026/2027:
      // $1.25 per $100 (minimum $20) to $18,000 ... $52,237 + $5.50 per $100 over $1,290,000; premium $194,137 + $7.00 per $100
      // over $3,870,000). First Home Buyers Assistance Scheme: exempt to $800,000, concessional rate under $1 million; the
      // concession formula (duty at $1M × (value − $800,000) ÷ $200,000) matches Revenue NSW's FHBA calculator ($850,000 →
      // $9,796.75). Checked 20 Oct 2026.
      nsw: {
        bands: [
          { from: 0, base: 0, rate: 0.0125 },
          { from: 18_000, base: 225, rate: 0.015 },
          { from: 38_000, base: 525, rate: 0.0175 },
          { from: 103_000, base: 1_662, rate: 0.035 },
          { from: 387_000, base: 11_602, rate: 0.045 },
          { from: 1_290_000, base: 52_237, rate: 0.055 },
          { from: 3_870_000, base: 194_137, rate: 0.07 },
        ],
        minimum: 20,
        firstHome: { exemptUpTo: 800_000, concessionBelow: 1_000_000 },
      },
      // VERIFY: https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates (non-PPR and PPR rates, updated 29 Sep 2026)
      // and https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/first-home-buyers/first-home-buyer-duty-exemption-or-concession
      // (first home buyers: no duty to $600,000; reduced to $750,000). The reduction (general duty × (value − $600,000) ÷ $150,000)
      // matches SRO's calculator ($650,000 → $11,356; $700,000 → $24,713, rounded down). Checked 20 Oct 2026.
      vic: {
        bands: [
          { from: 0, base: 0, rate: 0.014 },
          { from: 25_000, base: 350, rate: 0.024 },
          { from: 130_000, base: 2_870, rate: 0.06 },
          { from: 960_000, base: 0, rate: 0.055, flat: true },
          { from: 2_000_000, base: 110_000, rate: 0.065 },
        ],
        pprBands: [
          { from: 0, base: 0, rate: 0.014 },
          { from: 25_000, base: 350, rate: 0.024 },
          { from: 130_000, base: 2_870, rate: 0.05 },
          { from: 440_000, base: 18_370, rate: 0.06 },
        ],
        pprUpTo: 550_000,
        firstHome: { exemptUpTo: 600_000, concessionUpTo: 750_000 },
      },
      // VERIFY: https://qro.qld.gov.au/duties/transfer-duty/calculate/rates/ (updated 25 Jun 2026) and
      // https://qro.qld.gov.au/duties/transfer-duty/calculate/concession-rates/ (home concession rates; first home concession
      // amounts for contracts from 9 June 2024; updated 31 Jul 2026). First home (new home): no duty, no value cap, contracts
      // from 1 May 2025 (https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home-new-home/). Checked 20 Oct 2026.
      qld: {
        bands: [
          { from: 0, base: 0, rate: 0 },
          { from: 5_000, base: 0, rate: 0.015 },
          { from: 75_000, base: 1_050, rate: 0.035 },
          { from: 540_000, base: 17_325, rate: 0.045 },
          { from: 1_000_000, base: 38_025, rate: 0.0575 },
        ],
        homeBands: [
          { from: 0, base: 0, rate: 0.01 },
          { from: 350_000, base: 3_500, rate: 0.035 },
          { from: 540_000, base: 10_150, rate: 0.045 },
          { from: 1_000_000, base: 30_850, rate: 0.0575 },
        ],
        firstHomeConcession: [
          { below: 710_000, amount: 17_350 },
          { below: 720_000, amount: 15_615 },
          { below: 730_000, amount: 13_880 },
          { below: 740_000, amount: 12_145 },
          { below: 750_000, amount: 10_410 },
          { below: 760_000, amount: 8_675 },
          { below: 770_000, amount: 6_940 },
          { below: 780_000, amount: 5_205 },
          { below: 790_000, amount: 3_470 },
          { below: 800_000, amount: 1_735 },
        ],
      },
      // VERIFY: https://www.wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty-assessment (updated 30 Jul 2026:
      // general rate; concessional rate for a principal place of residence worth $200,000 or less; first home owner rate from
      // 7 May 2026: nil to $600,000, $16.15 per $100 or part above $600,000 to $800,000). Checked 20 Oct 2026.
      wa: {
        bands: [
          { from: 0, base: 0, rate: 0.019 },
          { from: 120_000, base: 2_280, rate: 0.0285 },
          { from: 150_000, base: 3_135, rate: 0.038 },
          { from: 360_000, base: 11_115, rate: 0.0475 },
          { from: 725_000, base: 28_453, rate: 0.0515 },
        ],
        concessionalBands: [
          { from: 0, base: 0, rate: 0.015 },
          { from: 120_000, base: 1_800, rate: 0.0404 },
        ],
        concessionalUpTo: 200_000,
        firstHome: { exemptUpTo: 600_000, upTo: 800_000, rate: 0.1615 },
      },
      // VERIFY: https://www.revenuesa.sa.gov.au/stamp-duty/rate-of-stamp-duty (conveyance rates; web.archive.org copy of 28 Nov 2025,
      // the live site blocks automated access). First home buyers of eligible new homes: full relief regardless of value for
      // contracts from 13 February 2025 (https://www.revenuesa.sa.gov.au/stamp-duty-land/first-home-buyer-relief/relief-available,
      // archive copy 3 Jul 2026). Checked 20 Oct 2026.
      sa: {
        bands: [
          { from: 0, base: 0, rate: 0.01 },
          { from: 12_000, base: 120, rate: 0.02 },
          { from: 30_000, base: 480, rate: 0.03 },
          { from: 50_000, base: 1_080, rate: 0.035 },
          { from: 100_000, base: 2_830, rate: 0.04 },
          { from: 200_000, base: 6_830, rate: 0.0425 },
          { from: 250_000, base: 8_955, rate: 0.0475 },
          { from: 300_000, base: 11_330, rate: 0.05 },
          { from: 500_000, base: 21_330, rate: 0.055 },
        ],
      },
      // VERIFY: https://www.sro.tas.gov.au/property-transfer-duties/rates-of-duty (duty payable on or after 21 October 2013). The first
      // home buyer exemption for established homes ended for transactions settling after 30 June 2026
      // (https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions/first-home-buyers-of-established-homes-duty-relief).
      // Checked 20 Oct 2026.
      tas: {
        bands: [
          { from: 0, base: 50, rate: 0 },
          { from: 3_000, base: 50, rate: 0.0175 },
          { from: 25_000, base: 435, rate: 0.0225 },
          { from: 75_000, base: 1_560, rate: 0.035 },
          { from: 200_000, base: 5_935, rate: 0.04 },
          { from: 375_000, base: 12_935, rate: 0.0425 },
          { from: 725_000, base: 27_810, rate: 0.045 },
        ],
      },
      // VERIFY: https://www.revenue.act.gov.au/rates-and-property-charges/conveyance-duty-stamp-duty/conveyance-duty-for-non-commercial-property
      // (transactions on or after 1 July 2025; web.archive.org copy of 12 Jul 2026) and Taxation Administration (Amounts
      // Payable—Duty) Determination 2026, DI2026-155 ("The residential marginal rates remain unchanged from 2025-26"). Home Buyer
      // Concession Scheme: exempt from 1 July 2026 if eligible, no income threshold
      // (https://www.revenue.act.gov.au/home-buyer-assistance/home-buyer-concession-scheme/about-the-home-buyer-concession-scheme,
      // archive copy 11 Oct 2026). Checked 20 Oct 2026.
      act: {
        ownerBands: [
          { from: 0, base: 0, rate: 0.0028 },
          { from: 260_000, base: 728, rate: 0.022 },
          { from: 300_000, base: 1_608, rate: 0.034 },
          { from: 500_000, base: 8_408, rate: 0.0432 },
          { from: 750_000, base: 19_208, rate: 0.059 },
          { from: 1_000_000, base: 33_958, rate: 0.064 },
          { from: 1_455_000, base: 0, rate: 0.0454, flat: true },
        ],
        investorBands: [
          { from: 0, base: 0, rate: 0.012 },
          { from: 200_000, base: 2_400, rate: 0.022 },
          { from: 300_000, base: 4_600, rate: 0.034 },
          { from: 500_000, base: 11_400, rate: 0.0432 },
          { from: 750_000, base: 22_200, rate: 0.059 },
          { from: 1_000_000, base: 36_950, rate: 0.064 },
          { from: 1_455_000, base: 0, rate: 0.0454, flat: true },
        ],
      },
      // VERIFY: Stamp Duty Act 1978 (NT), Schedule 1 clause 1, as in force at 1 July 2025
      // (https://legislation.nt.gov.au/api/sitecore/Act/PDF?id=11906): up to $525,000, D = (0.06571441 × V²) + 15V where V is the
      // value ÷ 1,000; 4.95% to under $3 million; 5.75% to under $5 million; 5.95% from $5 million. Checked 20 Oct 2026.
      nt: {
        formulaUpTo: 525_000,
        a: 0.06571441,
        b: 15,
        bands: [
          { from: 525_000, base: 0, rate: 0.0495, flat: true },
          { from: 3_000_000, base: 0, rate: 0.0575, flat: true },
          { from: 5_000_000, base: 0, rate: 0.0595, flat: true },
        ],
      },
      roundUpTo100: ['QLD', 'WA', 'SA', 'TAS', 'ACT'],
    },
    mls: {
      // VERIFY: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates
      // (2026–27 singles: $105,000 or less 0%; $105,001–$123,000 1%; $123,001–$164,000 1.25%; $164,001 or more 1.5%).
      // Archive copy 5 Oct 2026. Checked 20 Oct 2026.
      singleTiers: [
        { from: 105_000, rate: 0.01 },
        { from: 123_000, rate: 0.0125 },
        { from: 164_000, rate: 0.015 },
      ],
    },
  },
};
