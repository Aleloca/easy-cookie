export {
  EasyCookieProvider,
  useConsent,
  useEasyCookie,
  type EasyCookieProviderProps,
  type EasyCookieContextValue,
  type RemoteConfig,
  type UseConsentResult,
} from './provider';
export {
  ConsentGate,
  ConsentScript,
  ConsentEmbed,
  PreferencesLink,
  type ConsentGateProps,
  type ConsentScriptProps,
  type ConsentEmbedProps,
  type PreferencesLinkProps,
} from './components';
export { loadDefaultApi, pickApi, isEasyCookieApi } from './load';
export type { ConsentState, EasyCookieApi, EasyCookieConfig } from '@easy-cookie/core/shared';
