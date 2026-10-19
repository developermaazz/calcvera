/**
 * Site-wide browser behaviour in one module (one request instead of many): header, search, menu, theme
 * toggle, remembered country, one-time fade-ups, "On this page" highlighting, and the display-only
 * calculator polish (count-up, chart grow-in, mobile result bar). Calculator maths lives in each
 * calculator's own script; nothing here reads or changes results.
 */
import { animateNumberChange } from '../lib/countUp';
import { readStorage, removeStorage, writeStorage, STORAGE_KEYS } from '../lib/storage';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- Remembered country ------------------------------------------------------------------------- */
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-set-country]')) {
  link.addEventListener('click', () => writeStorage(STORAGE_KEYS.country, link.dataset.setCountry ?? ''));
}

/* ---- Theme toggle (applied before paint by the inline script in BaseLayout) ---------------------- */
const themeInputs = document.querySelectorAll<HTMLInputElement>('[data-theme-toggle] input');
const applyTheme = (choice: string) => {
  const root = document.documentElement;
  if (choice === 'light' || choice === 'dark') {
    root.dataset.theme = choice;
    writeStorage(STORAGE_KEYS.theme, choice);
  } else {
    delete root.dataset.theme;
    removeStorage(STORAGE_KEYS.theme);
  }
  for (const input of themeInputs) input.checked = input.value === choice;
};
const savedTheme = readStorage(STORAGE_KEYS.theme);
for (const input of themeInputs) {
  input.checked = input.value === (savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system');
  input.addEventListener('change', () => applyTheme(input.value));
}

/* ---- Header: border on scroll, menu sheet, search ---------------------------------------------- */
const header = document.querySelector<HTMLElement>('[data-header]');
const onScroll = () => header?.toggleAttribute('data-scrolled', window.scrollY > 4);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Native <dialog> gives a focus trap, Esc to close and an inert background.
for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[data-search], dialog[data-menu]')) {
  dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

const menu = document.querySelector<HTMLDialogElement>('dialog[data-menu]');
document.querySelector('[data-menu-open]')?.addEventListener('click', () => menu?.showModal());

const search = document.querySelector<HTMLDialogElement>('dialog[data-search]');
const searchInput = search?.querySelector<HTMLInputElement>('[data-search-input]');
const searchItems = [...(search?.querySelectorAll<HTMLLIElement>('[data-keywords]') ?? [])];
const searchEmpty = search?.querySelector<HTMLElement>('[data-search-empty]');
const visibleLinks = () => searchItems.filter((li) => !li.hidden).map((li) => li.querySelector('a')!);

const filterSearch = () => {
  const terms = (searchInput?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const li of searchItems) {
    const match = terms.every((t) => (li.dataset.keywords ?? '').includes(t));
    li.hidden = !match;
    if (match) shown++;
  }
  if (searchEmpty) searchEmpty.hidden = shown > 0;
};

const openSearch = () => {
  if (!search || search.open) return;
  menu?.close();
  search.showModal();
  searchInput?.focus();
  searchInput?.select();
};

document.querySelector('[data-search-open]')?.addEventListener('click', openSearch);
searchInput?.addEventListener('input', filterSearch);
searchInput?.addEventListener('keydown', (e) => {
  // A search box swallows the first Esc (it clears the text), so close explicitly.
  if (e.key === 'Escape') {
    e.preventDefault();
    search?.close();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    visibleLinks()[0]?.focus();
  } else if (e.key === 'Enter') {
    const first = visibleLinks()[0];
    if (first) location.href = first.href;
  }
});
search?.querySelector('[data-search-results]')?.addEventListener('keydown', (e) => {
  const event = e as KeyboardEvent;
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const links = visibleLinks();
  const i = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (event.key === 'ArrowUp' && i <= 0) searchInput?.focus();
  else links[Math.min(links.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1))]?.focus();
});

addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
  if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    openSearch();
  } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    openSearch();
  }
});

/* ---- One-time fade-up for .reveal sections below the fold --------------------------------------- */
const reveal = document.querySelectorAll<HTMLElement>('.reveal');
if (reveal.length > 0 && 'IntersectionObserver' in window && !reducedMotion) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );
  for (const el of reveal) {
    // Anything already on screen stays put; only content further down fades up.
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in');
    else io.observe(el);
  }
  // Set last, so that if this script never runs nothing is hidden.
  document.documentElement.dataset.motion = '';
}

/* ---- "On this page": highlight the section being read ------------------------------------------- */
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
const tocTargets = tocLinks
  .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
  .filter((el): el is HTMLElement => !!el);
if (tocTargets.length > 0 && 'IntersectionObserver' in window) {
  const visible = new Set<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
      const current = tocTargets.find((t) => visible.has(t));
      if (!current) return;
      for (const a of tocLinks) a.setAttribute('aria-current', String(a.hash.slice(1) === current.id));
    },
    { rootMargin: '-15% 0px -70% 0px' },
  );
  for (const t of tocTargets) io.observe(t);
}

/* ---- Calculator polish (display only) ---------------------------------------------------------- */
for (const shell of document.querySelectorAll<HTMLElement>('[data-calc-shell]')) {
  const results = shell.querySelector<HTMLElement>('.calc-results');
  const form = shell.querySelector('form');
  if (!results || !form) continue;

  // Count-up only after the visitor changes something, never on page load.
  let interacted = false;
  const markInteracted = () => (interacted = true);
  form.addEventListener('input', markInteracted, { capture: true });
  form.addEventListener('change', markInteracted, { capture: true });
  const counter = new MutationObserver((records) => {
    if (!interacted) return;
    for (const r of records) {
      const before = [...r.removedNodes].map((n) => n.textContent ?? '').join('');
      if (before) animateNumberChange(r.target as HTMLElement, before);
    }
  });
  for (const el of results.querySelectorAll<HTMLElement>('[data-out]')) counter.observe(el, { childList: true });

  // Chart bars grow in on first paint only; later redraws appear instantly.
  setTimeout(() => {
    for (const box of shell.closest('.calc-block')?.querySelectorAll<HTMLElement>('[data-chart]') ?? []) box.dataset.drawn = '';
  }, 900);

  // Mobile: slim bar with the main result while the inputs are on screen but the results are not.
  const bar = shell.querySelector<HTMLElement>('[data-result-bar]');
  const figure = results.querySelector<HTMLElement>('.result-figure');
  if (!bar || !figure) continue;
  const barValue = bar.querySelector<HTMLElement>('[data-bar-value]')!;
  bar.querySelector<HTMLElement>('[data-bar-label]')!.textContent = results.querySelector('.result-label')?.textContent ?? '';
  const syncBar = () => (barValue.textContent = figure.textContent);
  syncBar();
  new MutationObserver(syncBar).observe(figure, { childList: true, characterData: true, subtree: true });

  const breakdown = shell.closest('.calc-block')?.querySelector<HTMLElement>('.breakdown');
  const link = bar.querySelector<HTMLAnchorElement>('[data-bar-link]')!;
  if (breakdown) {
    if (!breakdown.id) breakdown.id = link.hash.slice(1);
    link.hash = breakdown.id;
  } else {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      results.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

  let formVisible = false;
  let resultsVisible = true;
  const banner = document.querySelector<HTMLElement>('[data-country-banner]');
  const showBar = () => bar.classList.toggle('is-visible', formVisible && !resultsVisible && (!banner || banner.hidden !== false));
  new IntersectionObserver(
    ([e]) => {
      formVisible = !!e?.isIntersecting;
      showBar();
    },
    { rootMargin: '0px 0px -80px 0px' },
  ).observe(form);
  new IntersectionObserver(
    ([e]) => {
      resultsVisible = !!e?.isIntersecting;
      showBar();
    },
    { threshold: 0.15 },
  ).observe(results);
}
