// Server-safe entry. The React components below come from @easy-cookie/react,
// whose bundle starts with "use client": importing them here keeps the client
// boundary inside that module, so this file can be used from server components.
export { EasyCookieHead, EasyCookieHeadRemote, headScriptUrl, type EasyCookieHeadProps, type EasyCookieHeadRemoteProps } from './head';
export {
  getServerConsent,
  isGrantedOnServer,
  isServiceGrantedOnServer,
  getLegalDocument,
  getRemoteConfig,
  type GetLegalDocumentOptions,
  type ConsentSource,
  type CookieStoreLike,
  type HeadersLike,
} from './server';
export {
  EasyCookieProvider,
  useConsent,
  useEasyCookie,
  ConsentGate,
  ConsentScript,
  ConsentEmbed,
  PreferencesLink,
  type EasyCookieProviderProps,
  type ConsentGateProps,
  type ConsentScriptProps,
  type ConsentEmbedProps,
  type PreferencesLinkProps,
  type UseConsentResult,
} from '@easy-cookie/react';
export type { ConsentState, EasyCookieApi, EasyCookieConfig } from '@easy-cookie/core/shared';
