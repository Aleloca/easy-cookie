import { describe, expect, it } from 'vitest';
import { validateConfig, type EasyCookieConfig } from '@easy-cookie/core/shared';
import type { CatalogEntry, ConfigService } from '../api/types';
import { MOCK_CATALOG } from '../mock/catalog';
import { renderMockMarkdown } from '../mock/legal';
import { addFromCatalog, addedAs, catalogToService, filterCatalog, missingCategories } from './catalog';
import {
  applyFormat,
  contentPlaceholders,
  countPlaceholders,
  findPlaceholders,
  insertDirective,
  legalHostedUrl,
  legalHtmlSnippet,
  markPlaceholders,
} from './legal';
import { fitViewport, DEVICES } from './preview';
import it_ from '../i18n/it';
import en from '../i18n/en';

const entry = (id: string) => MOCK_CATALOG.find((e) => e.id === id) as CatalogEntry;

const base = (): EasyCookieConfig => ({
  revision: 'draft',
  categories: { necessary: { readOnly: true }, measurement: {} },
  services: {},
});

describe('catalog conversion', () => {
  it('copies the fields and records the provenance', () => {
    const s = catalogToService(entry('ga4'));
    expect(s).toMatchObject({ category: 'measurement', label: 'Google Analytics 4', provider: 'Google Ireland Limited', from: 'ga4' });
    expect(s.cookies).toHaveLength(2);
    expect(s).not.toHaveProperty('group');
    expect(s).not.toHaveProperty('note');
  });

  it('deep-copies, so editing the service never touches the catalog', () => {
    const s = catalogToService(entry('ga4'));
    s.cookies![0].name = 'changed';
    expect(entry('ga4').cookies[0].name).toBe('_ga');
  });

  it('adds services and creates missing categories with defaults', () => {
    const r = addFromCatalog(base(), [entry('ga4'), entry('meta-pixel'), entry('google-ads')]);
    expect(r.serviceIds).toEqual(['ga4', 'meta-pixel', 'google-ads']);
    expect(r.addedCategories).toEqual(['marketing']);
    expect(r.config.categories.marketing).toEqual({});
    expect(validateConfig(r.config)).toEqual([]);
  });

  it('creates a missing necessary category as read-only', () => {
    const cfg: EasyCookieConfig = { revision: 'x', categories: { measurement: {} } };
    expect(addFromCatalog(cfg, [entry('stripe')]).config.categories.necessary).toEqual({ readOnly: true });
  });

  it('skips entries already added and avoids key collisions', () => {
    const cfg = base();
    cfg.services = { ga4: { category: 'measurement' }, mine: { category: 'measurement', from: 'hotjar' } as ConfigService };
    expect(addedAs(cfg, 'ga4')).toBe('ga4');
    expect(addedAs(cfg, 'hotjar')).toBe('mine');
    expect(addedAs(cfg, 'vimeo')).toBeNull();
    const r = addFromCatalog(cfg, [entry('ga4'), entry('hotjar'), entry('matomo')]);
    expect(r.serviceIds).toEqual(['matomo']);

    const clash = base();
    clash.services = { youtube: { category: 'measurement', from: 'custom' } as ConfigService };
    // Same key but a different origin: the custom one counts as "youtube" already.
    expect(addedAs(clash, 'youtube')).toBe('youtube');
  });

  it('lists missing categories once, in first-use order', () => {
    expect(missingCategories(base(), [entry('youtube'), entry('meta-pixel'), entry('vimeo')])).toEqual(['experience', 'marketing']);
  });

  it('filters by text (accent-insensitive, keywords) and group', () => {
    expect(filterCatalog(MOCK_CATALOG, 'facebook').map((e) => e.id)).toEqual(['meta-pixel']);
    expect(filterCatalog(MOCK_CATALOG, 'GOOGLE', 'embeds').map((e) => e.id)).toEqual(['google-maps', 'youtube']);
    expect(filterCatalog(MOCK_CATALOG, 'google maps').map((e) => e.id)).toEqual(['google-maps']);
    expect(filterCatalog(MOCK_CATALOG, 'statìstiche').length).toBeGreaterThan(0);
    expect(filterCatalog(MOCK_CATALOG, '', 'payments').map((e) => e.id)).toEqual(['stripe']);
  });

  it('ships about a dozen entries covering every group, sorted by group then label', () => {
    expect(MOCK_CATALOG.length).toBeGreaterThanOrEqual(12);
    expect(new Set(MOCK_CATALOG.map((e) => e.group)).size).toBe(8);
    expect(MOCK_CATALOG[0].group).toBe('analytics');
    expect(MOCK_CATALOG.at(-1)!.group).toBe('infrastructure');
  });
});

describe('legal placeholders', () => {
  const body = 'Titolare: [[Ragione sociale]].\n\nScrivi a [[email]].\n[[ ]] e [[]] e [x] non contano\n[[Città\ndel foro]] nemmeno';

  it('counts only single-line, non-empty [[…]] marks', () => {
    expect(countPlaceholders(body)).toBe(2);
    expect(countPlaceholders('')).toBe(0);
  });

  it('locates each placeholder with its offsets and line', () => {
    const p = findPlaceholders(body);
    expect(p.map((x) => x.label)).toEqual(['Ragione sociale', 'email']);
    expect(p[0].line).toBe(1);
    expect(p[1].line).toBe(3);
    expect(body.slice(p[1].start, p[1].end)).toBe('[[email]]');
  });

  it('sums title and body across translations', () => {
    expect(
      contentPlaceholders({
        translations: { it: { title: '[[Titolo]]', body: '[[a]] [[b]]' }, en: { title: 'T', body: '[[c]]' } },
      }),
    ).toBe(4);
  });

  it('wraps plain-text placeholders of the rendered preview in <mark>', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Scrivi a [[email]] o [[telefono]].</p><p><mark class="ec-legal-placeholder">[[sede]]</mark></p>';
    expect(markPlaceholders(root)).toBe(3);
    expect(root.querySelectorAll('mark.ph')).toHaveLength(2);
    expect(root.querySelector('p')!.textContent).toBe('Scrivi a [[email]] o [[telefono]].');
  });
});

describe('markdown toolbar', () => {
  it('toggles headings on the current line', () => {
    const v = 'uno\ndue\ntre';
    const h = applyFormat(v, 5, 5, 'h2');
    expect(h.value).toBe('uno\n## due\ntre');
    expect(applyFormat(h.value, 6, 6, 'h2').value).toBe(v);
    expect(applyFormat('### x', 0, 0, 'h2').value).toBe('## x');
  });

  it('wraps the selection in bold, or inserts the fill text selected', () => {
    expect(applyFormat('a b c', 2, 3, 'bold')).toEqual({ value: 'a **b** c', start: 4, end: 5 });
    const e = applyFormat('ab', 1, 1, 'bold', 'testo');
    expect(e.value).toBe('a**testo**b');
    expect(e.value.slice(e.start, e.end)).toBe('testo');
  });

  it('turns the selection into a link and selects the URL', () => {
    const e = applyFormat('vai qui', 4, 7, 'link');
    expect(e.value).toBe('vai [qui](https://)');
    expect(e.value.slice(e.start, e.end)).toBe('https://');
  });

  it('toggles a bullet list over every selected line', () => {
    const e = applyFormat('a\nb', 0, 3, 'list');
    expect(e.value).toBe('- a\n- b');
    expect(applyFormat(e.value, 0, e.value.length, 'list').value).toBe('a\nb');
  });

  it('inserts a directive on its own paragraph', () => {
    const e = insertDirective('Testo qui', 5, 5, 'cookie-table');
    expect(e.value).toBe('Testo\n\n{{cookie-table}}\n\n qui');
    expect(e.value.slice(e.start, e.end)).toBe('{{cookie-table}}');
    expect(insertDirective('', 0, 0, 'last-updated').value).toBe('{{last-updated}}\n');
    expect(insertDirective('a\n\n', 3, 3, 'services-list').value).toBe('a\n\n{{services-list}}\n');
  });
});

describe('legal snippets', () => {
  it('builds the hosted URL and the loader snippet from the server origin', () => {
    expect(legalHostedUrl('https://c.example.it', 'pk_1', 'cookie')).toBe('https://c.example.it/p/pk_1/cookie');
    expect(legalHtmlSnippet('https://c.example.it', 'pk_1', 'privacy')).toBe(
      '<div data-easy-cookie-legal="privacy"></div>\n<script src="https://c.example.it/v1/sites/pk_1/legal.js" defer></script>',
    );
  });
});

describe('mock markdown renderer', () => {
  const config: EasyCookieConfig = {
    revision: 'x',
    categories: { necessary: { readOnly: true }, measurement: { title: { it: 'Misura' } } },
    services: { ga4: { category: 'measurement', label: 'GA4', cookies: [{ name: '_ga', duration: { it: '2 anni' } }] } },
  };

  it('escapes raw HTML and drops unsafe link schemes', () => {
    const html = renderMockMarkdown('<script>x</script> [a](javascript:alert(1)) [b](https://ok.it)', 'it', { config });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('href="javascript');
    expect(html).toContain('<a href="https://ok.it">b</a>');
  });

  it('expands directives and highlights placeholders', () => {
    const html = renderMockMarkdown('## Cookie\n\n{{cookie-table}}\n\n{{preferences-link}}\n\nTitolare: [[nome]]', 'it', { config });
    expect(html).toContain('<h3>Cookie</h3>');
    expect(html).toContain('<h3>Misura</h3>');
    expect(html).toContain('<code>_ga</code>');
    expect(html).toContain('data-ec-open-preferences');
    expect(html).toContain('<mark class="ec-legal-placeholder">[[nome]]</mark>');
  });
});

describe('preview scaling', () => {
  it('fits a desktop viewport to the column width, keeping the aspect ratio', () => {
    const f = fitViewport(DEVICES.desktop, { width: 420 });
    expect(f.scale).toBeCloseTo(0.328, 3);
    expect(f.width).toBeLessThanOrEqual(420);
    expect(f.height / f.width).toBeCloseTo(800 / 1280, 2);
  });

  it('fits a phone to both width and height, never above 1:1', () => {
    expect(fitViewport(DEVICES.mobile, { width: 440, maxHeight: 1000 }).scale).toBe(1);
    const f = fitViewport(DEVICES.mobile, { width: 440, maxHeight: 560 });
    expect(f.height).toBeLessThanOrEqual(560);
    expect(f.scale).toBeCloseTo(0.717, 3);
  });

  it('returns zero before the stage has a size', () => {
    expect(fitViewport(DEVICES.desktop, { width: 0 })).toEqual({ scale: 0, width: 0, height: 0 });
  });
});

describe('new copy', () => {
  it('pluralises placeholder and service counts at n = 1', () => {
    expect(it_.legal.placeholders(1)).toBe('1 campo da compilare');
    expect(it_.legal.placeholders(3)).toBe('3 campi da compilare');
    expect(en.legal.placeholders(1)).toBe('1 field to fill in');
    expect(it_.library.addN(1)).toBe('Aggiungi 1 servizio');
    expect(it_.library.addN(2)).toBe('Aggiungi 2 servizi');
    expect(it_.library.cookieCount(1)).toBe('1 cookie');
    expect(en.library.cookieCount(2)).toBe('2 cookies');
  });
});
