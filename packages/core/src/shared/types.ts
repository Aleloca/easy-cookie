/**
 * Public configuration and state types shared by every easy-cookie package
 * (browser runtime, React/Next adapters, policy generator, consent server, console).
 *
 * The config is plain JSON on purpose: the consent server stores it, versions it
 * and serves it to sites, so it must survive JSON.stringify/parse unchanged.
 */

/** A string, or a map of language code → string (e.g. `{ it: '…', en: '…' }`). */
export type Localized = string | Record<string, string>;

/** Google Consent Mode v2 consent types. */
export type GcmSignal =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';

/** How a consent was expressed. `close` is the X button (counts as reject). */
export type ConsentMethod = 'accept_all' | 'reject_all' | 'custom' | 'close' | 'withdraw';

export interface CookieDeclaration {
  /** Cookie name, or a regular expression source when `pattern` is true (e.g. `^_ga`). */
  name: string;
  pattern?: boolean;
  /** Human-readable duration ("2 anni" / "2 years"). */
  duration?: Localized;
  description?: Localized;
  /** Domain the cookie is set on, when it differs from the site's (third parties). */
  domain?: string;
}

export interface CategoryDeclaration {
  /** Necessary categories are always on and cannot be toggled. */
  readOnly?: boolean;
  title?: Localized;
  description?: Localized;
  /** Consent Mode signals granted when this category is accepted. */
  gcm?: GcmSignal[];
  /** Module colour in the consent mosaic. Any CSS colour; defaults by known id. */
  color?: string;
}

export interface ServiceDeclaration {
  category: string;
  label?: Localized;
  provider?: string;
  purpose?: Localized;
  privacyUrl?: string;
  cookies?: CookieDeclaration[];
  /** Id of the catalog entry this service was created from (informational only). */
  from?: string;
}

export interface GoogleConsentModeOptions {
  enabled: boolean;
  /** ms GTM/gtag waits for an update before firing tags. Default 500. */
  waitForUpdate?: number;
  adsDataRedaction?: boolean;
  urlPassthrough?: boolean;
  /** ISO 3166-2 regions the defaults apply to (e.g. EEA list). Omit for all. */
  region?: string[];
  /** Default `dataLayer`. */
  dataLayerName?: string;
  /** Event pushed to the dataLayer on first choice and on changes. Default `easy_cookie_update`. */
  eventName?: string;
}

export interface ConsentLogOptions {
  /** Base URL of the consent server, e.g. `https://consent.example.com`. */
  endpoint: string;
  /** Public, write-only site key (`pk_…`). */
  siteKey: string;
  /** Keep the banner open (with an error) until the server confirms the record. */
  requireLog?: boolean;
}

export type UiPosition = 'bottom-left' | 'bottom-right' | 'bottom' | 'center';

export interface ReopenButtonOptions {
  position?: 'bottom-left' | 'bottom-right';
  /** Path prefixes (e.g. `/dashboard`) where the floating button is hidden. */
  hideOn?: string[];
}

export interface UiOptions {
  position?: UiPosition;
  /** Floating button that reopens preferences. Default true. */
  reopenButton?: boolean | ReopenButtonOptions;
  /** `auto` follows prefers-color-scheme. Default `light`. */
  colorScheme?: 'light' | 'dark' | 'auto';
  /** Reload the page when a previously granted category is withdrawn. Default true. */
  reloadOnWithdraw?: boolean;
  /** Show per-service toggles inside each category. Default true. */
  serviceToggles?: boolean;
}

/** Every visitor-facing string. All keys are overridable per language. */
export interface Texts {
  banner: {
    title: string;
    description: string;
    acceptAll: string;
    rejectAll: string;
    customize: string;
    close: string;
    policyLink: string;
    legendOn: string;
    legendOff: string;
    legendAlways: string;
  };
  preferences: {
    title: string;
    intro: string;
    acceptAll: string;
    rejectAll: string;
    save: string;
    close: string;
    alwaysOn: string;
    services: string;
    /** Badge on a category: "singular|plural". */
    serviceCounter: string;
    cookieName: string;
    cookieDuration: string;
    cookieDescription: string;
    provider: string;
    privacyPolicy: string;
    noCookies: string;
  };
  reopen: { label: string };
  embed: {
    blocked: string;
    enable: string;
    enableAlways: string;
  };
  errors: { logFailed: string };
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export interface EasyCookieConfig {
  /** Policy/config revision. Changing it re-prompts every visitor. Any string, e.g. a date. */
  revision: string;
  /** Days before a stored choice expires and the banner is shown again. Default 182 (≈6 months). */
  expiryDays?: number;
  cookie?: {
    name?: string;
    domain?: string;
    path?: string;
    sameSite?: 'Lax' | 'Strict' | 'None';
    secure?: boolean;
  };
  policyUrl?: Localized;
  language?: {
    default: string;
    /** Languages offered; texts fall back to `default`. */
    available?: string[];
    /** `document` reads <html lang>, `browser` reads navigator.language. Default `document`. */
    autoDetect?: 'document' | 'browser' | false;
  };
  categories: Record<string, CategoryDeclaration>;
  services?: Record<string, ServiceDeclaration>;
  googleConsentMode?: GoogleConsentModeOptions;
  log?: ConsentLogOptions;
  ui?: UiOptions;
  texts?: Record<string, DeepPartial<Texts>>;
  /** Honour the Global Privacy Control signal as a rejection. Default true. */
  respectGpc?: boolean;
  /** Do not show the banner to crawlers and automated browsers. Default true. */
  hideFromBots?: boolean;
}

/** The visitor's stored choice, as exposed by every easy-cookie API. */
export interface ConsentState {
  /** Random id generated on first choice; links browser cookie and server record. */
  id: string;
  revision: string;
  /** Accepted categories (necessary included). */
  categories: string[];
  /** Accepted services per category. */
  services: Record<string, string[]>;
  method: ConsentMethod;
  /** ISO timestamp of the first choice with this id. */
  firstAt: string;
  /** ISO timestamp of the latest choice. */
  updatedAt: string;
  language?: string;
}

/** Record sent to the consent server (`POST /v1/consents`). */
export interface ConsentRecordInput {
  consentId: string;
  revision: string;
  /** Every configured category → granted. */
  categories: Record<string, boolean>;
  services: Record<string, string[]>;
  method: ConsentMethod;
  language?: string;
  pageUrl?: string;
  subjectId?: string;
  /** Client clock, ISO. The server also stores its own receive time. */
  clientTimestamp: string;
}

export type EasyCookieEvent = 'ready' | 'consent' | 'change' | 'replay';

export interface ConsentEventDetail {
  consent: ConsentState;
  /** Categories whose state changed (empty on `replay` and first `consent`). */
  changed: string[];
  /** True on the visitor's first choice for this revision. */
  first: boolean;
}

/**
 * Browser runtime API (`@easy-cookie/core`, also `window.EasyCookie` in the IIFE build).
 * Adapters (React, Next, PostHog) depend only on this interface.
 */
export interface EasyCookieApi {
  /** Initialise with a config object, or `{ remote: { endpoint, siteKey } }` to fetch the published one. */
  run(config: EasyCookieConfig | { remote: { endpoint: string; siteKey: string } }): Promise<void>;
  /** Current valid choice, or null when the visitor has not chosen (for this revision). */
  get(): ConsentState | null;
  isGranted(category: string): boolean;
  isServiceGranted(service: string): boolean;
  /** Subscribe; returns an unsubscribe function. `ready` fires once after run(). */
  on(event: EasyCookieEvent, cb: (detail: ConsentEventDetail | null) => void): () => void;
  /** Call `cb` now if `category` is granted, and again whenever it becomes granted. */
  onGranted(category: string, cb: () => void): () => void;
  showBanner(): void;
  openPreferences(): void;
  acceptAll(): void;
  rejectAll(): void;
  /** Accept exactly these categories (necessary ones are always included). */
  accept(categories: string[], services?: Record<string, string[]>): void;
  /** Link the anonymous consent id to a user id on the consent server (after login). */
  identify(subjectId: string): Promise<void>;
  /** Forget the stored choice and show the banner again. */
  reset(): void;
  /** Resolved config (after run). */
  getConfig(): EasyCookieConfig | null;
  /** Language currently shown. */
  getLanguage(): string;
  setLanguage(lang: string): Promise<void>;
}
