import { Fragment, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { drafts, revisions as revisionsApi } from '../../api/endpoints';
import type { RevisionSummary } from '../../api/types';
import { PageHeader } from '../../components/Shell';
import { Button, Empty, ErrorState, Loading, Stamp, Tabs } from '../../components/ui';
import { useI18n } from '../../i18n';
import { jsonDiff, preview } from '../../lib/diff';
import { formatNumber } from '../../lib/format';
import { useResource, useTitle } from '../../lib/hooks';
import { useSite } from './SiteLayout';

type Mode = 'config' | 'diff';

function RevisionDetail({ siteId, rev, mode, setMode }: { siteId: string; rev: RevisionSummary; mode: Mode; setMode: (m: Mode) => void }) {
  const { t } = useI18n();
  const full = useResource(() => revisionsApi.get(siteId, rev.revision), [siteId, rev.revision]);
  const draft = useResource(() => drafts.get(siteId), [siteId]);
  const diff = useMemo(() => (full.data && draft.data ? jsonDiff(full.data.config, draft.data.config) : null), [full.data, draft.data]);
  const idBase = `rev-${rev.revision}`;

  return (
    <div className="rev-detail">
      <div className="rev-detail-bar">
        <Tabs
          idBase={idBase}
          label={t.revisions.detailsLabel(rev.revision)}
          active={mode}
          onChange={setMode}
          tabs={[
            { key: 'config', label: t.revisions.view },
            { key: 'diff', label: t.revisions.diff },
          ]}
        />
        <span className="ro-tag">{t.revisions.readOnly}</span>
      </div>
      <div role="tabpanel" id={`${idBase}-panel-${mode}`} aria-labelledby={`${idBase}-tab-${mode}`} tabIndex={0} className="rev-panel">
        {full.error ? (
          <ErrorState error={full.error} onRetry={full.reload} />
        ) : !full.data ? (
          <Loading rows={6} />
        ) : mode === 'config' ? (
          <pre className="code code-block">
            <code>{JSON.stringify(full.data.config, null, 2)}</code>
          </pre>
        ) : draft.error ? (
          <ErrorState error={draft.error} onRetry={draft.reload} />
        ) : !diff ? (
          <Loading rows={4} />
        ) : diff.length === 0 ? (
          <p className="hint">{t.revisions.noDiff}</p>
        ) : (
          <>
            <p className="hint">{t.revisions.diffCount(diff.length)}</p>
            <table className="table diff">
              <thead>
                <tr>
                  <th scope="col">{t.revisions.colPath}</th>
                  <th scope="col">{rev.revision}</th>
                  <th scope="col">{t.revisions.colDraft}</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((d) => (
                  <tr key={d.path} className={`d-${d.kind}`}>
                    <th scope="row" className="mono">
                      <span className={`d-kind d-kind-${d.kind}`}>{t.revisions.kinds[d.kind]}</span>
                      {d.path}
                    </th>
                    <td className="mono break">{d.kind === 'added' ? '' : preview(d.before)}</td>
                    <td className="mono break">{d.kind === 'removed' ? '' : preview(d.after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export function Revisions() {
  const { site } = useSite();
  const { t, lang } = useI18n();
  useTitle(`${t.revisions.title} · ${site.domain}`);
  const list = useResource(() => revisionsApi.list(site.id), [site.id]);
  const [params, setParams] = useSearchParams();
  const open = params.get('r');
  const [mode, setMode] = useState<Mode>((params.get('v') as Mode) === 'diff' ? 'diff' : 'config');

  const show = (rev: string | null, m?: Mode) => {
    if (m) setMode(m);
    setParams(rev ? { r: rev, ...(m === 'diff' ? { v: 'diff' } : {}) } : {}, { replace: true });
  };

  let body;
  if (list.error) body = <ErrorState error={list.error} onRetry={list.reload} />;
  else if (!list.data) body = <Loading />;
  else if (list.data.length === 0)
    body = (
      <Empty
        title={t.revisions.emptyTitle}
        action={
          <Link to={`/sites/${site.id}/config`} className="btn btn-primary">
            {t.revisions.goConfig}
          </Link>
        }
      >
        <p>{t.revisions.emptyLead}</p>
      </Empty>
    );
  else
    body = (
      <div className="table-wrap">
        <table className={`table passbook${open ? ' has-selection' : ''}`}>
          <caption className="sr-only">{t.revisions.title}</caption>
          <thead>
            <tr>
              <th scope="col">{t.revisions.colStamp}</th>
              <th scope="col">{t.revisions.colNote}</th>
              <th scope="col">{t.revisions.colBy}</th>
              <th scope="col" className="num">
                {t.revisions.colRecords}
              </th>
              <th scope="col">
                <span className="sr-only">{t.revisions.view}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((r, i) => {
              const isOpen = open === r.revision;
              return (
                <Fragment key={r.revision}>
                  <tr className={isOpen ? 'is-selected' : undefined}>
                    <td className="c-stamp">
                      <Stamp at={r.publishedAt} revision={r.revision} withSeconds={false} />
                      {i === 0 && <span className="current-tag">{t.revisions.current}</span>}
                    </td>
                    <td className="c-note">{r.note ?? <span className="dim">{t.revisions.noNote}</span>}</td>
                    <td className="mono c-by">{r.publishedBy ?? <span className="dim">{t.revisions.unknownUser}</span>}</td>
                    <td className="num tnum c-records">{formatNumber(r.recordCount, lang)}</td>
                    <td className="c-actions">
                      <Button
                        variant="quiet"
                        icon="eye"
                        aria-expanded={isOpen && mode === 'config'}
                        aria-label={t.revisions.viewLabel(r.revision)}
                        onClick={() => show(isOpen && mode === 'config' ? null : r.revision, 'config')}
                      >
                        {t.revisions.view}
                      </Button>
                      <Button
                        variant="quiet"
                        icon="diff"
                        aria-expanded={isOpen && mode === 'diff'}
                        aria-label={t.revisions.diffLabel(r.revision)}
                        onClick={() => show(isOpen && mode === 'diff' ? null : r.revision, 'diff')}
                      >
                        {t.revisions.diff}
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="proof-row">
                      <td colSpan={5}>
                        <RevisionDetail siteId={site.id} rev={r} mode={mode} setMode={(m) => show(r.revision, m)} />
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

  return (
    <>
      <PageHeader title={t.revisions.title}>
        <p className="top-sub">{t.revisions.lead}</p>
      </PageHeader>
      <div className="pad">{body}</div>
    </>
  );
}
