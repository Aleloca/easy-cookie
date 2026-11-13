import type { EasyCookieConfig } from '@easy-cookie/core/shared';

/**
 * Draft config created with every new site: necessary (always on),
 * measurement and marketing, Consent Mode v2 on, Italian by default with
 * English available. Titles, descriptions and GCM signals come from the
 * core's KNOWN_CATEGORIES defaults. The revision is a placeholder: publishing
 * replaces it with the published revision id.
 */
export function starterConfig(): EasyCookieConfig {
  return {
    revision: 'draft',
    language: { default: 'it', available: ['it', 'en'] },
    categories: {
      necessary: { readOnly: true },
      measurement: {},
      marketing: {},
    },
    services: {},
    googleConsentMode: { enabled: true },
    ui: { position: 'bottom', reopenButton: true },
  };
}
