import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { ConsentMethod } from '@easy-cookie/core/shared';
import { ApiError } from '../api/client';
import { useT } from '../i18n';
import { revisionLabel, stampDate } from '../lib/format';
import { useCopy } from '../lib/hooks';
import { Icon, type IconName } from './Icon';

/* -------------------------------------------------------------- Button */

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';

export function Button({
  variant = 'primary',
  icon,
  busy,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn btn-${variant}${className ? ` ${className}` : ''}`}
      aria-busy={busy || undefined}
      disabled={rest.disabled || busy}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- Stamp */

/** The violet date · revision stamp. `press` plays the publishing press once. */
export function Stamp({
  at,
  revision,
  press,
  withSeconds = true,
  dateOnly,
}: {
  at?: string;
  revision: string;
  press?: boolean;
  withSeconds?: boolean;
  dateOnly?: boolean;
}) {
  const date = at ? (dateOnly ? stampDate(at, new Date(), false).split(' ')[0] : stampDate(at, new Date(), withSeconds)) : null;
  return (
    <span className={`stamp${press ? ' stamp-press' : ''}`}>
      {date && (
        <>
          <span className="stamp-date">{date}</span>
          <span aria-hidden="true"> · </span>
        </>
      )}
      <span className="stamp-rev">{revisionLabel(revision)}</span>
    </span>
  );
}

/* ------------------------------------------------------ Category squares */

export function CategorySquares({ categories, order }: { categories: Record<string, boolean>; order?: string[] }) {
  const t = useT();
  const ids = order ? [...order.filter((c) => c in categories), ...Object.keys(categories).filter((c) => !order.includes(c))] : Object.keys(categories);
  const label = ids.map((c) => `${c}: ${categories[c] ? t.register.granted : t.register.denied}`).join(', ');
  return (
    <span className="squares" role="img" aria-label={label} title={label}>
      {ids.map((c) => (
        <i key={c} className={categories[c] ? 'on' : undefined} />
      ))}
    </span>
  );
}

export function MethodLabel({ method }: { method: ConsentMethod }) {
  const t = useT();
  return <span className={`meth meth-${method}`}>{t.methods[method]}</span>;
}

/* ---------------------------------------------------------------- States */

export function Loading({ label, rows = 6 }: { label?: string; rows?: number }) {
  const t = useT();
  return (
    <div className="state-loading" role="status" aria-live="polite">
      <span className="sr-only">{label ?? t.common.loading}</span>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton-line" style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state-empty">
      <h2 className="state-title">{title}</h2>
      {children && <div className="state-lead">{children}</div>}
      {action && <div className="state-action">{action}</div>}
    </div>
  );
}

export function errorMessage(err: unknown, t: ReturnType<typeof useT>): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return t.common.networkError;
    if (err.status === 404) return t.common.notFound;
    return t.common.genericError(`${err.status} ${err.message}`);
  }
  return t.common.genericError(String(err));
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const t = useT();
  return (
    <div className="state-error" role="alert">
      <Icon name="alert" />
      <div>
        <p className="state-title">{title ?? t.common.errorTitle}</p>
        <p className="state-lead">{errorMessage(error, t)}</p>
        {onRetry && (
          <Button variant="ghost" icon="refresh" onClick={onRetry}>
            {t.common.retry}
          </Button>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Notice */

/** Violet-ruled notice line (current revision, publish result). */
export function RevisionNotice({ children, tone = 'violet' }: { children: ReactNode; tone?: 'violet' | 'ink' | 'danger' }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

/* ----------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  error,
  children,
  id: idProp,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  id?: string;
  className?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' field-invalid' : ''}${className ? ` ${className}` : ''}`}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={errId}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Check({
  label,
  checked,
  onChange,
  disabled,
  mono,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <label className={`check${mono ? ' check-mono' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------ Copy block */

export function CopyBlock({
  label,
  value,
  hint,
  secret,
  multiline,
  hideLabel,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  secret?: boolean;
  multiline?: boolean;
  /** Label read by screen readers only (when a section heading already names the value). */
  hideLabel?: boolean;
}) {
  const t = useT();
  const { copied, copy } = useCopy();
  const id = useId();
  const button = (
    <Button variant="quiet" icon={copied === id ? 'check' : 'copy'} onClick={() => copy(id, value)} aria-describedby={`${id}-l`}>
      {copied === id ? t.common.copied : t.common.copy}
    </Button>
  );
  // With no visible label, a single-line value carries the button at the right end of its own row.
  const inline = hideLabel && !multiline;
  return (
    <div className={`copyblock${secret ? ' copyblock-secret' : ''}`}>
      {inline ? (
        <div className="copyblock-inline">
          <span className="sr-only" id={`${id}-l`}>
            {label}
          </span>
          <code className="code code-line" aria-labelledby={`${id}-l`}>
            {value}
          </code>
          {button}
        </div>
      ) : (
        <div className="copyblock-head">
          <span className={hideLabel ? 'sr-only' : 'label'} id={`${id}-l`}>
            {label}
          </span>
          {button}
        </div>
      )}
      {inline ? null : multiline ? (
        <pre className="code" aria-labelledby={`${id}-l`} tabIndex={0}>
          <code>{value}</code>
        </pre>
      ) : (
        <code className="code code-line" aria-labelledby={`${id}-l`}>
          {value}
        </code>
      )}
      {hint && <p className="hint">{hint}</p>}
      <span className="sr-only" aria-live="polite">
        {copied === id ? t.common.copied : ''}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ Tabs */

export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
  label,
  idBase,
  badges,
}: {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (k: K) => void;
  label: string;
  idBase: string;
  badges?: Partial<Record<K, number>>;
}) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onChange(tabs[n].key);
    document.getElementById(`${idBase}-tab-${tabs[n].key}`)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, i) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          id={`${idBase}-tab-${tab.key}`}
          aria-controls={`${idBase}-panel-${tab.key}`}
          aria-selected={active === tab.key}
          tabIndex={active === tab.key ? 0 : -1}
          className="tab"
          onClick={() => onChange(tab.key)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {tab.label}
          {badges?.[tab.key] ? <span className="tab-badge">{badges[tab.key]}</span> : null}
        </button>
      ))}
    </div>
  );
}
