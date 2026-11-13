import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ConsentState, EasyCookieApi, EasyCookieConfig, EasyCookieEvent } from '@easy-cookie/core/shared';
import { loadDefaultApi } from './load';

export interface RemoteConfig {
  /** Base URL of the consent server, e.g. `https://consent.example.com`. */
  endpoint: string;
  /** Public site key (`pk_…`). */
  siteKey: string;
}

interface BaseProviderProps {
  children?: ReactNode;
  /**
   * Runtime instance. Defaults to a lazy `import('@easy-cookie/core')` inside an
   * effect, so the provider is safe to render on the server.
   */
  api?: EasyCookieApi;
  /** Language used by the components' texts before the runtime reports its own. */
  lang?: string;
  /** Called when `run()` rejects or the runtime cannot be loaded. */
  onError?: (error: unknown) => void;
}

/** Either an inline `config` or a `remote` config published on a consent server. */
export type EasyCookieProviderProps = BaseProviderProps &
  ({ config: EasyCookieConfig; remote?: never } | { remote: RemoteConfig; config?: never });

export interface EasyCookieContextValue {
  /** Runtime instance, null until loaded (always null during SSR). */
  api: EasyCookieApi | null;
  /** Inline config, or the runtime's resolved config once ready. */
  config: EasyCookieConfig | null;
  /** Visitor's valid choice, null when none (or not ready yet). */
  consent: ConsentState | null;
  /** True once `run()` has resolved and the stored choice (if any) was applied. */
  ready: boolean;
  /** Language for visitor-facing texts. */
  language: string;
  /** Increments on every runtime event; use it as a memo dependency. */
  version: number;
  /** Run `fn` with the runtime as soon as it is available. */
  withApi(fn: (api: EasyCookieApi) => void): void;
}

const EasyCookieContext = createContext<EasyCookieContextValue | null>(null);
EasyCookieContext.displayName = 'EasyCookieContext';

// run() must happen once per runtime instance, even when React StrictMode mounts
// effects twice or the provider remounts.
const runs = new WeakMap<EasyCookieApi, Promise<void>>();
function runOnce(api: EasyCookieApi, arg: Parameters<EasyCookieApi['run']>[0]): Promise<void> {
  let p = runs.get(api);
  if (!p) {
    try {
      p = Promise.resolve(api.run(arg));
    } catch (err) {
      p = Promise.reject(err);
    }
    runs.set(api, p);
  }
  return p;
}

const EVENTS: EasyCookieEvent[] = ['ready', 'consent', 'change', 'replay'];

export function EasyCookieProvider(props: EasyCookieProviderProps) {
  const { children, api: apiProp, lang, onError } = props;
  const [api, setApi] = useState<EasyCookieApi | null>(null);
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);

  // Props are read once: the runtime is a page-level singleton.
  const runArg = useRef(props.config ?? { remote: props.remote! }).current;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const apiPromise = useRef<Promise<EasyCookieApi> | null>(null);

  useEffect(() => {
    let active = true;
    const unsubs: Array<() => void> = [];
    const report = (err: unknown) => {
      if (onErrorRef.current) onErrorRef.current(err);
      else console.error('[easy-cookie]', err);
    };
    const promise = apiProp ? Promise.resolve(apiProp) : loadDefaultApi();
    apiPromise.current = promise;
    promise.then(
      (instance) => {
        if (!active) return;
        setApi(instance);
        const refresh = () => {
          if (!active) return;
          setConsent(instance.get());
          setVersion((v) => v + 1);
        };
        for (const ev of EVENTS) unsubs.push(instance.on(ev, refresh));
        runOnce(instance, runArg).then(
          () => {
            if (!active) return;
            setReady(true);
            refresh();
          },
          (err) => {
            report(err);
            if (active) setReady(true);
          },
        );
      },
      (err) => report(err),
    );
    return () => {
      active = false;
      unsubs.forEach((u) => u());
    };
  }, [apiProp, runArg]);

  const withApi = useCallback((fn: (api: EasyCookieApi) => void) => {
    if (apiPromise.current) apiPromise.current.then(fn, () => undefined);
  }, []);

  const inlineConfig = 'config' in props && props.config ? props.config : null;
  const config = inlineConfig ?? (ready && api ? api.getConfig() : null);
  const language =
    (ready && api ? api.getLanguage() : undefined) || lang || config?.language?.default || 'it';

  const value = useMemo<EasyCookieContextValue>(
    () => ({ api, config, consent, ready, language, version, withApi }),
    [api, config, consent, ready, language, version, withApi],
  );

  return <EasyCookieContext.Provider value={value}>{children}</EasyCookieContext.Provider>;
}

/** Low-level access to the provider state. Throws outside <EasyCookieProvider>. */
export function useEasyCookie(): EasyCookieContextValue {
  const ctx = useContext(EasyCookieContext);
  if (!ctx) throw new Error('[easy-cookie] useConsent()/useEasyCookie() must be used inside <EasyCookieProvider>.');
  return ctx;
}

export interface UseConsentResult {
  consent: ConsentState | null;
  ready: boolean;
  /** False until ready (also during SSR), so server and first client render match. */
  isGranted(category: string): boolean;
  isServiceGranted(service: string): boolean;
  openPreferences(): void;
  acceptAll(): void;
  rejectAll(): void;
  accept(categories: string[], services?: Record<string, string[]>): void;
}

/** Consent state and actions. Re-renders on `consent`, `change` and `replay`. */
export function useConsent(): UseConsentResult {
  const { api, consent, ready, version, withApi } = useEasyCookie();
  return useMemo<UseConsentResult>(
    () => ({
      consent,
      ready,
      isGranted: (category) => (ready && api ? api.isGranted(category) : false),
      isServiceGranted: (service) => (ready && api ? api.isServiceGranted(service) : false),
      openPreferences: () => withApi((a) => a.openPreferences()),
      acceptAll: () => withApi((a) => a.acceptAll()),
      rejectAll: () => withApi((a) => a.rejectAll()),
      accept: (categories, services) => withApi((a) => a.accept(categories, services)),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` refreshes the isGranted closures
    [api, consent, ready, version, withApi],
  );
}
