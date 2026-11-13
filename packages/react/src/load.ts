import type { EasyCookieApi } from '@easy-cookie/core/shared';

/** True when `value` looks like an object implementing {@link EasyCookieApi}. */
export function isEasyCookieApi(value: unknown): value is EasyCookieApi {
  const v = value as Partial<EasyCookieApi> | null | undefined;
  return !!v && typeof v.run === 'function' && typeof v.on === 'function' && typeof v.get === 'function';
}

/**
 * Pick the runtime API out of the `@easy-cookie/core` module namespace.
 * Accepts a default export, a named `easyCookie` / `EasyCookie` export, or the
 * namespace itself exposing the API functions.
 */
export function pickApi(mod: unknown): EasyCookieApi {
  const m = mod as Record<string, unknown> | null | undefined;
  for (const candidate of [m?.default, m?.easyCookie, m?.EasyCookie, m]) {
    if (isEasyCookieApi(candidate)) return candidate;
  }
  throw new Error('[easy-cookie] @easy-cookie/core does not expose an EasyCookieApi (run/on/get).');
}

/**
 * Load the browser runtime lazily. Called only from effects (never during
 * render), so importing `@easy-cookie/react` on the server never touches the DOM.
 */
export async function loadDefaultApi(): Promise<EasyCookieApi> {
  const mod: unknown = await import('@easy-cookie/core');
  return pickApi(mod);
}
