/**
 * Display-only count-up: after the calculator writes a new figure into an element, animate the visible text
 * from the previous figure to the new one in under 400ms. The calculation and the final text are untouched:
 * the last frame is exactly the string the calculator wrote. Skipped when the two strings aren't the same
 * shape (different prefix/suffix, e.g. "34 months" → "2 years"), or when reduced motion is preferred.
 */
const NUMBER = /^(\D*?)(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(\D*)$/;
const DURATION = 350;
const running = new WeakMap<HTMLElement, number>();

interface Parsed {
  prefix: string;
  value: number;
  decimals: number;
  grouped: boolean;
  suffix: string;
}

function parse(text: string): Parsed | null {
  const m = NUMBER.exec(text.trim());
  if (!m) return null;
  const [, prefix = '', digits = '', suffix = ''] = m;
  return {
    prefix,
    suffix,
    value: Number(digits.replace(/,/g, '')),
    decimals: digits.includes('.') ? digits.split('.')[1]!.length : 0,
    grouped: digits.includes(','),
  };
}

export function animateNumberChange(el: HTMLElement, before: string): void {
  const after = el.textContent ?? '';
  if (before === after || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = parse(before);
  const to = parse(after);
  if (!from || !to || from.prefix !== to.prefix || from.suffix !== to.suffix) return;

  // Write frames into a text node's data: the calculator replaces child nodes, so these writes never look
  // like a new result to the observer that called us.
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE || el.childNodes.length !== 1) return;
  const text = node as Text;

  const format = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: to.decimals,
    maximumFractionDigits: to.decimals,
    useGrouping: to.grouped || from.grouped,
  });
  const cancel = running.get(el);
  if (cancel) cancelAnimationFrame(cancel);

  const start = performance.now();
  const step = (now: number) => {
    // The calculator wrote something newer: stop and leave its text alone.
    if (el.firstChild !== text) return;
    const t = Math.min(1, (now - start) / DURATION);
    const eased = 1 - Math.pow(1 - t, 3);
    text.data = t < 1 ? `${to.prefix}${format.format(from.value + (to.value - from.value) * eased)}${to.suffix}` : after;
    if (t < 1) running.set(el, requestAnimationFrame(step));
    else running.delete(el);
  };
  text.data = before;
  running.set(el, requestAnimationFrame(step));
}
