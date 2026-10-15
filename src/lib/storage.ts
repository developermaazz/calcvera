/**
 * The only two things the site stores, both in this browser only. Storage can be blocked
 * (private mode, strict settings), so every access is wrapped and failures are ignored.
 */
export const STORAGE_KEYS = {
  country: 'cv-country',
  bannerDismissed: 'cv-banner-dismissed',
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
