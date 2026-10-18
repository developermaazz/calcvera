import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { ca } from '../../src/countries/ca';
import type { CaProvinceCode } from '../../src/countries/types';
import { caIncomeTax, type CaTaxParams } from '../../src/engines/caIncomeTax';
import { calculateFhsa, validateFhsaInput, type FhsaInput, type FhsaParams } from '../../src/engines/fhsa';

/*
 * OUTSIDE CHECK (18 Oct 2026): calculator.net investment calculator, $8,000 a year at the start of each
 *   year, 5 years, 5% → $46,415.30 (exact). TaxTips.ca 2026 combined marginal rates: Ontario $80,000 = 29.65%
 *   (our refund rate exactly); Quebec $80,000 = 36.12% (ours 36.12%).
 *
 * Hand-checked values (2026 CRA brackets and T4127 basic personal amounts):
 *   Ontario, $80,000: federal 14% × 58,523 + 20.5% × 21,477 − 14% × 16,452 = 10,292.73
 *                     Ontario 5.05% × 53,891 + 9.15% × 26,109 − 5.05% × 12,989 = 4,454.52
 *   An $8,000 deduction at $80,000 in Ontario saves 20.5% + 9.15% = 29.65% → $2,372.
 *   $8,000 a year at 5% for 5 years, contributed at the start of each year → $46,415.30.
 */

const c = requireFigure(ca.ca, 'ca');
const fhsa: FhsaParams = {
  annualLimit: requireFigure(c.fhsa.annualLimit, 'annual'),
  lifetimeLimit: requireFigure(c.fhsa.lifetimeLimit, 'lifetime'),
  maxCarryForward: requireFigure(c.fhsa.maxCarryForward, 'carry'),
  maxParticipationYears: requireFigure(c.fhsa.maxParticipationYears, 'years'),
};

function taxParams(code: CaProvinceCode): CaTaxParams {
  const prov = c.provinces.find((p) => p.code === code)!;
  return {
    federalBands: ca.incomeTax.bands,
    federalBpa: ca.incomeTax.allowance,
    federalBpaPhaseOut: { start: 181_440, end: 258_482, minimum: requireFigure(c.extras.basicPersonalAmountMinimum, 'bpaMin') },
    provinceBands: requireFigure(prov.bands, 'bands'),
    provinceBpa: requireFigure(prov.basicPersonalAmount, 'bpa'),
    provinceBpaPhaseOut: prov.basicPersonalAmountPhaseOut,
    quebecAbatement: code === 'QC' ? requireFigure(c.extras.quebecAbatement, 'qc') : 0,
    ontarioSurtax:
      code === 'ON'
        ? {
            firstThreshold: requireFigure(c.extras.ontarioSurtax.firstThreshold, 's1'),
            firstRate: requireFigure(c.extras.ontarioSurtax.firstRate, 'r1'),
            secondThreshold: requireFigure(c.extras.ontarioSurtax.secondThreshold, 's2'),
            secondRate: requireFigure(c.extras.ontarioSurtax.secondRate, 'r2'),
          }
        : undefined,
  };
}

const base: FhsaInput = {
  startBalance: 0,
  contributionsSoFar: 0,
  annualContribution: 8_000,
  years: 5,
  returnPercent: 5,
  carryForward: 0,
};

describe('caIncomeTax', () => {
  it('Ontario, $80,000', () => {
    const t = caIncomeTax(80_000, taxParams('ON'));
    expect(t.federal).toBeCloseTo(10_292.73, 2);
    expect(t.provincial).toBeCloseTo(4_454.52, 2);
  });

  it('Ontario surtax applies on high incomes', () => {
    const withSurtax = caIncomeTax(200_000, taxParams('ON')).provincial;
    const withoutSurtax = caIncomeTax(200_000, { ...taxParams('ON'), ontarioSurtax: undefined }).provincial;
    expect(withSurtax).toBeGreaterThan(withoutSurtax * 1.2);
  });

  it('Quebec residents get the 16.5% federal abatement', () => {
    const qc = caIncomeTax(80_000, taxParams('QC'));
    const fedOnly = caIncomeTax(80_000, { ...taxParams('QC'), quebecAbatement: 0 }).federal;
    expect(qc.federal).toBeCloseTo(fedOnly * (1 - 0.165), 6);
  });

  it('no tax below the basic personal amounts', () => {
    expect(caIncomeTax(10_000, taxParams('AB')).total).toBe(0);
  });
});

describe('calculateFhsa', () => {
  const ontarioRefund = (contribution: number) =>
    caIncomeTax(80_000, taxParams('ON')).total - caIncomeTax(80_000 - contribution, taxParams('ON')).total;

  it('$8,000 a year for 5 years at 5% reaches the $40,000 lifetime limit', () => {
    const r = calculateFhsa(base, fhsa, () => 0);
    expect(r.totalContributions).toBe(40_000);
    expect(r.balance).toBeCloseTo(46_415.3, 2);
    expect(r.growth).toBeCloseTo(6_415.3, 2);
    expect(r.lifetimeLimitHitYear).toBeNull();
  });

  it('refunds: $8,000 at $80,000 in Ontario saves $2,372 a year', () => {
    expect(ontarioRefund(8_000)).toBeCloseTo(2_372, 2);
    expect(calculateFhsa(base, fhsa, ontarioRefund).totalRefunds).toBeCloseTo(5 * 2_372, 2);
  });

  it('warns and caps when the plan exceeds the annual room', () => {
    const r = calculateFhsa({ ...base, annualContribution: 10_000, years: 2 }, fhsa, () => 0);
    expect(r.annualLimitHitYear).toBe(1);
    expect(r.rows[0]?.contribution).toBe(8_000);
  });

  it('carry-forward adds to the first year’s room', () => {
    const r = calculateFhsa({ ...base, annualContribution: 16_000, carryForward: 8_000, years: 1 }, fhsa, () => 0);
    expect(r.rows[0]?.room).toBe(16_000);
    expect(r.rows[0]?.contribution).toBe(16_000);
    expect(r.annualLimitHitYear).toBeNull();
  });

  it('unused room carries into the next year (up to $8,000)', () => {
    const r = calculateFhsa({ ...base, annualContribution: 3_000, years: 2 }, fhsa, () => 0);
    expect(r.rows[1]?.room).toBe(13_000);
  });

  it('stops at the lifetime limit and warns', () => {
    const r = calculateFhsa({ ...base, startBalance: 30_000, contributionsSoFar: 30_000, years: 3 }, fhsa, () => 0);
    expect(r.totalContributions).toBe(10_000);
    expect(r.lifetimeLimitHitYear).toBe(2);
  });

  it('0% return: balance equals contributions', () => {
    expect(calculateFhsa({ ...base, returnPercent: 0 }, fhsa, () => 0).balance).toBe(40_000);
  });

  it('validates years, carry-forward and contributions so far', () => {
    const fields = validateFhsaInput({ ...base, years: 16, carryForward: 9_000, contributionsSoFar: 50_000 }, fhsa).map((e) => e.field);
    expect(fields).toEqual(['contributionsSoFar', 'years', 'carryForward']);
  });
});
