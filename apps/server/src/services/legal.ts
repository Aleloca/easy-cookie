import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import {
  LEGAL_KINDS,
  countPlaceholders,
  legalContentError,
  legalTemplate,
  pickLegalLanguage,
  renderLegalDocument,
  type LegalDocContent,
  type LegalKind,
  type RenderedLegalDocument,
} from '@easy-cookie/policy';
import { Prisma, type LegalDocument, type LegalDocumentVersion, type PrismaClient, type Site } from '@prisma/client';
import { ApiError, badRequest } from '../lib/errors.js';
import { isObject, isoDate } from '../lib/util.js';
import { REVISION_RE } from './sites.js';

/** Languages of the site's draft banner config: `available`, else `default`, else `it`. */
export function siteLanguages(site: Pick<Site, 'draftConfig'>): string[] {
  const lang = isObject(site.draftConfig) ? site.draftConfig.language : undefined;
  if (isObject(lang)) {
    const available = Array.isArray(lang.available) ? lang.available.filter((l): l is string => typeof l === 'string' && !!l) : [];
    if (available.length) return [...new Set(available)];
    if (typeof lang.default === 'string' && lang.default) return [lang.default];
  }
  return ['it'];
}

/** The site's default language (draft banner config), `it` when unset. */
export function siteDefaultLanguage(site: Pick<Site, 'draftConfig'>): string {
  const lang = isObject(site.draftConfig) ? site.draftConfig.language : undefined;
  return isObject(lang) && typeof lang.default === 'string' && lang.default ? lang.default : siteLanguages(site)[0];
}

/** Starting content for a new document: one built-in template translation per site language. */
export function initialContent(site: Pick<Site, 'draftConfig' | 'name' | 'domain'>, kind: LegalKind): LegalDocContent {
  const translations: LegalDocContent['translations'] = {};
  for (const lang of siteLanguages(site)) translations[lang] = legalTemplate(kind, lang, { name: site.name, domain: site.domain });
  return { translations };
}

const asContent = (v: Prisma.JsonValue): LegalDocContent =>
  isObject(v) && isObject(v.translations) ? (v as unknown as LegalDocContent) : { translations: {} };

/** The site's three documents (cookie, privacy, terms), created from the templates when missing. */
export async function ensureDocuments(prisma: PrismaClient, site: Site): Promise<LegalDocument[]> {
  let docs = await prisma.legalDocument.findMany({ where: { siteId: site.id } });
  const missing = LEGAL_KINDS.filter((k) => !docs.some((d) => d.kind === k));
  if (missing.length) {
    await prisma.legalDocument.createMany({
      data: missing.map((kind) => ({
        siteId: site.id,
        kind,
        draft: initialContent(site, kind) as unknown as Prisma.InputJsonValue,
      })),
      skipDuplicates: true, // concurrent first reads
    });
    docs = await prisma.legalDocument.findMany({ where: { siteId: site.id } });
  }
  return LEGAL_KINDS.map((k) => docs.find((d) => d.kind === k)!).filter(Boolean);
}

export async function ensureDocument(prisma: PrismaClient, site: Site, kind: LegalKind): Promise<LegalDocument> {
  const doc = await prisma.legalDocument.findUnique({ where: { siteId_kind: { siteId: site.id, kind } } });
  if (doc) return doc;
  return (await ensureDocuments(prisma, site)).find((d) => d.kind === kind)!;
}

export function serializeVersionMeta(v: LegalDocumentVersion) {
  return { version: v.version, note: v.note, publishedAt: v.publishedAt.toISOString(), publishedBy: v.publishedBy };
}

/** One row of `GET /sites/:id/legal`. */
export function serializeSummary(doc: LegalDocument, site: Site, published: LegalDocumentVersion | null) {
  const draft = asContent(doc.draft);
  const lang = pickLegalLanguage(draft, siteDefaultLanguage(site));
  return {
    kind: doc.kind as LegalKind,
    title: lang ? draft.translations[lang].title : '',
    languages: Object.keys(draft.translations),
    draftUpdatedAt: doc.draftUpdatedAt.toISOString(),
    publishedVersion: doc.publishedVersion,
    publishedAt: published ? published.publishedAt.toISOString() : null,
    placeholders: countPlaceholders(draft),
  };
}

/** `GET /sites/:id/legal/:kind`. */
export async function documentDetail(prisma: PrismaClient, doc: LegalDocument) {
  const versions = await prisma.legalDocumentVersion.findMany({
    where: { documentId: doc.id },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
  });
  const draft = asContent(doc.draft);
  return {
    kind: doc.kind as LegalKind,
    draft,
    draftUpdatedAt: doc.draftUpdatedAt.toISOString(),
    publishedVersion: doc.publishedVersion,
    placeholders: countPlaceholders(draft),
    versions: versions.map(serializeVersionMeta),
  };
}

/** Validate a `LegalDocContent` from a request body (400 `invalid_document`). */
export function parseContent(value: unknown): LegalDocContent {
  const err = legalContentError(value);
  if (err) throw badRequest(err, 'invalid_document');
  const tr = (value as LegalDocContent).translations;
  // Keep only the known fields, in the given language order.
  const translations: LegalDocContent['translations'] = {};
  for (const [lang, t] of Object.entries(tr)) translations[lang] = { title: t.title, body: t.body };
  return { translations };
}

/** Next free default version for today: `YYYY-MM-DD`, then `-2`, `-3`… */
async function defaultVersion(prisma: PrismaClient, documentId: string, now = new Date()): Promise<string> {
  const base = isoDate(now);
  const taken = new Set(
    (await prisma.legalDocumentVersion.findMany({ where: { documentId, version: { startsWith: base } }, select: { version: true } })).map(
      (v) => v.version,
    ),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Snapshot the draft as an immutable version and make it the published one. */
export async function publishDocument(
  prisma: PrismaClient,
  doc: LegalDocument,
  opts: { version?: string; note?: string | null; publishedBy?: string | null },
): Promise<LegalDocumentVersion> {
  const content = asContent(doc.draft);
  const translations = Object.values(content.translations);
  if (!translations.length || translations.every((t) => !t.body?.trim()))
    throw new ApiError(422, 'empty_document', 'The document has no content to publish');
  if (opts.version !== undefined && !REVISION_RE.test(opts.version))
    throw badRequest('version: 1-64 characters, letters, digits, ".", "_" or "-"', 'invalid_version');
  if (opts.note !== undefined && opts.note !== null && (typeof opts.note !== 'string' || opts.note.length > 2000))
    throw badRequest('note: string (max 2000)');

  for (let attempt = 0; attempt < 5; attempt++) {
    const version = opts.version ?? (await defaultVersion(prisma, doc.id));
    try {
      return await prisma.$transaction(async (tx) => {
        const v = await tx.legalDocumentVersion.create({
          data: {
            documentId: doc.id,
            version,
            note: opts.note ?? null,
            content: content as unknown as Prisma.InputJsonValue,
            publishedBy: opts.publishedBy ?? null,
          },
        });
        await tx.legalDocument.update({ where: { id: doc.id }, data: { publishedVersion: version } });
        return v;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        if (opts.version !== undefined) throw new ApiError(409, 'version_exists', `Version "${version}" is already published`);
        continue; // concurrent default version: pick the next suffix
      }
      throw e;
    }
  }
  throw new ApiError(409, 'version_exists', 'Could not allocate a version id');
}

/** The site's published banner config, or null. */
export async function publishedConfig(prisma: PrismaClient, site: Site): Promise<EasyCookieConfig | null> {
  if (!site.publishedRevision) return null;
  const v = await prisma.policyVersion.findUnique({
    where: { siteId_revision: { siteId: site.id, revision: site.publishedRevision } },
    select: { config: true },
  });
  return v ? (v.config as unknown as EasyCookieConfig) : null;
}

export interface PublishedDocument {
  kind: LegalKind;
  doc: LegalDocument;
  version: LegalDocumentVersion;
  content: LegalDocContent;
}

/** Published documents of a site, in kind order (only those with a published version). */
export async function publishedDocuments(prisma: PrismaClient, siteId: string): Promise<PublishedDocument[]> {
  const docs = await prisma.legalDocument.findMany({ where: { siteId, publishedVersion: { not: null } } });
  const versions = docs.length
    ? await prisma.legalDocumentVersion.findMany({
        where: { OR: docs.map((d) => ({ documentId: d.id, version: d.publishedVersion! })) },
      })
    : [];
  const out: PublishedDocument[] = [];
  for (const kind of LEGAL_KINDS) {
    const doc = docs.find((d) => d.kind === kind);
    const version = doc && versions.find((v) => v.documentId === doc.id);
    if (doc && version) out.push({ kind, doc, version, content: asContent(version.content) });
  }
  return out;
}

/** Render a published document for visitors, with the published banner config. */
export function renderPublished(
  p: PublishedDocument,
  site: Site,
  config: EasyCookieConfig | null,
  lang: string | undefined,
  extra: { preferencesHref?: string } = {},
): RenderedLegalDocument {
  const fallbackLang = config?.language?.default ?? siteDefaultLanguage(site);
  const shown = pickLegalLanguage(p.content, lang, fallbackLang) ?? fallbackLang;
  return renderLegalDocument(p.content, shown, {
    config,
    version: p.version.version,
    publishedAt: p.version.publishedAt,
    site: { name: site.name, domain: site.domain },
    ...extra,
  });
}
