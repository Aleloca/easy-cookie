import { fillSiteVariables, type LegalKind, type LegalTranslation } from '../legal';
import { cookie } from './cookie';
import { privacy } from './privacy';
import { terms } from './terms';

/**
 * Built-in starting drafts for the three legal documents, in Italian and
 * English. They are templates, not legal advice: every owner-specific value is
 * a `[[placeholder]]`, and the first line asks for a professional review.
 */
export const LEGAL_TEMPLATES: Record<LegalKind, Record<'it' | 'en', LegalTranslation>> = { cookie, privacy, terms };

/** Languages the built-in templates are written in. */
export const LEGAL_TEMPLATE_LANGUAGES = ['it', 'en'] as const;

/**
 * The built-in template for `kind` in `lang` (unknown languages get English),
 * with `{{site.name}}` / `{{site.domain}}` replaced when `site` is given.
 */
export function legalTemplate(kind: LegalKind, lang: string, site?: { name?: string; domain?: string }): LegalTranslation {
  const base = lang.toLowerCase().split('-')[0];
  const t = (LEGAL_TEMPLATES[kind] as Record<string, LegalTranslation>)[base] ?? LEGAL_TEMPLATES[kind].en;
  if (!site) return { ...t };
  return { title: fillSiteVariables(t.title, site), body: fillSiteVariables(t.body, site) };
}
