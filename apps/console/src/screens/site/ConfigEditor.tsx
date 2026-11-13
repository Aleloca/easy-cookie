import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import { drafts } from '../../api/endpoints';
import type { ConfigIssue, RevisionSummary } from '../../api/types';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/Shell';
import { Button, ErrorState, Loading, RevisionNotice, Stamp, Tabs } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useAutosave } from '../../lib/autosave';
import { timeOfDay } from '../../lib/format';
import { useResource, useTitle } from '../../lib/hooks';
import { CategoriesEditor } from './config/CategoriesEditor';
import { IssueList, tabForPath, type TabKey } from './config/IssueList';
import { CookieEditor, GcmEditor, JsonEditor, TextsEditor, UiEditor } from './config/OptionsEditors';
import { Preview } from './config/Preview';
import { PublishDialog } from './config/PublishDialog';
import { ServicesEditor } from './config/ServicesEditor';
import { useSite } from './SiteLayout';

const TABS: TabKey[] = ['categories', 'services', 'texts', 'gcm', 'ui', 'cookie', 'json'];

function editingLanguages(config: EasyCookieConfig): string[] {
  const set = new Set<string>();
  if (config.language?.default) set.add(config.language.default);
  for (const l of config.language?.available ?? []) set.add(l);
  if (set.size === 0) ['it', 'en'].forEach((l) => set.add(l));
  return [...set];
}

export function ConfigEditor() {
  const { site, setSite } = useSite();
  const { t } = useI18n();
  useTitle(`${t.config.title} · ${site.domain}`);
  const draft = useResource(() => drafts.get(site.id), [site.id]);

  const [config, setConfig] = useState<EasyCookieConfig | undefined>(undefined);
  const [issues, setIssues] = useState<ConfigIssue[]>([]);
  const [tab, setTab] = useState<TabKey>('categories');
  const [lang, setLang] = useState<string>('it');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<RevisionSummary | null>(null);

  useEffect(() => {
    if (draft.data) {
      setConfig(draft.data.config);
      setIssues(draft.data.issues);
      setLang(draft.data.config.language?.default ?? 'it');
    }
  }, [draft.data]);

  const save = useCallback(
    async (c: EasyCookieConfig) => {
      const res = await drafts.save(site.id, c);
      setIssues(res.issues);
    },
    [site.id],
  );
  const autosave = useAutosave(config, save, { delay: 900, initialSavedAt: draft.data?.updatedAt ?? null });

  const update = useCallback((fn: (c: EasyCookieConfig) => EasyCookieConfig) => {
    setConfig((c) => (c ? fn(c) : c));
    setPublished(null);
  }, []);

  const badges = useMemo(() => {
    const b: Partial<Record<TabKey, number>> = {};
    for (const i of issues) {
      const k = tabForPath(i.path);
      b[k] = (b[k] ?? 0) + 1;
    }
    return b;
  }, [issues]);

  if (draft.error)
    return (
      <>
        <PageHeader crumbs={[{ label: site.domain, to: `/sites/${site.id}` }, { label: t.config.title }]} title={t.config.title} />
        <div className="pad">
          <ErrorState error={draft.error} onRetry={draft.reload} title={t.config.loadError} />
        </div>
      </>
    );

  const defaultLang = config?.language?.default ?? 'it';
  const langs = config ? editingLanguages(config) : ['it', 'en'];
  const props = config ? { config, update, lang, defaultLang } : null;

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
        crumbs={[{ label: site.domain, to: `/sites/${site.id}` }, { label: t.config.title }]}
        title={t.config.title}
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
            <Button icon="stamp" onClick={() => setPublishing(true)} disabled={!config}>
              {t.config.publish}
            </Button>
          </>
        }
      />
      <div className="pad">
        {published ? (
          <RevisionNotice>
            <span className="published-line">
              <Stamp at={published.publishedAt} revision={published.revision} press withSeconds={false} />
              <span>{t.config.published(published.revision)}</span>
              <Link to={`/sites/${site.id}/revisions`} className="link">
                {t.nav.revisions}
              </Link>
            </span>
          </RevisionNotice>
        ) : (
          <p className="draft-note">{t.config.draftNote}</p>
        )}

        {!config || !props ? (
          <Loading rows={10} />
        ) : (
          <div className="editor">
            <div className="editor-main">
              {issues.length > 0 ? (
                <section className="issues-box" aria-labelledby="issues-h">
                  <h2 id="issues-h" className="issues-title">
                    <Icon name="alert" />
                    {t.config.issuesTitle(issues.length)}
                  </h2>
                  <p className="hint">{t.config.issuesLead}</p>
                  <IssueList
                    issues={issues}
                    onSelect={(i) => {
                      const k = tabForPath(i.path);
                      setTab(k);
                      requestAnimationFrame(() => document.getElementById(`cfg-tab-${k}`)?.focus());
                    }}
                  />
                </section>
              ) : null}

              <div className="editor-tools">
                {issues.length === 0 && (
                  <p className="valid-line">
                    <Icon name="check" />
                    {t.config.noIssues}
                  </p>
                )}
                <div className="lang-pick">
                  <span className="label" id="cfg-lang-l">
                    {t.config.textsLang}
                  </span>
                  <div className="seg" role="group" aria-labelledby="cfg-lang-l">
                    {langs.map((l) => (
                      <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="editor-bar">
                <Tabs
                  idBase="cfg"
                  label={t.config.tabsLabel}
                  active={tab}
                  onChange={setTab}
                  tabs={TABS.map((k) => ({ key: k, label: t.config.tabs[k] }))}
                  badges={badges}
                />
              </div>

              <div role="tabpanel" id={`cfg-panel-${tab}`} aria-labelledby={`cfg-tab-${tab}`} className="tabpanel" tabIndex={0}>
                {tab === 'categories' && <CategoriesEditor {...props} />}
                {tab === 'services' && <ServicesEditor {...props} />}
                {tab === 'texts' && <TextsEditor {...props} />}
                {tab === 'gcm' && <GcmEditor {...props} />}
                {tab === 'ui' && <UiEditor {...props} />}
                {tab === 'cookie' && <CookieEditor {...props} />}
                {tab === 'json' && <JsonEditor config={config} update={update} />}
              </div>
            </div>
            <aside className="editor-side">
              <Preview config={config} lang={lang} />
            </aside>
          </div>
        )}
      </div>
      <PublishDialog
        open={publishing}
        siteId={site.id}
        onClose={() => setPublishing(false)}
        beforePublish={autosave.flush}
        onIssues={setIssues}
        onPublished={(r) => {
          setPublishing(false);
          setPublished(r);
          setSite({ ...site, publishedRevision: r.revision });
          setConfig((c) => (c ? { ...c, revision: r.revision } : c));
        }}
      />
    </>
  );
}
