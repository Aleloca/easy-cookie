import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import {
  LEGAL_KINDS,
  LEGAL_TEMPLATES,
  countPlaceholders,
  fetchLegalDocument,
  isSafeLegalUrl,
  legalContentError,
  legalTemplate,
  pickLegalLanguage,
  renderLegalDocument,
  type LegalDocContent,
} from '../src';
import { LegalDocumentHtml } from '../src/react';

const config: EasyCookieConfig = {
  revision: '2026-11-13',
  language: { default: 'it', available: ['it', 'en'] },
  categories: { necessary: { readOnly: true }, measurement: {} },
  services: {
    ga4: {
      category: 'measurement',
      label: 'Google Analytics 4',
      provider: 'Google Ireland Ltd',
      privacyUrl: 'https://policies.google.com/privacy',
      purpose: { it: 'Statistiche', en: 'Statistics' },
      cookies: [{ name: '_ga', duration: { it: '2 anni', en: '2 years' } }],
      from: 'ga4',
    },
    own: { category: 'necessary', label: 'Sessione', cookies: [{ name: 'sid' }] },
  },
};

const doc = (body: string, title = 'Titolo'): LegalDocContent => ({ translations: { it: { title, body } } });

describe('renderLegalDocument', () => {
  it('renders Markdown inside an .ec-legal wrapper with the title', () => {
    const r = renderLegalDocument(doc('## Sezione\n\nTesto **forte**.'), 'it', { config, version: 'v1' });
    expect(r.lang).toBe('it');
    expect(r.title).toBe('Titolo');
    expect(r.html).toMatch(/^<div class="ec-legal" lang="it" data-version="v1">/);
    expect(r.html).toContain('<h1 class="ec-legal__title">Titolo</h1>');
    expect(r.html).toContain('<h2>Sezione</h2>');
    expect(r.html).toContain('<strong>forte</strong>');
    expect(r.html.endsWith('</div>')).toBe(true);
    expect(renderLegalDocument(doc('x'), 'it', { heading: false }).html).not.toContain('<h1');
  });

  it('shows raw HTML as text', () => {
    const r = renderLegalDocument(doc('<script>alert(1)</script>\n\nok <img src=x onerror=alert(1)>'), 'it', {});
    expect(r.html).not.toContain('<script>');
    expect(r.html).not.toContain('<img');
    expect(r.html).toContain('&lt;script&gt;');
  });

  it('allows only http, https, mailto and relative links', () => {
    const r = renderLegalDocument(
      doc(
        [
          '[a](https://example.com) [b](mailto:x@example.com) [c](/privacy) [d](#top) [e](page.html)',
          '[bad1](javascript:alert(1)) [bad2](data:text/html,x) [bad3](vbscript:x) [bad4](JaVa%0Ascript:alert(1)) [bad5](ftp://x)',
          'Visit www.example.org',
        ].join('\n\n'),
      ),
      'it',
    );
    expect(r.html).toContain('href="https://example.com" rel="noopener noreferrer"');
    expect(r.html).toContain('href="mailto:x@example.com"');
    expect(r.html).toContain('href="/privacy"');
    expect(r.html).toContain('href="#top"');
    expect(r.html).toContain('href="page.html"');
    expect(r.html).not.toMatch(/href="(javascript|data|vbscript|ftp)/i);
    expect(r.html).not.toMatch(/href="[^"]*script:/i);
    expect(r.html).toContain('href="http://www.example.org"'); // linkify
    expect(isSafeLegalUrl('java\tscript:alert(1)')).toBe(false);
    expect(isSafeLegalUrl('//cdn.example.com/x')).toBe(true);
  });

  it('highlights [[placeholders]], also in the title', () => {
    const r = renderLegalDocument(doc('Titolare: [[Nome <b>titolare</b>]].', 'Privacy [[Nome]]'), 'it');
    expect(r.html).toContain('Titolare: <mark class="ec-legal__todo">Nome &lt;b&gt;titolare&lt;/b&gt;</mark>.');
    expect(r.html).toContain('<h1 class="ec-legal__title">Privacy <mark class="ec-legal__todo">Nome</mark></h1>');
    expect(r.title).toBe('Privacy Nome');
  });

  it('expands {{cookie-table}} with the policy markup', () => {
    const r = renderLegalDocument(doc('Intro\n{{cookie-table}}\n\nFine'), 'it', { config });
    expect(r.html).toContain('<div class="ec-policy" lang="it">');
    expect(r.html).toContain('<h3 class="ec-policy__title" id="ec-policy-measurement-title">Misurazione</h3>');
    expect(r.html).toContain('<code class="ec-policy__cookie">_ga</code>');
    expect(r.html).not.toContain('{{cookie-table}}');
    expect(r.html).not.toContain('ec-policy__meta');
    // Without a config: a notice.
    expect(renderLegalDocument(doc('{{cookie-table}}'), 'it').html).toContain('ec-legal__notice');
  });

  it('expands {{services-list}} with third-party services and transfers from the catalog', () => {
    const r = renderLegalDocument(doc('{{services-list}}'), 'en', { config });
    expect(r.lang).toBe('it'); // only an Italian translation
    const en = renderLegalDocument({ translations: { en: { title: 'T', body: '{{services-list}}' } } }, 'en', { config });
    expect(en.html).toContain('<li class="ec-legal__service" data-service="ga4">');
    expect(en.html).toContain('<strong>Google Analytics 4</strong> · Google Ireland Ltd');
    expect(en.html).toContain('Category: Measurement');
    expect(en.html).toContain('Data transfer: United States (EU-US Data Privacy Framework)');
    expect(en.html).toContain('<a href="https://policies.google.com/privacy" rel="noopener noreferrer">Privacy policy</a>');
    expect(en.html).not.toContain('data-service="own"'); // first party: no provider
    const none = renderLegalDocument(doc('{{services-list}}'), 'it', { config: { ...config, services: {} } });
    expect(none.html).toContain('Nessun servizio di terze parti dichiarato.');
  });

  it('expands {{preferences-link}} and {{last-updated}}, on their own line and inline', () => {
    const r = renderLegalDocument(doc('{{preferences-link}}\n\n{{last-updated}}\n\nPuoi {{preferences-link}} il {{last-updated}}.'), 'it', {
      publishedAt: '2026-03-05T10:00:00Z',
    });
    expect(r.html).toContain('<p><a href="#" class="ec-legal__preferences" data-ec-open-preferences>Modifica le preferenze sui cookie</a></p>');
    expect(r.html).toContain('<p class="ec-legal__updated">Ultimo aggiornamento: <time datetime="2026-03-05">5 marzo 2026</time></p>');
    expect(r.html).toContain('Puoi <a href="#" class="ec-legal__preferences" data-ec-open-preferences>');
    expect(r.html).toContain('il <time datetime="2026-03-05">5 marzo 2026</time>.');
  });

  it('leaves unknown directives and block directives used inline as text, and keeps code untouched', () => {
    const r = renderLegalDocument(doc('Vedi {{cookie-table}} e {{boh}}\n\n`{{last-updated}}`'), 'it', { config });
    expect(r.html).toContain('Vedi {{cookie-table}} e {{boh}}');
    expect(r.html).toContain('<code>{{last-updated}}</code>');
  });

  it('substitutes {{site.name}} / {{site.domain}} when given', () => {
    const r = renderLegalDocument(doc('Sito {{site.name}} su {{site.domain}}', '{{site.name}} privacy'), 'it', {
      site: { name: 'Acme <srl>', domain: 'acme.it' },
    });
    expect(r.html).toContain('Sito Acme &lt;srl&gt; su acme.it');
    expect(r.title).toBe('Acme <srl> privacy');
  });

  it('falls back to the config default language, then to the first translation', () => {
    const content: LegalDocContent = { translations: { en: { title: 'EN', body: 'en' }, it: { title: 'IT', body: 'it' } } };
    expect(renderLegalDocument(content, 'en', { config }).title).toBe('EN');
    expect(renderLegalDocument(content, 'de', { config }).title).toBe('IT');
    expect(renderLegalDocument(content, 'en-GB', { config }).title).toBe('EN');
    expect(renderLegalDocument(content, 'de').title).toBe('EN'); // no config: first translation
    expect(pickLegalLanguage({ translations: {} }, 'it')).toBeUndefined();
  });
});

describe('legal helpers', () => {
  it('counts placeholders', () => {
    expect(countPlaceholders({ translations: { it: { title: '[[a]]', body: '[[b]] e [[c]]\n[[d\n]]' }, en: { title: '', body: '[[e]]' } } })).toBe(4);
    expect(countPlaceholders(null)).toBe(0);
  });

  it('validates content', () => {
    expect(legalContentError({ translations: { it: { title: 'a', body: 'b' } } })).toBeNull();
    expect(legalContentError({ translations: {} })).toBeNull();
    expect(legalContentError(null)).toBeTruthy();
    expect(legalContentError({ translations: [] })).toBeTruthy();
    expect(legalContentError({ translations: { it: { title: 1, body: '' } } })).toBeTruthy();
    expect(legalContentError({ translations: { 'not a lang': { title: '', body: '' } } })).toBeTruthy();
  });

  it('fetchLegalDocument builds the URL, returns null on 404 and throws on errors', async () => {
    const published = { kind: 'cookie', lang: 'it', languages: ['it'], title: 'T', html: '<div></div>', version: 'v', publishedAt: 'x' };
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => published });
    expect(await fetchLegalDocument({ endpoint: 'https://c.test/', siteKey: 'pk_1', kind: 'cookie', lang: 'it', fetch: f })).toEqual(published);
    expect(f.mock.calls[0][0]).toBe('https://c.test/v1/sites/pk_1/legal/cookie.json?lang=it');
    expect(f.mock.calls[0][1]).toMatchObject({ credentials: 'omit' });
    const missing = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await fetchLegalDocument({ endpoint: 'https://c.test', siteKey: 'pk_1', kind: 'terms', fetch: missing })).toBeNull();
    const broken = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchLegalDocument({ endpoint: 'https://c.test', siteKey: 'pk_1', kind: 'terms', fetch: broken })).rejects.toThrow('500');
  });

  it('LegalDocumentHtml renders the server HTML or the fallback', () => {
    expect(renderToStaticMarkup(<LegalDocumentHtml doc={{ html: '<div class="ec-legal">x</div>' }} className="c" />)).toBe(
      '<div class="c"><div class="ec-legal">x</div></div>',
    );
    expect(renderToStaticMarkup(<LegalDocumentHtml doc={null} fallback={<p>none</p>} />)).toBe('<p>none</p>');
  });
});

describe('built-in templates', () => {
  it('exist for every kind in it and en, start with a draft placeholder and render cleanly', () => {
    for (const kind of LEGAL_KINDS)
      for (const lang of ['it', 'en'] as const) {
        const t = LEGAL_TEMPLATES[kind][lang];
        expect(t.title).toBeTruthy();
        expect(t.body.startsWith('[[')).toBe(true);
        expect(t.body.split('\n')[0]).toMatch(/BOZZA|DRAFT/);
        const r = renderLegalDocument({ translations: { [lang]: t } }, lang, { config, site: { name: 'Acme', domain: 'acme.it' } });
        expect(r.html).not.toMatch(/\{\{/);
        expect(r.html).not.toMatch(/\[\[/);
        expect(r.html).toContain('ec-legal__todo');
        expect(r.html).toContain('ec-legal__updated');
      }
    expect(LEGAL_TEMPLATES.cookie.it.body).toContain('{{cookie-table}}');
    expect(LEGAL_TEMPLATES.cookie.en.body).toContain('{{preferences-link}}');
    expect(LEGAL_TEMPLATES.privacy.it.body).toContain('{{services-list}}');
    expect(LEGAL_TEMPLATES.privacy.it.body).toContain('Garante');
  });

  it('legalTemplate fills site variables and falls back to English', () => {
    const t = legalTemplate('privacy', 'it', { name: 'Acme', domain: 'acme.it' });
    expect(t.body).toContain('Acme');
    expect(t.body).toContain('acme.it');
    expect(t.body).not.toContain('{{site.');
    expect(legalTemplate('terms', 'de').title).toBe(LEGAL_TEMPLATES.terms.en.title);
    expect(legalTemplate('cookie', 'it').body).toContain('{{site.domain}}');
  });
});
