/** Formatting helpers. Every figure the console prints goes through here. */

const pad = (n: number) => String(n).padStart(2, '0');

/** Short revision label for stamps: `2026-11-13` → `r26-11-13`, anything else → `r<revision>`. */
export function revisionLabel(revision: string): string {
  const m = /^20(\d{2}-\d{2}-\d{2}(?:-\d+)?)$/.exec(revision);
  return `r${m ? m[1] : revision}`;
}

/**
 * Stamp date: `13/11 09:42:17` in the current year, `13/11/25 09:42:17` otherwise.
 * Local time, 24h, always the same width so the stamp column stays aligned.
 */
export function stampDate(iso: string, now: Date = new Date(), withSeconds = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const year = d.getFullYear() === now.getFullYear() ? '' : `/${String(d.getFullYear()).slice(2)}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}${withSeconds ? `:${pad(d.getSeconds())}` : ''}`;
  return `${day}${year} ${time}`;
}

/** Full timestamp for proofs: `2026-11-13 09:42:17.123 UTC`. */
export function isoFull(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

/** Calendar date `13/11/2026` in the given locale. */
export function shortDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'it-IT', { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions).format(n);
}

/** Percentage with no decimals, `0%` when the total is zero. */
export function percent(part: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

/** `c7e14a9f-…` → `c7e1·4a9f` (the full id stays in the proof and in the title). */
export function shortId(id: string): string {
  const hex = id.replace(/-/g, '');
  if (hex.length < 8) return id;
  return `${hex.slice(0, 4)}·${hex.slice(4, 8)}`;
}

/** Normalises what people paste into the search box (stamps print ids with a middle dot). */
export function normalizeQuery(q: string): string {
  return q.trim().replace(/[·\s]/g, '');
}

/** `9f3a…e21` */
export function shortHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  if (hash.length <= 9) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-3)}`;
}

/** Today as `YYYY-MM-DD` in local time (default revision id). */
export function todayRevision(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whole days between an ISO date and now (0 = today). */
export function daysAgo(iso: string, now: Date = new Date()): number {
  const d = new Date(iso);
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function timeOfDay(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
