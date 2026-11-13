import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import {
  autoClearRules,
  buildPolicyModel,
  matchesRule,
  prettyCookiePattern,
  renderPolicyHtml,
  renderPolicyMarkdown,
} from '../src';
import { CookiePolicy } from '../src/react';

const config: EasyCookieConfig = {
  revision: '2026-11-13',
  language: { default: 'it', available: ['it', 'en'] },
  categories: {
    necessary: { readOnly: true },
    measurement: {},
    marketing: {},
    experience: {},
  },
  services: {
    session: {
      category: 'necessary',
      label: { it: 'Sessione', en: 'Session' },
      provider: 'Example S.r.l.',
      cookies: [{ name: 'ec_consent', duration: { it: '6 mesi', en: '6 months' }, description: { it: 'Ricorda la scelta', en: 'Remembers the choice' } }],
    },
    ga4: {
      category: 'measurement',
      label: 'Google Analytics 4',
      provider: 'Google Ireland Ltd',
      privacyUrl: 'https://policies.google.com/privacy',
      purpose: { it: 'Statistiche di visita', en: 'Visit statistics' },
      cookies: [
        { name: '^_ga$', pattern: true, duration: { it: '2 anni', en: '2 years' } },
        { name: '^_ga_.*$', pattern: true, duration: { it: '2 anni', en: '2 years' } },
      ],
    },
    meta: {
      category: 'marketing',
      label: 'Meta Pixel',
      provider: 'Meta Platforms <Ireland> Ltd',
      privacyUrl: 'javascript:alert(1)',
      cookies: [{ name: '^_fb[pc]$', pattern: true, duration: { it: '3 mesi', en: '3 months' }, domain: '.example.com' }],
    },
    gtm: { category: 'measurement', label: 'Google Tag Manager', provider: 'Google Ireland Ltd' },
  },
};

describe('buildPolicyModel', () => {
  it('localizes categories, services and cookies', () => {
    const m = buildPolicyModel(config, 'en');
    expect(m.revision).toBe('2026-11-13');
    expect(m.date).toBe('2026-11-13');
    // `experience` has no services: like the banner, the policy leaves it out.
    expect(m.categories.map((c) => c.id)).toEqual(['necessary', 'measurement', 'marketing']);
    const measurement = m.categories[1];
    expect(measurement.title).toBe('Measurement');
    expect(measurement.services.map((s) => s.id)).toEqual(['ga4', 'gtm']);
    expect(measurement.services[0].purpose).toBe('Visit statistics');
    expect(measurement.services[0].cookies[1]).toMatchObject({ name: '^_ga_.*$', displayName: '_ga_*', duration: '2 years', pattern: true });
    expect(m.categories[0].readOnly).toBe(true);
    expect(m.labels.purpose).toBe('Purpose');
  });

  it('uses Italian labels and falls back to the default language', () => {
    const m = buildPolicyModel(config, 'it');
    expect(m.labels).toMatchObject({ service: 'Servizio', provider: 'Fornitore', duration: 'Durata', purpose: 'Finalità' });
    expect(m.categories[1].title).toBe('Misurazione');
    const fr = buildPolicyModel(config, 'fr');
    expect(fr.labels.service).toBe('Service');
    expect(fr.categories[0].services[0].label).toBe('Sessione');
  });

  it('accepts an explicit date and label overrides', () => {
    const m = buildPolicyModel({ ...config, revision: 'v3' }, 'en', { date: new Date('2026-01-02T10:00:00Z'), labels: { purpose: 'Why' } });
    expect(m.date).toBe('2026-01-02');
    expect(m.labels.purpose).toBe('Why');
    expect(buildPolicyModel({ ...config, revision: 'v3' }, 'en').date).toBeUndefined();
  });
});

describe('prettyCookiePattern', () => {
  it('makes regular expressions readable', () => {
    expect(prettyCookiePattern('^_ga$')).toBe('_ga');
    expect(prettyCookiePattern('^_ga_.*$')).toBe('_ga_*');
    expect(prettyCookiePattern('^ph_.+_posthog$')).toBe('ph_*_posthog');
    expect(prettyCookiePattern('^_ga(_.*)?$')).toBe('_ga[_*]');
  });
});

describe('renderPolicyHtml', () => {
  const html = renderPolicyHtml(buildPolicyModel(config, 'it'));

  it('renders a section and a table per category with IT headers', () => {
    expect(html.match(/<section class="ec-policy__category"/g)).toHaveLength(3);
    expect(html.match(/<table class="ec-policy__table">/g)).toHaveLength(3);
    expect(html).toContain('<th scope="col">Cookie</th><th scope="col">Servizio</th><th scope="col">Fornitore</th><th scope="col">Durata</th><th scope="col">Finalità</th>');
    expect(html).toContain('id="ec-policy-measurement"');
    expect(html).toContain('<h2 class="ec-policy__title" id="ec-policy-measurement-title">Misurazione</h2>');
    expect(html).toContain('<p class="ec-policy__badge">Sempre attivi</p>');
    expect(html).toContain('<time datetime="2026-11-13">13 novembre 2026</time>');
  });

  it('links providers to their privacy policy and lists services without cookies', () => {
    expect(html).toContain('<a class="ec-policy__link" href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">Google Ireland Ltd</a>');
    expect(html).toMatch(/<tr data-service="gtm"><th scope="row"><span class="ec-policy__none">—<\/span><\/th>/);
  });

  it('shows the empty notice for categories without services when no service is declared', () => {
    const bare = renderPolicyHtml(buildPolicyModel({ ...config, services: undefined }, 'it'));
    expect(bare).toContain('<p class="ec-policy__empty">Nessun cookie dichiarato in questa categoria.</p>');
  });

  it('escapes text and drops unsafe URLs', () => {
    expect(html).toContain('Meta Platforms &lt;Ireland&gt; Ltd');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<Ireland>');
  });

  it('uses class names only (no inline styles)', () => {
    expect(html).not.toMatch(/style=/);
  });

  it('honours options', () => {
    const out = renderPolicyHtml(buildPolicyModel(config, 'en'), { headingLevel: 3, idPrefix: 'c-', meta: false, hideEmpty: true });
    expect(out).toContain('<h3 class="ec-policy__title" id="c-measurement-title">Measurement</h3>');
    expect(out).not.toContain('ec-policy__meta');
    expect(out).not.toContain('c-experience');
    expect(out).toContain('<th scope="col">Service</th>');
  });
});

describe('renderPolicyMarkdown', () => {
  it('renders one table per category', () => {
    const md = renderPolicyMarkdown(buildPolicyModel(config, 'en'));
    expect(md).toContain('## Measurement');
    expect(md).toContain('| Cookie | Service | Provider | Duration | Purpose |');
    expect(md).toContain('| `_ga_*` | Google Analytics 4 | [Google Ireland Ltd](https://policies.google.com/privacy) | 2 years | Visit statistics |');
    expect(md).toContain('| — | Google Tag Manager | Google Ireland Ltd |  |  |');
    expect(md).toContain('Last updated: November 13, 2026 · Revision: 2026-11-13');
    expect(renderPolicyMarkdown(buildPolicyModel({ ...config, services: undefined }, 'en'))).toContain('No cookies declared in this category.');
  });
});

describe('autoClearRules', () => {
  it('groups cookies per non-necessary category', () => {
    const rules = autoClearRules(config);
    expect(Object.keys(rules)).toEqual(['measurement', 'marketing', 'experience']);
    expect(rules.measurement).toEqual([
      { name: '^_ga$', pattern: true, service: 'ga4' },
      { name: '^_ga_.*$', pattern: true, service: 'ga4' },
    ]);
    expect(rules.marketing[0]).toEqual({ name: '^_fb[pc]$', pattern: true, domain: '.example.com', service: 'meta' });
    expect(rules.experience).toEqual([]);
  });

  it('matches cookie names', () => {
    const [ga, gaStream] = autoClearRules(config).measurement;
    expect(matchesRule(ga, '_ga')).toBe(true);
    expect(matchesRule(ga, '_gid')).toBe(false);
    expect(matchesRule(gaStream, '_ga_ABC123')).toBe(true);
    expect(matchesRule({ name: 'exact', pattern: false }, 'exact')).toBe(true);
    expect(matchesRule({ name: '(', pattern: true }, '(')).toBe(false);
  });
});

describe('<CookiePolicy>', () => {
  it('renders the same structure as the HTML renderer', () => {
    const out = renderToStaticMarkup(<CookiePolicy config={config} lang="it" />);
    expect(out.match(/<section class="ec-policy__category"/g)).toHaveLength(3);
    expect(out).toContain('<th scope="col">Finalità</th>');
    expect(out).toContain('href="https://policies.google.com/privacy"');
    expect(out).not.toContain('javascript:');
    expect(out).not.toMatch(/style=/);
    expect(out.toLowerCase()).toContain('<time datetime="2026-11-13">13 novembre 2026</time>');
    // Same visible text as the string renderer.
    const text = (s: string) => s.replace(/\n/g, '').replace(/<[^>]+>/g, '').trim();
    expect(text(out)).toBe(text(renderPolicyHtml(buildPolicyModel(config, 'it'))));
  });
});
