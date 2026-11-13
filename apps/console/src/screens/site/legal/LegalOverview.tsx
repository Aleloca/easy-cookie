import { Link, useNavigate } from 'react-router';
import { legal } from '../../../api/endpoints';
import { Icon } from '../../../components/Icon';
import { PageHeader } from '../../../components/Shell';
import { ErrorState, Loading, RevisionNotice, Stamp } from '../../../components/ui';
import { useI18n } from '../../../i18n';
import { useCopy, useResource, useTitle } from '../../../lib/hooks';
import { legalHostedUrl } from '../../../lib/legal';
import { serverOrigin } from '../../../lib/snippets';
import { useSite } from '../SiteLayout';
import { UseAsBannerLink } from './parts';

/** The site's three legal documents at a glance. */
export function LegalOverview() {
  const { site } = useSite();
  const { t } = useI18n();
  useTitle(`${t.legal.title} · ${site.domain}`);
  const list = useResource(() => legal.list(site.id), [site.id]);
  const navigate = useNavigate();
  const { copied, copy } = useCopy();
  const origin = serverOrigin();

  let body;
  if (list.error) body = <ErrorState error={list.error} onRetry={list.reload} title={t.legal.loadError} />;
  else if (!list.data) body = <Loading rows={4} />;
  else
    body = (
      <>
        <div className="table-wrap">
          <table className="table legal-table">
            <caption className="sr-only">{t.legal.title}</caption>
            <thead>
              <tr>
                <th scope="col">{t.legal.colDoc}</th>
                <th scope="col">{t.legal.colVersion}</th>
                <th scope="col">{t.legal.colLangs}</th>
                <th scope="col">{t.legal.colTodo}</th>
                <th scope="col">{t.legal.colUrl}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((d) => {
                const url = legalHostedUrl(origin, site.publicKey, d.kind);
                const to = `/sites/${site.id}/legal/${d.kind}`;
                return (
                  <tr key={d.kind} className="row-link" onClick={() => navigate(to)}>
                    <td className="c-doc">
                      <Link to={to} className="site-link" onClick={(e) => e.stopPropagation()}>
                        {t.legal.kinds[d.kind]}
                      </Link>
                      {d.title !== t.legal.kinds[d.kind] && <span className="site-sub">{d.title}</span>}
                    </td>
                    <td className="c-stamp">
                      {d.publishedVersion && d.publishedAt ? (
                        <Stamp at={d.publishedAt} revision={d.publishedVersion} dateOnly />
                      ) : (
                        <span className="unpublished">{t.legal.notPublished}</span>
                      )}
                    </td>
                    <td className="c-langs">
                      {d.languages.map((l) => (
                        <span key={l} className="lang-tag">
                          {l.toUpperCase()}
                        </span>
                      ))}
                    </td>
                    <td className="c-todo">
                      {d.placeholders > 0 ? (
                        <span className="todo">
                          <Icon name="alert" size={14} />
                          {t.legal.placeholders(d.placeholders)}
                        </span>
                      ) : (
                        <span className="done">
                          <Icon name="check" size={14} />
                          {t.legal.complete}
                        </span>
                      )}
                    </td>
                    <td className="c-url" onClick={(e) => e.stopPropagation()}>
                      <span className="url-cell">
                        <code className="mono">/p/{site.publicKey.slice(0, 7)}…/{d.kind}</code>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`${t.common.copy}: ${url}`}
                          title={url}
                          onClick={() => void copy(d.kind, url)}
                        >
                          <Icon name={copied === d.kind ? 'check' : 'copy'} />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <span className="sr-only" aria-live="polite">
            {copied ? t.common.copied : ''}
          </span>
        </div>
        <section className="section legal-banner-link" aria-labelledby="legal-bl-h">
          <h2 id="legal-bl-h" className="section-title">
            {t.legal.bannerLinkTitle}
          </h2>
          <UseAsBannerLink siteId={site.id} publicKey={site.publicKey} />
        </section>
      </>
    );

  return (
    <>
      <PageHeader title={t.legal.title}>
        <p className="top-sub">{t.legal.lead}</p>
      </PageHeader>
      <div className="pad legal">
        <RevisionNotice tone="ink">
          <span className="auto-line">
            <Icon name="check" />
            {t.legal.autoTables}
          </span>
        </RevisionNotice>
        {body}
      </div>
    </>
  );
}
