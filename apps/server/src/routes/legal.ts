import { escapeHtml, fillSiteVariables, isLegalKind, pickLegalLanguage, type LegalKind } from '@easy-cookie/policy';
import type { Site } from '@prisma/client';
import { Hono, type Context } from 'hono';
import { PUBLIC_KEY_RE } from '../lib/crypto.js';
import { notFound } from '../lib/errors.js';
import { baseUrl } from '../lib/http.js';
import { jsonForScript } from '../lib/util.js';
import { publishedConfig, publishedDocuments, renderPublished, siteDefaultLanguage, type PublishedDocument } from '../services/legal.js';
import type { AppDeps, AppEnv } from '../types.js';

const CACHE = 'public, max-age=300';

/** Public, read-only legal document endpoints (`/v1/sites/:publicKey/legal…`) and the hosted page (`/p/…`). */
export function legalRoutes(deps: AppDeps) {
  const { prisma, config } = deps;
  const app = new Hono<AppEnv>();

  const findSite = (key: string | undefined) =>
    key && PUBLIC_KEY_RE.test(key) ? prisma.site.findUnique({ where: { publicKey: key } }) : Promise.resolve(null);

  /** The site and the published version of `kind`, or null. */
  async function load(key: string, kind: string) {
    if (!isLegalKind(kind)) return null;
    const site = await findSite(key);
    if (!site) return null;
    const all = await publishedDocuments(prisma, site.id);
    const doc = all.find((d) => d.kind === kind);
    return doc ? { site, doc, all } : null;
  }

  const notPublished = (c: Context, as: 'json' | 'html') => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', 'no-store');
    if (as === 'html') return c.html('<!-- easy-cookie: this document is not published -->', 404);
    return c.json({ error: { code: 'not_published', message: 'This document is not published' } }, 404);
  };

  app.get('/v1/sites/:publicKey/legal/:file', async (c) => {
    const m = /^([a-z]+)\.(json|html)$/.exec(c.req.param('file'));
    if (!m) throw notFound();
    const [, kind, ext] = m as unknown as [string, string, 'json' | 'html'];
    const hit = await load(c.req.param('publicKey'), kind);
    if (!hit) return notPublished(c, ext);
    const cfg = await publishedConfig(prisma, hit.site);
    const r = renderPublished(hit.doc, hit.site, cfg, c.req.query('lang'));
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Cache-Control', CACHE);
    if (ext === 'html') return c.html(r.html);
    return c.json({
      kind: hit.doc.kind,
      lang: r.lang,
      languages: Object.keys(hit.doc.content.translations),
      title: r.title,
      html: r.html,
      version: hit.doc.version.version,
      publishedAt: hit.doc.version.publishedAt.toISOString(),
    });
  });

  app.get('/v1/sites/:publicKey/legal.js', async (c) => {
    const site = await findSite(c.req.param('publicKey'));
    c.header('Content-Type', 'application/javascript; charset=utf-8');
    c.header('Access-Control-Allow-Origin', '*');
    if (!site) {
      c.header('Cache-Control', 'no-store');
      return c.body('/* easy-cookie: unknown site key */', 404);
    }
    c.header('Cache-Control', CACHE);
    return c.body(renderLegalLoader(baseUrl(c, config.publicUrl), site.publicKey));
  });

  app.get('/p/:publicKey/:kind', async (c) => {
    const hit = await load(c.req.param('publicKey'), c.req.param('kind'));
    if (!hit) {
      c.header('Cache-Control', 'no-store');
      return c.html(notFoundPage(), 404);
    }
    const cfg = await publishedConfig(prisma, hit.site);
    const base = baseUrl(c, config.publicUrl);
    const r = renderPublished(hit.doc, hit.site, cfg, c.req.query('lang'), {
      // The banner is not on this page: send visitors back to the site to change their choice.
      preferencesHref: `https://${hit.site.domain}/`,
    });
    c.header('Cache-Control', CACHE);
    return c.html(hostedPage({ base, site: hit.site, current: hit.doc, all: hit.all, lang: r.lang, title: r.title, html: r.html }));
  });

  return app;
}

/**
 * Loader that fills every `<div data-easy-cookie-legal="cookie|privacy|terms" [data-lang]>`
 * with the published document, and injects the legal stylesheet once unless
 * the script tag or the container has `data-no-style`.
 */
export function renderLegalLoader(base: string, publicKey: string): string {
  return `/* easy-cookie legal documents loader */
(function(w,d,base,key){
var noStyle=!!(d.currentScript&&d.currentScript.hasAttribute('data-no-style'));
if(w.__easyCookieLegal){w.__easyCookieLegal.scan();return;}
var styled=false;
function style(){if(styled||noStyle)return;styled=true;if(d.querySelector('link[data-ec-legal-css]'))return;
var l=d.createElement('link');l.rel='stylesheet';l.href=base+'/static/easy-cookie-legal.css';l.setAttribute('data-ec-legal-css','');(d.head||d.documentElement).appendChild(l);}
function fill(el){
if(el.getAttribute('data-ec-legal-state'))return;
var kind=el.getAttribute('data-easy-cookie-legal');if(!/^(cookie|privacy|terms)$/.test(kind||''))return;
el.setAttribute('data-ec-legal-state','loading');
if(!el.hasAttribute('data-no-style'))style();
var lang=el.getAttribute('data-lang')||d.documentElement.lang||'';
fetch(base+'/v1/sites/'+encodeURIComponent(key)+'/legal/'+kind+'.json'+(lang?'?lang='+encodeURIComponent(lang):''),{credentials:'omit'})
.then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
.then(function(doc){el.innerHTML=doc.html;el.setAttribute('data-ec-legal-state','ready');})
.catch(function(e){el.setAttribute('data-ec-legal-state','error');console.error('[easy-cookie] could not load the '+kind+' document',e);});
}
function scan(){var els=d.querySelectorAll('[data-easy-cookie-legal]');for(var i=0;i<els.length;i++)fill(els[i]);}
w.__easyCookieLegal={scan:scan};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',scan);else scan();
})(window,document,${jsonForScript(base)},${jsonForScript(publicKey)});
`;
}

const PAGE_TEXT: Record<'it' | 'en', { languages: string; documents: string; generated: string; notFound: string; notFoundBody: string }> = {
  it: {
    languages: 'Lingua',
    documents: 'Altri documenti',
    generated: 'Generato con',
    notFound: 'Documento non disponibile',
    notFoundBody: 'Questo documento non è stato pubblicato.',
  },
  en: {
    languages: 'Language',
    documents: 'Other documents',
    generated: 'Generated with',
    notFound: 'Document not available',
    notFoundBody: 'This document has not been published.',
  },
};
const pageText = (lang: string) => (PAGE_TEXT as Record<string, (typeof PAGE_TEXT)['en']>)[lang.split('-')[0]] ?? PAGE_TEXT.en;

function languageName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
  } catch {
    return code;
  }
}

/** Title of a published document in `lang` (placeholders unwrapped), for links between documents. */
function docTitle(p: PublishedDocument, site: Site, lang: string): string {
  const shown = pickLegalLanguage(p.content, lang, siteDefaultLanguage(site));
  const title = shown ? p.content.translations[shown].title : p.kind;
  return fillSiteVariables(title, { name: site.name, domain: site.domain }).replace(/\[\[([^[\]\n]+?)\]\]/g, '$1') || p.kind;
}

// Page chrome only: the document itself is styled by /static/easy-cookie-legal.css.
const PAGE_CSS = `
:root{color-scheme:light;--page-bg:#fbfbf9;--page-ink:#1c1c1a;--page-muted:#5a5a55;--page-line:#dcdcd6;--page-accent:#1a56c4}
*{box-sizing:border-box}
body{margin:0;background:var(--page-bg);color:var(--page-ink);font-family:system-ui,sans-serif;line-height:1.6}
.page{max-width:72ch;margin:0 auto;padding:24px 16px 48px}
.page a{color:var(--page-accent)}
.bar{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:baseline;justify-content:space-between;padding-bottom:12px;margin-bottom:28px;border-bottom:1px solid var(--page-line);font-size:.9rem;color:var(--page-muted)}
.bar strong{color:var(--page-ink);font-weight:600}
.bar nav{display:flex;flex-wrap:wrap;gap:4px 12px}
.bar [aria-current]{color:var(--page-ink);font-weight:600;text-decoration:none}
.others{margin-top:40px;padding-top:16px;border-top:1px solid var(--page-line);font-size:.95rem}
.others h2{font-size:.85rem;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:var(--page-muted);margin:0 0 8px}
.others ul{list-style:none;margin:0;padding:0}
.others li{margin:4px 0}
footer{margin-top:40px;font-size:.8rem;color:var(--page-muted)}
.ec-legal{max-width:none}
`;

function hostedPage(p: {
  base: string;
  site: Site;
  current: PublishedDocument;
  all: PublishedDocument[];
  lang: string;
  title: string;
  html: string;
}): string {
  const e = escapeHtml;
  const t = pageText(p.lang);
  const key = p.site.publicKey;
  const href = (kind: LegalKind, lang: string) => `${p.base}/p/${encodeURIComponent(key)}/${kind}?lang=${encodeURIComponent(lang)}`;
  const langs = Object.keys(p.current.content.translations);
  const langNav =
    langs.length > 1
      ? `<nav aria-label="${e(t.languages)}">${langs
          .map((l) =>
            l === p.lang
              ? `<a href="${e(href(p.current.kind, l))}" lang="${e(l)}" hreflang="${e(l)}" aria-current="true">${e(languageName(l))}</a>`
              : `<a href="${e(href(p.current.kind, l))}" lang="${e(l)}" hreflang="${e(l)}">${e(languageName(l))}</a>`,
          )
          .join('')}</nav>`
      : '';
  const others = p.all.filter((d) => d.kind !== p.current.kind);
  const othersHtml = others.length
    ? `<section class="others" aria-labelledby="others-title"><h2 id="others-title">${e(t.documents)}</h2><ul>${others
        .map((d) => `<li><a href="${e(href(d.kind, p.lang))}">${e(docTitle(d, p.site, p.lang))}</a></li>`)
        .join('')}</ul></section>`
    : '';
  const alternates = langs
    .map((l) => `<link rel="alternate" hreflang="${e(l)}" href="${e(href(p.current.kind, l))}">`)
    .join('\n');
  return `<!doctype html>
<html lang="${e(p.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index">
<title>${e(p.title)} · ${e(p.site.name)}</title>
<link rel="canonical" href="${e(href(p.current.kind, p.lang))}">
${alternates}
<link rel="stylesheet" href="${e(p.base)}/static/easy-cookie-legal.css">
<style>${PAGE_CSS}</style>
</head>
<body>
<div class="page">
<header class="bar"><strong>${e(p.site.name)}</strong>${langNav}</header>
<main>
${p.html}
</main>
${othersHtml}
<footer>${e(t.generated)} <a href="https://github.com/easy-cookie/easy-cookie" rel="noopener noreferrer">easy-cookie</a></footer>
</div>
</body>
</html>
`;
}

function notFoundPage(): string {
  const it = PAGE_TEXT.it;
  const en = PAGE_TEXT.en;
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${it.notFound}</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<div class="page">
<main>
<h1>${it.notFound}</h1>
<p>${it.notFoundBody}</p>
<p lang="en">${en.notFoundBody}</p>
</main>
</div>
</body>
</html>
`;
}

