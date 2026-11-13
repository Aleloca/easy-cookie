import { useId, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { sites as sitesApi } from '../../api/endpoints';
import { CATALOG_GROUPS, type CatalogEntry, type CatalogGroup } from '../../api/types';
import { Icon } from '../../components/Icon';
import { PageHeader, Shell } from '../../components/Shell';
import { ErrorState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { filterCatalog, loc } from '../../lib/catalog';
import { useResource, useTitle } from '../../lib/hooks';
import { CategoryTag, useCatalog } from './parts';

function Detail({ entry }: { entry: CatalogEntry }) {
  const { t, lang } = useI18n();
  const note = loc(entry.note, lang);
  return (
    <article className="lib-detail" aria-labelledby="lib-detail-h">
      <header className="lib-detail-head">
        <div>
          <h2 id="lib-detail-h">{entry.label}</h2>
          <p className="mono dim">{entry.id}</p>
        </div>
        <span className="ro-tag">{t.library.readOnly}</span>
      </header>
      <dl className="lib-facts">
        <div>
          <dt className="label">{t.library.category}</dt>
          <dd>
            <CategoryTag id={entry.category} />
          </dd>
        </div>
        <div>
          <dt className="label">{t.library.groupFilter}</dt>
          <dd>{t.library.groups[entry.group]}</dd>
        </div>
        <div>
          <dt className="label">{t.library.provider}</dt>
          <dd>{entry.provider}</dd>
        </div>
        <div>
          <dt className="label">{t.library.privacy}</dt>
          <dd>
            <a className="link link-ext" href={entry.privacyUrl} target="_blank" rel="noreferrer noopener">
              {entry.privacyUrl.replace(/^https?:\/\//, '')}
              <Icon name="external" size={14} />
            </a>
          </dd>
        </div>
        {entry.transfer && (
          <div>
            <dt className="label">{t.library.transfer}</dt>
            <dd>
              {t.library.countries(entry.transfer.countries.join(', '))}
              {entry.transfer.safeguard && <span className="dim"> · {loc(entry.transfer.safeguard, lang)}</span>}
            </dd>
          </div>
        )}
      </dl>
      <section className="lib-sec" aria-labelledby="lib-purpose-h">
        <h3 id="lib-purpose-h" className="label">
          {t.library.purpose}
        </h3>
        <p className="lib-purpose">{loc(entry.purpose, lang)}</p>
      </section>
      {note && (
        <section className="lib-sec" aria-labelledby="lib-note-h">
          <h3 id="lib-note-h" className="label">
            {t.library.note}
          </h3>
          <p className="notice notice-ink">{note}</p>
        </section>
      )}
      <section className="lib-sec" aria-labelledby="lib-cookies-h">
        <h3 id="lib-cookies-h" className="label">
          {t.library.cookies} · {t.library.cookieCount(entry.cookies.length)}
        </h3>
        {entry.cookies.length === 0 ? (
          <p className="hint">{t.library.noCookiesLong}</p>
        ) : (
          <div className="table-scroll">
            <table className="table lib-cookie-table">
              <thead>
                <tr>
                  <th scope="col">{t.library.colName}</th>
                  <th scope="col">{t.library.colDomain}</th>
                  <th scope="col">{t.library.colDuration}</th>
                  <th scope="col">{t.library.colDescription}</th>
                </tr>
              </thead>
              <tbody>
                {entry.cookies.map((c) => (
                  <tr key={c.name}>
                    <td className="mono">
                      {c.name}
                      {c.pattern && <span className="lang-tag">{t.library.pattern}</span>}
                    </td>
                    <td className="mono dim">{c.domain ?? '—'}</td>
                    <td className="nowrap">{loc(c.duration, lang)}</td>
                    <td>{loc(c.description, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="hint lib-how">{t.library.howToAdd}</p>
    </article>
  );
}

/** Global, read-only browser of the service catalog. */
export function Library() {
  const { t } = useI18n();
  const { entryId } = useParams();
  const list = useCatalog();
  const sites = useResource(() => sitesApi.list(), []);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<CatalogGroup | 'all'>('all');
  const searchId = useId();
  const groupId = useId();
  useTitle(t.library.title);

  const entries = list.data ?? [];
  const shown = useMemo(() => filterCatalog(entries, query, group), [entries, query, group]);
  const selected = entries.find((e) => e.id === entryId);

  let body;
  if (list.error) body = <ErrorState error={list.error} onRetry={list.reload} title={t.library.loadError} />;
  else if (!list.data) body = <Loading />;
  else
    body = (
      <div className={`lib-browse${selected ? ' has-detail' : ''}`}>
        <div className="lib-index">
          <div className="lib-index-tools">
            <div className="field">
              <label className="label" htmlFor={searchId}>
                {t.library.search}
              </label>
              <div className="input-icon">
                <Icon name="search" />
                <input
                  id={searchId}
                  className="input"
                  type="search"
                  value={query}
                  placeholder={t.library.searchPlaceholder}
                  autoComplete="off"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor={groupId}>
                {t.library.groupFilter}
              </label>
              <select id={groupId} className="input select" value={group} onChange={(e) => setGroup(e.target.value as CatalogGroup | 'all')}>
                <option value="all">{t.library.allGroups}</option>
                {CATALOG_GROUPS.filter((g) => entries.some((e) => e.group === g)).map((g) => (
                  <option key={g} value={g}>
                    {t.library.groups[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="lib-count" role="status">
            {shown.length ? t.library.results(shown.length) : t.library.noResults}
          </p>
          <ul className="lib-links">
            {shown.map((e, i) => (
              <li key={e.id}>
                {(i === 0 || shown[i - 1].group !== e.group) && <span className="lib-group">{t.library.groups[e.group]}</span>}
                <NavLink to={`/library/${e.id}`} className="lib-link">
                  <span className="lib-name">
                    <span className="lib-label">{e.label}</span>
                    <span className="lib-provider">{e.provider}</span>
                  </span>
                  <CategoryTag id={e.category} />
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="lib-pane">
          {selected ? (
            <>
              <Link to="/library" className="link lib-back">
                <Icon name="chevronLeft" />
                {t.library.title}
              </Link>
              <Detail entry={selected} />
            </>
          ) : (
            <div className="lib-detail lib-detail-empty">
              <p className="hint">{t.library.detailEmpty}</p>
            </div>
          )}
        </div>
      </div>
    );

  return (
    <Shell sites={sites.data}>
      <PageHeader title={t.library.title}>
        <p className="top-sub">{t.library.lead}</p>
      </PageHeader>
      <div className="pad">{body}</div>
    </Shell>
  );
}
