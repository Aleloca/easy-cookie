/**
 * Mock service catalog (`GET /admin/api/catalog`), shaped like
 * `@easy-cookie/core/catalog`. Cookie names, durations and providers follow the
 * vendors' public documentation as of 2026; the real catalog lives in
 * packages/core and is the one to trust.
 */
import type { CatalogEntry } from '../api/types';

const DPF = { it: 'EU-US Data Privacy Framework', en: 'EU-US Data Privacy Framework' };

const ENTRIES: CatalogEntry[] = [
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    provider: 'Google Ireland Limited',
    privacyUrl: 'https://policies.google.com/privacy',
    group: 'analytics',
    category: 'measurement',
    purpose: {
      it: 'Statistiche aggregate sulle visite: pagine viste, provenienza, dispositivo.',
      en: 'Aggregate visit statistics: pages viewed, source, device.',
    },
    cookies: [
      { name: '_ga', duration: { it: '2 anni', en: '2 years' }, description: { it: 'Distingue i visitatori.', en: 'Distinguishes visitors.' } },
      {
        name: '^_ga_[A-Z0-9]+$',
        pattern: true,
        duration: { it: '2 anni', en: '2 years' },
        description: { it: 'Mantiene lo stato della sessione.', en: 'Keeps the session state.' },
      },
    ],
    note: {
      it: 'Con Consent Mode attivo GA4 invia ping senza cookie finché il visitatore non accetta.',
      en: 'With Consent Mode on, GA4 sends cookieless pings until the visitor accepts.',
    },
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['google', 'analytics', 'gtag', 'statistiche'],
  },
  {
    id: 'matomo',
    label: 'Matomo (self-hosted)',
    provider: 'Il titolare del sito',
    privacyUrl: 'https://matomo.org/privacy-policy/',
    group: 'analytics',
    category: 'measurement',
    purpose: {
      it: 'Statistiche sulle visite raccolte su un server del titolare.',
      en: 'Visit statistics collected on the owner’s own server.',
    },
    cookies: [
      { name: '^_pk_id\\..*', pattern: true, duration: { it: '13 mesi', en: '13 months' }, description: { it: 'Identifica il visitatore.', en: 'Identifies the visitor.' } },
      { name: '^_pk_ses\\..*', pattern: true, duration: { it: '30 minuti', en: '30 minutes' }, description: { it: 'Raggruppa le pagine di una visita.', en: 'Groups the pages of one visit.' } },
    ],
    note: {
      it: 'Se configuri Matomo senza cookie e con IP anonimizzato puoi valutare di spostarlo tra i necessari.',
      en: 'If Matomo runs cookieless with anonymised IPs you may consider moving it to necessary.',
    },
    keywords: ['piwik', 'analytics', 'statistiche'],
  },
  {
    id: 'hotjar',
    label: 'Hotjar',
    provider: 'Hotjar Ltd',
    privacyUrl: 'https://www.hotjar.com/legal/policies/privacy/',
    group: 'analytics',
    category: 'measurement',
    purpose: {
      it: 'Mappe di calore e registrazioni anonime delle sessioni.',
      en: 'Heatmaps and anonymised session recordings.',
    },
    cookies: [
      {
        name: '^_hjSessionUser_\\d+$',
        pattern: true,
        duration: { it: '1 anno', en: '1 year' },
        description: { it: 'Identifica il visitatore tra le visite.', en: 'Identifies the visitor across visits.' },
      },
      {
        name: '^_hjSession_\\d+$',
        pattern: true,
        duration: { it: '30 minuti', en: '30 minutes' },
        description: { it: 'Dati della sessione corrente.', en: 'Current session data.' },
      },
    ],
    transfer: { countries: ['IE', 'US'] },
    keywords: ['heatmap', 'recording'],
  },
  {
    id: 'google-ads',
    label: 'Google Ads',
    provider: 'Google Ireland Limited',
    privacyUrl: 'https://policies.google.com/privacy',
    group: 'advertising',
    category: 'marketing',
    purpose: {
      it: 'Misura le conversioni delle campagne e mostra annunci a chi ha già visitato il sito.',
      en: 'Measures campaign conversions and shows ads to people who visited the site.',
    },
    cookies: [
      { name: '_gcl_au', duration: { it: '3 mesi', en: '3 months' }, description: { it: 'Attribuisce le conversioni agli annunci.', en: 'Attributes conversions to ads.' } },
      {
        name: 'IDE',
        domain: '.doubleclick.net',
        duration: { it: '13 mesi', en: '13 months' },
        description: { it: 'Personalizzazione degli annunci.', en: 'Ad personalisation.' },
      },
    ],
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['adwords', 'gclid', 'remarketing', 'doubleclick'],
  },
  {
    id: 'meta-pixel',
    label: 'Meta Pixel',
    provider: 'Meta Platforms Ireland Ltd.',
    privacyUrl: 'https://www.facebook.com/privacy/policy/',
    group: 'advertising',
    category: 'marketing',
    purpose: {
      it: 'Misura le conversioni delle campagne su Facebook e Instagram e crea pubblici personalizzati.',
      en: 'Measures Facebook and Instagram campaign conversions and builds custom audiences.',
    },
    cookies: [
      { name: '_fbp', duration: { it: '3 mesi', en: '3 months' }, description: { it: 'Identifica il browser per gli annunci.', en: 'Identifies the browser for ads.' } },
      { name: 'fr', domain: '.facebook.com', duration: { it: '3 mesi', en: '3 months' }, description: { it: 'Pubblicità e misurazione.', en: 'Advertising and measurement.' } },
    ],
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['facebook', 'instagram', 'fbq'],
  },
  {
    id: 'gtm',
    label: 'Google Tag Manager',
    provider: 'Google Ireland Limited',
    privacyUrl: 'https://policies.google.com/privacy',
    group: 'tag-management',
    category: 'necessary',
    purpose: {
      it: 'Carica gli script degli altri servizi. Da solo non imposta cookie.',
      en: 'Loads the scripts of the other services. It sets no cookies by itself.',
    },
    cookies: [],
    note: {
      it: 'Dichiara a parte ogni tag che GTM carica: è lì che nascono i cookie.',
      en: 'Declare every tag GTM loads separately: that is where the cookies come from.',
    },
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['gtm', 'tag manager', 'datalayer'],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    provider: 'Google Ireland Limited',
    privacyUrl: 'https://policies.google.com/privacy',
    group: 'embeds',
    category: 'experience',
    purpose: {
      it: 'Video incorporati nelle pagine. Fino al consenso resta il segnaposto.',
      en: 'Videos embedded in the pages. Until consent, the placeholder stays.',
    },
    cookies: [
      {
        name: 'VISITOR_INFO1_LIVE',
        domain: '.youtube.com',
        duration: { it: '6 mesi', en: '6 months' },
        description: { it: 'Stima la banda per il player.', en: 'Estimates bandwidth for the player.' },
      },
      { name: 'YSC', domain: '.youtube.com', duration: { it: 'sessione', en: 'session' }, description: { it: 'Conta le visualizzazioni.', en: 'Counts views.' } },
      { name: 'PREF', domain: '.youtube.com', duration: { it: '8 mesi', en: '8 months' }, description: { it: 'Preferenze del player.', en: 'Player preferences.' } },
    ],
    note: {
      it: 'youtube-nocookie.com riduce i cookie ma usa comunque lo storage locale: tienilo dietro consenso.',
      en: 'youtube-nocookie.com sets fewer cookies but still uses local storage: keep it behind consent.',
    },
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['video', 'embed', 'iframe'],
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    provider: 'Vimeo.com, Inc.',
    privacyUrl: 'https://vimeo.com/privacy',
    group: 'embeds',
    category: 'experience',
    purpose: { it: 'Video incorporati nelle pagine.', en: 'Videos embedded in the pages.' },
    cookies: [
      { name: 'vuid', domain: '.vimeo.com', duration: { it: '2 anni', en: '2 years' }, description: { it: 'Statistiche del player.', en: 'Player statistics.' } },
    ],
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['video', 'embed', 'iframe'],
  },
  {
    id: 'google-maps',
    label: 'Google Maps',
    provider: 'Google Ireland Limited',
    privacyUrl: 'https://policies.google.com/privacy',
    group: 'embeds',
    category: 'functionality',
    purpose: { it: 'Mappe interattive incorporate nelle pagine.', en: 'Interactive maps embedded in the pages.' },
    cookies: [{ name: 'NID', domain: '.google.com', duration: { it: '6 mesi', en: '6 months' }, description: { it: 'Preferenze e sicurezza.', en: 'Preferences and security.' } }],
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['mappa', 'map', 'embed'],
  },
  {
    id: 'intercom',
    label: 'Intercom',
    provider: 'Intercom R&D Unlimited Company',
    privacyUrl: 'https://www.intercom.com/legal/privacy',
    group: 'support',
    category: 'functionality',
    purpose: { it: 'Chat di assistenza e messaggi in-app.', en: 'Support chat and in-app messages.' },
    cookies: [
      {
        name: '^intercom-id-.*',
        pattern: true,
        duration: { it: '9 mesi', en: '9 months' },
        description: { it: 'Riconosce chi torna in chat.', en: 'Recognises returning chat users.' },
      },
      {
        name: '^intercom-session-.*',
        pattern: true,
        duration: { it: '1 settimana', en: '1 week' },
        description: { it: 'Mantiene aperta la conversazione.', en: 'Keeps the conversation open.' },
      },
      {
        name: '^intercom-device-id-.*',
        pattern: true,
        duration: { it: '9 mesi', en: '9 months' },
        description: { it: 'Identifica il dispositivo.', en: 'Identifies the device.' },
      },
    ],
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['chat', 'helpdesk', 'support'],
  },
  {
    id: 'stripe',
    label: 'Stripe',
    provider: 'Stripe Payments Europe, Ltd.',
    privacyUrl: 'https://stripe.com/privacy',
    group: 'payments',
    category: 'necessary',
    purpose: { it: 'Pagamenti e prevenzione delle frodi al checkout.', en: 'Payments and fraud prevention at checkout.' },
    cookies: [
      { name: '__stripe_mid', duration: { it: '1 anno', en: '1 year' }, description: { it: 'Prevenzione frodi.', en: 'Fraud prevention.' } },
      { name: '__stripe_sid', duration: { it: '30 minuti', en: '30 minutes' }, description: { it: 'Prevenzione frodi nella sessione.', en: 'Session fraud prevention.' } },
    ],
    note: {
      it: 'Necessario solo nelle pagine di pagamento: caricalo lì, non in tutto il sito.',
      en: 'Only necessary on payment pages: load it there, not site-wide.',
    },
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['checkout', 'pagamenti', 'carta'],
  },
  {
    id: 'recaptcha',
    label: 'Google reCAPTCHA',
    provider: 'Google Ireland Limited',
    privacyUrl: 'https://policies.google.com/privacy',
    group: 'security',
    category: 'necessary',
    purpose: { it: 'Protegge i moduli dallo spam e dai bot.', en: 'Protects forms from spam and bots.' },
    cookies: [{ name: '_GRECAPTCHA', duration: { it: '6 mesi', en: '6 months' }, description: { it: 'Analisi del rischio.', en: 'Risk analysis.' } }],
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['captcha', 'spam', 'form'],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    provider: 'Cloudflare, Inc.',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    group: 'infrastructure',
    category: 'necessary',
    purpose: { it: 'CDN e protezione dagli attacchi automatizzati.', en: 'CDN and protection from automated attacks.' },
    cookies: [
      { name: '__cf_bm', duration: { it: '30 minuti', en: '30 minutes' }, description: { it: 'Distingue persone e bot.', en: 'Tells people and bots apart.' } },
      { name: '_cfuvid', duration: { it: 'sessione', en: 'session' }, description: { it: 'Limitazione del traffico.', en: 'Rate limiting.' } },
    ],
    transfer: { countries: ['US'], safeguard: DPF },
    keywords: ['cdn', 'waf', 'turnstile'],
  },
  {
    // The consent banner itself. Like the server's entry, it has no third-party
    // provider or privacy URL: both are the site's own.
    id: 'easy-cookie',
    label: 'easy-cookie',
    provider: '',
    privacyUrl: '',
    group: 'infrastructure',
    category: 'necessary',
    purpose: {
      it: 'Ricorda le scelte sui cookie e registra la prova del consenso.',
      en: 'Remembers cookie choices and records the proof of consent.',
    },
    cookies: [
      { name: 'ec_consent', duration: { it: '6 mesi', en: '6 months' }, description: { it: 'Le scelte del visitatore.', en: 'The visitor’s choices.' } },
    ],
    keywords: ['consenso', 'consent', 'banner'],
  },
];

const GROUP_ORDER = ['analytics', 'advertising', 'tag-management', 'embeds', 'support', 'payments', 'security', 'infrastructure'];

/** Sorted by group then label, like the server. */
export const MOCK_CATALOG: CatalogEntry[] = [...ENTRIES].sort(
  (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.label.localeCompare(b.label),
);
