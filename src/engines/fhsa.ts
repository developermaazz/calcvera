/**
 * Canadian First Home Savings Account projection. Each year: participation room = annual limit +
 * carry-forward (capped), contributions stop at the lifetime limit, contributions go in at the start of
 * the year and grow at the expected return. Tax refunds come from a function the caller supplies
 * (a flat marginal rate, or the tax saved at a given income). Pure: figures are passed in.
 */
import { checkMoney, checkPercent, checkRange, type FieldError } from './validation';

export interface FhsaParams {
  annualLimit: number;
  lifetimeLimit: number;
  maxCarryForward: number;
  maxParticipationYears: number;
}

export interface FhsaInput {
  startBalance: number;
  /** Contributions already made (count towards the lifetime limit). */
  contributionsSoFar: number;
  annualContribution: number;
  years: number;
  returnPercent: number;
  /** Unused participation room carried into the first year. */
  carryForward: number;
}

export interface FhsaYear {
  year: number;
  room: number;
  contribution: number;
  refund: number;
  balance: number;
}

export interface FhsaResult {
  balance: number;
  totalContributions: number;
  totalRefunds: number;
  growth: number;
  /** First year the planned contribution was more than the room, or null. */
  annualLimitHitYear: number | null;
  /** First year contributions were capped by the lifetime limit, or null. */
  lifetimeLimitHitYear: number | null;
  rows: FhsaYear[];
}

export function validateFhsaInput(input: FhsaInput, p: FhsaParams): FieldError[] {
  const errors: FieldError[] = [];
  checkMoney(errors, 'startBalance', input.startBalance, 10_000_000);
  checkRange(errors, 'contributionsSoFar', input.contributionsSoFar, {
    min: 0,
    max: p.lifetimeLimit,
    empty: 'Enter your contributions so far, or 0.',
    range: `Contributions so far can't be more than the lifetime limit.`,
  });
  checkMoney(errors, 'annualContribution', input.annualContribution, 1_000_000);
  checkRange(errors, 'years', input.years, {
    min: 1,
    max: p.maxParticipationYears,
    integer: true,
    empty: 'Enter how many years you plan to save.',
    range: `An FHSA can stay open for at most ${p.maxParticipationYears} years.`,
  });
  checkPercent(errors, 'returnPercent', input.returnPercent, 30);
  checkRange(errors, 'carryForward', input.carryForward, {
    min: 0,
    max: p.maxCarryForward,
    empty: 'Enter unused room carried forward, or 0.',
    range: `Carry-forward room can't be more than the annual maximum.`,
  });
  return errors;
}

export function calculateFhsa(input: FhsaInput, p: FhsaParams, refundFor: (contribution: number) => number): FhsaResult {
  const errors = validateFhsaInput(input, p);
  if (errors.length > 0) throw new RangeError(errors.map((e) => e.message).join(' '));

  const r = input.returnPercent / 100;
  let balance = input.startBalance;
  let lifetimeUsed = input.contributionsSoFar;
  let carry = input.carryForward;
  let totalContributions = 0;
  let totalRefunds = 0;
  let annualLimitHitYear: number | null = null;
  let lifetimeLimitHitYear: number | null = null;
  const rows: FhsaYear[] = [];

  for (let year = 1; year <= input.years; year++) {
    const room = p.annualLimit + carry;
    const lifetimeLeft = Math.max(0, p.lifetimeLimit - lifetimeUsed);
    const contribution = Math.min(input.annualContribution, room, lifetimeLeft);

    if (input.annualContribution > room && annualLimitHitYear === null) annualLimitHitYear = year;
    if (input.annualContribution > lifetimeLeft && lifetimeLimitHitYear === null) lifetimeLimitHitYear = year;

    const refund = refundFor(contribution);
    balance = (balance + contribution) * (1 + r);
    lifetimeUsed += contribution;
    totalContributions += contribution;
    totalRefunds += refund;
    carry = Math.min(p.maxCarryForward, room - contribution);

    rows.push({ year, room, contribution, refund, balance });
  }

  return {
    balance,
    totalContributions,
    totalRefunds,
    growth: balance - input.startBalance - totalContributions,
    annualLimitHitYear,
    lifetimeLimitHitYear,
    rows,
  };
}
