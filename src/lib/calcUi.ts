/**
 * Browser wiring shared by calculators built from Field / SelectField / CheckboxField.
 * The calculator supplies one function: read the form → { errors, view }. This file handles live updates,
 * inline messages, conditional fields and writing the view into the page:
 *   [data-out=key]   textContent = view[key]          [data-html=key]  innerHTML = view[key]
 *   [data-show=key]  hidden = !view[key]              [data-summary]   view.summary
 *   [data-when="field:a,b"]  hidden unless that field's value is a or b (checkboxes: true/false)
 */
import type { FieldError } from '../engines/validation';
import { createFormatters, parseNumber } from './format';

export interface Reader {
  /** Parsed number; NaN when invalid. Empty input returns `emptyAs` when given. */
  num(field: string, emptyAs?: number): number;
  text(field: string): string;
  checked(field: string): boolean;
}

export interface CalcView {
  summary: string;
  [key: string]: unknown;
}

export interface Computed<V extends CalcView> {
  errors: FieldError[];
  view: V | null;
}

export const STALE_MESSAGE = 'Check the highlighted field to update your results.';

/** Reader over plain values, so the same compute function renders the initial HTML at build time. */
export function valueReader(values: Record<string, string | number | boolean>): Reader {
  return {
    num: (field, emptyAs) => {
      const v = values[field];
      if (typeof v === 'number') return v;
      if ((v === undefined || v === '') && emptyAs !== undefined) return emptyAs;
      return parseNumber(String(v ?? ''));
    },
    text: (field) => String(values[field] ?? ''),
    checked: (field) => values[field] === true,
  };
}

export function bindCalculator<V extends CalcView>(root: HTMLElement, compute: (read: Reader) => Computed<V>): void {
  const form = root.querySelector('form');
  if (!form) return;
  const fmt = createFormatters(root.dataset.locale ?? 'en-US', root.dataset.currency ?? 'USD');

  const control = (field: string) =>
    root.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-field="${CSS.escape(field)}"]`);

  const read: Reader = {
    num: (field, emptyAs) => {
      const el = control(field);
      if (!el) return Number.NaN;
      if (el.value.trim() === '' && emptyAs !== undefined) return emptyAs;
      return parseNumber(el.value);
    },
    text: (field) => control(field)?.value ?? '',
    checked: (field) => (control(field) as HTMLInputElement | null)?.checked ?? false,
  };

  const applyConditions = () => {
    for (const el of root.querySelectorAll<HTMLElement>('[data-when]')) {
      const [field = '', values = ''] = (el.dataset.when ?? '').split(':');
      const target = control(field);
      const current = target instanceof HTMLInputElement && target.type === 'checkbox' ? String(target.checked) : (target?.value ?? '');
      el.hidden = !values.split(',').includes(current);
    }
  };

  const render = (view: V) => {
    for (const el of root.querySelectorAll<HTMLElement>('[data-out]')) {
      const value = view[el.dataset.out ?? ''];
      if (typeof value === 'string') el.textContent = value;
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-html]')) {
      const value = view[el.dataset.html ?? ''];
      if (typeof value === 'string') el.innerHTML = value;
    }
    for (const el of root.querySelectorAll<HTMLElement>('[data-show]')) {
      el.hidden = !view[el.dataset.show ?? ''];
    }
  };

  const update = () => {
    applyConditions();
    const { errors, view } = compute(read);
    for (const msg of root.querySelectorAll<HTMLElement>('[data-msg]')) {
      const field = msg.dataset.msg ?? '';
      const error = errors.find((e) => e.field === field);
      msg.textContent = error?.message ?? '';
      control(field)?.setAttribute('aria-invalid', error ? 'true' : 'false');
    }
    root.toggleAttribute('data-stale', errors.length > 0 || view === null);
    const summary = root.querySelector<HTMLElement>('[data-summary]');
    if (errors.length > 0 || !view) {
      if (summary) summary.textContent = STALE_MESSAGE;
      return;
    }
    render(view);
    if (summary) summary.textContent = view.summary;
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', update);
  form.addEventListener('change', update);

  for (const input of root.querySelectorAll<HTMLInputElement>('[data-money]')) {
    input.addEventListener('blur', () => {
      const value = parseNumber(input.value);
      if (input.value.trim() !== '' && Number.isFinite(value) && value >= 0) input.value = fmt.number(value);
    });
  }

  // "Add another" buttons reveal the next hidden row in their group.
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-reveal]')) {
    button.addEventListener('click', () => {
      const next = root.querySelector<HTMLElement>(`[data-row-group="${button.dataset.reveal}"][hidden]`);
      if (next) {
        next.hidden = false;
        next.querySelector<HTMLInputElement>('input')?.focus();
      }
      if (!root.querySelector(`[data-row-group="${button.dataset.reveal}"][hidden]`)) button.hidden = true;
    });
  }

  if (needsRefresh(form)) update();
}

/**
 * The built HTML already shows the result for the default inputs, so the first recalculation is skipped
 * unless the browser restored edited values (back button, autofill) or the build is from an earlier month
 * (payoff dates count from the current month).
 */
export function needsRefresh(form: HTMLFormElement): boolean {
  const built = document.documentElement.dataset.built;
  const now = new Date();
  if (built !== `${now.getFullYear()}-${now.getMonth()}`) return true;
  for (const el of form.elements) {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'checkbox' || el.type === 'radio' ? el.checked !== el.defaultChecked : el.value !== el.defaultValue) return true;
    } else if (el instanceof HTMLSelectElement) {
      for (const option of el.options) if (option.selected !== option.defaultSelected) return true;
    }
  }
  return false;
}

/** Reads the resolved figures the page embedded for the browser. */
export function embeddedParams<P>(root: HTMLElement): P {
  return JSON.parse(root.dataset.params ?? '{}') as P;
}
