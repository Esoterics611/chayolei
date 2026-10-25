// Links for the new UI. The app uses normal paths; the static demo build
// (scripts/build-demo.sh) sets VITE_HASH_ROUTER=1 and SvelteKit's hash router,
// so every link and navigation goes through these helpers.

import { goto } from '$app/navigation';

const HASH = import.meta.env.VITE_HASH_ROUTER === '1';

export const href = (path: string): string => (HASH ? `#${path}` : path);

export const go = (path: string): Promise<void> => goto(href(path));

/** The app path of the current URL, in either routing mode. */
export function currentPath(url: URL): string {
  return HASH ? (url.hash.slice(1) || '/').split('?')[0] : url.pathname;
}

/** True when `path` is the current section (e.g. /plan matches /plan/o123). */
export function inSection(url: URL, path: string): boolean {
  const p = currentPath(url);
  if (path === '/') return p === '/';
  if (path === '/work') return p === '/work' || p.startsWith('/d/');
  return p === path || p.startsWith(`${path}/`);
}
