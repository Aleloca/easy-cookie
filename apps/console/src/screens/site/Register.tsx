import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ConsentMethod } from '@easy-cookie/core/shared';
import { fetchText } from '../../api/client';
import { consents, revisions as revisionsApi, stats as statsApi } from '../../api/endpoints';
import type { ConsentFilters, ConsentRecord, ConsentRecordDetail } from '../../api/types';
import { METHODS } from '../../api/types';
import { Icon } from '../../components/Icon';
import { IS_MOCK, PageHeader } from '../../components/Shell';
import { Button, CategorySquares, Empty, ErrorState, Loading, MethodLabel, Stamp, errorMessage } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatNumber, isoFull, normalizeQuery, shortHash, shortId } from '../../lib/format';
import { useDebounced, useResource, useTitle } from '../../lib/hooks';
import { CurrentRevisionNotice, KpiStrip } from './common';
import { useSite } from './SiteLayout';

const PERIODS = ['1', '7', '30', '90', 'all'] as const;
type Period = (typeof PERIODS)[number];

/** Translate the period select into the API's `from` bound (start of local day). */
export function periodFrom(period: string, now: Date = new Date()): string | undefined {
  if (period === 'all') return undefined;
  const days = Number(period) || 30;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return d.toISOString();
}

function useFilters() {
  const [params, setParams] = useSearchParams();
  const period = (PERIODS as readonly string[]).includes(params.get('p') ?? '') ? (params.get('p') as Period) : '30';
  const method = (METHODS as string[]).includes(params.get('m') ?? '') ? (params.get('m') as ConsentMethod) : ('' as const);
  const revision = params.get('r') ?? '';
  const q = params.get('q') ?? '';
  const set = useCallback(
    (patch: Partial<{ p: string; m: string; r: string; q: string }>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (!v || (k === 'p' && v === '30')) next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return { period, method, revision, q, set };
}

function ProofPanel({ siteId, record, order }: { siteId: string; record: ConsentRecord; order: string[] }) {
  const { t, lang } = useI18n();
  const detail = useResource<ConsentRecordDetail>(() => consents.get(siteId, record.id), [siteId, record.id]);
  const d = detail.data ?? { ...record, history: [] };
  const p = t.register.proof;
  const services = Object.entries(d.services).flatMap(([c, list]) => list.map((s) => `${s} (${c})`));
  const rows: [string, React.ReactNode, boolean?][] = [
    [p.recordId, d.id, true],
    [p.consentId, d.consentId, true],
    [p.subjectId, d.subjectId ?? t.common.none, true],
    [p.revision, d.revision, true],
    [p.method, <MethodLabel method={d.method} key="m" />],
    [
      p.categories,
      <ul className="proof-cats" key="c">
        {Object.entries(d.categories).map(([c, g]) => (
          <li key={c}>
            <i className={g ? 'sq on' : 'sq'} aria-hidden="true" />
            <span className="mono">{c}</span> <span className={g ? 'granted' : 'dim'}>{g ? t.register.granted : t.register.denied}</span>
          </li>
        ))}
      </ul>,
    ],
    [p.services, services.length ? services.join(', ') : t.register.noServices, true],
    [p.language, d.language ?? t.common.none, true],
    [p.pageUrl, d.pageUrl ?? t.common.none, true],
    [p.ipHash, d.ipHash ?? t.common.none, true],
    [p.userAgent, d.userAgent ?? t.common.none, true],
    [p.clientTimestamp, isoFull(d.clientTimestamp), true],
    [p.receivedAt, isoFull(d.receivedAt), true],
  ];

  return (
    <div className="proof">
      <section className="proof-main" aria-label={t.register.proofTitle}>
        <h3 className="proof-title">{t.register.proofTitle}</h3>
        <dl className="proof-dl">
          {rows.map(([k, v, mono]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className={mono ? 'mono break' : undefined}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="proof-history" aria-label={t.register.history(d.history.length)}>
        <h3 className="proof-title">{t.register.history(Math.max(d.history.length, 1))}</h3>
        {detail.error ? (
          <p className="field-error">{t.register.proofError} {errorMessage(detail.error, t)}</p>
        ) : detail.loading ? (
          <Loading rows={2} />
        ) : (
          <ol className="history">
            {d.history.map((h) => (
              <li key={h.id} className={h.id === d.id ? 'is-this' : undefined} aria-current={h.id === d.id ? 'true' : undefined}>
                <Stamp at={h.receivedAt} revision={h.revision} />
                <MethodLabel method={h.method} />
                <CategorySquares categories={h.categories} order={order} />
                {h.id === d.id && <span className="this-tag">{t.register.thisRecord}</span>}
              </li>
            ))}
          </ol>
        )}
        <p className="hint">{formatNumber(d.history.length, lang)} · {d.consentId}</p>
      </section>
    </div>
  );
}

export function Register() {
  const { site } = useSite();
  const { t, lang } = useI18n();
  const f = useFilters();
  const [search, setSearch] = useState(f.q);
  const debounced = useDebounced(search, 300);
  const [filtersOpen, setFiltersOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia?.('(max-width: 720px)').matches);
  const [selected, setSelected] = useState<string | null>(null);
  const filtersId = useId();
  useTitle(`${t.register.title} · ${site.domain}`);

  useEffect(() => {
    if (normalizeQuery(debounced) !== f.q) f.set({ q: normalizeQuery(debounced) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filters: ConsentFilters = useMemo(
    () => ({ from: periodFrom(f.period), method: f.method, revision: f.revision, q: f.q }),
    [f.period, f.method, f.revision, f.q],
  );
  const key = JSON.stringify(filters);

  const stats = useResource(() => statsApi.get(site.id, 30), [site.id]);
  const revs = useResource(() => revisionsApi.list(site.id), [site.id]);

  const [items, setItems] = useState<ConsentRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'more' | 'error'>('loading');
  const [error, setError] = useState<unknown>(null);
  const reqId = useRef(0);

  const load = useCallback(
    async (from: string | null) => {
      const id = ++reqId.current;
      setStatus(from ? 'more' : 'loading');
      setError(null);
      try {
        const page = await consents.list(site.id, filters, from);
        if (id !== reqId.current) return;
        setItems((prev) => (from ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setStatus('ready');
      } catch (e) {
        if (id !== reqId.current) return;
        setError(e);
        setStatus('error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [site.id, key],
  );

  useEffect(() => {
    setSelected(null);
    void load(null);
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.getElementById(`stamp-${selected}`)?.focus();
        setSelected(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const csvUrl = consents.csvUrl(site.id, filters);
  const onExport = async (e: React.MouseEvent) => {
    if (!IS_MOCK) return;
    e.preventDefault();
    const text = await fetchText(csvUrl);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = `${site.domain}-consensi.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const order = useMemo(() => {
    const seen: string[] = [];
    for (const r of items) for (const c of Object.keys(r.categories)) if (!seen.includes(c)) seen.push(c);
    return seen;
  }, [items]);

  const hasFilters = !!(f.method || f.revision || f.q || f.period !== '30');
  const clear = () => {
    setSearch('');
    f.set({ p: '30', m: '', r: '', q: '' });
  };

  let table;
  if (status === 'error' && !items.length) table = <ErrorState error={error} onRetry={() => void load(null)} />;
  else if (status === 'loading') table = <Loading rows={10} />;
  else if (!items.length)
    table = hasFilters ? (
      <Empty title={t.register.emptyTitle} action={<Button variant="ghost" onClick={clear}>{t.register.clearFilters}</Button>}>
        <p>{t.register.emptyLead}</p>
      </Empty>
    ) : (
      <Empty title={t.register.emptyAllTitle}>
        <p>{t.register.emptyAllLead}</p>
      </Empty>
    );
  else
    table = (
      <>
        <div className="table-wrap">
          <table className={`table register${selected ? ' has-selection' : ''}`}>
            <caption className="sr-only">{t.register.title}</caption>
            <thead>
              <tr>
                <th scope="col">{t.register.colStamp}</th>
                <th scope="col">{t.register.colConsent}</th>
                <th scope="col">{t.register.colMethod}</th>
                <th scope="col">{t.register.colCategories}</th>
                <th scope="col">{t.register.colUser}</th>
                <th scope="col">{t.register.colIp}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const isSel = selected === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      className={`m-${r.method}${isSel ? ' is-selected' : ''}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, a')) return;
                        setSelected(isSel ? null : r.id);
                      }}
                    >
                      <td className="c-stamp">
                        <button
                          type="button"
                          id={`stamp-${r.id}`}
                          className="stamp-btn"
                          aria-expanded={isSel}
                          aria-controls={isSel ? `proof-${r.id}` : undefined}
                          onClick={() => setSelected(isSel ? null : r.id)}
                        >
                          <span className="sr-only">{t.register.expand}: </span>
                          <Stamp at={r.receivedAt} revision={r.revision} />
                        </button>
                      </td>
                      <td className="mono c-id" title={r.consentId}>
                        {shortId(r.consentId)}
                      </td>
                      <td className="c-meth">
                        <MethodLabel method={r.method} />
                      </td>
                      <td className="c-cats">
                        <CategorySquares categories={r.categories} order={order} />
                      </td>
                      <td className="mono c-user">{r.subjectId ?? t.common.none}</td>
                      <td className="mono dim c-ip" title={r.ipHash ?? undefined}>
                        {shortHash(r.ipHash)}
                      </td>
                    </tr>
                    {isSel && (
                      <tr className="proof-row" id={`proof-${r.id}`}>
                        <td colSpan={6}>
                          <ProofPanel siteId={site.id} record={r} order={order} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span className="tnum dim" aria-live="polite">
            {t.register.showing(formatNumber(items.length, lang))}
          </span>
          {status === 'error' && <span className="field-error">{errorMessage(error, t)}</span>}
          {cursor ? (
            <Button variant="ghost" busy={status === 'more'} onClick={() => void load(cursor)}>
              {status === 'more' ? t.register.loadingMore : t.register.loadMore}
            </Button>
          ) : (
            <span className="dim">{t.register.end}</span>
          )}
        </div>
      </>
    );

  return (
    <>
      <PageHeader
        crumbs={[{ label: site.domain, to: `/sites/${site.id}` }, { label: t.register.title }]}
        title={t.register.title}
        actions={
          <>
            <Button variant="ghost" icon="filter" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen((o) => !o)}>
              {t.register.filters}
            </Button>
            <a className="btn btn-primary" href={csvUrl} download onClick={onExport}>
              <Icon name="download" />
              {t.register.export}
            </a>
          </>
        }
      />
      <div className="pad">
        {stats.data && <CurrentRevisionNotice stats={stats.data} />}
        {stats.data && stats.data.total > 0 && <KpiStrip stats={stats.data} methods={['accept_all', 'reject_all', 'custom', 'close']} />}
        {!stats.data && !stats.error && <div className="kpi-placeholder" aria-hidden="true" />}
        <form className="filters" id={filtersId} hidden={!filtersOpen} onSubmit={(e) => e.preventDefault()} role="search">
          <label className="f">
            <span className="sr-only">{t.register.period}</span>
            <select value={f.period} onChange={(e) => f.set({ p: e.target.value })}>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {t.register.periods[p]}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </label>
          <label className="f">
            <span className="sr-only">{t.register.method}</span>
            <select value={f.method} onChange={(e) => f.set({ m: e.target.value })}>
              <option value="">{t.register.allMethods}</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t.methods[m]}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </label>
          <label className="f">
            <span className="sr-only">{t.register.revision}</span>
            <select value={f.revision} onChange={(e) => f.set({ r: e.target.value })}>
              <option value="">{t.register.allRevisions}</option>
              {(revs.data ?? []).map((r) => (
                <option key={r.revision} value={r.revision}>
                  {r.revision}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" />
          </label>
          <label className="f f-search">
            <Icon name="search" />
            <span className="sr-only">{t.register.search}</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.register.searchPlaceholder}
              spellCheck={false}
              autoCapitalize="off"
            />
          </label>
        </form>
        {table}
      </div>
    </>
  );
}
