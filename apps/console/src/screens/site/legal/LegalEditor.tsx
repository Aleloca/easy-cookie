import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { legal } from '../../../api/endpoints';
import { LEGAL_KINDS, type LegalDoc, type LegalDocContent, type LegalKind, type LegalVersionSummary, type RenderedLegal } from '../../../api/types';
import { LEGAL_PREVIEW_CSS, LEGAL_PREVIEW_MARKS_CSS } from '../../../lib/legalPreviewCss';
import { serverOrigin } from '../../../lib/snippets';
import { useAuth } from '../../../auth';
import { Icon } from '../../../components/Icon';
import { PageHeader } from '../../../components/Shell';
import { Button, ErrorState, Field, Loading, RevisionNotice, Stamp, Tabs, errorMessage } from '../../../components/ui';
import { useI18n } from '../../../i18n';
import { useAutosave } from '../../../lib/autosave';
import { timeOfDay } from '../../../lib/format';
import { useDebounced, useResource, useTitle } from '../../../lib/hooks';
import {
  DIRECTIVES,
  applyFormat,
  contentPlaceholders,
  findPlaceholders,
  insertDirective,
  markPlaceholders,
  type Directive,
  type Edit,
  type FormatAction,
} from '../../../lib/legal';
import { useSite } from '../SiteLayout';
import { LegalPublishDialog } from './LegalPublishDialog';
import { EmbedPanel } from './parts';

type Tab = 'text' | 'versions' | 'embed';
const EDIT_LANGS = ['it', 'en'];

/* ------------------------------------------------------------- preview */

function LegalPreview({ siteId, kind, content, lang }: { siteId: string; kind: LegalKind; content: LegalDocContent; lang: string }) {
  const { t } = useI18n();
  const settled = useDebounced(content, 600);
  const [state, setState] = useState<RenderedLegal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const shadow = useRef<{ root: ShadowRoot; doc: HTMLDivElement } | null>(null);

  useEffect(() => {
    let live = true;
    setBusy(true);
    legal.render(siteId, kind, settled, lang).then(
      (r) => {
        if (!live) return;
        setState(r);
        setError(null);
        setBusy(false);
      },
      (e) => {
        if (!live) return;
        setError(errorMessage(e, t));
        setBusy(false);
      },
    );
    return () => {
      live = false;
    };
    // `t` only words the error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, kind, settled, lang]);

  // The HTML comes from the server renderer (raw HTML disabled, safe link
  // schemes) and already carries its <h1> and placeholder marks. It lives in a
  // shadow root with the public legal stylesheet, so the preview reads like the
  // hosted page and neither side's CSS leaks into the other.
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host || !state) return;
    if (!shadow.current) {
      const root = host.attachShadow({ mode: 'open' });
      const base = document.createElement('style');
      base.textContent = LEGAL_PREVIEW_CSS;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${serverOrigin()}/static/easy-cookie-legal.css`;
      const marks = document.createElement('style');
      marks.textContent = LEGAL_PREVIEW_MARKS_CSS;
      const doc = document.createElement('div');
      root.append(base, link, marks, doc);
      shadow.current = { root, doc };
    }
    shadow.current.doc.innerHTML = state.html;
    // The rendered document carries its own h1; inside the editor it sits under the
    // page's h1, so shift every heading one level down for assistive technology.
    shadow.current.doc.querySelectorAll('h1, h2, h3, h4, h5').forEach((h) => {
      h.setAttribute('role', 'heading');
      h.setAttribute('aria-level', String(Number(h.tagName[1]) + 1));
    });
    markPlaceholders(shadow.current.doc);
  }, [state]);

  return (
    <section className="legal-preview-panel" aria-labelledby="lp-h">
      <header className="preview-head">
        <h2 id="lp-h">{t.legal.preview}</h2>
        <span className="preview-meta" role="status">
          {busy ? t.legal.previewUpdating : ''}
        </span>
      </header>
      {error && !state ? (
        <div className="preview-off">
          <p className="state-title">{t.legal.previewError}</p>
          <p className="hint">{error}</p>
        </div>
      ) : (
        <div className="legal-paper">
          {!state && <Loading rows={8} />}
          <div
            ref={ref}
            className="legal-preview"
            lang={state?.lang ?? lang}
            // Links in the preview must not navigate away from the editor (the
            // click is retargeted out of the shadow root, so look at the path).
            onClick={(e) => {
              if (e.nativeEvent.composedPath().some((n) => n instanceof HTMLAnchorElement)) e.preventDefault();
            }}
          />
        </div>
      )}
      <p className="hint legal-preview-foot">{t.legal.previewLead}</p>
    </section>
  );
}

/* ------------------------------------------------------- markdown editor */

function MarkdownEditor({
  title,
  body,
  onTitle,
  onBody,
  lang,
}: {
  title: string;
  body: string;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  lang: string;
}) {
  const { t } = useI18n();
  const area = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<Edit | null>(null);
  const bodyId = useId();
  const hintId = useId();
  const listId = useId();
  const placeholders = useMemo(() => findPlaceholders(body), [body]);
  const titlePh = useMemo(() => findPlaceholders(title), [title]);
  const total = placeholders.length + titlePh.length;

  // Restore the selection after a toolbar edit re-renders the textarea.
  useLayoutEffect(() => {
    const e = pending.current;
    if (!e || !area.current || area.current.value !== e.value) return;
    pending.current = null;
    area.current.focus();
    area.current.setSelectionRange(e.start, e.end);
  });

  const apply = (fn: (v: string, s: number, e: number) => Edit) => {
    const ta = area.current;
    if (!ta) return;
    const edit = fn(ta.value, ta.selectionStart, ta.selectionEnd);
    pending.current = edit;
    onBody(edit.value);
  };
  const format = (a: FormatAction) =>
    apply((v, s, e) => applyFormat(v, s, e, a, a === 'bold' ? t.legal.boldFill : a === 'link' ? t.legal.linkFill : ''));

  const jump = (start: number, end: number, line: number) => {
    const ta = area.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(start, end);
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, (line - 4) * lh);
  };

  const tools: { a: FormatAction; text: string }[] = [
    { a: 'h2', text: 'H2' },
    { a: 'h3', text: 'H3' },
    { a: 'bold', text: 'B' },
    { a: 'link', text: t.legal.tools.link },
    { a: 'list', text: '•' },
  ];

  return (
    <div className="md-editor">
      <section className={`ph-box${total ? '' : ' ph-done'}`} aria-labelledby={listId}>
        <h3 id={listId} className="ph-title">
          <Icon name={total ? 'alert' : 'check'} />
          {total ? t.legal.placeholders(total) : t.legal.checklistDone}
        </h3>
        {total > 0 && (
          <ul className="ph-list">
            {titlePh.map((p) => (
              <li key={`t${p.start}`}>
                <span className="ph-item ph-static">
                  <mark className="ph">{p.label || "[[ ]]"}</mark>
                  <span className="ph-line">{t.legal.titleField}</span>
                </span>
              </li>
            ))}
            {placeholders.map((p) => (
              <li key={p.start}>
                <button type="button" className="ph-item" onClick={() => jump(p.start, p.end, p.line)} aria-label={t.legal.jumpLabel(p.label, p.line)}>
                  <mark className="ph">{p.label || "[[ ]]"}</mark>
                  <span className="ph-line">{t.legal.line(p.line)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Field label={<>{t.legal.titleField} <span className="lang-tag">{lang.toUpperCase()}</span></>}>
        {(p) => <input {...p} className="input md-title" value={title} onChange={(e) => onTitle(e.target.value)} />}
      </Field>

      <div className="field">
        <label className="label" htmlFor={bodyId}>
          {t.legal.body} <span className="lang-tag">{lang.toUpperCase()}</span>
        </label>
        <div className="md-frame">
          <div className="md-toolbar" role="group" aria-label={t.legal.toolbar}>
            {tools.map((x) => (
              <button
                key={x.a}
                type="button"
                className={`md-btn md-${x.a}`}
                aria-label={t.legal.tools[x.a]}
                title={t.legal.tools[x.a]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => format(x.a)}
              >
                {x.a === 'list' ? <Icon name="menu" size={14} /> : x.text}
              </button>
            ))}
            <span className="md-sep" aria-hidden="true" />
            <select
              className="md-select"
              aria-label={t.legal.insertDirective}
              value=""
              onChange={(e) => {
                const d = e.target.value as Directive;
                if (d) apply((v, s, en) => insertDirective(v, s, en, d));
              }}
            >
              <option value="">{t.legal.insertDirective}</option>
              {DIRECTIVES.map((d) => (
                <option key={d} value={d}>
                  {`{{${d}}}`} · {t.legal.directives[d]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            ref={area}
            id={bodyId}
            className="input md-area"
            value={body}
            spellCheck
            lang={lang}
            aria-describedby={hintId}
            onChange={(e) => onBody(e.target.value)}
          />
        </div>
        <p className="hint" id={hintId}>
          {t.legal.bodyHint}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- versions */

function VersionText({ siteId, kind, version }: { siteId: string; kind: LegalKind; version: string }) {
  const { t } = useI18n();
  const v = useResource(() => legal.version(siteId, kind, version), [siteId, kind, version]);
  const langs = v.data ? Object.keys(v.data.content.translations) : [];
  const [lang, setLang] = useState<string | null>(null);
  const cur = lang ?? langs[0];
  const tr = cur ? v.data?.content.translations[cur] : undefined;
  return (
    <div className="rev-detail">
      <div className="rev-detail-bar">
        {langs.length > 1 ? (
          <div className="seg seg-sm" role="group" aria-label={t.legal.language}>
            {langs.map((l) => (
              <button key={l} type="button" aria-pressed={cur === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        ) : (
          <span className="lang-tag">{cur?.toUpperCase()}</span>
        )}
        <span className="ro-tag">{t.legal.readOnly}</span>
      </div>
      <div className="rev-panel">
        {v.error ? (
          <ErrorState error={v.error} onRetry={v.reload} />
        ) : !tr ? (
          <Loading rows={5} />
        ) : (
          <>
            <p className="version-title">{tr.title}</p>
            <pre className="code code-block version-body" tabIndex={0}>
              <code>{tr.body}</code>
            </pre>
          </>
        )}
      </div>
    </div>
  );
}

function VersionsPanel({ siteId, kind, versions }: { siteId: string; kind: LegalKind; versions: LegalVersionSummary[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  if (!versions.length) return <p className="hint versions-empty">{t.legal.noVersions}</p>;
  return (
    <div className="table-wrap">
      <table className={`table passbook${open ? ' has-selection' : ''}`}>
        <caption className="sr-only">{t.legal.tabs.versions}</caption>
        <thead>
          <tr>
            <th scope="col">{t.legal.colStamp}</th>
            <th scope="col">{t.legal.colNote}</th>
            <th scope="col">{t.legal.colBy}</th>
            <th scope="col">
              <span className="sr-only">{t.legal.view}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v, i) => {
            const isOpen = open === v.version;
            return (
              <Fragment key={v.version}>
                <tr className={isOpen ? 'is-selected' : undefined}>
                  <td className="c-stamp">
                    <Stamp at={v.publishedAt} revision={v.version} withSeconds={false} />
                    {i === 0 && <span className="current-tag">{t.legal.current}</span>}
                  </td>
                  <td className="c-note">{v.note ?? <span className="dim">{t.legal.noNote}</span>}</td>
                  <td className="mono c-by">{v.publishedBy ?? <span className="dim">{t.revisions.unknownUser}</span>}</td>
                  <td className="c-actions">
                    <Button
                      variant="quiet"
                      icon="eye"
                      aria-expanded={isOpen}
                      aria-label={t.legal.viewLabel(v.version)}
                      onClick={() => setOpen(isOpen ? null : v.version)}
                    >
                      {t.legal.view}
                    </Button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="proof-row">
                    <td colSpan={4}>
                      <VersionText siteId={siteId} kind={kind} version={v.version} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------- screen */

function Editor({ kind }: { kind: LegalKind }) {
  const { site } = useSite();
  const { t, lang: uiLang } = useI18n();
  const { user } = useAuth();
  const docTitle = t.legal.kinds[kind];
  useTitle(`${docTitle} · ${site.domain}`);
  const doc = useResource<LegalDoc>(() => legal.get(site.id, kind), [site.id, kind]);
  const [content, setContent] = useState<LegalDocContent | undefined>(undefined);
  const [lang, setLang] = useState('it');
  const [tab, setTab] = useState<Tab>('text');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<Omit<LegalVersionSummary, 'publishedBy'> | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Adopt the server draft once per document; later reloads only refresh versions.
  useEffect(() => {
    if (!doc.data || loadedFor.current === kind) return;
    loadedFor.current = kind;
    setContent(doc.data.draft);
    const langs = Object.keys(doc.data.draft.translations);
    setLang(langs.includes(uiLang) ? uiLang : (langs[0] ?? 'it'));
  }, [doc.data, kind, uiLang]);

  const save = useCallback(
    async (c: LegalDocContent) => {
      await legal.saveDraft(site.id, kind, c);
    },
    [site.id, kind],
  );
  const autosave = useAutosave(content, save, { delay: 900, initialSavedAt: doc.data?.draftUpdatedAt ?? null });

  if (doc.error)
    return (
      <>
        <PageHeader title={docTitle} />
        <div className="pad">
          <ErrorState error={doc.error} onRetry={doc.reload} title={t.legal.loadError} />
        </div>
      </>
    );

  const langs = content ? Object.keys(content.translations) : [];
  const tr = content?.translations[lang];
  const total = content ? contentPlaceholders(content) : 0;
  const versions = doc.data?.versions ?? [];
  const current = versions[0];

  const setTr = (patch: Partial<{ title: string; body: string }>) => {
    setContent((c) => (c ? { translations: { ...c.translations, [lang]: { ...c.translations[lang], ...patch } } } : c));
    setPublished(null);
  };

  const addLanguage = async (l: string) => {
    setAdding(l);
    setAddError(null);
    try {
      const tpl = await legal.template(kind, l, site.id);
      setContent((c) => (c ? { translations: { ...c.translations, [l]: tpl } } : c));
      setLang(l);
    } catch (e) {
      setAddError(errorMessage(e, t));
    } finally {
      setAdding(null);
    }
  };

  const statusText =
    autosave.status === 'saving'
      ? t.config.status.saving
      : autosave.status === 'dirty'
        ? t.config.status.dirty
        : autosave.status === 'error'
          ? t.config.status.error
          : autosave.savedAt
            ? t.config.status.saved(timeOfDay(autosave.savedAt))
            : '';

  return (
    <>
      <PageHeader
        title={docTitle}
        actions={
          <>
            <p className={`save-status save-${autosave.status}`} role="status" aria-live="polite">
              <i aria-hidden="true" />
              {statusText}
              {autosave.status === 'error' && (
                <Button variant="quiet" icon="refresh" onClick={() => void autosave.flush().catch(() => {})}>
                  {t.common.retry}
                </Button>
              )}
            </p>
            <Button icon="stamp" onClick={() => setPublishing(true)} disabled={!content}>
              {t.legal.publish}
            </Button>
          </>
        }
      >
        <p className="top-sub top-crumbs">
          <Link to={`/sites/${site.id}/legal`} className="link crumb">
            <Icon name="chevronLeft" size={14} />
            {t.legal.back}
          </Link>
          {current ? (
            <Stamp at={current.publishedAt} revision={current.version} withSeconds={false} />
          ) : (
            <span className="unpublished">{t.legal.notPublished}</span>
          )}
        </p>
      </PageHeader>
      <div className="pad legal">
        {published ? (
          <RevisionNotice>
            <span className="published-line">
              <Stamp at={published.publishedAt} revision={published.version} press withSeconds={false} />
              <span>{t.legal.published(published.version)}</span>
            </span>
          </RevisionNotice>
        ) : (
          <p className="draft-note">{t.legal.draftNote}</p>
        )}

        {!content ? (
          <Loading rows={10} />
        ) : (
          <>
            <div className="editor-bar">
              <Tabs
                idBase="legal"
                label={t.legal.tabsLabel}
                active={tab}
                onChange={setTab}
                tabs={[
                  { key: 'text', label: t.legal.tabs.text },
                  { key: 'versions', label: `${t.legal.tabs.versions} · ${versions.length}` },
                  { key: 'embed', label: t.legal.tabs.embed },
                ]}
              />
            </div>
            <div role="tabpanel" id={`legal-panel-${tab}`} aria-labelledby={`legal-tab-${tab}`} className="tabpanel" tabIndex={0}>
              {tab === 'text' && (
                <>
                  <div className="legal-tools">
                    <div className="lang-pick">
                      <span className="label" id="legal-lang-l">
                        {t.legal.language}
                      </span>
                      <div className="seg" role="group" aria-labelledby="legal-lang-l">
                        {langs.map((l) => (
                          <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                            {l.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    {EDIT_LANGS.filter((l) => !langs.includes(l)).map((l) => (
                      <Button key={l} variant="quiet" icon="plus" busy={adding === l} onClick={() => void addLanguage(l)} title={t.legal.addLanguageHint}>
                        {t.legal.addLanguage(l)}
                      </Button>
                    ))}
                    {addError && (
                      <span className="field-error" role="alert">
                        {addError}
                      </span>
                    )}
                  </div>
                  {tr && (
                    <div className="legal-grid">
                      <MarkdownEditor
                        key={lang}
                        lang={lang}
                        title={tr.title}
                        body={tr.body}
                        onTitle={(v) => setTr({ title: v })}
                        onBody={(v) => setTr({ body: v })}
                      />
                      <aside className="legal-side">
                        <LegalPreview siteId={site.id} kind={kind} content={content} lang={lang} />
                      </aside>
                    </div>
                  )}
                </>
              )}
              {tab === 'versions' && <VersionsPanel siteId={site.id} kind={kind} versions={versions} />}
              {tab === 'embed' && (
                <EmbedPanel kind={kind} siteId={site.id} publicKey={site.publicKey} lang={lang} published={versions.length > 0} />
              )}
            </div>
          </>
        )}
      </div>
      <LegalPublishDialog
        open={publishing}
        siteId={site.id}
        kind={kind}
        placeholders={total}
        onClose={() => setPublishing(false)}
        beforePublish={autosave.flush}
        onPublished={(v) => {
          setPublishing(false);
          setPublished(v);
          doc.setData((d) => (d ? { ...d, publishedVersion: v.version, versions: [{ ...v, publishedBy: user?.email ?? null }, ...d.versions] } : d!));
        }}
      />
    </>
  );
}

export function LegalEditor() {
  const { kind } = useParams();
  const { site } = useSite();
  if (!LEGAL_KINDS.includes(kind as LegalKind)) return <Navigate to={`/sites/${site.id}/legal`} replace />;
  // Keyed so switching document starts from a clean editor.
  return <Editor key={kind} kind={kind as LegalKind} />;
}
