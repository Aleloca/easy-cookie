import { renderHeadScript, type EasyCookieConfig, type ResolvedConfig } from '@easy-cookie/core/shared';

export interface EasyCookieHeadProps {
  config: EasyCookieConfig | ResolvedConfig;
  /** CSP nonce, when the site uses a nonce-based Content-Security-Policy. */
  nonce?: string;
  /** Default `easy-cookie-head`. */
  id?: string;
}

/**
 * Inline Google Consent Mode v2 "default" snippet, generated from the config.
 * Put it in `app/layout.tsx` `<head>` **before** GTM / gtag. Server component:
 * no hooks, no client JavaScript besides the snippet itself.
 */
export function EasyCookieHead({ config, nonce, id = 'easy-cookie-head' }: EasyCookieHeadProps) {
  return <script id={id} nonce={nonce} dangerouslySetInnerHTML={{ __html: renderHeadScript(config) }} />;
}

export interface EasyCookieHeadRemoteProps {
  /** Consent server base URL, e.g. `https://consent.example.com`. */
  endpoint: string;
  /** Public site key (`pk_…`). */
  siteKey: string;
  nonce?: string;
  id?: string;
}

/** URL of the head snippet published by the consent server for a site. */
export function headScriptUrl(endpoint: string, siteKey: string): string {
  return `${endpoint.replace(/\/+$/, '')}/v1/sites/${encodeURIComponent(siteKey)}/head.js`;
}

/**
 * Same as {@link EasyCookieHead} for configs published on a consent server:
 * a synchronous `<script src=".../v1/sites/:pk/head.js">` (must stay blocking
 * so it runs before GTM).
 */
export function EasyCookieHeadRemote({ endpoint, siteKey, nonce, id = 'easy-cookie-head' }: EasyCookieHeadRemoteProps) {
  return <script id={id} nonce={nonce} src={headScriptUrl(endpoint, siteKey)} />;
}
