import { describe, expect, it } from 'vitest';
import { gcmStateFor, resolveConfig, resolveTexts } from '../src/shared/config';
import { BUILTIN_LANGUAGES, DEFAULT_TEXTS, KNOWN_CATEGORIES } from '../src/shared/defaults';

describe('categories derived from services', () => {
  const base = {
    revision: '1',
    categories: { necessary: { readOnly: true }, measurement: {}, marketing: {} },
  };

  it('keeps every category when no service is declared', () => {
    expect(resolveConfig(base).resolvedCategories.map((c) => c.id)).toEqual(['necessary', 'measurement', 'marketing']);
  });

  it('drops optional categories without services once services are declared', () => {
    const c = resolveConfig({ ...base, services: { ga4: { category: 'measurement' } } });
    expect(c.resolvedCategories.map((x) => x.id)).toEqual(['necessary', 'measurement']);
  });

  it('always keeps read-only categories, even without services', () => {
    const c = resolveConfig({ ...base, services: { ads: { category: 'marketing' } } });
    expect(c.resolvedCategories.map((x) => x.id)).toEqual(['necessary', 'marketing']);
  });

  it('leaves the signals of a dropped category denied', () => {
    const c = resolveConfig({ ...base, services: { ga4: { category: 'measurement' } } });
    const state = gcmStateFor(c, ['necessary', 'measurement', 'marketing']);
    expect(state.analytics_storage).toBe('granted');
    expect(state.ad_storage).toBe('denied');
  });

  it('keeps colours stable when a category is dropped', () => {
    const withAll = resolveConfig({ ...base, categories: { ...base.categories, extra1: {}, extra2: {} } });
    const dropped = resolveConfig({
      ...base,
      categories: { ...base.categories, extra1: {}, extra2: {} },
      services: { s: { category: 'extra2' } },
    });
    expect(dropped.resolvedCategories.find((c) => c.id === 'extra2')!.color).toBe(
      withAll.resolvedCategories.find((c) => c.id === 'extra2')!.color,
    );
  });
});

describe('built-in texts', () => {
  const cfg = { revision: 'r1', categories: { necessary: { readOnly: true } } };
  const keysOf = (o: object): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keysOf(v).map((x) => `${k}.${x}`) : [k]));

  it('resolveTexts returns German for de, and uses the base language of a regional code', () => {
    const de = resolveTexts(cfg, 'de');
    expect(de.banner.acceptAll).toBe('Alle akzeptieren');
    expect(de.banner.rejectAll).toBe('Alle ablehnen');
    expect(de.preferences.title).toBe('Cookie-Einstellungen');
    expect(resolveTexts(cfg, 'de-AT').banner.acceptAll).toBe('Alle akzeptieren');
  });

  it('falls back to English for an unknown language', () => {
    expect(resolveTexts(cfg, 'nl')).toEqual(DEFAULT_TEXTS.en);
    expect(resolveTexts(cfg, '')).toEqual(DEFAULT_TEXTS.en);
  });

  it('applies overrides on top of the new languages', () => {
    const t = resolveTexts({ ...cfg, texts: { fr: { banner: { title: 'Cookies ?' } } } }, 'fr');
    expect(t.banner.title).toBe('Cookies ?');
    expect(t.banner.acceptAll).toBe('Tout accepter');
  });

  it('every language has every key, non-empty, with placeholders intact', () => {
    const ref = keysOf(DEFAULT_TEXTS.en).sort();
    for (const lang of BUILTIN_LANGUAGES) {
      const t = DEFAULT_TEXTS[lang];
      expect(keysOf(t).sort(), lang).toEqual(ref);
      for (const k of ref) {
        const v = k.split('.').reduce((o: any, p) => o[p], t) as string;
        expect(v.trim(), `${lang}.${k}`).not.toBe('');
      }
      expect(t.preferences.serviceCounter.split('|'), lang).toHaveLength(2);
      expect(t.embed.blocked, lang).toContain('{service}');
      expect(t.embed.blocked, lang).toContain('{category}');
      expect(t.embed.enableAlways, lang).toContain('{category}');
    }
  });

  it('keeps the equal-weight banner buttons of comparable length', () => {
    for (const lang of BUILTIN_LANGUAGES) {
      const { acceptAll, rejectAll } = DEFAULT_TEXTS[lang].banner;
      expect(Math.abs(acceptAll.length - rejectAll.length), lang).toBeLessThanOrEqual(3);
    }
  });

  it('known categories have a title and description in every built-in language', () => {
    for (const [id, cat] of Object.entries(KNOWN_CATEGORIES))
      for (const lang of BUILTIN_LANGUAGES) {
        expect(cat.title[lang], `${id}.title.${lang}`).toBeTruthy();
        expect(cat.description[lang], `${id}.description.${lang}`).toBeTruthy();
      }
    expect(KNOWN_CATEGORIES.measurement.title.de).toBe('Messung');
  });
});
