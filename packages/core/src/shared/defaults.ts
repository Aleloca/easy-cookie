import type { CategoryDeclaration, GcmSignal, Texts } from './types';

export const DEFAULT_COOKIE_NAME = 'ec_consent';
export const DEFAULT_EXPIRY_DAYS = 182;
export const DEFAULT_GCM_EVENT = 'easy_cookie_update';
export const DEFAULT_WAIT_FOR_UPDATE = 500;

/**
 * Well-known category ids. They match Iubenda's five purposes (1–5) so sites can
 * migrate without renaming, but any id is allowed.
 */
export const KNOWN_CATEGORIES: Record<
  string,
  { gcm: GcmSignal[]; color: string; title: Record<'it' | 'en', string>; description: Record<'it' | 'en', string> }
> = {
  necessary: {
    gcm: ['security_storage'],
    color: 'var(--ec-c-necessary)',
    title: { it: 'Necessari', en: 'Necessary' },
    description: {
      it: 'Servono al funzionamento del sito, ad esempio per la sessione e per ricordare questa scelta. Non si possono disattivare.',
      en: 'Required for the site to work, for example the session and remembering this choice. They cannot be turned off.',
    },
  },
  functionality: {
    gcm: ['functionality_storage'],
    color: 'var(--ec-c-functionality)',
    title: { it: 'Funzionalità', en: 'Functionality' },
    description: {
      it: 'Abilitano funzioni aggiuntive come chat, mappe o preferenze salvate.',
      en: 'Enable extra features such as chat, maps or saved preferences.',
    },
  },
  experience: {
    gcm: ['personalization_storage'],
    color: 'var(--ec-c-experience)',
    title: { it: 'Esperienza', en: 'Experience' },
    description: {
      it: 'Contenuti incorporati di terze parti, come video e post social.',
      en: 'Embedded third-party content such as videos and social posts.',
    },
  },
  measurement: {
    gcm: ['analytics_storage'],
    color: 'var(--ec-c-measurement)',
    title: { it: 'Misurazione', en: 'Measurement' },
    description: {
      it: 'Ci aiutano a capire come viene usato il sito, con statistiche sulle visite.',
      en: 'Help us understand how the site is used, through visit statistics.',
    },
  },
  marketing: {
    gcm: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    color: 'var(--ec-c-marketing)',
    title: { it: 'Marketing', en: 'Marketing' },
    description: {
      it: 'Servono a misurare le campagne e a mostrarti pubblicità più pertinente, anche su altri siti.',
      en: 'Measure campaigns and show you more relevant ads, including on other sites.',
    },
  },
};

/** Fallback module colours for unknown category ids, in order. */
export const EXTRA_CATEGORY_COLORS = ['var(--ec-c-extra-1)', 'var(--ec-c-extra-2)', 'var(--ec-c-extra-3)'];

export function categoryDefaults(id: string): Partial<CategoryDeclaration> & { color: string } {
  const known = KNOWN_CATEGORIES[id];
  if (known) return { gcm: known.gcm, color: known.color, title: known.title, description: known.description };
  return { color: EXTRA_CATEGORY_COLORS[0] };
}

export const DEFAULT_TEXTS: Record<'it' | 'en', Texts> = {
  it: {
    banner: {
      title: 'Usiamo i cookie solo se sei d’accordo',
      description:
        'I cookie necessari fanno funzionare il sito. Con il tuo consenso usiamo anche le altre categorie qui sotto. Puoi cambiare idea quando vuoi da «Preferenze cookie».',
      acceptAll: 'Accetta tutti',
      rejectAll: 'Rifiuta tutti',
      customize: 'Personalizza',
      close: 'Chiudi e rifiuta i cookie non necessari',
      policyLink: 'Cookie policy',
      legendOn: 'attivi',
      legendOff: 'spenti',
    },
    preferences: {
      title: 'Preferenze cookie',
      intro:
        'Scegli quali categorie attivare. Quelle spente restano bloccate finché non le accendi. Puoi tornare qui in qualsiasi momento.',
      acceptAll: 'Accetta tutti',
      rejectAll: 'Rifiuta tutti',
      save: 'Salva le scelte',
      close: 'Chiudi',
      alwaysOn: 'Sempre attivi',
      services: 'Servizi',
      serviceCounter: 'servizio|servizi',
      cookieName: 'Cookie',
      cookieDuration: 'Durata',
      cookieDescription: 'A cosa serve',
      provider: 'Fornitore',
      privacyPolicy: 'Privacy policy',
      noCookies: 'Nessun cookie dichiarato.',
    },
    reopen: { label: 'Preferenze cookie' },
    embed: {
      blocked: 'Questo contenuto di {service} è bloccato finché non accetti i cookie «{category}».',
      enable: 'Mostra il contenuto',
      enableAlways: 'Attiva sempre «{category}»',
    },
    errors: { logFailed: 'Non siamo riusciti a registrare la scelta. Riprova.' },
  },
  en: {
    banner: {
      title: 'We use cookies only if you agree',
      description:
        'Necessary cookies make the site work. With your consent we also use the other categories below. You can change your mind at any time from “Cookie preferences”.',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      customize: 'Customize',
      close: 'Close and reject non-necessary cookies',
      policyLink: 'Cookie policy',
      legendOn: 'on',
      legendOff: 'off',
    },
    preferences: {
      title: 'Cookie preferences',
      intro: 'Choose which categories to turn on. Categories left off stay blocked until you enable them. You can come back here at any time.',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      save: 'Save choices',
      close: 'Close',
      alwaysOn: 'Always on',
      services: 'Services',
      serviceCounter: 'service|services',
      cookieName: 'Cookie',
      cookieDuration: 'Duration',
      cookieDescription: 'Purpose',
      provider: 'Provider',
      privacyPolicy: 'Privacy policy',
      noCookies: 'No cookies declared.',
    },
    reopen: { label: 'Cookie preferences' },
    embed: {
      blocked: 'This {service} content is blocked until you accept “{category}” cookies.',
      enable: 'Show content',
      enableAlways: 'Always enable “{category}”',
    },
    errors: { logFailed: 'We could not record your choice. Please try again.' },
  },
};
