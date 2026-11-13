/** Landing copy, Italian first. Facts only: no adoption numbers, testimonials or benchmarks. */

/** Revision of the sample config; its stamp (r26-11-13) signs the first viewport. */
export const configRevision = '2026-11-13';
export const configStamp = `r${configRevision.slice(2)}`;

export const configSnippet = `export default defineConfig({
  revision: '${configRevision}',
  policyUrl: '/cookie-policy',
  googleConsentMode: { enabled: true },
  log: { endpoint: 'https://consent.example.com',
         siteKey: 'pk_live_xxx' },
  categories: {
    necessary: { readOnly: true },
    measurement: {},
    marketing: {},
  },
  services: {
    ga4: { category: 'measurement',
           provider: 'Google Ireland Ltd',
           cookies: [{ name: '^_ga', pattern: true }] },
  },
});`;

export const installSnippets = {
  embed: `<head>
  <script src="https://consent.example.com/v1/sites/pk_live_xxx/embed.js"></script>
  <!-- poi Google Tag Manager -->
</head>`,
  npm: `pnpm add @easy-cookie/core

import EasyCookie from '@easy-cookie/core';
import '@easy-cookie/core/style.css';
import config from './easy-cookie.config';

EasyCookie.run(config);`,
  next: `// app/layout.tsx
import { EasyCookieHead, EasyCookieProvider } from '@easy-cookie/next';
import config from '../easy-cookie.config';
import '@easy-cookie/core/style.css';

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head><EasyCookieHead config={config} />{/* prima di GTM */}</head>
      <body><EasyCookieProvider config={config}>{children}</EasyCookieProvider></body>
    </html>
  );
}`,
};

export type Lang = 'it' | 'en';

export const copy = {
  it: {
    title: 'easy-cookie · consenso cookie open source e self-hosted',
    description:
      "Alternativa open source (MIT) e self-hosted a Iubenda: banner, blocco preventivo, Google Consent Mode v2, registro dei consensi e cookie policy da una sola configurazione.",
    nav: { docs: 'Documentazione', start: 'Avvio rapido', github: 'GitHub', other: 'English', otherHref: '/en/', otherLang: 'en' },
    h1: 'Il consenso ai cookie, da una sola configurazione.',
    lede:
      "easy-cookie è l'alternativa open source e self-hosted a Iubenda. Un file genera il banner, blocca gli script finché il visitatore non sceglie, informa Google Consent Mode v2, registra ogni scelta sul tuo server e compila la tabella della cookie policy.",
    ctaDemo: 'Prova il banner',
    ctaStart: 'Avvio rapido',
    terms: 'Licenza MIT · nessun abbonamento · lo ospiti tu',
    spreadLeft: 'easy-cookie.config.ts',
    spreadRight: 'Cosa ne esce',
    outputs: [
      { keys: 'categories · texts', title: 'Banner e preferenze', body: 'Accetta e Rifiuta con lo stesso peso, la X vale come rifiuto, categorie spente per default. In italiano e inglese.' },
      { keys: 'services', title: 'Blocco preventivo', body: 'Script e iframe partono solo dopo il consenso. Alla revoca i loro cookie vengono cancellati.' },
      { keys: 'categories[].gcm', title: 'Google Consent Mode v2', body: 'Il default giusto in <head> prima di GTM, poi update ed evento easy_cookie_update a ogni scelta.' },
      { keys: 'revision · log', title: 'Registro dei consensi', body: 'Ogni scelta diventa una voce con data e revisione, sul tuo server. IP solo come hash.' },
      { keys: 'services[].cookies', title: 'Cookie policy', body: 'La tabella dei cookie generata dalla stessa fonte: non può divergere dal banner.' },
    ],
    demoH2: 'Prova il banner vero',
    demoLede:
      'Qui sotto c\'è una pagina di esempio con il runtime di easy-cookie, senza ritocchi. Scegli come vuoi: accanto vedi cosa succede, nell\'ordine in cui succede.',
    demoFrameTitle: 'Demo: pagina di esempio con il banner di easy-cookie',
    demoReset: 'Riapri il banner di prova',
    demoLogTitle: 'Registro della demo',
    demoLogEmpty: 'In attesa della pagina di esempio…',
    demoNote:
      'Questo sito non imposta cookie di profilazione né di statistica. La demo salva solo un cookie tecnico, ec_demo, valido per la sua pagina, per ricordare la scelta di prova. Nessun dato lascia il tuo browser: i servizi della demo non vengono caricati davvero e nessun record viene inviato.',
    log: {
      default: 'Consent Mode · default',
      update: 'Consent Mode · update',
      event: 'dataLayer · easy_cookie_update',
      blocked: 'Script bloccati in attesa',
      ran: 'Script eseguito',
      record: 'Record per il registro',
      replay: 'Scelta salvata riapplicata',
      ready: 'Banner pronto',
    },
    registerH2: 'Ogni scelta, una voce nel registro',
    registerLede:
      'Il server dei consensi conserva una prova per ogni scelta, come un libretto: data, revisione della configurazione mostrata, metodo, categorie. Le voci non si correggono: una nuova scelta è una nuova voce, la revoca è una voce timbrata.',
    registerCaption: 'Estratto del registro di un sito',
    registerExample: 'Esempio · dati sintetici',
    registerCols: ['Timbro', 'Consent ID', 'Metodo', 'Categorie', 'Utente', 'Hash IP'],
    registerLegend: 'Quadrati, da sinistra: necessari, esperienza, misurazione, marketing. Pieno = concesso.',
    methods: { accept_all: 'accetta tutti', reject_all: 'rifiuta tutti', custom: 'personalizzato', close: 'chiuso (X)', withdraw: 'revoca' },
    registerPoints: [
      { title: 'Art. 7.1 GDPR', body: 'Dimostri il consenso con la scelta, il momento e la revisione esatta della configurazione presentata.' },
      { title: 'IP solo come hash', body: 'sha256 con un sale diverso per sito. Nessun IP in chiaro, nessun cookie dal server.' },
      { title: 'Art. 15 e 17', body: 'Accesso e cancellazione per utente con due chiamate autenticate, o dalla console.' },
    ],
    registerLink: 'Come funziona il registro',
    complianceH2: 'Conforme per costruzione',
    complianceLede:
      'Le regole del Garante (2021) e dell\'EDPB che riguardano il banner non sono opzioni da attivare: sono il comportamento del software, e chi integra non può sbagliarle.',
    complianceCols: ['Requisito', 'Come lo rispetta easy-cookie'],
    compliance: [
      ['Accettare e rifiutare con la stessa evidenza', 'Due metà uguali della stessa griglia, stesso stile, al primo livello.'],
      ['Chiudere non è accettare', 'La X registra un rifiuto, con metodo close.'],
      ['Lo scroll non è consenso', 'Il consenso nasce solo da un comando esplicito.'],
      ['Nessuna casella preselezionata', 'Ogni categoria non necessaria parte spenta.'],
      ['Nessun tracciante prima della scelta', 'Script e iframe marcati restano fermi; Consent Mode parte tutto negato.'],
      ['Revocare facile quanto accettare', 'Pulsante sempre disponibile; alla revoca cookie cancellati e update a Google.'],
      ['Non ripresentare il banner prima di 6 mesi', 'Scadenza predefinita 182 giorni; prima solo se cambi la revisione.'],
      ['Poter dimostrare il consenso', 'Registro append-only con la revisione accettata.'],
    ],
    complianceNote:
      'Resta a te marcare ogni tag di terze parti, scrivere il testo della policy e decidere la conservazione dei dati. Non è consulenza legale.',
    complianceLink: 'La checklist completa, punto per punto',
    compareH2: 'easy-cookie e Iubenda',
    compareLede:
      'Iubenda è un servizio completo e collaudato. easy-cookie ne copre solo la parte cookie e consensi, con un modello diverso: il codice è tuo e gira sui tuoi server.',
    compareCols: ['', 'Iubenda', 'easy-cookie'],
    compare: [
      ['Modello', 'Servizio SaaS, codice chiuso', 'Software libero, licenza MIT'],
      ['Costo', 'Abbonamento secondo il piano', 'Nessuna licenza: paghi solo l\'hosting'],
      ['Configurazione e registro', 'Sui server di Iubenda', 'Sul tuo server, su Postgres'],
      ['Banner, preferenze, blocco preventivo', 'Sì', 'Sì, con markup dichiarato'],
      ['Blocco automatico dei domini noti', 'Sì', 'No'],
      ['Google Consent Mode v2', 'Sì', 'Sì'],
      ['Prova del consenso', 'Consent Database', 'Server dei consensi self-hosted'],
      ['Segnaposto per iframe bloccati', 'Non standard', 'Sì'],
      ['Cookie policy', 'Generatore di privacy e cookie policy', 'Solo la tabella dei cookie'],
      ['IAB TCF, normative extra-UE, geolocalizzazione', 'Sì', 'No'],
      ['Lingue del banner', 'Molte', 'Italiano e inglese, ogni testo sovrascrivibile'],
    ],
    compareLink: 'Guida alla migrazione da Iubenda',
    installH2: 'Installazione',
    installLede: 'Tre percorsi, la stessa configurazione. Lo snippet di Consent Mode va sempre prima di Google Tag Manager.',
    install: [
      { key: 'embed', title: 'Un tag dal server dei consensi', body: 'Configurazione gestita dalla console e pubblicata come revisione, come con Iubenda.', lang: 'html' },
      { key: 'npm', title: 'npm o tag script', body: 'Configurazione nel repository, versionata con il codice.', lang: 'ts' },
      { key: 'next', title: 'Next.js App Router', body: 'Con @easy-cookie/next e @easy-cookie/react, lettura del consenso anche lato server.', lang: 'tsx' },
    ],
    installLink: 'Avvio rapido completo',
    footer: {
      about: 'easy-cookie è software libero con licenza MIT. Costruito su un fork di vanilla-cookieconsent (MIT, © Orest Bida).',
      cookies: 'Questo sito non imposta cookie di profilazione né di statistica.',
      repo: 'Codice sorgente su GitHub',
      repoNote: 'indirizzo provvisorio',
      docs: 'Documentazione',
      legal: 'La documentazione non è consulenza legale.',
    },
  },
  en: {
    title: 'easy-cookie · open-source, self-hosted cookie consent',
    description:
      'Open-source (MIT), self-hosted alternative to Iubenda: banner, prior blocking, Google Consent Mode v2, proof-of-consent register and cookie policy from one config.',
    nav: { docs: 'Docs (Italian)', start: 'Quick start', github: 'GitHub', other: 'Italiano', otherHref: '/', otherLang: 'it' },
    h1: 'Cookie consent, from one config.',
    lede:
      'easy-cookie is the open-source, self-hosted alternative to Iubenda. One file generates the banner, blocks scripts until the visitor chooses, drives Google Consent Mode v2, records every choice on your server and fills in the cookie policy table.',
    ctaDemo: 'Try the banner',
    ctaStart: 'Quick start',
    terms: 'MIT licence · no subscription · you host it',
    spreadLeft: 'easy-cookie.config.ts',
    spreadRight: 'What comes out',
    outputs: [
      { keys: 'categories · texts', title: 'Banner and preferences', body: 'Accept and Reject carry equal weight, the X counts as a rejection, categories are off by default. Italian and English.' },
      { keys: 'services', title: 'Prior blocking', body: 'Scripts and iframes run only after consent. On withdrawal their cookies are cleared.' },
      { keys: 'categories[].gcm', title: 'Google Consent Mode v2', body: 'The right default in <head> before GTM, then an update and an easy_cookie_update event on every choice.' },
      { keys: 'revision · log', title: 'Consent register', body: 'Every choice becomes an entry with date and revision, on your server. IPs stored only as hashes.' },
      { keys: 'services[].cookies', title: 'Cookie policy', body: 'The cookie table generated from the same source, so it cannot drift from the banner.' },
    ],
    demoH2: 'Try the real banner',
    demoLede:
      'Below is an example page running the easy-cookie runtime, untouched. Choose whatever you like: the log beside it shows what happens, in order.',
    demoFrameTitle: 'Demo: example page with the easy-cookie banner',
    demoReset: 'Reopen the demo banner',
    demoLogTitle: 'Demo log',
    demoLogEmpty: 'Waiting for the example page…',
    demoNote:
      'This site sets no profiling or analytics cookies. The demo only stores a technical cookie, ec_demo, scoped to its own page, to remember your test choice. No data leaves your browser: the demo services are never actually loaded and no record is sent.',
    log: {
      default: 'Consent Mode · default',
      update: 'Consent Mode · update',
      event: 'dataLayer · easy_cookie_update',
      blocked: 'Scripts held back',
      ran: 'Script executed',
      record: 'Record for the register',
      replay: 'Stored choice re-applied',
      ready: 'Banner ready',
    },
    registerH2: 'Every choice, an entry in the register',
    registerLede:
      'The consent server keeps proof of every choice, like a passbook: date, revision of the config that was shown, method, categories. Entries are never corrected: a new choice is a new entry, a withdrawal is a stamped entry.',
    registerCaption: 'Excerpt from a site register',
    registerExample: 'Example · synthetic data',
    registerCols: ['Stamp', 'Consent ID', 'Method', 'Categories', 'User', 'IP hash'],
    registerLegend: 'Squares, left to right: necessary, experience, measurement, marketing. Filled = granted.',
    methods: { accept_all: 'accept all', reject_all: 'reject all', custom: 'custom', close: 'closed (X)', withdraw: 'withdrawal' },
    registerPoints: [
      { title: 'GDPR art. 7.1', body: 'Prove consent with the choice, the moment and the exact config revision that was shown.' },
      { title: 'IPs only as hashes', body: 'sha256 with a per-site salt. No raw IP, no cookies set by the server.' },
      { title: 'Art. 15 and 17', body: 'Access and erasure per user with two authenticated calls, or from the console.' },
    ],
    registerLink: 'How the register works (Italian)',
    complianceH2: 'Compliant by construction',
    complianceLede:
      'The Italian Garante (2021) and EDPB rules about the banner are not options to switch on: they are how the software behaves, and integrators cannot get them wrong.',
    complianceCols: ['Requirement', 'How easy-cookie meets it'],
    compliance: [
      ['Accept and reject equally prominent', 'Two equal halves of one grid, same style, on the first layer.'],
      ['Closing is not accepting', 'The X records a rejection, with method close.'],
      ['Scrolling is not consent', 'Consent comes only from an explicit control.'],
      ['No pre-ticked boxes', 'Every non-necessary category starts off.'],
      ['No trackers before the choice', 'Marked scripts and iframes stay idle; Consent Mode starts all denied.'],
      ['Withdrawing as easy as consenting', 'Always-available button; on withdrawal cookies are cleared and Google is updated.'],
      ['No re-prompt before 6 months', 'Default expiry 182 days; earlier only when you change the revision.'],
      ['Able to prove consent', 'Append-only register with the accepted revision.'],
    ],
    complianceNote:
      'Marking every third-party tag, writing the policy text and choosing data retention remain your job. This is not legal advice.',
    complianceLink: 'The full checklist (Italian)',
    compareH2: 'easy-cookie and Iubenda',
    compareLede:
      'Iubenda is a complete, established service. easy-cookie covers only its cookie and consent part, with a different model: the code is yours and runs on your servers.',
    compareCols: ['', 'Iubenda', 'easy-cookie'],
    compare: [
      ['Model', 'SaaS, closed source', 'Free software, MIT licence'],
      ['Cost', 'Subscription by plan', 'No licence fee: you only pay for hosting'],
      ['Config and register', 'On Iubenda\'s servers', 'On your server, in Postgres'],
      ['Banner, preferences, prior blocking', 'Yes', 'Yes, with declared markup'],
      ['Automatic blocking of known domains', 'Yes', 'No'],
      ['Google Consent Mode v2', 'Yes', 'Yes'],
      ['Proof of consent', 'Consent Database', 'Self-hosted consent server'],
      ['Placeholders for blocked iframes', 'Not standard', 'Yes'],
      ['Cookie policy', 'Privacy and cookie policy generator', 'The cookie table only'],
      ['IAB TCF, non-EU regimes, geolocation', 'Yes', 'No'],
      ['Banner languages', 'Many', 'Italian and English, every string overridable'],
    ],
    compareLink: 'Migrating from Iubenda (Italian)',
    installH2: 'Install',
    installLede: 'Three paths, one config. The Consent Mode snippet always goes before Google Tag Manager.',
    install: [
      { key: 'embed', title: 'One tag from the consent server', body: 'Config managed in the console and published as revisions, as with Iubenda.', lang: 'html' },
      { key: 'npm', title: 'npm or script tag', body: 'Config in your repository, versioned with the code.', lang: 'ts' },
      { key: 'next', title: 'Next.js App Router', body: 'With @easy-cookie/next and @easy-cookie/react, consent readable on the server too.', lang: 'tsx' },
    ],
    installLink: 'Full quick start (Italian)',
    footer: {
      about: 'easy-cookie is free software under the MIT licence. Built on a fork of vanilla-cookieconsent (MIT, © Orest Bida).',
      cookies: 'This site sets no profiling or analytics cookies.',
      repo: 'Source code on GitHub',
      repoNote: 'placeholder address',
      docs: 'Documentation (Italian)',
      legal: 'The documentation is not legal advice.',
    },
  },
} as const;

/** Synthetic register rows, newest first. Categories: necessary, experience, measurement, marketing. */
export const registerRows = [
  { date: '2026-11-13', time: '09:41', rev: '2026-11-13', id: '8f14e45f…3b91', method: 'withdraw', cats: [1, 0, 0, 0], user: 'user_4821', ip: 'a3f1…9c0e' },
  { date: '2026-11-13', time: '09:38', rev: '2026-11-13', id: '2c9d71b0…77aa', method: 'close', cats: [1, 0, 0, 0], user: '—', ip: '51be…02d4' },
  { date: '2026-11-12', time: '21:07', rev: '2026-11-13', id: '6e0a33c2…e815', method: 'custom', cats: [1, 1, 1, 0], user: '—', ip: 'c7d2…4a1b' },
  { date: '2026-11-12', time: '18:52', rev: '2026-11-13', id: 'b41f08d9…0c3e', method: 'reject_all', cats: [1, 0, 0, 0], user: '—', ip: '0e9a…f7c2' },
  { date: '2026-11-12', time: '18:30', rev: '2026-11-13', id: '8f14e45f…3b91', method: 'accept_all', cats: [1, 1, 1, 1], user: 'user_4821', ip: 'a3f1…9c0e' },
  { date: '2026-10-02', time: '11:15', rev: '2026-09-30', id: 'd19e5a47…6b02', method: 'custom', cats: [1, 0, 1, 0], user: '—', ip: '7b3c…e1d9' },
] as const;
