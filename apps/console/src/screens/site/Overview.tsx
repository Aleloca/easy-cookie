import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { stats as statsApi } from '../../api/endpoints';
import type { Stats } from '../../api/types';
import { PageHeader } from '../../components/Shell';
import { Empty, ErrorState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { formatNumber, percent } from '../../lib/format';
import { useResource, useTitle } from '../../lib/hooks';
import { categoryTitle, CurrentRevisionNotice, KpiStrip } from './common';
import { useSite } from './SiteLayout';

/** Stacking order, bottom to top. */
const STACK = ['accept_all', 'custom', 'reject_all', 'close', 'withdraw'] as const;

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

const dm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

export function DailyBars({ stats }: { stats: Stats }) {
  const { t, lang } = useI18n();
  const days = stats.byDay;
  const ref = useRef<HTMLElement>(null);
  const [W, setW] = useState(760);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 240;
  const left = 44;
  const bottom = 22;
  const top = 8;
  const plotW = W - left;
  const plotH = H - bottom - top;
  const max = niceMax(Math.max(1, ...days.map((d) => d.total)));
  const slot = plotW / Math.max(days.length, 1);
  const barW = Math.max(2, slot - Math.min(4, slot * 0.28));
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelIdx = days.length > 1 ? [0, Math.floor((days.length - 1) / 2), days.length - 1] : [0];

  return (
    <figure className="chart" ref={ref}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg"
        role="img"
        aria-label={t.overview.chartLabel(days[0] ? dm(days[0].date) : '', days.at(-1) ? dm(days.at(-1)!.date) : '', formatNumber(stats.total, lang))}
        width={W}
        height={H}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={left} x2={W} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
            <text x={left - 8} y={y(v) + 4} className="tick" textAnchor="end">
              {formatNumber(v, lang)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          let acc = 0;
          const x = left + i * slot + (slot - barW) / 2;
          return (
            <g key={d.date}>
              <title>{`${dm(d.date)} · ${formatNumber(d.total, lang)} — ${STACK.map((m) => `${t.methods[m]} ${d[m]}`).join(', ')}`}</title>
              {STACK.map((m) => {
                const v = d[m];
                if (!v) return null;
                const y0 = y(acc);
                acc += v;
                const y1 = y(acc);
                return <rect key={m} x={x} y={y1} width={barW} height={Math.max(0, y0 - y1)} className={`s-${m}`} />;
              })}
            </g>
          );
        })}
        {labelIdx.map((i) => (
          <text key={i} x={left + i * slot + slot / 2} y={H - 6} className="tick" textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}>
            {days[i] ? dm(days[i].date) : ''}
          </text>
        ))}
      </svg>
      <figcaption className="legend">
        {STACK.map((m) => (
          <span key={m}>
            <i className={`key key-${m}`} aria-hidden="true" />
            {t.methods[m]}
          </span>
        ))}
      </figcaption>
      <div className="sr-only">
      <table>
        <caption>{t.overview.daily}</caption>
        <thead>
          <tr>
            <th scope="col">{t.overview.tableDay}</th>
            <th scope="col">{t.overview.tableTotal}</th>
            {STACK.map((m) => (
              <th scope="col" key={m}>
                {t.methods[m]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.total}</td>
              {STACK.map((m) => (
                <td key={m}>{d[m]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

function CategoryRates({ stats }: { stats: Stats }) {
  const { t, lang } = useI18n();
  const entries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="rates">
      {entries.map(([id, n]) => {
        const pct = stats.total ? n / stats.total : 0;
        return (
          <li key={id}>
            <span className="rate-name">
              {categoryTitle(id, lang)} <span className="mono dim">{id}</span>
            </span>
            <span className="rate-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(pct * 100)}%` }} />
            </span>
            <span className="rate-val tnum">{percent(n, stats.total)}</span>
            <span className="rate-n tnum dim">
              {formatNumber(n, lang)} {t.overview.granted}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Overview() {
  const { site } = useSite();
  const { t } = useI18n();
  const res = useResource(() => statsApi.get(site.id, 30), [site.id]);
  useTitle(`${t.overview.title} · ${site.domain}`);

  let body;
  if (res.error) body = <ErrorState error={res.error} onRetry={res.reload} />;
  else if (!res.data) body = <Loading rows={8} />;
  else {
    const s = res.data;
    body = (
      <>
        <CurrentRevisionNotice stats={s} />
        {!s.currentRevision && (
          <p className="notice-action">
            <Link to={`/sites/${site.id}/config`} className="link">
              {t.overview.goConfigure}
            </Link>
          </p>
        )}
        {s.total === 0 ? (
          <Empty title={t.overview.emptyTitle}>
            <p>{t.overview.emptyLead}</p>
          </Empty>
        ) : (
          <>
            <KpiStrip stats={s} />
            <div className="overview-grid">
              <section className="panel" aria-labelledby="ov-daily">
                <header className="panel-head">
                  <h2 id="ov-daily">{t.overview.daily}</h2>
                  <p className="panel-lead">{t.overview.dailyLead}</p>
                </header>
                <DailyBars stats={s} />
              </section>
              <section className="panel" aria-labelledby="ov-cat">
                <header className="panel-head">
                  <h2 id="ov-cat">{t.overview.categories}</h2>
                  <p className="panel-lead">{t.overview.categoriesLead}</p>
                </header>
                <CategoryRates stats={s} />
              </section>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: site.domain, to: `/sites/${site.id}` }, { label: t.overview.title }]}
        title={t.overview.title}
        actions={
          <Link to={`/sites/${site.id}/consents`} className="btn btn-ghost">
            {t.overview.openRegister}
          </Link>
        }
      >
        <p className="top-sub">{t.overview.period}</p>
      </PageHeader>
      <div className="pad">{body}</div>
    </>
  );
}
