import { useEffect, useState, type ReactNode } from 'react';
import type { EasyCookieConfig, Localized } from '@easy-cookie/core/shared';
import { Field } from '../../../components/ui';
import { getLoc, setLoc } from '../../../lib/configEdit';

export type Update = (fn: (c: EasyCookieConfig) => EasyCookieConfig) => void;

export interface EditorProps {
  config: EasyCookieConfig;
  update: Update;
  /** Language being edited for every localized field (also drives the preview). */
  lang: string;
  defaultLang: string;
}

/** One localized text input for the current editing language. */
export function LocField({
  label,
  value,
  onChange,
  lang,
  defaultLang,
  multiline,
  placeholder,
  hint,
  error,
}: {
  label: ReactNode;
  value: Localized | undefined;
  onChange: (v: Localized | undefined) => void;
  lang: string;
  defaultLang: string;
  multiline?: boolean;
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  const text = getLoc(value, lang, defaultLang);
  const set = (s: string) => onChange(setLoc(value, lang, s, defaultLang));
  return (
    <Field
      label={
        <>
          {label} <span className="lang-tag">{lang.toUpperCase()}</span>
        </>
      }
      hint={hint}
      error={error}
    >
      {(p) =>
        multiline ? (
          <textarea {...p} className="input" rows={3} value={text} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
        ) : (
          <input {...p} className="input" value={text} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
        )
      }
    </Field>
  );
}

/** Plain text input bound to an optional string. Empty → undefined. */
export function TextField({
  label,
  value,
  onChange,
  mono,
  hint,
  placeholder,
  type = 'text',
  error,
}: {
  label: ReactNode;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  mono?: boolean;
  hint?: ReactNode;
  placeholder?: string;
  type?: string;
  error?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <input
          {...p}
          type={type}
          className={`input${mono ? ' mono' : ''}`}
          value={value ?? ''}
          placeholder={placeholder}
          spellCheck={mono ? false : undefined}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        />
      )}
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min,
  max,
  placeholder,
}: {
  label: ReactNode;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  hint?: ReactNode;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(p) => (
        <input
          {...p}
          type="number"
          inputMode="numeric"
          className="input mono input-num"
          value={value ?? ''}
          min={min}
          max={max}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      )}
    </Field>
  );
}

export function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: ReactNode;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  hint?: ReactNode;
}) {
  return (
    <Field label={label} hint={hint}>
      {(p) => (
        <select {...p} className="input select" value={value} onChange={(e) => onChange(e.target.value as V)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Textarea of one value per line, bound to a string array. Keeps the raw text while typing. */
export function LinesField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
  separator = '\n',
}: {
  label: ReactNode;
  value: string[] | undefined;
  onChange: (v: string[] | undefined) => void;
  hint?: ReactNode;
  rows?: number;
  separator?: string;
}) {
  const joined = (value ?? []).join(separator);
  const [text, setText] = useState(joined);
  useEffect(() => {
    const parsed = text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).join(separator);
    if (parsed !== joined) setText(joined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);
  return (
    <Field label={label} hint={hint}>
      {(p) =>
        rows > 1 ? (
          <textarea
            {...p}
            className="input mono"
            rows={rows}
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              const list = e.target.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
              onChange(list.length ? list : undefined);
            }}
          />
        ) : (
          <input
            {...p}
            className="input mono"
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              const list = e.target.value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
              onChange(list.length ? list : undefined);
            }}
          />
        )
      }
    </Field>
  );
}

/** Commit-on-blur id input (category/service ids are keys, renaming re-keys the object). */
export function IdField({
  label,
  value,
  validate,
  onCommit,
}: {
  label: string;
  value: string;
  validate: (v: string) => string | null;
  onCommit: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const err = text !== value ? validate(text) : null;
  const commit = () => {
    if (text === value) return;
    if (validate(text)) setText(value);
    else onCommit(text);
  };
  return (
    <Field label={label} error={err} className="field-id">
      {(p) => (
        <input
          {...p}
          className="input mono"
          value={text}
          spellCheck={false}
          autoCapitalize="off"
          onChange={(e) => setText(e.target.value.trim())}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
        />
      )}
    </Field>
  );
}
