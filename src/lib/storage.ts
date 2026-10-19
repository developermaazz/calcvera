/**
 * The only things the site stores, all in this browser only: the remembered country, the dismissed banner
 * and the colour theme. Storage can be blocked (private mode, strict settings), so every access is wrapped
 * and failures are ignored.
 */
export const STORAGE_KEYS = {
  country: 'cv-country',
  bannerDismissed: 'cv-banner-dismissed',
  theme: 'cv-theme',
} as const;

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the preference simply isn't remembered.
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}
