import type { CookieDeclaration, Localized } from '../shared/types';
import type { CatalogEntry } from './types';

/*
 * Ready-made service declarations. Data checked against each provider's public
 * cookie / privacy documentation (November 2026). Durations are omitted where
 * the provider does not document them or makes them configurable without a
 * stable default. Site owners must still review every entry: providers change
 * their cookies, and the transfer section depends on the owner's contracts.
 */

const t = (it: string, en: string): Record<'it' | 'en', string> => ({ it, en });

function ck(
  name: string,
  duration: Record<'it' | 'en', string> | undefined,
  description: Record<'it' | 'en', string>,
  extra: Partial<CookieDeclaration> = {},
): CookieDeclaration {
  return { name, ...extra, ...(duration ? { duration } : {}), description };
}

const pattern = { pattern: true } as const;

// Durations.
const SESSION = t('sessione', 'session');
const MIN30 = t('30 minuti', '30 minutes');
const DAY1 = t('1 giorno', '1 day');
const DAYS7 = t('7 giorni', '7 days');
const DAYS30 = t('30 giorni', '30 days');
const MONTHS3 = t('3 mesi', '3 months');
const MONTHS6 = t('6 mesi', '6 months');
const MONTHS9 = t('9 mesi', '9 months');
const YEAR1 = t('1 anno', '1 year');
const MONTHS13 = t('13 mesi', '13 months');
const YEARS2 = t('2 anni', '2 years');

// Transfer safeguards.
const DPF = t('EU-US Data Privacy Framework', 'EU-US Data Privacy Framework');
const SCC = t('Clausole contrattuali standard', 'Standard contractual clauses');
const BCR = t('Norme vincolanti d’impresa (BCR)', 'Binding corporate rules (BCR)');
const us = (safeguard: Localized) => ({ countries: ['US'], safeguard });

const GOOGLE = 'Google Ireland Ltd';
const GOOGLE_PRIVACY = 'https://policies.google.com/privacy';
const MICROSOFT = 'Microsoft Ireland Operations Ltd';
const MICROSOFT_PRIVACY = 'https://privacy.microsoft.com/privacystatement';

export const ENTRIES: CatalogEntry[] = [
  // ---- analytics ------------------------------------------------------------
  {
    id: 'ga4',
    label: 'Google Analytics 4',
    provider: GOOGLE,
    privacyUrl: GOOGLE_PRIVACY,
    group: 'analytics',
    category: 'measurement',
    purpose: t(
      'Statistiche sulle visite e sull’uso del sito (pagine viste, sorgenti di traffico, eventi).',
      'Statistics about visits and site usage (page views, traffic sources, events).',
    ),
    cookies: [
      ck('_ga', YEARS2, t('Distingue i visitatori con un identificativo casuale.', 'Distinguishes visitors with a random identifier.')),
      ck('^_ga_', YEARS2, t('Mantiene lo stato della sessione per la proprietà GA4.', 'Keeps the session state for the GA4 property.'), pattern),
    ],
    transfer: us(DPF),
    note: t(
      'Senza consenso Google Analytics non deve impostare cookie: abilita Consent Mode v2. Nel contratto con Google valuta le impostazioni di condivisione dei dati.',
      'Without consent Google Analytics must not set cookies: enable Consent Mode v2. Review the data-sharing settings in your Google agreement.',
    ),
    keywords: ['google analytics', 'gtag', 'analytics'],
  },
  {
    id: 'gtm',
    label: 'Google Tag Manager',
    provider: GOOGLE,
    privacyUrl: GOOGLE_PRIVACY,
    group: 'tag-management',
    category: 'necessary',
    purpose: t(
      'Carica gli script configurati nel contenitore; da solo non imposta cookie.',
      'Loads the scripts configured in the container; on its own it sets no cookies.',
    ),
    cookies: [],
    transfer: us(DPF),
    note: t(
      'GTM non imposta cookie, ma i tag che carica sì: dichiara ogni tag (GA4, Ads, Meta…) come servizio separato e attivali solo col consenso tramite Consent Mode.',
      'GTM sets no cookies, but the tags it loads do: declare each tag (GA4, Ads, Meta…) as its own service and fire them only with consent through Consent Mode.',
    ),
    keywords: ['gtm', 'tag manager'],
  },
  {
    id: 'posthog',
    label: 'PostHog',
    provider: 'PostHog Inc.',
    privacyUrl: 'https://posthog.com/privacy',
    group: 'analytics',
    category: 'measurement',
    purpose: t(
      'Analisi del prodotto: eventi, funnel, registrazioni di sessione e feature flag.',
      'Product analytics: events, funnels, session recordings and feature flags.',
    ),
    cookies: [
      ck('^ph_.*_posthog$', YEAR1, t('Identificativo anonimo del visitatore e stato della sessione.', 'Anonymous visitor identifier and session state.'), pattern),
    ],
    transfer: us(SCC),
    note: t(
      'Con PostHog EU Cloud (eu.posthog.com) i dati restano nell’UE: aggiorna la sezione trasferimenti. Senza consenso usa persistence: "memory" (con @easy-cookie/posthog).',
      'With PostHog EU Cloud (eu.posthog.com) data stays in the EU: update the transfer section. Without consent use persistence: "memory" (with @easy-cookie/posthog).',
    ),
    keywords: ['product analytics', 'session replay'],
  },
  {
    id: 'matomo',
    label: 'Matomo',
    provider: 'InnoCraft Ltd (Matomo Cloud)',
    privacyUrl: 'https://matomo.org/privacy-policy/',
    group: 'analytics',
    category: 'measurement',
    purpose: t('Statistiche sulle visite e sull’uso del sito.', 'Statistics about visits and site usage.'),
    cookies: [
      ck('^_pk_id\\.', MONTHS13, t('Identificativo del visitatore.', 'Visitor identifier.'), pattern),
      ck('^_pk_ses\\.', MIN30, t('Dati temporanei della visita in corso.', 'Temporary data for the current visit.'), pattern),
    ],
    note: t(
      'Se Matomo è installato sul tuo server, il fornitore sei tu: modifica il campo. Con IP mascherato, senza incrocio con altri dati e con cookie disattivati o di prima parte, le linee guida del Garante (2021) lo equiparano a un cookie tecnico: puoi spostarlo tra i necessari.',
      'If Matomo runs on your own server, you are the provider: edit the field. With masked IPs, no cross-referencing with other data and cookies disabled or first-party, the Italian Garante guidelines (2021) treat it like a technical cookie: you may move it to necessary.',
    ),
    keywords: ['piwik', 'self-hosted'],
  },
  {
    id: 'plausible',
    label: 'Plausible Analytics',
    provider: 'Plausible Insights OÜ',
    privacyUrl: 'https://plausible.io/privacy',
    group: 'analytics',
    category: 'measurement',
    purpose: t(
      'Statistiche aggregate sulle visite, senza cookie e senza identificativi persistenti.',
      'Aggregate visit statistics, without cookies or persistent identifiers.',
    ),
    cookies: [],
    note: t(
      'Plausible non imposta cookie: potresti non aver bisogno del consenso. Valuta di spostarlo tra i necessari o di elencarlo solo nella privacy policy.',
      'Plausible sets no cookies: you may not need consent. Consider moving it to necessary or listing it only in the privacy policy.',
    ),
    keywords: ['cookieless', 'privacy-friendly'],
  },
  {
    id: 'hotjar',
    label: 'Hotjar',
    provider: 'Hotjar Ltd',
    privacyUrl: 'https://www.hotjar.com/legal/policies/privacy/',
    group: 'analytics',
    category: 'measurement',
    purpose: t(
      'Mappe di calore, registrazioni delle sessioni e sondaggi sull’uso del sito.',
      'Heatmaps, session recordings and surveys about site usage.',
    ),
    cookies: [
      ck('^_hjSessionUser_', YEAR1, t('Identificativo del visitatore per il sito.', 'Visitor identifier for the site.'), pattern),
      ck('^_hjSession_', MIN30, t('Dati della sessione in corso.', 'Current session data.'), pattern),
    ],
    keywords: ['heatmap', 'session recording', 'contentsquare'],
  },
  {
    id: 'clarity',
    label: 'Microsoft Clarity',
    provider: MICROSOFT,
    privacyUrl: MICROSOFT_PRIVACY,
    group: 'analytics',
    category: 'measurement',
    purpose: t('Mappe di calore e registrazioni delle sessioni.', 'Heatmaps and session recordings.'),
    cookies: [
      ck('_clck', YEAR1, t('Identificativo del visitatore e preferenze di Clarity.', 'Visitor identifier and Clarity preferences.')),
      ck('_clsk', DAY1, t('Collega le pagine viste in una stessa sessione.', 'Links page views into one session.')),
      ck('CLID', YEAR1, t('Identifica il primo accesso del browser a Clarity.', 'Identifies the browser’s first visit to Clarity.'), { domain: 'clarity.ms' }),
      ck('MUID', YEAR1, t('Identificativo del browser usato dai servizi Microsoft.', 'Browser identifier used by Microsoft services.'), { domain: 'clarity.ms' }),
    ],
    transfer: us(DPF),
    note: t(
      'Dal 2025 Clarity richiede di inviare il segnale di consenso (Consent API) per i visitatori del SEE.',
      'Since 2025 Clarity requires the consent signal (Consent API) for EEA visitors.',
    ),
    keywords: ['heatmap', 'session recording'],
  },
  {
    id: 'mixpanel',
    label: 'Mixpanel',
    provider: 'Mixpanel Inc.',
    privacyUrl: 'https://mixpanel.com/legal/privacy-policy/',
    group: 'analytics',
    category: 'measurement',
    purpose: t('Analisi del prodotto basata su eventi.', 'Event-based product analytics.'),
    cookies: [ck('^mp_.*_mixpanel$', YEAR1, t('Identificativo del visitatore e proprietà dell’evento.', 'Visitor identifier and event properties.'), pattern)],
    transfer: us(DPF),
    note: t(
      'Con la residenza dei dati UE di Mixpanel i dati sono conservati nell’UE: aggiorna la sezione trasferimenti.',
      'With Mixpanel EU data residency data is stored in the EU: update the transfer section.',
    ),
    keywords: ['product analytics'],
  },
  {
    id: 'amplitude',
    label: 'Amplitude',
    provider: 'Amplitude Inc.',
    privacyUrl: 'https://amplitude.com/privacy',
    group: 'analytics',
    category: 'measurement',
    purpose: t('Analisi del prodotto basata su eventi.', 'Event-based product analytics.'),
    cookies: [ck('^AMP_', YEAR1, t('Identificativo del visitatore e della sessione.', 'Visitor and session identifier.'), pattern)],
    transfer: us(DPF),
    note: t(
      'Con il data center UE di Amplitude i dati sono conservati nell’UE: aggiorna la sezione trasferimenti.',
      'With Amplitude’s EU data center data is stored in the EU: update the transfer section.',
    ),
    keywords: ['product analytics'],
  },

  // ---- advertising ----------------------------------------------------------
  {
    id: 'google-ads',
    label: 'Google Ads',
    provider: GOOGLE,
    privacyUrl: GOOGLE_PRIVACY,
    group: 'advertising',
    category: 'marketing',
    purpose: t(
      'Misura le conversioni delle campagne e mostra annunci personalizzati (remarketing).',
      'Measures campaign conversions and shows personalised ads (remarketing).',
    ),
    cookies: [
      ck('_gcl_au', MONTHS3, t('Memorizza le informazioni sui clic sugli annunci per misurare le conversioni.', 'Stores ad-click information to measure conversions.')),
      ck('^_gcl_', MONTHS3, t('Altri cookie di misurazione delle conversioni (es. _gcl_aw).', 'Other conversion-measurement cookies (e.g. _gcl_aw).'), pattern),
      ck('IDE', MONTHS13, t('Pubblicità personalizzata e misurazione su siti di terze parti.', 'Personalised advertising and measurement across third-party sites.'), { domain: 'doubleclick.net' }),
    ],
    transfer: us(DPF),
    keywords: ['adwords', 'remarketing', 'conversion', 'doubleclick'],
  },
  {
    id: 'meta-pixel',
    label: 'Meta Pixel',
    provider: 'Meta Platforms Ireland Ltd',
    privacyUrl: 'https://www.facebook.com/privacy/policy/',
    group: 'advertising',
    category: 'marketing',
    purpose: t(
      'Misura le conversioni delle campagne su Facebook e Instagram e crea pubblici per gli annunci.',
      'Measures Facebook and Instagram campaign conversions and builds ad audiences.',
    ),
    cookies: [
      ck('_fbp', MONTHS3, t('Identifica il browser per la pubblicità di Meta.', 'Identifies the browser for Meta advertising.')),
      ck('_fbc', MONTHS3, t('Memorizza l’ultimo clic su un annuncio di Meta.', 'Stores the last click on a Meta ad.')),
      ck('fr', MONTHS3, t('Pubblicità personalizzata e misurazione.', 'Personalised advertising and measurement.'), { domain: 'facebook.com' }),
    ],
    transfer: us(DPF),
    keywords: ['facebook', 'instagram', 'pixel'],
  },
  {
    id: 'linkedin-insight',
    label: 'LinkedIn Insight Tag',
    provider: 'LinkedIn Ireland Unlimited Company',
    privacyUrl: 'https://www.linkedin.com/legal/privacy-policy',
    group: 'advertising',
    category: 'marketing',
    purpose: t(
      'Misura le conversioni delle campagne LinkedIn e crea pubblici di retargeting.',
      'Measures LinkedIn campaign conversions and builds retargeting audiences.',
    ),
    cookies: [
      ck('li_sugr', MONTHS3, t('Identificativo del browser per l’abbinamento degli utenti.', 'Browser identifier for user matching.')),
      ck('bcookie', YEAR1, t('Identificativo del browser.', 'Browser identifier.'), { domain: 'linkedin.com' }),
      ck('lidc', DAY1, t('Instradamento verso il data center.', 'Data-center routing.'), { domain: 'linkedin.com' }),
      ck('UserMatchHistory', DAYS30, t('Sincronizzazione degli identificativi pubblicitari.', 'Ad identifier syncing.'), { domain: 'linkedin.com' }),
      ck('AnalyticsSyncHistory', DAYS30, t('Data dell’ultima sincronizzazione.', 'Time of the last sync.'), { domain: 'linkedin.com' }),
    ],
    transfer: us(DPF),
    keywords: ['linkedin', 'retargeting'],
  },
  {
    id: 'tiktok-pixel',
    label: 'TikTok Pixel',
    provider: 'TikTok Technology Limited',
    privacyUrl: 'https://www.tiktok.com/legal/page/eea/privacy-policy/en',
    group: 'advertising',
    category: 'marketing',
    purpose: t(
      'Misura le conversioni delle campagne TikTok e ottimizza la pubblicità.',
      'Measures TikTok campaign conversions and optimises advertising.',
    ),
    cookies: [
      ck('_ttp', MONTHS13, t('Identifica il browser per la pubblicità di TikTok.', 'Identifies the browser for TikTok advertising.')),
      ck('_tt_enable_cookie', MONTHS13, t('Verifica che il browser accetti i cookie.', 'Checks that the browser accepts cookies.')),
    ],
    transfer: { countries: ['US', 'MY', 'CN'], safeguard: SCC },
    note: t(
      'Verifica i paesi di trasferimento nella privacy policy SEE di TikTok in vigore: cambiano nel tempo.',
      'Check the transfer countries in TikTok’s current EEA privacy policy: they change over time.',
    ),
    keywords: ['tiktok', 'pixel'],
  },
  {
    id: 'pinterest-tag',
    label: 'Pinterest Tag',
    provider: 'Pinterest Europe Ltd',
    privacyUrl: 'https://policy.pinterest.com/privacy-policy',
    group: 'advertising',
    category: 'marketing',
    purpose: t('Misura le conversioni delle campagne Pinterest.', 'Measures Pinterest campaign conversions.'),
    cookies: [
      ck('_pin_unauth', YEAR1, t('Identifica il browser dei visitatori non registrati.', 'Identifies the browser of signed-out visitors.')),
      ck('_pinterest_ct_ua', YEAR1, t('Collega le azioni sul sito ai clic sugli annunci.', 'Links on-site actions to ad clicks.')),
      ck('_epik', YEAR1, t('Memorizza il clic sull’annuncio di provenienza.', 'Stores the click on the originating ad.')),
    ],
    transfer: us(DPF),
    keywords: ['pinterest', 'pixel'],
  },
  {
    id: 'microsoft-uet',
    label: 'Microsoft Advertising (UET)',
    provider: MICROSOFT,
    privacyUrl: MICROSOFT_PRIVACY,
    group: 'advertising',
    category: 'marketing',
    purpose: t(
      'Misura le conversioni delle campagne Microsoft Advertising (Bing) e crea pubblici di remarketing.',
      'Measures Microsoft Advertising (Bing) conversions and builds remarketing audiences.',
    ),
    cookies: [
      ck('_uetsid', DAY1, t('Identificativo della sessione per la misurazione delle conversioni.', 'Session identifier for conversion measurement.')),
      ck('_uetvid', MONTHS13, t('Identificativo del visitatore tra più sessioni.', 'Visitor identifier across sessions.')),
      ck('MUID', YEAR1, t('Identificativo del browser usato dai servizi Microsoft.', 'Browser identifier used by Microsoft services.'), { domain: 'bing.com' }),
    ],
    transfer: us(DPF),
    keywords: ['bing ads', 'uet'],
  },
  {
    id: 'x-pixel',
    label: 'X (Twitter) Pixel',
    provider: 'Twitter International Unlimited Company',
    privacyUrl: 'https://x.com/en/privacy',
    group: 'advertising',
    category: 'marketing',
    purpose: t('Misura le conversioni delle campagne su X e crea pubblici.', 'Measures X campaign conversions and builds audiences.'),
    cookies: [
      ck('muc_ads', MONTHS13, t('Identificativo pubblicitario del browser.', 'Advertising identifier for the browser.'), { domain: 't.co' }),
      ck('guest_id', MONTHS13, t('Identificativo dei visitatori non registrati.', 'Identifier of signed-out visitors.'), { domain: 'x.com' }),
      ck('personalization_id', MONTHS13, t('Pubblicità personalizzata.', 'Personalised advertising.'), { domain: 'x.com' }),
    ],
    transfer: us(SCC),
    note: t(
      'Verifica la denominazione attuale del titolare UE nella privacy policy di X.',
      'Check the current name of the EU controller in X’s privacy policy.',
    ),
    keywords: ['twitter', 'pixel'],
  },

  // ---- embeds ---------------------------------------------------------------
  {
    id: 'youtube',
    label: 'YouTube',
    provider: GOOGLE,
    privacyUrl: GOOGLE_PRIVACY,
    group: 'embeds',
    category: 'experience',
    purpose: t('Mostra video di YouTube incorporati nelle pagine.', 'Shows YouTube videos embedded in pages.'),
    cookies: [
      ck('VISITOR_INFO1_LIVE', MONTHS6, t('Stima la banda e ricorda le impostazioni del lettore.', 'Estimates bandwidth and remembers player settings.'), { domain: 'youtube.com' }),
      ck('YSC', SESSION, t('Identificativo della sessione di visione.', 'Viewing session identifier.'), { domain: 'youtube.com' }),
    ],
    transfer: us(DPF),
    note: t(
      'Usa youtube-nocookie.com: i cookie vengono impostati solo quando il visitatore avvia il video. Il contenuto arriva comunque da Google, quindi blocca l’iframe fino al consenso (data-category="experience").',
      'Use youtube-nocookie.com: cookies are set only when the visitor plays the video. The content still comes from Google, so block the iframe until consent (data-category="experience").',
    ),
    keywords: ['video', 'youtube-nocookie', 'iframe'],
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    provider: 'Vimeo.com Inc.',
    privacyUrl: 'https://vimeo.com/privacy',
    group: 'embeds',
    category: 'experience',
    purpose: t('Mostra video di Vimeo incorporati nelle pagine.', 'Shows Vimeo videos embedded in pages.'),
    cookies: [
      ck('vuid', YEARS2, t('Identificativo del visitatore per le statistiche del video.', 'Visitor identifier for video statistics.'), { domain: 'vimeo.com' }),
    ],
    transfer: us(SCC),
    note: t(
      'Con il parametro dnt=1 nell’URL dell’iframe Vimeo non imposta cookie di tracciamento.',
      'With dnt=1 in the iframe URL Vimeo sets no tracking cookies.',
    ),
    keywords: ['video', 'iframe'],
  },
  {
    id: 'google-maps',
    label: 'Google Maps',
    provider: GOOGLE,
    privacyUrl: GOOGLE_PRIVACY,
    group: 'embeds',
    category: 'experience',
    purpose: t('Mostra mappe interattive incorporate nelle pagine.', 'Shows interactive maps embedded in pages.'),
    cookies: [
      ck('NID', MONTHS6, t('Ricorda le preferenze e le informazioni del visitatore per i servizi Google.', 'Remembers visitor preferences and information for Google services.'), { domain: 'google.com' }),
    ],
    transfer: us(DPF),
    keywords: ['map', 'iframe'],
  },
  {
    id: 'spotify',
    label: 'Spotify (embed)',
    provider: 'Spotify AB',
    privacyUrl: 'https://www.spotify.com/legal/privacy-policy/',
    group: 'embeds',
    category: 'experience',
    purpose: t('Mostra brani, playlist e podcast di Spotify incorporati nelle pagine.', 'Shows embedded Spotify tracks, playlists and podcasts.'),
    cookies: [
      ck('sp_t', YEAR1, t('Identificativo del browser per Spotify.', 'Browser identifier for Spotify.'), { domain: 'spotify.com' }),
      ck('sp_landing', DAY1, t('Registra la pagina di arrivo della visita.', 'Records the landing page of the visit.'), { domain: 'spotify.com' }),
    ],
    transfer: us(SCC),
    keywords: ['music', 'podcast', 'iframe'],
  },
  {
    id: 'calendly',
    label: 'Calendly',
    provider: 'Calendly LLC',
    privacyUrl: 'https://calendly.com/privacy',
    group: 'embeds',
    category: 'experience',
    purpose: t('Calendario incorporato per prenotare appuntamenti.', 'Embedded calendar to book appointments.'),
    cookies: [
      ck('__cf_bm', MIN30, t('Protezione dai bot (Cloudflare) sul dominio di Calendly.', 'Bot protection (Cloudflare) on Calendly’s domain.'), { domain: 'calendly.com' }),
    ],
    transfer: us(DPF),
    note: t(
      'Calendly imposta altri cookie propri (sessione, analisi): verifica l’elenco nella sua cookie policy.',
      'Calendly sets other cookies of its own (session, analytics): check the list in its cookie policy.',
    ),
    keywords: ['booking', 'scheduling', 'iframe'],
  },

  // ---- support --------------------------------------------------------------
  {
    id: 'intercom',
    label: 'Intercom',
    provider: 'Intercom R&D Unlimited Company',
    privacyUrl: 'https://www.intercom.com/legal/privacy',
    group: 'support',
    category: 'functionality',
    purpose: t('Chat di assistenza e messaggi ai visitatori.', 'Support chat and messages to visitors.'),
    cookies: [
      ck('^intercom-id-', MONTHS9, t('Identificativo anonimo del visitatore per la chat.', 'Anonymous visitor identifier for the chat.'), pattern),
      ck('^intercom-session-', DAYS7, t('Mantiene la conversazione tra le pagine.', 'Keeps the conversation across pages.'), pattern),
      ck('^intercom-device-id-', MONTHS9, t('Identificativo del dispositivo.', 'Device identifier.'), pattern),
    ],
    transfer: us(DPF),
    note: t(
      'Con l’hosting UE di Intercom i dati sono conservati nell’UE: aggiorna la sezione trasferimenti.',
      'With Intercom EU hosting data is stored in the EU: update the transfer section.',
    ),
    keywords: ['chat', 'helpdesk'],
  },
  {
    id: 'crisp',
    label: 'Crisp',
    provider: 'Crisp IM SAS',
    privacyUrl: 'https://crisp.chat/en/privacy/',
    group: 'support',
    category: 'functionality',
    purpose: t('Chat di assistenza.', 'Support chat.'),
    cookies: [
      ck('^crisp-client', MONTHS6, t('Mantiene la sessione della chat.', 'Keeps the chat session.'), pattern),
    ],
    keywords: ['chat', 'helpdesk'],
  },
  {
    id: 'hubspot',
    label: 'HubSpot (chat)',
    provider: 'HubSpot Ireland Ltd',
    privacyUrl: 'https://legal.hubspot.com/privacy-policy',
    group: 'support',
    category: 'functionality',
    purpose: t('Chat di assistenza e moduli di contatto.', 'Support chat and contact forms.'),
    cookies: [
      ck('messagesUtk', MONTHS6, t('Riconosce i visitatori della chat.', 'Recognises chat visitors.')),
    ],
    transfer: us(DPF),
    note: t(
      'Il codice di tracciamento HubSpot (__hstc, hubspotutk, __hssc) serve ad analisi e marketing: se lo usi, dichiaralo come servizio separato in misurazione o marketing.',
      'The HubSpot tracking code (__hstc, hubspotutk, __hssc) is analytics and marketing: if you use it, declare it as a separate service under measurement or marketing.',
    ),
    keywords: ['chat', 'crm', 'forms'],
  },
  {
    id: 'zendesk',
    label: 'Zendesk',
    provider: 'Zendesk International Ltd',
    privacyUrl: 'https://www.zendesk.com/company/agreements-and-terms/privacy-notice/',
    group: 'support',
    category: 'functionality',
    purpose: t('Widget di assistenza e chat.', 'Support widget and chat.'),
    cookies: [ck('__zlcmid', YEAR1, t('Identificativo del visitatore per la chat.', 'Visitor identifier for the chat.'))],
    transfer: us(DPF),
    keywords: ['chat', 'helpdesk'],
  },

  // ---- payments -------------------------------------------------------------
  {
    id: 'stripe',
    label: 'Stripe',
    provider: 'Stripe Payments Europe Ltd',
    privacyUrl: 'https://stripe.com/privacy',
    group: 'payments',
    category: 'necessary',
    purpose: t('Elabora i pagamenti e previene le frodi.', 'Processes payments and prevents fraud.'),
    cookies: [
      ck('__stripe_mid', YEAR1, t('Prevenzione delle frodi.', 'Fraud prevention.')),
      ck('__stripe_sid', MIN30, t('Prevenzione delle frodi nella sessione.', 'Fraud prevention within the session.')),
      ck('m', YEARS2, t('Prevenzione delle frodi.', 'Fraud prevention.'), { domain: 'm.stripe.com' }),
    ],
    transfer: us(DPF),
    keywords: ['payment', 'checkout'],
  },
  {
    id: 'paypal',
    label: 'PayPal',
    provider: 'PayPal (Europe) S.à r.l. et Cie, S.C.A.',
    privacyUrl: 'https://www.paypal.com/myaccount/privacy/privacyhub',
    group: 'payments',
    category: 'necessary',
    purpose: t('Elabora i pagamenti e previene le frodi.', 'Processes payments and prevents fraud.'),
    cookies: [
      ck('ts', undefined, t('Prevenzione delle frodi.', 'Fraud prevention.'), { domain: 'paypal.com' }),
      ck('x-pp-s', SESSION, t('Sessione del pagamento.', 'Payment session.'), { domain: 'paypal.com' }),
      ck('nsid', SESSION, t('Sessione del pagamento.', 'Payment session.'), { domain: 'paypal.com' }),
    ],
    transfer: us(BCR),
    keywords: ['payment', 'checkout'],
  },

  // ---- security -------------------------------------------------------------
  {
    id: 'recaptcha',
    label: 'Google reCAPTCHA',
    provider: GOOGLE,
    privacyUrl: GOOGLE_PRIVACY,
    group: 'security',
    category: 'necessary',
    purpose: t('Protegge i moduli da spam e abusi automatizzati.', 'Protects forms from spam and automated abuse.'),
    cookies: [
      ck('_GRECAPTCHA', MONTHS6, t('Analisi del rischio per distinguere persone e bot.', 'Risk analysis to tell humans from bots.'), { domain: 'google.com' }),
    ],
    transfer: us(DPF),
    note: t(
      'Classificato come necessario (sicurezza), ma invia dati a Google: indicalo nella privacy policy e valuta di caricarlo solo nelle pagine con moduli.',
      'Classed as necessary (security), but it sends data to Google: mention it in the privacy policy and consider loading it only on pages with forms.',
    ),
    keywords: ['captcha', 'spam'],
  },
  {
    id: 'hcaptcha',
    label: 'hCaptcha',
    provider: 'Intuition Machines, Inc.',
    privacyUrl: 'https://www.hcaptcha.com/privacy',
    group: 'security',
    category: 'necessary',
    purpose: t('Protegge i moduli da spam e abusi automatizzati.', 'Protects forms from spam and automated abuse.'),
    cookies: [
      ck('hc_accessibility', undefined, t('Impostato solo per chi usa l’accesso facilitato di hCaptcha.', 'Set only for visitors who use hCaptcha’s accessibility access.'), { domain: 'hcaptcha.com' }),
    ],
    transfer: us(SCC),
    keywords: ['captcha', 'spam'],
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    provider: 'Cloudflare, Inc.',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
    group: 'infrastructure',
    category: 'necessary',
    purpose: t(
      'Distribuzione dei contenuti (CDN) e protezione da bot e attacchi.',
      'Content delivery (CDN) and protection from bots and attacks.',
    ),
    cookies: [
      ck('__cf_bm', MIN30, t('Distingue il traffico umano dai bot.', 'Tells human traffic from bots.')),
      ck('cf_clearance', t('da 30 minuti a 1 anno (configurabile)', '30 minutes to 1 year (configurable)'), t('Ricorda che il visitatore ha superato una verifica.', 'Remembers that the visitor passed a challenge.')),
      ck('_cfuvid', SESSION, t('Limitazione delle richieste (rate limiting).', 'Rate limiting.')),
    ],
    transfer: us(DPF),
    keywords: ['cdn', 'waf', 'turnstile', 'bot'],
  },
  {
    id: 'sentry',
    label: 'Sentry',
    provider: 'Functional Software, Inc. (Sentry)',
    privacyUrl: 'https://sentry.io/privacy/',
    group: 'infrastructure',
    category: 'necessary',
    purpose: t(
      'Segnala gli errori tecnici del sito per poterli correggere.',
      'Reports technical errors on the site so they can be fixed.',
    ),
    cookies: [],
    transfer: us(DPF),
    note: t(
      'L’SDK di Sentry non imposta cookie. Se attivi Session Replay, che registra le interazioni, valuta di spostarlo in misurazione. Con la regione dati UE di Sentry aggiorna la sezione trasferimenti.',
      'The Sentry SDK sets no cookies. If you enable Session Replay, which records interactions, consider moving it to measurement. With Sentry’s EU data region update the transfer section.',
    ),
    keywords: ['errors', 'monitoring'],
  },
  {
    id: 'easy-cookie',
    label: 'easy-cookie',
    provider: '',
    privacyUrl: '',
    group: 'infrastructure',
    category: 'necessary',
    purpose: t(
      'Ricorda le scelte del visitatore sui cookie e ne conserva la prova.',
      'Remembers the visitor’s cookie choices and keeps proof of them.',
    ),
    cookies: [
      ck('ec_consent', MONTHS6, t('Memorizza le categorie accettate e la revisione della policy.', 'Stores the accepted categories and the policy revision.')),
    ],
    note: t(
      'Cookie di prima parte. La durata segue expiryDays (predefinito 182 giorni): aggiornala se la cambi.',
      'First-party cookie. The duration follows expiryDays (default 182 days): update it if you change that.',
    ),
    keywords: ['consent', 'cookie banner'],
  },
];
