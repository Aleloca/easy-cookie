import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderHeadScript, type EasyCookieConfig } from '@easy-cookie/core/shared';
import {
  EasyCookieHead,
  EasyCookieHeadRemote,
  EasyCookieProvider,
  getServerConsent,
  headScriptUrl,
  isGrantedOnServer,
  isServiceGrantedOnServer,
  useConsent,
} from '../src';
import * as serverEntry from '../src/server';

const config: EasyCookieConfig = {
  revision: '2026-11-13',
  googleConsentMode: { enabled: true },
  categories: { necessary: { readOnly: true }, measurement: {}, marketing: {} },
  services: {
    ga4: { category: 'measurement' },
    posthog: { category: 'measurement' },
    meta: { category: 'marketing' },
  },
};

function cookieValue(over: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return encodeURIComponent(
    JSON.stringify({
      categories: ['necessary', 'measurement'],
      revision: 0,
      consentId: 'abc-123',
      consentTimestamp: now,
      lastConsentTimestamp: now,
      services: { necessary: [], measurement: ['ga4'] },
      languageCode: 'it',
      data: { ec: { rev: '2026-11-13', method: 'custom' } },
      ...over,
    }),
  );
}

/** Mimics `ReadonlyRequestCookies` from next/headers. */
function cookieStore(values: Record<string, string>) {
  return {
    get: (name: string) => (name in values ? { name, value: values[name] } : undefined),
    getAll: () => Object.entries(values).map(([name, value]) => ({ name, value })),
    has: (name: string) => name in values,
    size: Object.keys(values).length,
  };
}

describe('getServerConsent', () => {
  it('reads the awaited cookies() store', () => {
    const consent = getServerConsent(cookieStore({ ec_consent: cookieValue() }), config);
    expect(consent).toMatchObject({ id: 'abc-123', revision: '2026-11-13', method: 'custom', categories: ['necessary', 'measurement'] });
  });

  it('accepts decoded cookie values (as Next hands them out)', () => {
    const store = cookieStore({ ec_consent: decodeURIComponent(cookieValue()) });
    expect(getServerConsent(store, config)?.id).toBe('abc-123');
  });

  it('reads Headers, Request-like objects and raw Cookie strings', () => {
    const header = `other=1; ec_consent=${cookieValue()}; x=y`;
    expect(getServerConsent(new Headers({ cookie: header }), config)?.id).toBe('abc-123');
    expect(getServerConsent(new Request('https://example.com', { headers: { cookie: header } }), config)?.id).toBe('abc-123');
    expect(getServerConsent({ cookies: cookieStore({ ec_consent: cookieValue() }) }, config)?.id).toBe('abc-123');
    expect(getServerConsent(header, config)?.id).toBe('abc-123');
  });

  it('returns null without a valid choice for this revision', () => {
    expect(getServerConsent(cookieStore({}), config)).toBeNull();
    expect(getServerConsent(null, config)).toBeNull();
    expect(getServerConsent(new Headers(), config)).toBeNull();
    expect(getServerConsent(cookieStore({ ec_consent: 'garbage' }), config)).toBeNull();
    const old = cookieValue({ data: { ec: { rev: '2025-01-01', method: 'accept_all' } } });
    expect(getServerConsent(cookieStore({ ec_consent: old }), config)).toBeNull();
    const expired = cookieValue({ lastConsentTimestamp: '2020-01-01T00:00:00.000Z', consentTimestamp: '2020-01-01T00:00:00.000Z' });
    expect(getServerConsent(cookieStore({ ec_consent: expired }), config)).toBeNull();
  });

  it('honours a custom cookie name', () => {
    const custom = { ...config, cookie: { name: 'site_consent' } };
    expect(getServerConsent(cookieStore({ site_consent: cookieValue() }), custom)?.id).toBe('abc-123');
    expect(getServerConsent(cookieStore({ ec_consent: cookieValue() }), custom)).toBeNull();
  });

  it('explains a forgotten await', () => {
    expect(() => getServerConsent(Promise.resolve(cookieStore({})) as any, config)).toThrow(/await cookies\(\)/);
  });
});

describe('isGrantedOnServer / isServiceGrantedOnServer', () => {
  const store = cookieStore({ ec_consent: cookieValue() });
  it('checks categories, with read-only ones always granted', () => {
    expect(isGrantedOnServer(store, config, 'measurement')).toBe(true);
    expect(isGrantedOnServer(store, config, 'marketing')).toBe(false);
    expect(isGrantedOnServer(cookieStore({}), config, 'necessary')).toBe(true);
    expect(isGrantedOnServer(cookieStore({}), config, 'measurement')).toBe(false);
  });
  it('checks services', () => {
    expect(isServiceGrantedOnServer(store, config, 'ga4')).toBe(true);
    expect(isServiceGrantedOnServer(store, config, 'posthog')).toBe(false);
    expect(isServiceGrantedOnServer(store, config, 'meta')).toBe(false);
    expect(isServiceGrantedOnServer(store, config, 'unknown')).toBe(false);
  });
});

describe('<EasyCookieHead>', () => {
  it('renders the generated Consent Mode snippet inline', () => {
    const html = renderToStaticMarkup(<EasyCookieHead config={config} nonce="n0nce" />);
    expect(html.startsWith('<script id="easy-cookie-head" nonce="n0nce">')).toBe(true);
    expect(html).toContain(renderHeadScript(config));
  });

  it('renders the remote head.js tag', () => {
    expect(headScriptUrl('https://consent.example.com/', 'pk_live_1')).toBe(
      'https://consent.example.com/v1/sites/pk_live_1/head.js',
    );
    const html = renderToStaticMarkup(<EasyCookieHeadRemote endpoint="https://consent.example.com" siteKey="pk_live_1" />);
    expect(html).toBe('<script id="easy-cookie-head" src="https://consent.example.com/v1/sites/pk_live_1/head.js"></script>');
  });
});

describe('entries', () => {
  it('re-exports the React client components', () => {
    expect(typeof EasyCookieProvider).toBe('function');
    expect(typeof useConsent).toBe('function');
  });
  it('keeps the server entry free of React', () => {
    expect(Object.keys(serverEntry).sort()).toEqual(['getLegalDocument', 'getRemoteConfig', 'getServerConsent', 'isGrantedOnServer', 'isServiceGrantedOnServer']);
  });
});
