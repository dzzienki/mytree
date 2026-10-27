// The app can be served from a sub-path (e.g. https://host/mytree) by setting
// BASE_PATH at build time (see next.config.ts). Next prefixes <Link> and
// router.push() automatically, but raw URLs (fetch, <img src>, window.location,
// service worker) are not, so they go through these helpers.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes root-relative URLs ("/api/x", "/uploads/y.png"); leaves everything else untouched. */
export function withBase(url: string): string {
  return url.startsWith("/") && !url.startsWith("//") ? BASE_PATH + url : url;
}

/** fetch() that works under a base path. */
export function apiFetch(input: string, init?: RequestInit) {
  return fetch(withBase(input), init);
}
