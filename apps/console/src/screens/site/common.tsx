import { KNOWN_CATEGORIES } from '@easy-cookie/core/shared';
import type { Stats } from '../../api/types';
import { METHODS } from '../../api/types';
import { RevisionNotice } from '../../components/ui';
import { useI18n } from '../../i18n';
import type { Dict } from '../../i18n/it';
import { daysAgo, formatNumber, percent } from '../../lib/format';

export function relativeDay(iso: string, t: Dict): string {
  const n = daysAgo(iso);
  if (n <= 0) return t.when.today;
  if (n === 1) return t.when.yesterday;
  return t.when.daysAgo(n);
}

export function categoryTitle(id: string, lang: string): string {
  const k = KNOWN_CATEGORIES[id];
  return k ? k.title[lang as 'it' | 'en'] ?? id : id;
}

/** Current revision line, violet-ruled. */
export function CurrentRevisionNotice({ stats }: { stats: Stats }) {
  const { t, lang } = useI18n();
  const cur = stats.currentRevision;
  if (!cur) return <RevisionNotice tone="ink">{t.overview.noRevision}</RevisionNotice>;
  const text = t.overview.revisionNotice('\u0000', relativeDay(cur.publishedAt, t), cur.recordsSince, formatNumber(cur.recordsSince, lang));
  const [before, after] = text.split('\u0000');
  return (
    <RevisionNotice>
      {before}
      <b className="mono">{cur.revision}</b>
      {after}
    </RevisionNotice>
  );
}

/** Hairline KPI strip: total plus share by method. */
export function KpiStrip({ stats, methods = METHODS }: { stats: Stats; methods?: typeof METHODS }) {
  const { t, lang } = useI18n();
  return (
    <dl className="kpis" style={{ ['--kpi-cols' as string]: methods.length + 1 }}>
      <div className="kpi">
        <dt className="kl">{t.overview.kpiTotal}</dt>
        <dd className="kv">{formatNumber(stats.total, lang)}</dd>
      </div>
      {methods.map((m) => (
        <div className="kpi" key={m}>
          <dt className="kl">
            <i className={`key key-${m}`} aria-hidden="true" />
            {t.methods[m]}
          </dt>
          <dd className="kv">
            {percent(stats.byMethod[m], stats.total)}
            <span className="ks">{formatNumber(stats.byMethod[m], lang)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
