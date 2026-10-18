import { describe, expect, it } from 'vitest';
import { requireFigure } from '../../src/countries';
import { uk } from '../../src/countries/uk';
import { calculateRedundancyPay, validateRedundancyInput, type RedundancyParams } from '../../src/engines/redundancyPay';

/*
 * Official cross-checks (GOV.UK and nidirect, checked 16 Oct 2026):
 *   GB maximum statutory redundancy pay from 6 April 2026: £22,530 (30 weeks × £751)
 *   NI maximum: £23,490 (30 weeks × £783)
 * Other cases worked by hand from the age bands: ½ week under 22, 1 week 22–40, 1½ weeks 41+.
 */

const r = requireFigure(uk.uk, 'uk');
const params = (region: 'greatBritain' | 'northernIreland'): RedundancyParams => ({
  weeklyPayCap: requireFigure(r.redundancy.weeklyPayCap[region], 'cap'),
  minYearsService: requireFigure(r.redundancy.minYearsService, 'min'),
  maxYearsCounted: requireFigure(r.redundancy.maxYearsCounted, 'max'),
  ageBands: requireFigure(r.redundancy.ageBands, 'bands'),
  taxFreeLimit: requireFigure(r.redundancy.taxFreeLimit, 'taxFree'),
});
const gb = params('greatBritain');
const ni = params('northernIreland');

describe('calculateRedundancyPay', () => {
  it('reaches the official GB maximum of £22,530', () => {
    const res = calculateRedundancyPay({ age: 61, yearsOfService: 25, weeklyPay: 1_000 }, gb);
    expect(res.yearsCounted).toBe(20);
    expect(res.weeks).toBe(30);
    expect(res.amount).toBe(22_530);
    expect(res.weeklyPayCapped).toBe(true);
  });

  it('reaches the official NI maximum of £23,490', () => {
    expect(calculateRedundancyPay({ age: 61, yearsOfService: 20, weeklyPay: 1_000 }, ni).amount).toBe(23_490);
  });

  it('age 41 with 20 years: 19 years at 1 week, 1 year at ½ week', () => {
    const res = calculateRedundancyPay({ age: 41, yearsOfService: 20, weeklyPay: 1_000 }, gb);
    expect(res.weeks).toBe(19.5);
    expect(res.amount).toBe(19.5 * 751);
  });

  it('age 25 with 6 years: 3 years at 1 week and 3 under 22 at ½ week', () => {
    const res = calculateRedundancyPay({ age: 25, yearsOfService: 6, weeklyPay: 500 }, gb);
    expect(res.rows.map((row) => row.weeks)).toEqual([1, 1, 1, 0.5, 0.5, 0.5]);
    expect(res.amount).toBe(4.5 * 500);
    expect(res.weeklyPayCapped).toBe(false);
  });

  it('under 2 years of service: not eligible', () => {
    const res = calculateRedundancyPay({ age: 30, yearsOfService: 1, weeklyPay: 600 }, gb);
    expect(res.eligible).toBe(false);
    expect(res.amount).toBe(0);
  });

  it('statutory pay is always within the £30,000 tax-free limit', () => {
    const res = calculateRedundancyPay({ age: 64, yearsOfService: 40, weeklyPay: 5_000 }, ni);
    expect(res.taxFree).toBe(res.amount);
    expect(res.amount).toBeLessThan(30_000);
  });

  it('validates age, service and pay', () => {
    const fields = (input: Parameters<typeof validateRedundancyInput>[0]) => validateRedundancyInput(input).map((e) => e.field);
    expect(fields({ age: 15, yearsOfService: -1, weeklyPay: -5 })).toEqual(['age', 'yearsOfService', 'weeklyPay']);
    expect(fields({ age: 30, yearsOfService: 30, weeklyPay: 500 })).toEqual(['yearsOfService']);
    expect(fields({ age: 30.5, yearsOfService: 2, weeklyPay: 500 })).toEqual(['age']);
  });
});
