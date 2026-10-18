import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { uk } from '../../src/countries/uk';
import { calculateInheritanceTax, validateInheritanceTaxInput, type InheritanceTaxInput, type InheritanceTaxParams } from '../../src/engines/inheritanceTax';

/*
 * Official cross-checks (checked 16 Oct 2026):
 *   GOV.UK Inheritance Tax: £500,000 estate, £325,000 threshold → 40% of £175,000 = £70,000
 *   GOV.UK: the threshold "can increase to £500,000" when the home goes to children or grandchildren
 *   HMRC IHTM45010: £750,000 estate, £50,000 to charity, £325,000 band → baseline £425,000, 10% = £42,500,
 *     so the 36% rate applies: 36% × (£750,000 − £50,000 − £325,000) = £135,000
 */

const t = requireFigure(uk.uk, 'uk').inheritanceTax;
const p: InheritanceTaxParams = {
  nilRateBand: requireFigure(t.nilRateBand, 'nrb'),
  residenceNilRateBand: requireFigure(t.residenceNilRateBand, 'rnrb'),
  taperThreshold: requireFigure(t.taperThreshold, 'taper'),
  taperRate: requireFigure(t.taperRate, 'taperRate'),
  standardRate: requireFigure(t.standardRate, 'rate'),
  charityReducedRate: requireFigure(t.charityReducedRate, 'charityRate'),
  charityQualifyingShare: requireFigure(t.charityQualifyingShare, 'charityShare'),
  maxTransferableShare: requireFigure(t.maxTransferableShare, 'transfer'),
};

const base: InheritanceTaxInput = {
  estateValue: 500_000,
  debtsAndFuneral: 0,
  giftsLast7Years: 0,
  homeToDescendants: false,
  homeValue: 0,
  maritalStatus: 'single',
  leftToSpouse: 0,
  transferredNrbPercent: 0,
  transferredRnrbPercent: 0,
  charityPercent: 0,
};

describe('calculateInheritanceTax', () => {
  it('GOV.UK example: £500,000 estate pays £70,000', () => {
    const r = calculateInheritanceTax(base, p);
    expect(r.taxableAmount).toBe(175_000);
    expect(r.tax).toBe(70_000);
  });

  it('home to children raises the threshold to £500,000', () => {
    const r = calculateInheritanceTax({ ...base, homeToDescendants: true, homeValue: 300_000 }, p);
    expect(r.residenceBandUsed).toBe(175_000);
    expect(r.tax).toBe(0);
  });

  it('residence band is limited to the value of the home', () => {
    const r = calculateInheritanceTax({ ...base, estateValue: 600_000, homeToDescendants: true, homeValue: 100_000 }, p);
    expect(r.residenceBandUsed).toBe(100_000);
    expect(r.tax).toBeCloseTo(0.4 * (600_000 - 325_000 - 100_000), 6);
  });

  it('tapers the residence band by £1 for every £2 over £2 million', () => {
    const r = calculateInheritanceTax({ ...base, estateValue: 2_200_000, homeToDescendants: true, homeValue: 500_000 }, p);
    expect(r.residenceBandTaper).toBe(100_000);
    expect(r.residenceBandUsed).toBe(75_000);
    expect(r.tax).toBeCloseTo(0.4 * (2_200_000 - 325_000 - 75_000), 6); // £720,000
  });

  it('HMRC charity example: 36% on £375,000 = £135,000', () => {
    const r = calculateInheritanceTax({ ...base, estateValue: 750_000, charityPercent: (50_000 / 750_000) * 100 }, p);
    expect(r.charityNeededForReducedRate).toBeCloseTo(42_500, 6);
    expect(r.charityRateApplies).toBe(true);
    expect(r.tax).toBeCloseTo(135_000, 6);
  });

  it('charity gift below 10% of the baseline keeps the 40% rate', () => {
    const r = calculateInheritanceTax({ ...base, estateValue: 750_000, charityPercent: 2 }, p);
    expect(r.charityRateApplies).toBe(false);
    expect(r.rate).toBe(0.4);
  });

  it('everything left to a spouse is tax-free', () => {
    const r = calculateInheritanceTax({ ...base, estateValue: 900_000, maritalStatus: 'married', leftToSpouse: 900_000 }, p);
    expect(r.tax).toBe(0);
  });

  it('widowed with both allowances transferred: up to £1 million tax-free', () => {
    const r = calculateInheritanceTax(
      {
        ...base,
        estateValue: 1_000_000,
        maritalStatus: 'widowed',
        transferredNrbPercent: 100,
        transferredRnrbPercent: 100,
        homeToDescendants: true,
        homeValue: 400_000,
      },
      p,
    );
    expect(r.nilRateBand).toBe(650_000);
    expect(r.residenceBandUsed).toBe(350_000);
    expect(r.tax).toBe(0);
  });

  it('gifts in the last 7 years use up the nil-rate band first', () => {
    const r = calculateInheritanceTax({ ...base, giftsLast7Years: 200_000 }, p);
    expect(r.nilRateBandAvailable).toBe(125_000);
    expect(r.tax).toBe(0.4 * 375_000);
    expect(calculateInheritanceTax({ ...base, giftsLast7Years: 400_000 }, p).giftsExceedNilRateBand).toBe(true);
  });

  it('deducts debts and funeral costs first', () => {
    expect(calculateInheritanceTax({ ...base, debtsAndFuneral: 25_000 }, p).tax).toBe(0.4 * 150_000);
  });

  it('validates gifts to spouse and charity that exceed the estate', () => {
    const fields = validateInheritanceTaxInput({ ...base, maritalStatus: 'married', leftToSpouse: 450_000, charityPercent: 20 }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['leftToSpouse']);
    expect(validateInheritanceTaxInput({ ...base, estateValue: Number.NaN }).map((e) => e.field)).toEqual(['estateValue']);
  });
});
