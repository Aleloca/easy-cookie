/**
 * Minimal structural JSON diff, used to compare a published revision with the
 * current draft. Returns one entry per changed leaf path (objects recurse,
 * arrays are compared index by index), sorted by path.
 */
export type DiffKind = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  path: string;
  kind: DiffKind;
  before?: unknown;
  after?: unknown;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function join(base: string, key: string | number): string {
  if (typeof key === 'number') return `${base}[${key}]`;
  return base ? `${base}.${key}` : key;
}

export function jsonDiff(before: unknown, after: unknown, path = ''): DiffEntry[] {
  if (Object.is(before, after)) return [];

  if (isObj(before) && isObj(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const out: DiffEntry[] = [];
    for (const k of keys) {
      const p = join(path, k);
      if (!(k in before) || before[k] === undefined) {
        if (after[k] !== undefined) out.push({ path: p, kind: 'added', after: after[k] });
      } else if (!(k in after) || after[k] === undefined) {
        out.push({ path: p, kind: 'removed', before: before[k] });
      } else out.push(...jsonDiff(before[k], after[k], p));
    }
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const out: DiffEntry[] = [];
    const n = Math.max(before.length, after.length);
    for (let i = 0; i < n; i++) {
      const p = join(path, i);
      if (i >= before.length) out.push({ path: p, kind: 'added', after: after[i] });
      else if (i >= after.length) out.push({ path: p, kind: 'removed', before: before[i] });
      else out.push(...jsonDiff(before[i], after[i], p));
    }
    return out;
  }

  return [{ path: path || '(root)', kind: 'changed', before, after }];
}

/** Compact one-line rendering of a JSON value for the diff list. */
export function preview(value: unknown, max = 80): string {
  const s = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value) ?? 'undefined';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
