import { describe, expect, it, beforeEach } from 'vitest';
import { renderHeadScript, defineConfig, consentFromCookieHeader, validateConfig, gcmStateFor, resolveConfig } from '../src/shared';

const config = defineConfig({
  revision: '2026-11-13',
  categories: { necessary: { readOnly: true }, measurement: {}, marketing: {} },
  googleConsentMode: { enabled: true },
});

function cookieFor(categories: string[], rev = '2026-11-13', ageDays = 0) {
  const ts = new Date(Date.now() - ageDays * 86400000).toISOString();
  return 'ec_consent=' + encodeURIComponent(JSON.stringify({
    categories, revision: 0, consentId: 'abc', consentTimestamp: ts, services: {},
    data: { ec: { rev, method: 'custom' } },
  }));
}

function run(cookie: string) {
  (window as any).dataLayer = undefined;
  (window as any).gtag = undefined;
  document.cookie.split(';').forEach((c) => (document.cookie = c.split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'));
  if (cookie) document.cookie = cookie;
  new Function(renderHeadScript(config))();
  return Array.from((window as any).dataLayer[0]) as any[];
}

describe('head script', () => {
  it('defaults everything to denied without a choice', () => {
    const [cmd, type, state] = run('');
    expect([cmd, type]).toEqual(['consent', 'default']);
    expect(state).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', security_storage: 'granted', wait_for_update: 500 });
  });
  it('applies the stored choice', () => {
    const state = run(cookieFor(['necessary', 'measurement']))[2];
    expect(state.analytics_storage).toBe('granted');
    expect(state.ad_storage).toBe('denied');
    expect(state.wait_for_update).toBeUndefined();
  });
  it('ignores a choice for another revision', () => {
    expect(run(cookieFor(['necessary', 'measurement', 'marketing'], 'old'))[2].analytics_storage).toBe('denied');
  });
  it('ignores an expired choice', () => {
    expect(run(cookieFor(['necessary', 'marketing'], '2026-11-13', 400))[2].ad_storage).toBe('denied');
  });
});

describe('shared helpers', () => {
  it('parses consent from a cookie header', () => {
    const c = consentFromCookieHeader('foo=1; ' + cookieFor(['necessary', 'marketing']), { revision: '2026-11-13' });
    expect(c?.categories).toEqual(['necessary', 'marketing']);
    expect(c?.method).toBe('custom');
    expect(consentFromCookieHeader(cookieFor(['necessary']), { revision: 'other' })).toBeNull();
  });
  it('validates configs', () => {
    expect(validateConfig(config)).toEqual([]);
    const issues = validateConfig({ revision: '', categories: { a: {} }, services: { x: { category: 'zzz' } } });
    expect(issues.map((i) => i.path)).toEqual(expect.arrayContaining(['revision', 'categories', 'services.x.category']));
  });
  it('maps categories to Consent Mode signals', () => {
    const s = gcmStateFor(resolveConfig(config), ['necessary', 'marketing']);
    expect(s).toMatchObject({ ad_storage: 'granted', ad_user_data: 'granted', analytics_storage: 'denied' });
  });
});
