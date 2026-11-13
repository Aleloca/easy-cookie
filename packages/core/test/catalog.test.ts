import { describe, expect, it } from 'vitest';
import { CATALOG, CATALOG_GROUPS, catalogToService, findCatalogEntry } from '../src/catalog';
import { validateConfig } from '../src/shared/config';
import { BUILTIN_LANGUAGES } from '../src/shared/defaults';
import type { EasyCookieConfig, Localized } from '../src/shared/types';

const minimal = (): EasyCookieConfig => ({
  revision: 'r1',
  categories: { necessary: { readOnly: true }, functionality: {}, experience: {}, measurement: {}, marketing: {} },
  services: {},
});

const complete = (v: Localized | undefined) =>
  typeof v === 'object' && BUILTIN_LANGUAGES.every((l) => typeof v[l] === 'string' && v[l].trim() !== '');

describe('service catalog', () => {
  it('has about 30 entries with unique ids', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(30);
    const ids = CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it('covers the services the console offers', () => {
    for (const id of [
      'ga4', 'gtm', 'posthog', 'matomo', 'plausible', 'hotjar', 'clarity', 'mixpanel', 'amplitude',
      'google-ads', 'meta-pixel', 'linkedin-insight', 'tiktok-pixel', 'pinterest-tag', 'microsoft-uet', 'x-pixel',
      'youtube', 'vimeo', 'google-maps', 'spotify', 'calendly',
      'intercom', 'crisp', 'hubspot', 'zendesk', 'stripe', 'paypal',
      'recaptcha', 'cloudflare', 'hcaptcha', 'sentry', 'easy-cookie',
    ])
      expect(findCatalogEntry(id), id).toBeDefined();
    expect(findCatalogEntry('nope')).toBeUndefined();
  });

  it('is sorted by group then label', () => {
    const keys = CATALOG.map((e) => [CATALOG_GROUPS.indexOf(e.group), e.label] as const);
    for (const [g] of keys) expect(g).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < keys.length; i++) {
      const [ga, la] = keys[i - 1];
      const [gb, lb] = keys[i];
      expect(ga < gb || (ga === gb && la.localeCompare(lb, 'en') <= 0)).toBe(true);
    }
  });

  it('every entry validates when added to a minimal config', () => {
    for (const entry of CATALOG) {
      const config = minimal();
      config.services![entry.id] = catalogToService(entry);
      expect(validateConfig(config), entry.id).toEqual([]);
    }
    const all = minimal();
    for (const entry of CATALOG) all.services![entry.id] = catalogToService(entry);
    expect(validateConfig(all)).toEqual([]);
  });

  it('every localized field has all the built-in languages', () => {
    expect([...BUILTIN_LANGUAGES]).toEqual(['it', 'en', 'es', 'fr', 'de', 'pt']);
    for (const e of CATALOG) {
      expect(complete(e.purpose), `${e.id}.purpose`).toBe(true);
      if (e.note !== undefined) expect(complete(e.note), `${e.id}.note`).toBe(true);
      if (e.transfer?.safeguard !== undefined) expect(complete(e.transfer.safeguard), `${e.id}.transfer`).toBe(true);
      for (const c of e.cookies) {
        expect(complete(c.description), `${e.id}.${c.name}.description`).toBe(true);
        if (c.duration !== undefined) expect(complete(c.duration), `${e.id}.${c.name}.duration`).toBe(true);
      }
    }
  });

  it('localizes durations in every language', () => {
    expect(findCatalogEntry('ga4')!.cookies[0].duration).toEqual({
      it: '2 anni',
      en: '2 years',
      es: '2 años',
      fr: '2 ans',
      de: '2 Jahre',
      pt: '2 anos',
    });
    expect(findCatalogEntry('youtube')!.cookies.find((c) => c.name === 'YSC')!.duration).toMatchObject({
      es: 'sesión',
      fr: 'session',
      de: 'Sitzung',
      pt: 'sessão',
    });
  });

  it('pattern names compile as regular expressions and plain names are not anchored', () => {
    for (const e of CATALOG)
      for (const c of e.cookies) {
        if (c.pattern) expect(() => new RegExp(c.name), `${e.id}.${c.name}`).not.toThrow();
        else expect(c.name, `${e.id}.${c.name}`).not.toMatch(/^\^|\$$/);
      }
  });

  it('uses defensible categories and https privacy links', () => {
    const byGroup = (g: string) => CATALOG.filter((e) => e.group === g);
    for (const e of byGroup('analytics')) expect(e.category, e.id).toBe('measurement');
    for (const e of byGroup('advertising')) expect(e.category, e.id).toBe('marketing');
    for (const e of byGroup('embeds')) expect(e.category, e.id).toBe('experience');
    for (const e of byGroup('support')) expect(e.category, e.id).toBe('functionality');
    for (const g of ['payments', 'security', 'infrastructure', 'tag-management'])
      for (const e of byGroup(g)) expect(e.category, e.id).toBe('necessary');
    expect(findCatalogEntry('gtm')!.cookies).toEqual([]);
    for (const e of CATALOG) if (e.privacyUrl) expect(e.privacyUrl, e.id).toMatch(/^https:\/\//);
    expect(findCatalogEntry('easy-cookie')!.cookies.map((c) => c.name)).toEqual(['ec_consent']);
  });

  it('catalogToService copies the entry and records where it came from', () => {
    const entry = findCatalogEntry('ga4')!;
    const svc = catalogToService(entry);
    expect(svc).toMatchObject({
      category: 'measurement',
      label: 'Google Analytics 4',
      provider: 'Google Ireland Ltd',
      privacyUrl: 'https://policies.google.com/privacy',
      from: 'ga4',
    });
    expect(svc.purpose).toEqual(entry.purpose);
    svc.cookies![0].name = 'changed';
    (svc.purpose as Record<string, string>).it = 'changed';
    expect(entry.cookies[0].name).toBe('_ga');
    expect((entry.purpose as Record<string, string>).it).not.toBe('changed');
    // Empty provider / privacy URL are omitted.
    const own = catalogToService(findCatalogEntry('easy-cookie')!);
    expect(own).not.toHaveProperty('provider');
    expect(own).not.toHaveProperty('privacyUrl');
  });

  it('validateConfig rejects a non-string from', () => {
    const config = minimal();
    config.services!.x = { category: 'necessary', from: 42 as unknown as string };
    expect(validateConfig(config)).toEqual([{ path: 'services.x.from', message: expect.any(String) }]);
  });
});
