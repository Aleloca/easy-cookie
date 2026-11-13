/**
 * Mock legal documents for `VITE_MOCK=1`: built-in templates, the seeded
 * drafts and versions of the synthetic sites, and a deliberately small
 * Markdown renderer. The real renderer is `renderLegalDocument` in
 * `@easy-cookie/policy`; this one only has to make the preview believable.
 *
 * The texts are SYNTHETIC templates, not legal advice.
 */
import type { EasyCookieConfig, Localized } from '@easy-cookie/core/shared';
import { KNOWN_CATEGORIES } from '@easy-cookie/core/shared';
import type { LegalDocContent, LegalKind, LegalVersionSummary } from '../api/types';

/* ------------------------------------------------------------ templates */

const T: Record<LegalKind, Record<'it' | 'en', { title: string; body: string }>> = {
  cookie: {
    it: {
      title: 'Cookie policy',
      body: `Questa pagina spiega quali cookie usa **{{site.name}}** ({{site.domain}}) e come puoi gestirli.

Ultimo aggiornamento: {{last-updated}}

## Cosa sono i cookie

I cookie sono piccoli file che il sito salva nel tuo browser. Alcuni servono a far funzionare il sito, altri li usiamo solo se ci dai il consenso.

## Cookie usati da questo sito

{{cookie-table}}

## Servizi di terze parti

{{services-list}}

## Come cambiare le tue scelte

Puoi cambiare idea in qualsiasi momento:

{{preferences-link}}

Puoi anche cancellare i cookie dalle impostazioni del browser.

## Titolare del trattamento

[[Ragione sociale del titolare]], [[Indirizzo della sede]]. Per qualsiasi domanda scrivi a [[email di contatto]].
`,
    },
    en: {
      title: 'Cookie policy',
      body: `This page explains which cookies **{{site.name}}** ({{site.domain}}) uses and how you can manage them.

Last updated: {{last-updated}}

## What cookies are

Cookies are small files the site stores in your browser. Some make the site work; we use the others only with your consent.

## Cookies used on this site

{{cookie-table}}

## Third-party services

{{services-list}}

## Changing your choices

You can change your mind at any time:

{{preferences-link}}

## Data controller

[[Company name]], [[Registered address]]. For any question write to [[contact email]].
`,
    },
  },
  privacy: {
    it: {
      title: 'Informativa sulla privacy',
      body: `Questa informativa descrive come **{{site.name}}** tratta i dati personali di chi visita {{site.domain}}, ai sensi del Regolamento (UE) 2016/679 (GDPR).

## Titolare del trattamento

[[Ragione sociale del titolare]], [[Indirizzo della sede]], [[email di contatto]].

## Dati che raccogliamo

- Dati di navigazione: indirizzo IP, browser, pagine visitate.
- Dati che ci invii tu, ad esempio con il modulo di contatto o l’iscrizione alla newsletter.
- Cookie e strumenti di terze parti, solo con il tuo consenso dove richiesto: vedi la [cookie policy](/cookie-policy).

## Finalità e basi giuridiche

| Finalità | Base giuridica |
|---|---|
| Rispondere alle tue richieste | Esecuzione di misure precontrattuali |
| Inviarti la newsletter | Consenso |
| Statistiche di visita | Consenso |

## Servizi che trattano dati per nostro conto

{{services-list}}

## Per quanto tempo conserviamo i dati

[[Periodo di conservazione dei dati dei contatti]]

## I tuoi diritti

Puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei dati, e opporti al trattamento, scrivendo a [[email di contatto]]. Hai anche diritto di proporre reclamo al [Garante per la protezione dei dati personali](https://www.garanteprivacy.it).

Ultimo aggiornamento: {{last-updated}}
`,
    },
    en: {
      title: 'Privacy policy',
      body: `This policy describes how **{{site.name}}** processes the personal data of people visiting {{site.domain}}, under Regulation (EU) 2016/679 (GDPR).

## Data controller

[[Company name]], [[Registered address]], [[contact email]].

## Data we collect

- Browsing data: IP address, browser, pages visited.
- Data you send us, for example through the contact form.
- Cookies and third-party tools, with your consent where required.

## Services that process data on our behalf

{{services-list}}

## Your rights

Write to [[contact email]] to exercise your rights.

Last updated: {{last-updated}}
`,
    },
  },
  terms: {
    it: {
      title: 'Termini e condizioni',
      body: `Questi termini regolano l’uso di {{site.domain}}, gestito da [[Ragione sociale del titolare]].

## Uso del sito

Puoi consultare i contenuti per uso personale. Non è consentito copiarli o ridistribuirli senza autorizzazione scritta.

## Account

[[Descrivi se e come si crea un account, oppure elimina questa sezione]]

## Responsabilità

Curiamo i contenuti con attenzione ma non garantiamo che siano sempre completi o aggiornati.

## Legge applicabile

Questi termini sono regolati dalla legge italiana. Foro competente: [[Città del foro competente]].

Ultimo aggiornamento: {{last-updated}}
`,
    },
    en: {
      title: 'Terms and conditions',
      body: `These terms govern the use of {{site.domain}}, run by [[Company name]].

## Using the site

You may read the content for personal use.

## Governing law

These terms are governed by Italian law. Competent court: [[City of the competent court]].

Last updated: {{last-updated}}
`,
    },
  },
};

export function legalTemplate(kind: LegalKind, lang: string, site?: { name: string; domain: string }): { title: string; body: string } {
  const tpl = T[kind][lang === 'en' ? 'en' : 'it'];
  const fill = (s: string) => (site ? s.replaceAll('{{site.name}}', site.name).replaceAll('{{site.domain}}', site.domain) : s);
  return { title: fill(tpl.title), body: fill(tpl.body) };
}

/* ----------------------------------------------------------- mock store */

export interface MockLegalVersion extends LegalVersionSummary {
  content: LegalDocContent;
}

export interface MockLegalDoc {
  draft: LegalDocContent;
  draftUpdatedAt: string;
  /** Newest first. */
  versions: MockLegalVersion[];
}

export function freshDoc(kind: LegalKind, langs: string[], site: { name: string; domain: string }, at: string): MockLegalDoc {
  const translations: LegalDocContent['translations'] = {};
  for (const l of langs) translations[l] = legalTemplate(kind, l, site);
  return { draft: { translations }, draftUpdatedAt: at, versions: [] };
}

/**
 * Seeded state for the first synthetic site: the cookie policy is published
 * (two versions) and complete in Italian; the privacy policy has one version
 * and three placeholders left; the terms were never published.
 */
export function seedLegal(site: { name: string; domain: string }, now: number, by: string): Record<LegalKind, MockLegalDoc> {
  const DAY = 86_400_000;
  const iso = (days: number, h = 10) => {
    const d = new Date(now - days * DAY);
    d.setHours(h, 20, 0, 0);
    return d.toISOString();
  };
  const ymd = (s: string) => s.slice(0, 10);

  const fillOwner = (s: string) =>
    s
      .replaceAll('[[Ragione sociale del titolare]]', 'Redazione FermoUnAttimo')
      .replaceAll('[[Indirizzo della sede]]', 'via Esempio 1, 00100 Roma')
      .replaceAll('[[email di contatto]]', 'privacy@fermounattimo.it')
      .replaceAll('[[Company name]]', 'Redazione FermoUnAttimo')
      .replaceAll('[[Registered address]]', 'via Esempio 1, 00100 Roma, Italy')
      .replaceAll('[[contact email]]', 'privacy@fermounattimo.it');

  const cookie = freshDoc('cookie', ['it', 'en'], site, iso(3));
  for (const tr of Object.values(cookie.draft.translations)) tr.body = fillOwner(tr.body);
  const cookieV1 = structuredClone(cookie.draft);
  cookieV1.translations.it.body = cookieV1.translations.it.body.replace('\n## Servizi di terze parti\n\n{{services-list}}\n', '');
  cookie.versions = [
    { version: ymd(iso(3)), note: 'Aggiunto l’elenco dei servizi di terze parti', publishedAt: iso(3), publishedBy: by, content: structuredClone(cookie.draft) },
    { version: ymd(iso(120)), note: 'Prima pubblicazione', publishedAt: iso(120), publishedBy: by, content: cookieV1 },
  ];

  const privacy = freshDoc('privacy', ['it'], site, iso(0, 9));
  const pv = structuredClone(privacy.draft);
  privacy.draft.translations.it.body = privacy.draft.translations.it.body.replace(
    '[[Ragione sociale del titolare]], [[Indirizzo della sede]], [[email di contatto]].',
    'Redazione FermoUnAttimo, [[Indirizzo della sede]], privacy@fermounattimo.it.',
  );
  privacy.versions = [{ version: ymd(iso(40)), note: null, publishedAt: iso(40), publishedBy: by, content: pv }];

  const terms = freshDoc('terms', ['it'], site, iso(12, 17));

  return { cookie, privacy, terms };
}

/* ------------------------------------------------------------- renderer */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null;
  return u;
}

/** Inline Markdown on already-escaped text: placeholders, bold, italic, code, links. */
function inline(text: string): string {
  return esc(text)
    .replace(/\[\[([^[\]\n]+?)\]\]/g, '<mark class="ec-legal__todo">[[$1]]</mark>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, href: string) => {
      const h = safeHref(href.replace(/&amp;/g, '&'));
      return h ? `<a href="${esc(h)}">${label}</a>` : m;
    });
}

function locText(v: Localized | undefined, lang: string, def: string): string {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  return v[lang] ?? v[def] ?? Object.values(v)[0] ?? '';
}

const L = {
  it: { name: 'Nome', duration: 'Durata', desc: 'Descrizione', provider: 'Fornitore', privacy: 'Privacy policy', prefs: 'Preferenze cookie', none: 'Nessun cookie dichiarato.' },
  en: { name: 'Name', duration: 'Duration', desc: 'Description', provider: 'Provider', privacy: 'Privacy policy', prefs: 'Cookie preferences', none: 'No cookies declared.' },
};

function cookieTable(config: EasyCookieConfig, lang: string): string {
  const def = config.language?.default ?? 'it';
  const l = lang === 'en' ? L.en : L.it;
  const services = Object.values(config.services ?? {});
  return Object.entries(config.categories ?? {})
    .map(([id, cat]) => {
      const title = locText(cat.title, lang, def) || KNOWN_CATEGORIES[id]?.title[lang === 'en' ? 'en' : 'it'] || id;
      const rows = services
        .filter((s) => s.category === id)
        .flatMap((s) =>
          (s.cookies ?? []).map(
            (c) =>
              `<tr><td><code>${esc(c.name)}</code></td><td>${esc(locText(s.label, lang, def) || s.provider || '')}</td><td>${esc(locText(c.duration, lang, def))}</td><td>${esc(locText(c.description, lang, def))}</td></tr>`,
          ),
        );
      const body = rows.length
        ? `<table><thead><tr><th>${l.name}</th><th>${l.provider}</th><th>${l.duration}</th><th>${l.desc}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
        : `<p>${l.none}</p>`;
      return `<section class="ec-policy-category"><h3>${esc(title)}</h3>${body}</section>`;
    })
    .join('');
}

function servicesList(config: EasyCookieConfig, lang: string): string {
  const def = config.language?.default ?? 'it';
  const l = lang === 'en' ? L.en : L.it;
  const items = Object.entries(config.services ?? {}).map(([id, s]) => {
    const name = locText(s.label, lang, def) || id;
    const parts = [`<strong>${esc(name)}</strong>`];
    if (s.provider) parts.push(esc(s.provider));
    const purpose = locText(s.purpose, lang, def);
    if (purpose) parts.push(esc(purpose));
    if (s.privacyUrl) parts.push(`<a href="${esc(s.privacyUrl)}">${l.privacy}</a>`);
    return `<li>${parts.join(' · ')}</li>`;
  });
  return items.length ? `<ul class="ec-legal-services">${items.join('')}</ul>` : '';
}

/**
 * Minimal Markdown → HTML for mock mode: headings, paragraphs, bold, italic,
 * links (http, https, mailto, relative), lists, pipe tables and the four
 * directives. Raw HTML in the source is escaped, as on the server.
 */
export function renderMockMarkdown(md: string, lang: string, opts: { config: EasyCookieConfig; updatedAt?: string; title?: string }): string {
  const out: string[] = [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const date = new Date(opts.updatedAt ?? Date.now()).toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    const dir = /^\{\{([a-z-]+)\}\}$/.exec(t);
    if (!t) {
      flush();
      continue;
    }
    if (dir) {
      flush();
      if (dir[1] === 'cookie-table') out.push(cookieTable(opts.config, lang));
      else if (dir[1] === 'services-list') out.push(servicesList(opts.config, lang));
      else if (dir[1] === 'preferences-link')
        out.push(`<p><a href="#" data-ec-open-preferences>${lang === 'en' ? L.en.prefs : L.it.prefs}</a></p>`);
      else if (dir[1] === 'last-updated') out.push(`<p>${esc(date)}</p>`);
      else out.push(`<p>${inline(t)}</p>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(t);
    if (h) {
      flush();
      const level = Math.min(h[1].length + 1, 5);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t)) {
      flush();
      const ordered = /^\d+\./.test(t);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        items.push(`<li>${inline(lines[i].trim().replace(/^([-*]|\d+\.)\s+/, ''))}</li>`);
        i++;
      }
      i--;
      out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }
    if (t.startsWith('|') && lines[i + 1]?.trim().match(/^\|[-:| ]+\|$/)) {
      flush();
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
      const head = cells(t);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      i--;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }
    para.push(t);
  }
  flush();
  const title = opts.title === undefined ? '' : `<h1 class="ec-legal__title">${inline(opts.title)}</h1>`;
  return `<div class="ec-legal" lang="${esc(lang)}">${title}${out.join('\n')}</div>`;
}
