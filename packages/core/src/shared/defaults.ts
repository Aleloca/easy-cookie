import type { CategoryDeclaration, GcmSignal, Texts } from './types';

export const DEFAULT_COOKIE_NAME = 'ec_consent';
export const DEFAULT_EXPIRY_DAYS = 182;
export const DEFAULT_GCM_EVENT = 'easy_cookie_update';
export const DEFAULT_WAIT_FOR_UPDATE = 500;

/** Languages with built-in visitor-facing texts. Any other language falls back to English. */
export const BUILTIN_LANGUAGES = ['it', 'en', 'es', 'fr', 'de', 'pt'] as const;
export type BuiltinLanguage = (typeof BUILTIN_LANGUAGES)[number];

/**
 * Built-in language for `lang`: the exact code, then its base language
 * (`de-AT` → `de`). Undefined when neither has built-in texts.
 */
export function builtinLanguage(lang: string | undefined | null): BuiltinLanguage | undefined {
  if (!lang) return undefined;
  const builtin = BUILTIN_LANGUAGES as readonly string[];
  const l = lang.toLowerCase();
  const base = l.split('-')[0];
  if (builtin.includes(l)) return l as BuiltinLanguage;
  return builtin.includes(base) ? (base as BuiltinLanguage) : undefined;
}

/**
 * Well-known category ids. They match Iubenda's five purposes (1–5) so sites can
 * migrate without renaming, but any id is allowed.
 */
export const KNOWN_CATEGORIES: Record<
  string,
  { gcm: GcmSignal[]; color: string; title: Record<BuiltinLanguage, string>; description: Record<BuiltinLanguage, string> }
> = {
  necessary: {
    gcm: ['security_storage'],
    color: 'var(--ec-c-necessary)',
    title: { it: 'Necessari', en: 'Necessary', es: 'Necesarias', fr: 'Nécessaires', de: 'Notwendig', pt: 'Necessários' },
    description: {
      it: 'Servono al funzionamento del sito, ad esempio per la sessione e per ricordare questa scelta. Non si possono disattivare.',
      en: 'Required for the site to work, for example the session and remembering this choice. They cannot be turned off.',
      es: 'Son imprescindibles para que el sitio funcione, por ejemplo para la sesión y para recordar esta elección. No se pueden desactivar.',
      fr: 'Indispensables au fonctionnement du site, par exemple pour la session et pour mémoriser ce choix. Ils ne peuvent pas être désactivés.',
      de: 'Erforderlich, damit die Website funktioniert, etwa für die Sitzung und um diese Auswahl zu speichern. Sie können nicht deaktiviert werden.',
      pt: 'Indispensáveis ao funcionamento do site, por exemplo para a sessão e para memorizar esta escolha. Não podem ser desativados.',
    },
  },
  functionality: {
    gcm: ['functionality_storage'],
    color: 'var(--ec-c-functionality)',
    title: { it: 'Funzionalità', en: 'Functionality', es: 'Funcionalidad', fr: 'Fonctionnalité', de: 'Funktionalität', pt: 'Funcionalidade' },
    description: {
      it: 'Abilitano funzioni aggiuntive come chat, mappe o preferenze salvate.',
      en: 'Enable extra features such as chat, maps or saved preferences.',
      es: 'Activan funciones adicionales como el chat, los mapas o las preferencias guardadas.',
      fr: 'Permettent des fonctions supplémentaires comme le chat, les cartes ou les préférences enregistrées.',
      de: 'Ermöglichen zusätzliche Funktionen wie Chat, Karten oder gespeicherte Einstellungen.',
      pt: 'Ativam funcionalidades adicionais, como chat, mapas ou preferências guardadas.',
    },
  },
  experience: {
    gcm: ['personalization_storage'],
    color: 'var(--ec-c-experience)',
    title: { it: 'Esperienza', en: 'Experience', es: 'Experiencia', fr: 'Expérience', de: 'Nutzererlebnis', pt: 'Experiência' },
    description: {
      it: 'Contenuti incorporati di terze parti, come video e post social.',
      en: 'Embedded third-party content such as videos and social posts.',
      es: 'Contenido de terceros incorporado, como vídeos y publicaciones en redes sociales.',
      fr: 'Contenus tiers intégrés, comme des vidéos et des publications de réseaux sociaux.',
      de: 'Eingebettete Inhalte von Drittanbietern wie Videos und Social-Media-Beiträge.',
      pt: 'Conteúdos de terceiros incorporados, como vídeos e publicações de redes sociais.',
    },
  },
  measurement: {
    gcm: ['analytics_storage'],
    color: 'var(--ec-c-measurement)',
    title: { it: 'Misurazione', en: 'Measurement', es: 'Medición', fr: 'Mesure', de: 'Messung', pt: 'Medição' },
    description: {
      it: 'Ci aiutano a capire come viene usato il sito, con statistiche sulle visite.',
      en: 'Help us understand how the site is used, through visit statistics.',
      es: 'Nos ayudan a entender cómo se usa el sitio mediante estadísticas de visitas.',
      fr: 'Nous aident à comprendre comment le site est utilisé, grâce à des statistiques de visite.',
      de: 'Helfen uns, anhand von Besuchsstatistiken zu verstehen, wie die Website genutzt wird.',
      pt: 'Ajudam-nos a perceber como o site é utilizado, através de estatísticas de visitas.',
    },
  },
  marketing: {
    gcm: ['ad_storage', 'ad_user_data', 'ad_personalization'],
    color: 'var(--ec-c-marketing)',
    title: { it: 'Marketing', en: 'Marketing', es: 'Marketing', fr: 'Marketing', de: 'Marketing', pt: 'Marketing' },
    description: {
      it: 'Servono a misurare le campagne e a mostrarti pubblicità più pertinente, anche su altri siti.',
      en: 'Measure campaigns and show you more relevant ads, including on other sites.',
      es: 'Sirven para medir las campañas y mostrarte publicidad más relevante, también en otros sitios.',
      fr: 'Servent à mesurer les campagnes et à vous montrer des publicités plus pertinentes, y compris sur d’autres sites.',
      de: 'Dienen dazu, Kampagnen zu messen und Ihnen relevantere Werbung anzuzeigen, auch auf anderen Websites.',
      pt: 'Servem para medir campanhas e mostrar-lhe publicidade mais relevante, incluindo noutros sites.',
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

/** Built-in texts. `resolveTexts` falls back to English for other languages. */
export const DEFAULT_TEXTS: Record<BuiltinLanguage, Texts> = {
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
      legendAlways: 'sempre attivi',
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
      legendAlways: 'always on',
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
  es: {
    banner: {
      title: 'Solo usamos cookies si estás de acuerdo',
      description:
        'Las cookies necesarias hacen que el sitio funcione. Con tu consentimiento usamos también las demás categorías que aparecen a continuación. Puedes cambiar de opinión cuando quieras desde «Preferencias de cookies».',
      acceptAll: 'Aceptar todas',
      rejectAll: 'Rechazar todas',
      customize: 'Personalizar',
      close: 'Cerrar y rechazar las cookies no necesarias',
      policyLink: 'Política de cookies',
      legendOn: 'activas',
      legendOff: 'desactivadas',
      legendAlways: 'siempre activas',
    },
    preferences: {
      title: 'Preferencias de cookies',
      intro:
        'Elige qué categorías activar. Las que dejes desactivadas permanecen bloqueadas hasta que las actives. Puedes volver aquí en cualquier momento.',
      acceptAll: 'Aceptar todas',
      rejectAll: 'Rechazar todas',
      save: 'Guardar selección',
      close: 'Cerrar',
      alwaysOn: 'Siempre activas',
      services: 'Servicios',
      serviceCounter: 'servicio|servicios',
      cookieName: 'Cookie',
      cookieDuration: 'Duración',
      cookieDescription: 'Finalidad',
      provider: 'Proveedor',
      privacyPolicy: 'Política de privacidad',
      noCookies: 'No se ha declarado ninguna cookie.',
    },
    reopen: { label: 'Preferencias de cookies' },
    embed: {
      blocked: 'Este contenido de {service} está bloqueado hasta que aceptes las cookies de «{category}».',
      enable: 'Mostrar el contenido',
      enableAlways: 'Activar siempre «{category}»',
    },
    errors: { logFailed: 'No hemos podido registrar tu elección. Inténtalo de nuevo.' },
  },
  fr: {
    banner: {
      title: 'Nous n’utilisons des cookies qu’avec votre accord',
      description:
        'Les cookies nécessaires assurent le fonctionnement du site. Avec votre consentement, nous utilisons aussi les autres catégories ci-dessous. Vous pouvez changer d’avis à tout moment depuis « Préférences cookies ».',
      acceptAll: 'Tout accepter',
      rejectAll: 'Tout refuser',
      customize: 'Personnaliser',
      close: 'Fermer et refuser les cookies non nécessaires',
      policyLink: 'Politique de cookies',
      legendOn: 'activés',
      legendOff: 'désactivés',
      legendAlways: 'toujours actifs',
    },
    preferences: {
      title: 'Préférences cookies',
      intro:
        'Choisissez les catégories à activer. Celles qui restent désactivées sont bloquées jusqu’à ce que vous les activiez. Vous pouvez revenir ici à tout moment.',
      acceptAll: 'Tout accepter',
      rejectAll: 'Tout refuser',
      save: 'Enregistrer mes choix',
      close: 'Fermer',
      alwaysOn: 'Toujours actifs',
      services: 'Services',
      serviceCounter: 'service|services',
      cookieName: 'Cookie',
      cookieDuration: 'Durée',
      cookieDescription: 'Finalité',
      provider: 'Fournisseur',
      privacyPolicy: 'Politique de confidentialité',
      noCookies: 'Aucun cookie déclaré.',
    },
    reopen: { label: 'Préférences cookies' },
    embed: {
      blocked: 'Ce contenu {service} est bloqué tant que vous n’acceptez pas les cookies « {category} ».',
      enable: 'Afficher le contenu',
      enableAlways: 'Toujours activer « {category} »',
    },
    errors: { logFailed: 'Nous n’avons pas pu enregistrer votre choix. Veuillez réessayer.' },
  },
  de: {
    banner: {
      title: 'Wir verwenden Cookies nur mit Ihrer Zustimmung',
      description:
        'Notwendige Cookies sorgen dafür, dass die Website funktioniert. Mit Ihrer Einwilligung verwenden wir auch die anderen unten aufgeführten Kategorien. Sie können Ihre Entscheidung jederzeit unter „Cookie-Einstellungen“ ändern.',
      acceptAll: 'Alle akzeptieren',
      rejectAll: 'Alle ablehnen',
      customize: 'Einstellungen',
      close: 'Schließen und nicht notwendige Cookies ablehnen',
      policyLink: 'Cookie-Richtlinie',
      legendOn: 'aktiv',
      legendOff: 'inaktiv',
      legendAlways: 'immer aktiv',
    },
    preferences: {
      title: 'Cookie-Einstellungen',
      intro:
        'Wählen Sie, welche Kategorien Sie aktivieren möchten. Deaktivierte Kategorien bleiben blockiert, bis Sie sie aktivieren. Sie können jederzeit hierher zurückkehren.',
      acceptAll: 'Alle akzeptieren',
      rejectAll: 'Alle ablehnen',
      save: 'Auswahl speichern',
      close: 'Schließen',
      alwaysOn: 'Immer aktiv',
      services: 'Dienste',
      serviceCounter: 'Dienst|Dienste',
      cookieName: 'Cookie',
      cookieDuration: 'Speicherdauer',
      cookieDescription: 'Zweck',
      provider: 'Anbieter',
      privacyPolicy: 'Datenschutzerklärung',
      noCookies: 'Keine Cookies angegeben.',
    },
    reopen: { label: 'Cookie-Einstellungen' },
    embed: {
      blocked: 'Dieser Inhalt von {service} ist blockiert, bis Sie Cookies der Kategorie „{category}“ akzeptieren.',
      enable: 'Inhalt anzeigen',
      enableAlways: '„{category}“ immer aktivieren',
    },
    errors: { logFailed: 'Ihre Auswahl konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.' },
  },
  pt: {
    banner: {
      title: 'Só utilizamos cookies com o seu consentimento',
      description:
        'Os cookies necessários permitem que o site funcione. Com o seu consentimento, utilizamos também as outras categorias abaixo. Pode mudar de ideias a qualquer momento em «Preferências de cookies».',
      acceptAll: 'Aceitar todos',
      rejectAll: 'Rejeitar todos',
      customize: 'Personalizar',
      close: 'Fechar e rejeitar os cookies não necessários',
      policyLink: 'Política de cookies',
      legendOn: 'ativos',
      legendOff: 'desativados',
      legendAlways: 'sempre ativos',
    },
    preferences: {
      title: 'Preferências de cookies',
      intro:
        'Escolha as categorias que pretende ativar. As que ficarem desativadas permanecem bloqueadas até as ativar. Pode voltar aqui a qualquer momento.',
      acceptAll: 'Aceitar todos',
      rejectAll: 'Rejeitar todos',
      save: 'Guardar escolhas',
      close: 'Fechar',
      alwaysOn: 'Sempre ativos',
      services: 'Serviços',
      serviceCounter: 'serviço|serviços',
      cookieName: 'Cookie',
      cookieDuration: 'Duração',
      cookieDescription: 'Finalidade',
      provider: 'Fornecedor',
      privacyPolicy: 'Política de privacidade',
      noCookies: 'Nenhum cookie declarado.',
    },
    reopen: { label: 'Preferências de cookies' },
    embed: {
      blocked: 'Este conteúdo de {service} está bloqueado até aceitar os cookies de «{category}».',
      enable: 'Mostrar o conteúdo',
      enableAlways: 'Ativar sempre «{category}»',
    },
    errors: { logFailed: 'Não foi possível registar a sua escolha. Tente novamente.' },
  },
};
