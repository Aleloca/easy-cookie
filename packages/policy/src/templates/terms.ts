import type { LegalTranslation } from '../legal';

/** Built-in terms of use skeleton. A starting draft, not legal advice. */
export const terms: Record<'it' | 'en', LegalTranslation> = {
  it: {
    title: 'Termini e condizioni',
    body: `[[BOZZA: questo testo è uno schema generico, non è una consulenza legale. Termini e condizioni dipendono molto dall’attività: completa i campi evidenziati, elimina le sezioni che non ti riguardano e fallo verificare da un professionista prima di pubblicarlo. Poi elimina questa riga.]]

## 1. Oggetto

Questi termini regolano l’uso del sito {{site.domain}} e dei servizi offerti da {{site.name}} (di seguito «Servizio»). Usando il Servizio accetti questi termini. Se non li accetti, non usare il Servizio.

## 2. Chi siamo

Il Servizio è gestito da [[Ragione sociale o nome e cognome]], con sede in [[Indirizzo completo]], P. IVA [[Partita IVA]], email [[Indirizzo email di contatto]], [[PEC, se disponibile]].

## 3. Descrizione del Servizio

[[Descrivi in modo semplice cosa offre il sito o il servizio, a chi si rivolge e se è gratuito o a pagamento.]]

## 4. Uso consentito

Ti impegni a usare il Servizio nel rispetto della legge e di questi termini. In particolare non puoi:

- usarlo per attività illecite o per violare diritti altrui;
- tentare di accedere senza autorizzazione a sistemi, account o dati;
- comprometterne il funzionamento, ad esempio con attacchi automatizzati o carichi eccessivi;
- [[Altri divieti specifici del tuo Servizio]].

## 5. Account

[[Se il Servizio prevede un account: requisiti per registrarsi (ad esempio l’età minima), responsabilità per la custodia delle credenziali, modalità di chiusura dell’account. Altrimenti elimina questa sezione.]]

## 6. Prezzi e pagamenti

[[Se il Servizio è a pagamento: prezzi (IVA inclusa o esclusa), modalità di pagamento, rinnovi e disdetta, fatturazione. Altrimenti elimina questa sezione.]]

## 7. Diritto di recesso

[[Se vendi a consumatori a distanza: indica le condizioni del diritto di recesso previsto dal Codice del consumo (d.lgs. 206/2005), di regola 14 giorni, e le eventuali esclusioni. Altrimenti elimina questa sezione.]]

## 8. Proprietà intellettuale

Testi, immagini, marchi, loghi, software e altri contenuti del Servizio appartengono a [[Ragione sociale o nome e cognome]] o ai rispettivi titolari e sono protetti dalla legge. Non puoi copiarli, modificarli o distribuirli senza autorizzazione scritta, salvo i casi consentiti dalla legge.

## 9. Contenuti degli utenti

[[Se gli utenti possono pubblicare contenuti: chi ne resta titolare, quale licenza ci concedono, regole sui contenuti vietati e come li rimuoviamo. Altrimenti elimina questa sezione.]]

## 10. Link a siti di terzi

Il Servizio può contenere link a siti di terzi. Non controlliamo questi siti e non siamo responsabili dei loro contenuti o delle loro pratiche sulla privacy.

## 11. Disponibilità e modifiche del Servizio

Facciamo il possibile perché il Servizio sia disponibile e funzioni correttamente, ma potrebbe essere interrotto per manutenzione, aggiornamenti o cause indipendenti dalla nostra volontà. Possiamo modificare o sospendere il Servizio, dandone [[Modalità e tempi di preavviso]] quando la modifica ti riguarda in modo rilevante.

## 12. Responsabilità

Nei limiti consentiti dalla legge, non siamo responsabili per danni indiretti derivanti dall’uso o dall’impossibilità di usare il Servizio. Nulla in questi termini esclude o limita la responsabilità che per legge non può essere esclusa o limitata, né i diritti che la legge riconosce ai consumatori.

[[Eventuali limitazioni ulteriori, da verificare con un professionista.]]

## 13. Privacy

Trattiamo i dati personali come descritto nell’informativa sulla privacy: [[Link all’informativa sulla privacy]].

## 14. Modifiche ai termini

Possiamo aggiornare questi termini. La versione in vigore è sempre pubblicata su questa pagina, con la data dell’ultimo aggiornamento. Se le modifiche sono rilevanti te lo comunicheremo [[Come: ad esempio via email o con un avviso sul sito]].

## 15. Legge applicabile e foro competente

Questi termini sono regolati dalla [[Legge applicabile, ad esempio la legge italiana]]. Se sei un consumatore, per le controversie è competente il giudice del luogo in cui risiedi o hai il domicilio. Negli altri casi è competente in via esclusiva il foro di [[Città]].

## 16. Contatti

Per domande su questi termini scrivi a [[Indirizzo email di contatto]].

{{last-updated}}
`,
  },
  en: {
    title: 'Terms and conditions',
    body: `[[DRAFT: this text is a generic skeleton, not legal advice. Terms depend heavily on the business: fill in the highlighted fields, delete the sections that do not apply and have it reviewed by a professional before publishing it. Then delete this line.]]

## 1. Scope

These terms govern the use of the site {{site.domain}} and of the services offered by {{site.name}} (the “Service”). By using the Service you accept these terms. If you do not accept them, do not use the Service.

## 2. Who we are

The Service is run by [[Company name or full name]], located at [[Full address]], VAT number [[VAT number]], email [[Contact email]].

## 3. The Service

[[Describe in plain words what the site or service offers, who it is for and whether it is free or paid.]]

## 4. Acceptable use

You agree to use the Service lawfully and in line with these terms. In particular you must not:

- use it for unlawful activities or to infringe the rights of others;
- try to access systems, accounts or data without authorisation;
- disrupt it, for example with automated attacks or excessive load;
- [[Other restrictions specific to your Service]].

## 5. Accounts

[[If the Service has accounts: sign-up requirements (for example a minimum age), responsibility for keeping credentials safe, how to close the account. Otherwise delete this section.]]

## 6. Prices and payments

[[If the Service is paid: prices (including or excluding VAT), payment methods, renewals and cancellation, invoicing. Otherwise delete this section.]]

## 7. Right of withdrawal

[[If you sell to consumers at a distance: state the conditions of the statutory right of withdrawal (in the EU, usually 14 days) and any exceptions. Otherwise delete this section.]]

## 8. Intellectual property

Texts, images, trademarks, logos, software and other content of the Service belong to [[Company name or full name]] or to their respective owners and are protected by law. You may not copy, modify or distribute them without written permission, except where the law allows it.

## 9. User content

[[If users can publish content: who keeps ownership, which licence they grant you, rules on prohibited content and how you remove it. Otherwise delete this section.]]

## 10. Third-party links

The Service may link to third-party sites. We do not control those sites and are not responsible for their content or privacy practices.

## 11. Availability and changes to the Service

We do our best to keep the Service available and working, but it may be interrupted for maintenance, updates or causes beyond our control. We may change or suspend the Service, giving [[Notice period and how]] when a change affects you significantly.

## 12. Liability

To the extent permitted by law, we are not liable for indirect damages arising from the use of, or the inability to use, the Service. Nothing in these terms excludes or limits any liability that cannot be excluded or limited by law, or the rights the law gives to consumers.

[[Any further limitations, to be checked with a professional.]]

## 13. Privacy

We process personal data as described in the privacy policy: [[Link to the privacy policy]].

## 14. Changes to these terms

We may update these terms. The current version is always published on this page, with the date of the last update. If the changes are significant we will tell you [[How: for example by email or with a notice on the site]].

## 15. Governing law and jurisdiction

These terms are governed by [[Governing law, for example Italian law]]. If you are a consumer, the courts of the place where you live have jurisdiction, and you keep the protection of the mandatory rules of your country of residence. Otherwise the courts of [[City]] have exclusive jurisdiction.

## 16. Contact

For questions about these terms, write to [[Contact email]].

{{last-updated}}
`,
  },
};
