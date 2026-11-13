/**
 * Immutable editing helpers for the draft `EasyCookieConfig`.
 * The structured editor and the JSON tab both go through these, so the draft
 * stays plain JSON (no undefined holes, no empty override objects).
 */
import type { EasyCookieConfig, Localized } from '@easy-cookie/core/shared';

type Key = string | number;
type Json = unknown;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Read a nested value. */
export function getIn(obj: Json, path: Key[]): Json {
  let cur: Json = obj;
  for (const k of path) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<Key, Json>)[k];
  }
  return cur;
}

/**
 * Return a copy of `obj` with `path` set to `value`. `undefined` removes the key
 * (or the array item). Missing intermediate objects are created.
 */
export function setIn<T>(obj: T, path: Key[], value: Json): T {
  if (path.length === 0) return value as T;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = obj.slice();
    const next = setIn(copy[head as number], rest, value);
    if (next === undefined && rest.length === 0) copy.splice(head as number, 1);
    else copy[head as number] = next;
    return copy as T;
  }
  const base: Record<string, Json> = isObj(obj) ? { ...obj } : {};
  const next = setIn(base[head as string], rest, value);
  if (next === undefined) delete base[head as string];
  else base[head as string] = next;
  return base as T;
}

/** Like setIn, then removes objects left empty along the path (used for text overrides). */
export function setInPruned<T>(obj: T, path: Key[], value: Json): T {
  let out = setIn(obj, path, value);
  for (let i = path.length - 1; i > 0; i--) {
    const parent = path.slice(0, i);
    const v = getIn(out, parent);
    if (isObj(v) && Object.keys(v).length === 0) out = setIn(out, parent, undefined);
    else break;
  }
  return out;
}

/** The text for `lang` in a Localized value. A plain string belongs to the default language. */
export function getLoc(value: Localized | undefined, lang: string, defaultLang: string): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return lang === defaultLang ? value : '';
  return value[lang] ?? '';
}

/** Set the text for `lang`, turning a plain string into a language map when needed. */
export function setLoc(value: Localized | undefined, lang: string, text: string, defaultLang: string): Localized | undefined {
  const map: Record<string, string> =
    value === undefined ? {} : typeof value === 'string' ? { [defaultLang]: value } : { ...value };
  if (text === '') delete map[lang];
  else map[lang] = text;
  return Object.keys(map).length ? map : undefined;
}

/** Rename an object key keeping its position (category and service ids). */
export function renameKey<T>(record: Record<string, T>, from: string, to: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(record)) out[k === from ? to : k] = v;
  return out;
}

/** Services that reference a category (shown before a category is removed). */
export function servicesUsing(config: EasyCookieConfig, categoryId: string): string[] {
  return Object.entries(config.services ?? {})
    .filter(([, s]) => s.category === categoryId)
    .map(([id]) => id);
}

/** Suggest an unused id like `category_2`. */
export function freeId(existing: string[], base: string): string {
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

/** Valid category/service id (same rule as validateConfig). */
export const ID_PATTERN = /^[a-z][a-z0-9_-]*$/i;

/** Split a textarea into trimmed non-empty lines. */
export function lines(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
