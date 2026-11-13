import {
  useEffect,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributeReferrerPolicy,
  type IframeHTMLAttributes,
  type ReactNode,
} from 'react';
import { localize, resolveConfig, resolveTexts, type EasyCookieConfig } from '@easy-cookie/core/shared';
import { useConsent, useEasyCookie, type UseConsentResult } from './provider';

interface Target {
  /** Category id the content needs. */
  category?: string;
  /** Service id: when set, the service's own consent decides (finer than the category). */
  service?: string;
}

function isTargetGranted(c: UseConsentResult, { category, service }: Target): boolean {
  if (service) return c.isServiceGranted(service);
  if (category) return c.isGranted(category);
  return false;
}

/* ------------------------------------------------------------------------- */

export interface ConsentGateProps extends Target {
  children?: ReactNode;
  /** Rendered while consent is missing (and during SSR / before the runtime is ready). */
  fallback?: ReactNode;
}

/** Render `children` only when the category (or service) is granted. */
export function ConsentGate({ children, fallback = null, ...target }: ConsentGateProps) {
  const consent = useConsent();
  return <>{isTargetGranted(consent, target) ? children : fallback}</>;
}

/* ------------------------------------------------------------------------- */

export interface PreferencesLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Defaults to the localized "Cookie preferences" label. */
  children?: ReactNode;
}

/** A button that reopens the preferences modal, e.g. for the site footer. */
export function PreferencesLink({ children, onClick, type = 'button', ...rest }: PreferencesLinkProps) {
  const { openPreferences } = useConsent();
  const { config, language } = useEasyCookie();
  const label = children ?? resolveTexts(config ?? FALLBACK_CONFIG, language).reopen.label;
  return (
    <button
      type={type}
      data-ec-preferences=""
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) openPreferences();
      }}
    >
      {label}
    </button>
  );
}

const FALLBACK_CONFIG: EasyCookieConfig = { revision: '', categories: {} };

/* ------------------------------------------------------------------------- */

export interface ConsentScriptProps extends Target {
  category: string;
  /** External script URL. */
  src?: string;
  /** Inline code (string), used when there is no `src`. */
  children?: string;
  /** DOM id; also used to avoid injecting the same script twice. */
  id?: string;
  /** Default true for external scripts. */
  async?: boolean;
  defer?: boolean;
  /** e.g. `module`. Default: classic script. */
  type?: string;
  nonce?: string;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  /** Extra attributes set on the <script> element. */
  attributes?: Record<string, string>;
  onLoad?: () => void;
  onError?: () => void;
}

const injected = new Set<string>();

/**
 * Inject a script into `<head>` only once its category/service is granted.
 * It renders nothing. Scripts cannot be unloaded: after a withdrawal the runtime
 * clears the cookies and (by default) reloads the page.
 */
export function ConsentScript({
  category,
  service,
  src,
  children,
  id,
  async: isAsync,
  defer,
  type,
  nonce,
  crossOrigin,
  attributes,
  onLoad,
  onError,
}: ConsentScriptProps) {
  const consent = useConsent();
  const granted = isTargetGranted(consent, { category, service });
  const code = typeof children === 'string' ? children : undefined;

  useEffect(() => {
    if (!granted || (!src && !code)) return;
    // Deduplicate by id and by src/code, so two components for the same script inject it once.
    const keys = [id && `id:${id}`, src ? `src:${src}` : `code:${code}`].filter(Boolean) as string[];
    if (keys.some((k) => injected.has(k)) || (id && document.getElementById(id))) return;
    keys.forEach((k) => injected.add(k));
    const el = document.createElement('script');
    if (id) el.id = id;
    if (type) el.type = type;
    if (nonce) el.nonce = nonce;
    if (crossOrigin !== undefined) el.crossOrigin = crossOrigin;
    el.setAttribute('data-category', category);
    if (service) el.setAttribute('data-service', service);
    for (const [k, v] of Object.entries(attributes ?? {})) el.setAttribute(k, v);
    if (src) {
      el.src = src;
      el.async = isAsync ?? true;
      if (defer) el.defer = true;
      if (onLoad) el.addEventListener('load', onLoad);
      if (onError) el.addEventListener('error', onError);
    } else {
      el.text = code!;
    }
    document.head.appendChild(el);
    if (!src) onLoad?.();
    // Intentionally no cleanup: a script that ran cannot be "un-run".
  }, [granted, src, code, id, type, nonce, crossOrigin, category, service, isAsync, defer, attributes, onLoad, onError]);

  return null;
}

/** Test helper: forget which scripts were injected. */
export function __resetInjectedScripts() {
  injected.clear();
}

/* ------------------------------------------------------------------------- */

export interface ConsentEmbedProps {
  /** Category the embed needs (e.g. `experience`). */
  category: string;
  /** Service id from the config (e.g. `youtube`); enables the "show content" button. */
  service?: string;
  src: string;
  title: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  allow?: string;
  allowFullScreen?: boolean;
  loading?: 'eager' | 'lazy';
  referrerPolicy?: HTMLAttributeReferrerPolicy;
  /** Extra attributes for the iframe. */
  iframeProps?: IframeHTMLAttributes<HTMLIFrameElement>;
  /** Replace the default placeholder body. */
  placeholder?: ReactNode;
  /** Text language; defaults to the runtime's current language. */
  lang?: string;
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

/**
 * An iframe that loads only after consent. Until then it renders a placeholder
 * (`.ec-embed`, styled by the core theme) with two actions:
 * - **show content**: accepts just this service (keeps every other choice);
 * - **always enable**: accepts the whole category.
 */
export function ConsentEmbed({
  category,
  service,
  src,
  title,
  width,
  height,
  className,
  style,
  allow,
  allowFullScreen,
  loading = 'lazy',
  referrerPolicy,
  iframeProps,
  placeholder,
  lang,
}: ConsentEmbedProps) {
  const consent = useConsent();
  const { config, language } = useEasyCookie();
  const granted = isTargetGranted(consent, { category, service });

  if (granted) {
    return (
      <iframe
        {...iframeProps}
        src={src}
        title={title}
        width={width}
        height={height}
        className={className}
        style={style}
        allow={allow}
        allowFullScreen={allowFullScreen}
        loading={loading}
        referrerPolicy={referrerPolicy}
        data-category={category}
        data-service={service}
      />
    );
  }

  const l = lang ?? language;
  const cfg = config ?? FALLBACK_CONFIG;
  const texts = resolveTexts(cfg, l).embed;
  const cat = config ? resolveConfig(config).resolvedCategories.find((c) => c.id === category) : undefined;
  const categoryLabel = cat ? localize(cat.title, l) : category;
  const svc = service ? config?.services?.[service] : undefined;
  const serviceLabel = svc?.label ? localize(svc.label, l) : (svc?.provider ?? service ?? title);
  const vars = { service: serviceLabel, category: categoryLabel };

  const acceptService = () => {
    const current = consent.consent;
    const cats = new Set(current?.categories ?? []);
    cats.add(category);
    const services: Record<string, string[]> = { ...(current?.services ?? {}) };
    services[category] = Array.from(new Set([...(services[category] ?? []), service!]));
    consent.accept(Array.from(cats), services);
  };
  const acceptCategory = () => {
    const current = consent.consent;
    const cats = Array.from(new Set([...(current?.categories ?? []), category]));
    const services: Record<string, string[]> = { ...(current?.services ?? {}) };
    if (cat) services[category] = cat.services.slice();
    else delete services[category];
    consent.accept(cats, services);
  };

  return (
    <div
      className={['ec-embed', className].filter(Boolean).join(' ')}
      style={style}
      data-category={category}
      data-service={service}
      data-ready={consent.ready ? '' : undefined}
      role="region"
      aria-label={title}
    >
      {placeholder ?? <p className="ec-embed__text">{fill(texts.blocked, vars)}</p>}
      <div className="ec-embed__actions">
        {service && (
          <button type="button" className="ec-embed__btn ec-embed__btn--primary" onClick={acceptService}>
            {fill(texts.enable, vars)}
          </button>
        )}
        <button
          type="button"
          className={service ? 'ec-embed__btn' : 'ec-embed__btn ec-embed__btn--primary'}
          onClick={acceptCategory}
        >
          {fill(service ? texts.enableAlways : texts.enable, vars)}
        </button>
      </div>
    </div>
  );
}
