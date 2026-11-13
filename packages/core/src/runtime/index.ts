import * as engine from '../engine/index.esm.js';
import { gcmStateFor, localize, resolveConfig, resolveTexts, validateConfig, type ResolvedConfig } from '../shared/config';
import { decodeRawCookie, parseConsent, readCookie } from '../shared/cookie';
import type {
  ConsentEventDetail,
  ConsentMethod,
  ConsentRecordInput,
  ConsentState,
  EasyCookieApi,
  EasyCookieConfig,
  EasyCookieEvent,
  Texts,
} from '../shared/types';
import { mountEmbeds } from './embeds';
import { flushQueue, sendRecord, sendSubject } from './log';
import { renderMosaic, mountReopenButton, type ReopenHandle } from './ui';
import { engineCategories, engineTranslation } from './translate';

type Listener = (detail: ConsentEventDetail | null) => void;
type RunInput = EasyCookieConfig | { remote: { endpoint: string; siteKey: string } };

const w = typeof window !== 'undefined' ? (window as any) : undefined;

/** Elements that open the preferences on click: ours, plus Iubenda's documented class. */
const OPEN_PREFERENCES_SELECTOR = '[data-ec-open-preferences], .iubenda-cs-preferences-link';

function detectLanguage(c: ResolvedConfig): string {
  const avail = c.language.available;
  let cand: string | undefined;
  if (c.language.autoDetect === 'document' && typeof document !== 'undefined') cand = document.documentElement.lang;
  else if (c.language.autoDetect === 'browser' && typeof navigator !== 'undefined') cand = navigator.language;
  const short = cand?.slice(0, 2).toLowerCase();
  return short && avail.includes(short) ? short : c.language.default;
}

function eraseCookie(c: ResolvedConfig) {
  const base = `${c.cookie.name}=; Max-Age=0; Path=${c.cookie.path}`;
  document.cookie = base;
  if (c.cookie.domain) document.cookie = `${base}; Domain=${c.cookie.domain}`;
}

/** Create an independent easy-cookie instance. The default export is a singleton. */
export function createEasyCookie(): EasyCookieApi {
  let config: ResolvedConfig | null = null;
  let lang = 'it';
  let texts: Texts | null = null;
  const listeners = new Map<EasyCookieEvent, Set<Listener>>();
  let pendingMethod: ConsentMethod | null = null;
  let pendingSubject: string | null = null;
  let lastSend: Promise<boolean> = Promise.resolve(true);
  let firstFlag = false;
  let previous: string[] = [];
  let reopen: ReopenHandle | null = null;
  let embeds: { refresh(): void } | null = null;
  let ran = false;

  const emit = (event: EasyCookieEvent, detail: ConsentEventDetail | null) => {
    listeners.get(event)?.forEach((cb) => {
      try {
        cb(detail);
      } catch (e) {
        console.error('[easy-cookie] listener error', e);
      }
    });
    w?.dispatchEvent(new CustomEvent(`easycookie:${event}`, { detail }));
  };

  const get = (): ConsentState | null => {
    if (!config || typeof document === 'undefined') return null;
    return parseConsent(readCookie(document.cookie, config.cookie.name), {
      revision: config.revision,
      expiryDays: config.expiryDays,
    });
  };

  const gtag = (...args: unknown[]) => {
    if (!w || !config) return;
    const dl = config.gcm.dataLayerName;
    w[dl] = w[dl] || [];
    if (typeof w.gtag === 'function') w.gtag(...args);
    else
      w[dl].push(
        (function (this: unknown) {
          return arguments;
        } as any)(...args),
      );
  };

  const pushConsentMode = (state: ConsentState, first: boolean, notify: boolean) => {
    if (!config?.gcm.enabled) return;
    gtag('consent', 'update', gcmStateFor(config, state.categories));
    if (!notify) return;
    const flags: Record<string, boolean> = {};
    for (const cat of config.resolvedCategories) flags[cat.id] = state.categories.includes(cat.id);
    // A tag blocked on gtm.init is not re-fired by a later consent update:
    // GTM needs this custom event as an extra trigger (documented in the README).
    w[config.gcm.dataLayerName].push({
      event: config.gcm.eventName,
      easyCookie: { categories: flags, method: state.method, first, revision: state.revision },
    });
  };

  const inferMethod = (accepted: string[]): ConsentMethod => {
    if (!config) return 'custom';
    const optional = config.resolvedCategories.filter((c) => !c.readOnly).map((c) => c.id);
    if (optional.every((id) => accepted.includes(id))) return 'accept_all';
    if (optional.every((id) => !accepted.includes(id))) return 'reject_all';
    return 'custom';
  };

  const record = (state: ConsentState): ConsentRecordInput => {
    const cats: Record<string, boolean> = {};
    for (const c of config!.resolvedCategories) cats[c.id] = state.categories.includes(c.id);
    return {
      consentId: state.id,
      revision: state.revision,
      categories: cats,
      services: state.services,
      method: state.method,
      language: lang,
      pageUrl: location.origin + location.pathname,
      clientTimestamp: state.updatedAt,
    };
  };

  const handleChoice = (first: boolean, changed: string[]) => {
    if (!config) return;
    const raw = engine.getUserPreferences() as { acceptedCategories: string[] };
    const method = pendingMethod ?? inferMethod(raw.acceptedCategories);
    pendingMethod = null;
    engine.setCookieData({ value: { ec: { rev: config.revision, method } }, mode: 'overwrite' });
    const state = get();
    if (!state) return;
    pushConsentMode(state, first, true);
    const withdrawn = previous.filter((c) => !state.categories.includes(c));
    previous = state.categories;
    afterState(state);
    emit(first ? 'consent' : 'change', { consent: state, changed, first });
    const sent = config.log ? sendRecord(config.log, record(state)) : Promise.resolve(true);
    lastSend = sent;
    // A subject passed to identify() before the first choice is linked as soon
    // as the record exists on the server.
    if (pendingSubject && config.log) {
      const subject = pendingSubject;
      pendingSubject = null;
      void sent.then((ok) => ok && sendSubject(config!.log!, state.id, subject));
    }
    if (config.log?.requireLog)
      sent.then((ok) => {
        if (!ok) {
          eraseCookie(config!);
          engine.show(true);
          const err = document.querySelector('#cc-main .ec-error');
          if (err) err.textContent = texts!.errors.logFailed;
        }
      });
    if (withdrawn.length && !first && config.ui?.reloadOnWithdraw !== false) {
      // Scripts already running cannot be unloaded: reload once the record is out.
      sent.finally(() => location.reload());
    }
  };

  const afterState = (state: ConsentState | null) => {
    // Keep the head script's snapshot in sync, for code that reads it before or
    // without the runtime (e.g. the PostHog before_send filter).
    if (w) w.__easyCookieHead = { granted: state ? state.categories : config!.resolvedCategories.filter((c) => c.readOnly).map((c) => c.id), valid: !!state };
    renderMosaic(document.querySelector('#cc-main .cm'), config!, texts!, lang, state);
    reopen?.update(state);
    embeds?.refresh();
  };

  const api: EasyCookieApi = {
    async run(input: RunInput) {
      if (!w) return;
      if (ran) {
        console.warn('[easy-cookie] run() called twice; ignoring.');
        return;
      }
      ran = true;
      let cfg: EasyCookieConfig;
      if ('remote' in input) {
        const res = await fetch(
          `${input.remote.endpoint.replace(/\/$/, '')}/v1/sites/${encodeURIComponent(input.remote.siteKey)}/config.json`,
          { credentials: 'omit' },
        );
        if (!res.ok) throw new Error(`[easy-cookie] could not load config (${res.status})`);
        cfg = await res.json();
      } else cfg = input;

      const issues = validateConfig(cfg);
      if (issues.length) console.warn('[easy-cookie] config issues:', issues);
      config = resolveConfig(cfg);
      lang = detectLanguage(config);
      texts = resolveTexts(config, lang);

      // A stored choice for another revision, expired, or without easy-cookie data is not
      // valid: drop it so the engine shows the banner again (re-prompt).
      const rawValue = readCookie(document.cookie, config.cookie.name);
      if (rawValue && !parseConsent(rawValue, { revision: config.revision, expiryDays: config.expiryDays })) {
        if (decodeRawCookie(rawValue)) eraseCookie(config);
        else eraseCookie(config);
      }
      previous = get()?.categories ?? [];

      if (config.log) flushQueue(config.log);

      const translations: Record<string, unknown> = {};
      for (const l of config.language.available) translations[l] = engineTranslation(config, l, resolveTexts(config, l));

      const pos = config.ui?.position ?? 'bottom-left';
      const enginePos = pos === 'bottom' ? 'bottom center' : pos === 'center' ? 'middle center' : pos.replace('-', ' ');
      document.documentElement.classList.add('ec');
      // `bottom` is a full-width bar on wide screens, not a centred box.
      document.documentElement.classList.toggle('ec--bar', pos === 'bottom');
      const scheme = config.ui?.colorScheme ?? 'light';
      if (scheme === 'dark') document.documentElement.classList.add('ec--dark');
      if (scheme === 'auto' && w.matchMedia?.('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.add('ec--dark');

      // Record which control the visitor used (the engine's callbacks don't say).
      document.addEventListener(
        'click',
        (e) => {
          const el = (e.target as Element | null)?.closest?.('#cc-main button');
          if (!el) return;
          const role = el.getAttribute('data-role');
          if (el.classList.contains('cm__btn--close')) pendingMethod = 'close';
          else if (role === 'all') pendingMethod = 'accept_all';
          else if (role === 'necessary') pendingMethod = 'reject_all';
          else if (role === 'save') pendingMethod = null; // inferred from the toggles
        },
        true,
      );

      // Any `[data-ec-open-preferences]` element opens the preferences, including
      // elements added later (e.g. the `{{preferences-link}}` of a legal document).
      // Iubenda's `.iubenda-cs-preferences-link` class works too, so links kept
      // from an Iubenda setup need no change.
      document.addEventListener('click', (e) => {
        const el = (e.target as Element | null)?.closest?.(OPEN_PREFERENCES_SELECTOR);
        if (!el) return;
        e.preventDefault();
        api.openPreferences();
      });

      await engine.run({
        root: document.body,
        mode: 'opt-in',
        autoShow: true,
        revision: 0,
        hideFromBots: cfg.hideFromBots ?? true,
        manageScriptTags: true,
        autoClearCookies: true,
        disablePageInteraction: false,
        respectGpc: cfg.respectGpc ?? true,
        cookie: {
          name: config.cookie.name,
          path: config.cookie.path,
          sameSite: config.cookie.sameSite,
          ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
          expiresAfterDays: config.expiryDays,
          secure: config.cookie.secure && location.protocol === 'https:',
        },
        guiOptions: {
          consentModal: { layout: 'box', position: enginePos, equalWeightButtons: true, flipButtons: false },
          preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false },
        },
        categories: engineCategories(config, lang, config.ui?.serviceToggles !== false),
        language: { default: lang, translations },
        onFirstConsent: () => {
          firstFlag = true;
        },
        onConsent: () => {
          if (firstFlag) {
            firstFlag = false;
            handleChoice(true, []);
          } else {
            const state = get();
            if (state) {
              pushConsentMode(state, false, false);
              afterState(state);
              emit('replay', { consent: state, changed: [], first: false });
            }
          }
        },
        onChange: ({ changedCategories }: { changedCategories: string[] }) => handleChoice(false, changedCategories),
        onModalReady: ({ modalName, modal }: { modalName: string; modal: HTMLElement }) => {
          if (modalName === 'consentModal') {
            renderMosaic(modal, config!, texts!, lang, get());
            if (!modal.querySelector('.ec-error')) {
              const err = document.createElement('p');
              err.className = 'ec-error';
              err.setAttribute('role', 'alert');
              modal.querySelector('.cm__texts')?.appendChild(err);
            }
          }
        },
      } as any);

      const reopenOpt = config.ui?.reopenButton ?? true;
      if (reopenOpt)
        reopen = mountReopenButton(config, texts, lang, typeof reopenOpt === 'object' ? reopenOpt : {}, () =>
          api.openPreferences(),
        );
      embeds = mountEmbeds(config, () => texts!, () => lang, api);
      afterState(get());
      emit('ready', null);
    },

    get,
    isGranted: (category) => !!get()?.categories.includes(category),
    isServiceGranted: (service) => {
      const s = get();
      if (!s || !config) return false;
      const cat = config.services?.[service]?.category;
      return !!cat && (s.services[cat]?.includes(service) ?? false);
    },
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
      return () => listeners.get(event)?.delete(cb);
    },
    onGranted(category, cb) {
      let fired = false;
      const check = () => {
        if (!fired && api.isGranted(category)) {
          fired = true;
          cb();
        }
      };
      check();
      const offs = (['ready', 'consent', 'change', 'replay'] as EasyCookieEvent[]).map((e) => api.on(e, check));
      return () => offs.forEach((off) => off());
    },
    showBanner: () => engine.show(true),
    openPreferences: () => engine.showPreferences(),
    acceptAll() {
      pendingMethod = 'accept_all';
      engine.acceptCategory('all');
      engine.hide();
      engine.hidePreferences();
    },
    rejectAll() {
      pendingMethod = 'reject_all';
      engine.acceptCategory([]);
      engine.hide();
      engine.hidePreferences();
    },
    accept(categories, services) {
      pendingMethod = null;
      const current = get()?.categories ?? [];
      engine.acceptCategory(Array.from(new Set([...current, ...categories])));
      if (services)
        for (const [cat, svcs] of Object.entries(services)) engine.acceptService(svcs, cat);
      engine.hide();
    },
    async identify(subjectId) {
      if (!config?.log) return false;
      const s = get();
      if (!s) {
        // No choice yet: link it right after the visitor chooses.
        pendingSubject = subjectId;
        return false;
      }
      // The record must exist on the server before the link (see docs/api.md).
      await lastSend;
      return sendSubject(config.log, s.id, subjectId);
    },
    reset() {
      if (!config) return;
      const s = get();
      if (s && config.log) sendRecord(config.log, { ...record(s), method: 'withdraw', categories: Object.fromEntries(config.resolvedCategories.map((c) => [c.id, c.readOnly])) });
      eraseCookie(config);
      previous = [];
      engine.reset(true);
      ran = false;
      reopen?.destroy();
      reopen = null;
    },
    getConfig: () => config,
    getLanguage: () => lang,
    async setLanguage(l) {
      if (!config || !config.language.available.includes(l)) return;
      lang = l;
      texts = resolveTexts(config, l);
      await engine.setLanguage(l, true);
      afterState(get());
    },
  };
  return api;
}

export { localize };
