import { describe, expect, it } from 'vitest';
import { gcmStateFor, resolveConfig } from '../src/shared/config';

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
