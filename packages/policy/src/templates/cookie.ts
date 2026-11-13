import type { LegalTranslation } from '../legal';

/** Built-in cookie policy template. A starting draft, not legal advice. */
export const cookie: Record<'it' | 'en', LegalTranslation> = {
  it: {
    title: 'Cookie policy',
    body: `[[BOZZA: questo testo è un modello generico, non è una consulenza legale. Completa i campi evidenziati, verifica che l’elenco dei cookie corrisponda a quello che il sito usa davvero e fallo controllare da un professionista prima di pubblicarlo. Poi elimina questa riga.]]

Questa pagina spiega quali cookie e strumenti simili usa {{site.domain}}, a cosa servono e come puoi gestire il tuo consenso.

## Cosa sono i cookie

I cookie sono piccoli file di testo che un sito salva nel tuo browser per ricordare informazioni sulla tua visita. Strumenti simili, come il local storage, i pixel e gli script di terze parti, funzionano in modo analogo: in questa pagina li chiamiamo tutti «cookie».

I cookie possono essere **di prima parte**, se li imposta questo sito, o **di terze parti**, se li impostano altri servizi, ad esempio un video incorporato o uno strumento di statistica.

## Come li usiamo

Secondo l’art. 122 del Codice privacy e le linee guida del Garante per la protezione dei dati personali del 10 giugno 2021:

- i **cookie tecnici** (necessari) sono usati senza il tuo consenso, perché servono a far funzionare il sito e a ricordare le tue scelte;
- tutti gli **altri cookie** sono attivati solo dopo il tuo consenso. Fino ad allora sono bloccati.

Chiudere il banner con la X equivale a rifiutare i cookie non necessari.

## Categorie

- **Necessari**: servono al funzionamento del sito, ad esempio per la sessione e per ricordare la tua scelta sui cookie. Non si possono disattivare.
- **Funzionalità**: abilitano funzioni aggiuntive come la chat di assistenza o le preferenze salvate.
- **Esperienza**: permettono di mostrare contenuti di terze parti incorporati, come video e mappe.
- **Misurazione**: ci aiutano a capire come viene usato il sito, con statistiche sulle visite.
- **Marketing**: servono a misurare le campagne pubblicitarie e a mostrarti annunci più pertinenti, anche su altri siti.

Il sito usa solo le categorie elencate nella tabella qui sotto.

## Cookie usati su questo sito

{{cookie-table}}

I cookie di terze parti sono gestiti dai rispettivi fornitori: per sapere come trattano i dati consulta le loro informative, collegate nella tabella.

## Come gestire il consenso

Alla prima visita un banner ti chiede di scegliere: puoi accettare tutti i cookie, rifiutarli tutti o scegliere categoria per categoria. Ricordiamo la tua scelta per [[Durata del consenso, ad esempio 6 mesi]], poi te la chiediamo di nuovo. Te la chiediamo di nuovo anche se cambiano in modo rilevante i cookie che usiamo.

Puoi cambiare idea in qualsiasi momento: {{preferences-link}}. Quando revochi il consenso, i cookie della categoria vengono cancellati, dove tecnicamente possibile.

## Impostazioni del browser

Puoi anche bloccare o cancellare i cookie dalle impostazioni del browser. Bloccare i cookie necessari può impedire ad alcune parti del sito di funzionare.

- [Google Chrome](https://support.google.com/chrome/answer/95647)
- [Mozilla Firefox](https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox)
- [Apple Safari](https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac)
- [Microsoft Edge](https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

## Titolare del trattamento

Il titolare del trattamento è [[Ragione sociale o nome e cognome del titolare]], [[Indirizzo completo]], [[Indirizzo email di contatto]]. Per sapere come trattiamo i dati personali e come esercitare i tuoi diritti leggi l’informativa sulla privacy: [[Link all’informativa sulla privacy]].

## Ultimo aggiornamento

{{last-updated}}
`,
  },
  en: {
    title: 'Cookie policy',
    body: `[[DRAFT: this text is a generic template, not legal advice. Fill in the highlighted fields, check that the list of cookies matches what the site really uses and have it reviewed by a professional before publishing it. Then delete this line.]]

This page explains which cookies and similar technologies {{site.domain}} uses, what they are for and how you can manage your consent.

## What cookies are

Cookies are small text files that a site stores in your browser to remember information about your visit. Similar technologies, such as local storage, pixels and third-party scripts, work in a similar way: on this page we call them all “cookies”.

Cookies can be **first-party**, when this site sets them, or **third-party**, when other services set them, for example an embedded video or an analytics tool.

## How we use them

In line with the ePrivacy Directive and, in Italy, the guidelines of the Italian Data Protection Authority (Garante) of 10 June 2021:

- **technical** (necessary) cookies are used without your consent, because the site needs them to work and to remember your choices;
- all **other cookies** are turned on only after you consent. Until then they are blocked.

Closing the banner with the X counts as rejecting non-essential cookies.

## Categories

- **Necessary**: required for the site to work, for example for the session and to remember your cookie choice. They cannot be turned off.
- **Functionality**: enable extra features such as the support chat or saved preferences.
- **Experience**: allow embedded third-party content such as videos and maps.
- **Measurement**: help us understand how the site is used, through visit statistics.
- **Marketing**: measure advertising campaigns and show you more relevant ads, including on other sites.

The site uses only the categories listed in the table below.

## Cookies used on this site

{{cookie-table}}

Third-party cookies are managed by their providers: to learn how they process data, read their policies, linked in the table.

## Managing your consent

On your first visit a banner asks you to choose: you can accept all cookies, reject them all or choose category by category. We remember your choice for [[Consent duration, for example 6 months]], then we ask again. We also ask again if the cookies we use change significantly.

You can change your mind at any time: {{preferences-link}}. When you withdraw consent, the cookies of that category are deleted where technically possible.

## Browser settings

You can also block or delete cookies in your browser settings. Blocking necessary cookies may stop parts of the site from working.

- [Google Chrome](https://support.google.com/chrome/answer/95647)
- [Mozilla Firefox](https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox)
- [Apple Safari](https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac)
- [Microsoft Edge](https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

## Data controller

The data controller is [[Company name or full name of the controller]], [[Full address]], [[Contact email]]. To learn how we process personal data and how to exercise your rights, read the privacy policy: [[Link to the privacy policy]].

## Last updated

{{last-updated}}
`,
  },
};
