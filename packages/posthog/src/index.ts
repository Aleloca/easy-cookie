import type { EasyCookieApi, EasyCookieEvent } from '@easy-cookie/core/shared';

/**
 * The few posthog-js methods the adapter uses. Typed loosely on purpose, so
 * `posthog-js` stays an optional peer dependency and any compatible client works.
 */
export interface PostHogLike {
  opt_in_capturing(options?: { captureEventName?: string | null | false; [key: string]: unknown }): void;
  opt_out_capturing(): void;
  has_opted_in_capturing?(): boolean;
  has_opted_out_capturing?(): boolean;
  clear_opt_in_out_capturing?(): void;
  startSessionRecording?(...args: unknown[]): void;
  stopSessionRecording?(): void;
  identify?(distinctId?: string, ...rest: unknown[]): void;
  get_distinct_id?(): string;
}

/** Minimal shape of a PostHog event passed to `before_send`. */
export interface PostHogEventLike {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches posthog-js `Properties`
  properties?: Record<string, any>;
}

export interface ConnectPostHogOptions {
  /** Category that allows PostHog cookies/profiles. Default `measurement`. */
  category?: string;
  /** Service id: when set, the service's own consent decides instead of the category. */
  service?: string;
  /**
   * Return the logged-in user id (or undefined). Called after opt-in, so the
   * identified person profile is created only with consent.
   */
  identify?: () => string | undefined | null;
  /**
   * Before the visitor's first choice:
   * - `'pending'` (default): capture nothing. A stale opt-in left in storage by an
   *   earlier setup is cleared, so nothing is captured with cookies.
   * - `'cookieless'`: count visits without cookies (same as after a rejection).
   *   Only if your privacy policy covers cookieless measurement without consent.
   */
  beforeChoice?: 'pending' | 'cookieless';
  /** Start session recording on opt-in and stop it on opt-out. Default false. */
  sessionReplay?: boolean;
}

/**
 * Keep PostHog's capture state in sync with the visitor's consent, without reloads.
 *
 * PostHog must be initialised by the host with `cookieless_mode: 'on_reject'`
 * (see {@link posthogInitOptions}): before a choice it captures nothing, after a
 * rejection it keeps counting anonymously with no cookies or storage, and after
 * an acceptance it switches to normal cookie-based capture.
 *
 * On `replay`, `consent` and `change` the adapter calls `opt_in_capturing()` or
 * `opt_out_capturing()`. Returns an unsubscribe function.
 */
export function connectPostHog(posthog: PostHogLike, api: EasyCookieApi, options: ConnectPostHogOptions = {}): () => void {
  const category = options.category ?? 'measurement';
  const granted = () => (options.service ? api.isServiceGranted(options.service) : api.isGranted(category));
  let last: 'in' | 'out' | null = null;

  const apply = () => {
    if (!api.get()) {
      if (options.beforeChoice === 'cookieless') {
        if (last !== 'out') {
          if (!posthog.has_opted_out_capturing?.()) posthog.opt_out_capturing();
          last = 'out';
        }
      } else if (posthog.has_opted_in_capturing?.()) {
        // Pending: an opt-in stored by a previous banner must not keep capturing.
        posthog.clear_opt_in_out_capturing?.();
      }
      return;
    }
    if (granted()) {
      if (last !== 'in') {
        // No `$opt_in` event: the consent itself is recorded by easy-cookie.
        if (!posthog.has_opted_in_capturing?.()) posthog.opt_in_capturing({ captureEventName: false });
        if (options.sessionReplay) posthog.startSessionRecording?.();
        last = 'in';
      }
      const id = options.identify?.();
      if (id && posthog.identify && posthog.get_distinct_id?.() !== id) posthog.identify(id);
    } else if (last !== 'out') {
      if (options.sessionReplay) posthog.stopSessionRecording?.();
      if (!posthog.has_opted_out_capturing?.()) posthog.opt_out_capturing();
      last = 'out';
    }
  };

  const events: EasyCookieEvent[] = ['replay', 'consent', 'change'];
  const unsubs = events.map((ev) => api.on(ev, apply));
  // The stored choice may have been replayed before we subscribed.
  apply();
  return () => unsubs.forEach((u) => u());
}

/** Events dropped by {@link consentBeforeSend} while consent is missing. */
export const NON_ESSENTIAL_EVENTS: readonly string[] = [
  '$autocapture',
  '$rageclick',
  '$dead_click',
  '$exception',
  '$web_vitals',
  '$$heatmap',
  '$heatmap',
];

export interface ConsentBeforeSendOptions {
  /** Category checked by the default `isGranted`. Default `measurement`. */
  category?: string;
  /**
   * Consent check. Defaults to the runtime when `api` is given, otherwise to the
   * state published by the head script (`window.__easyCookieHead.granted`).
   */
  isGranted?: () => boolean;
  api?: Pick<EasyCookieApi, 'isGranted'> | null;
  /** Event names to drop without consent. Default {@link NON_ESSENTIAL_EVENTS}. */
  drop?: readonly string[];
}

function headGranted(category: string): boolean {
  const head = (globalThis as { __easyCookieHead?: { granted?: string[]; valid?: boolean } }).__easyCookieHead;
  return !!head?.valid && !!head.granted?.includes(category);
}

/**
 * `before_send` filter: without consent, drop autocapture, exceptions, web vitals
 * and heatmap events, so cookieless mode only sends the essentials (pageviews,
 * explicit captures). Pass it as `before_send` or use {@link posthogInitOptions}.
 */
export function consentBeforeSend(options: ConsentBeforeSendOptions = {}) {
  const category = options.category ?? 'measurement';
  const drop = new Set(options.drop ?? NON_ESSENTIAL_EVENTS);
  const isGranted =
    options.isGranted ?? (() => (options.api ? options.api.isGranted(category) : headGranted(category)));
  return <T extends PostHogEventLike | null>(event: T): T | null => {
    if (!event) return event;
    if (drop.has(event.event) && !isGranted()) return null;
    return event;
  };
}

export interface PostHogInitOptions {
  cookieless_mode: 'on_reject';
  persistence: 'localStorage+cookie';
  person_profiles: 'identified_only';
  before_send: ReturnType<typeof consentBeforeSend>;
  [key: string]: unknown;
}

/**
 * Recommended `posthog.init()` options for easy-cookie:
 * - `cookieless_mode: 'on_reject'` (requires "Cookieless server hash mode" enabled
 *   in the PostHog project settings);
 * - `persistence: 'localStorage+cookie'` (only used after opt-in);
 * - `person_profiles: 'identified_only'`;
 * - a consent-aware `before_send` filter.
 *
 * Spread your own options after it: `posthog.init(key, { ...posthogInitOptions(), api_host })`.
 */
export function posthogInitOptions(options: ConsentBeforeSendOptions = {}): PostHogInitOptions {
  return {
    cookieless_mode: 'on_reject',
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
    before_send: consentBeforeSend(options),
  };
}
