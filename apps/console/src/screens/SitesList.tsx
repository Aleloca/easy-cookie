import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { sites as sitesApi } from '../api/endpoints';
import { PageHeader, Shell } from '../components/Shell';
import { Button, Empty, ErrorState, Loading, Stamp } from '../components/ui';
import { useI18n } from '../i18n';
import { formatNumber, shortDate } from '../lib/format';
import { useResource, useTitle } from '../lib/hooks';
import { CreateSiteDialog } from './CreateSiteDialog';

export function SitesList() {
  const { t, lang } = useI18n();
  const list = useResource(() => sitesApi.list(), []);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  useTitle(t.sites.title);

  const newButton = (
    <Button icon="plus" onClick={() => setCreating(true)}>
      {t.sites.newSite}
    </Button>
  );

  let body;
  if (list.error) body = <ErrorState error={list.error} onRetry={list.reload} />;
  else if (list.loading && !list.data) body = <Loading />;
  else if (!list.data?.length)
    body = (
      <Empty title={t.sites.emptyTitle} action={newButton}>
        <p>{t.sites.emptyLead}</p>
        <ol className="steps">
          {t.sites.emptySteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Empty>
    );
  else
    body = (
      <div className="table-wrap">
        <table className="table table-sites">
          <caption className="sr-only">{t.sites.count(list.data.length)}</caption>
          <thead>
            <tr>
              <th scope="col">{t.sites.colName}</th>
              <th scope="col">{t.sites.colRevision}</th>
              <th scope="col" className="num">
                {t.sites.colRecords}
              </th>
              <th scope="col">{t.sites.colKey}</th>
              <th scope="col">{t.sites.colCreated}</th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((s) => (
              <tr key={s.id} className="row-link" onClick={() => navigate(`/sites/${s.id}`)}>
                <td data-label={t.sites.colName}>
                  <Link to={`/sites/${s.id}`} className="site-link" onClick={(e) => e.stopPropagation()}>
                    {s.domain}
                  </Link>
                  <span className="site-sub">{s.name}</span>
                </td>
                <td data-label={t.sites.colRevision}>
                  {s.publishedRevision ? <Stamp revision={s.publishedRevision} /> : <span className="dim">{t.sites.notPublished}</span>}
                </td>
                <td className="num tnum" data-label={t.sites.colRecords}>
                  {formatNumber(s.stats30d.total, lang)}
                </td>
                <td className="mono dim" data-label={t.sites.colKey}>
                  {s.publicKey}
                </td>
                <td className="tnum" data-label={t.sites.colCreated}>
                  {shortDate(s.createdAt, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <Shell>
      <PageHeader title={t.sites.title} actions={list.data?.length ? newButton : undefined} />
      <div className="pad">{body}</div>
      <CreateSiteDialog open={creating} onClose={() => setCreating(false)} onCreated={list.reload} />
    </Shell>
  );
}
