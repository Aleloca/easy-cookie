import type { CookieDeclaration, Localized, ServiceDeclaration } from '../shared/types';

/** Group used to browse the catalog (not the consent category). */
export type CatalogGroup = 'analytics' | 'advertising' | 'tag-management' | 'embeds' | 'support' | 'payments' | 'security' | 'infrastructure';

/**
 * One ready-made service. `toService()` turns it into a `ServiceDeclaration`
 * the site owner can then edit. Everything is plain JSON so the console can
 * ship it to the browser as-is.
 */
export interface CatalogEntry {
  /** Stable id, used as the default service key in the config (e.g. `ga4`). */
  id: string;
  label: string;
  /** Legal entity that processes the data for EU visitors. */
  provider: string;
  privacyUrl: string;
  group: CatalogGroup;
  /** Consent category the service belongs to by default. */
  category: 'necessary' | 'functionality' | 'experience' | 'measurement' | 'marketing';
  purpose: Localized;
  cookies: CookieDeclaration[];
  /** Short note for the site owner (not shown to visitors), e.g. "Set IP anonymisation in GA4". */
  note?: Localized;
  /** Where the service sends data, for the transfer section of the privacy policy. */
  transfer?: { countries: string[]; safeguard?: Localized };
  /** Optional search keywords. */
  keywords?: string[];
}

export type { ServiceDeclaration };
