/**
 * Hand-written SVG charts, returned as markup strings so the same code renders at build time
 * (initial HTML) and in the browser (live updates). Colours come from CSS classes, not inline fills.
 */
import { escapeHtml } from './format';

export interface StackedBarDatum {
  /** Short x-axis label, e.g. "3". */
  label: string;
  /** One value per series, bottom to top. Negative values are drawn as 0. */
  values: number[];
  /** Native tooltip text for the whole bar. */
  tooltip: string;
}

export interface StackedBarOptions {
  data: StackedBarDatum[];
  /** CSS class per series, same order as values. */
  seriesClasses: string[];
  formatAxis: (value: number) => string;
  /** Text alternative describing what the chart shows. */
  ariaLabel: string;
  xAxisLabel?: string;
}

const WIDTH = 640;
const HEIGHT = 260;
const MARGIN = { top: 14, right: 8, left: 76 };
const GAP = 2; // surface gap between stacked segments
const RADIUS = 4; // rounded data end
const MAX_LABELS = 12;

/**
 * Picks an axis maximum and tick count (3–5) whose step is 1, 2, 2.5 or 5 × 10^k, choosing the
 * tightest fit so bars use most of the plot height.
 */
export function niceScale(value: number): { max: number; ticks: number } {
  if (!(value > 0)) return { max: 1, ticks: 4 };
  let best = { max: Infinity, ticks: 4 };
  for (const ticks of [4, 5, 3]) {
    const rough = value / ticks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
    if (step * ticks < best.max) best = { max: step * ticks, ticks };
  }
  return best;
}

/** A bar segment with only its top corners rounded, so it stays anchored to the baseline. */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

const n = (v: number) => Math.round(v * 100) / 100;

export function stackedBarChart(opts: StackedBarOptions): string {
  const { data, seriesClasses, formatAxis, ariaLabel, xAxisLabel } = opts;
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  // Room for x labels, plus the axis title when there is one.
  const bottom = xAxisLabel ? 56 : 34;
  const plotH = HEIGHT - MARGIN.top - bottom;
  const baseY = MARGIN.top + plotH;

  const totals = data.map((d) => d.values.reduce((a, v) => a + Math.max(0, v), 0));
  const { max, ticks } = niceScale(Math.max(0, ...totals));
  const y = (v: number) => (v / max) * plotH;

  const parts: string[] = [];

  // Recessive gridlines and y-axis labels.
  for (let i = 0; i <= ticks; i++) {
    const value = (max / ticks) * i;
    const gy = n(baseY - y(value));
    parts.push(`<line class="chart-grid" x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${gy}" y2="${gy}"/>`);
    parts.push(
      `<text class="chart-axis" x="${MARGIN.left - 8}" y="${gy}" text-anchor="end" dominant-baseline="middle">${escapeHtml(formatAxis(value))}</text>`,
    );
  }

  const band = plotW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(32, band * 0.62));
  const labelEvery = Math.ceil(data.length / MAX_LABELS);

  data.forEach((d, i) => {
    const x = n(MARGIN.left + band * i + (band - barW) / 2);
    const segs: string[] = [];
    let stackTop = baseY;
    const drawn = d.values.map((v) => Math.max(0, v));
    const lastVisible = drawn.reduce((last, v, idx) => (y(v) > 0.5 ? idx : last), -1);

    drawn.forEach((v, s) => {
      const h = y(v);
      if (h <= 0.5) return;
      // Leave a surface gap above each segment except the top one.
      const gap = s < lastVisible ? GAP : 0;
      const segH = Math.max(0.5, h - gap);
      const top = stackTop - h;
      const cls = seriesClasses[s] ?? '';
      segs.push(
        s === lastVisible
          ? `<path class="${cls}" d="${topRoundedRect(x, n(top), n(barW), n(segH), RADIUS)}"/>`
          : `<rect class="${cls}" x="${x}" y="${n(top + gap)}" width="${n(barW)}" height="${n(segH)}"/>`,
      );
      stackTop = top;
    });

    // Full-height hit area so the tooltip works even on short bars.
    parts.push(
      `<g class="chart-bar"><title>${escapeHtml(d.tooltip)}</title><rect class="chart-hit" x="${n(MARGIN.left + band * i)}" y="${MARGIN.top}" width="${n(band)}" height="${plotH}"/>${segs.join('')}</g>`,
    );

    if (i % labelEvery === 0 || i === data.length - 1) {
      parts.push(
        `<text class="chart-axis" x="${n(x + barW / 2)}" y="${baseY + 8}" text-anchor="middle" dominant-baseline="hanging">${escapeHtml(d.label)}</text>`,
      );
    }
  });

  parts.push(`<line class="chart-baseline" x1="${MARGIN.left}" x2="${WIDTH - MARGIN.right}" y1="${baseY}" y2="${baseY}"/>`);
  if (xAxisLabel) {
    parts.push(
      `<text class="chart-axis" x="${MARGIN.left + plotW / 2}" y="${HEIGHT - 4}" text-anchor="middle">${escapeHtml(xAxisLabel)}</text>`,
    );
  }

  return `<svg class="chart-svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeHtml(ariaLabel)}" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
}

export const CHART_ASPECT = `${WIDTH} / ${HEIGHT}`;
