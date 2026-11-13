import type { LegalTranslation } from '../legal';

/** Built-in privacy policy template (GDPR art. 13). A starting draft, not legal advice. */
export const privacy: Record<'it' | 'en', LegalTranslation> = {
  it: {
    title: 'Informativa sulla privacy',
    body: `[[BOZZA: questo testo è un modello generico, non è una consulenza legale. Completa i campi evidenziati, adattalo a come tratti davvero i dati e fallo verificare da un professionista prima di pubblicarlo. Poi elimina questa riga.]]

Questa informativa spiega come {{site.name}} tratta i dati personali di chi visita {{site.domain}} e di chi usa i suoi servizi, ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679 («GDPR») e del Codice in materia di protezione dei dati personali (d.lgs. 196/2003).

## 1. Titolare del trattamento

Il titolare del trattamento è [[Ragione sociale o nome e cognome del titolare]], con sede in [[Indirizzo completo]], P. IVA / C.F. [[Partita IVA o codice fiscale]] (di seguito «Titolare»).

Puoi contattare il Titolare scrivendo a [[Indirizzo email per la privacy]].

[[Se hai nominato un Responsabile della protezione dei dati (DPO), indica qui il nome e il contatto; altrimenti elimina questa riga.]]

## 2. Quali dati trattiamo

- **Dati di navigazione.** I sistemi che fanno funzionare il sito raccolgono automaticamente alcuni dati, come l’indirizzo IP, il tipo di browser e di dispositivo, le pagine richieste, la data e l’ora della richiesta. Servono a far funzionare il sito e a proteggerlo.
- **Dati che ci fornisci.** Quando ci scrivi, compili un modulo, ti registri o acquisti, trattiamo i dati che inserisci, ad esempio nome, cognome, indirizzo email e [[Altri dati raccolti, ad esempio telefono, indirizzo di fatturazione]].
- **Cookie e strumenti simili.** Li descriviamo nella cookie policy: [[Link alla cookie policy]].
- [[Altre categorie di dati che tratti, ad esempio dati di pagamento o dati dell’account. Elimina questa voce se non serve.]]

[[Conferma o modifica:]] Non chiediamo dati appartenenti a categorie particolari (art. 9 GDPR), come dati sulla salute. Ti chiediamo di non inviarceli.

## 3. Finalità e basi giuridiche

| Finalità | Base giuridica (art. 6 GDPR) |
| --- | --- |
| Rispondere alle tue richieste di contatto | Misure precontrattuali richieste da te (art. 6.1.b) o nostro legittimo interesse a rispondere (art. 6.1.f) |
| Fornire il servizio o il prodotto richiesto e gestire il contratto | Esecuzione di un contratto (art. 6.1.b) |
| Adempiere agli obblighi di legge, ad esempio fiscali e contabili | Obbligo legale (art. 6.1.c) |
| Garantire la sicurezza del sito e prevenire abusi | Legittimo interesse (art. 6.1.f) |
| Statistiche, contenuti incorporati e marketing tramite cookie non tecnici | Consenso (art. 6.1.a), che puoi revocare in ogni momento |
| [[Altra finalità, ad esempio l’invio della newsletter]] | [[Base giuridica, ad esempio il consenso (art. 6.1.a)]] |

Quando la base giuridica è il legittimo interesse, puoi opporti al trattamento in qualsiasi momento (vedi la sezione «I tuoi diritti»).

## 4. Natura del conferimento

I dati di navigazione sono necessari per usare il sito. Il conferimento degli altri dati è facoltativo, ma senza i dati richiesti come obbligatori non possiamo rispondere alla tua richiesta o fornire il servizio.

## 5. Modalità del trattamento e conservazione

Trattiamo i dati con strumenti elettronici e con misure tecniche e organizzative adeguate a proteggerli. Li conserviamo solo per il tempo necessario:

- richieste di contatto: [[Periodo di conservazione, ad esempio 12 mesi dall’ultima comunicazione]];
- dati relativi al contratto e alla fatturazione: per la durata del contratto e poi per il tempo previsto dalla legge per gli obblighi fiscali e contabili ([[Periodo, di norma 10 anni]]);
- dati di navigazione (log tecnici): [[Periodo di conservazione dei log]];
- prova del consenso ai cookie: [[Periodo di conservazione della prova del consenso]];
- cookie: per la durata indicata nella cookie policy.

Al termine li cancelliamo o li rendiamo anonimi.

## 6. Destinatari dei dati

I dati possono essere comunicati a:

- fornitori che li trattano per nostro conto come responsabili del trattamento (art. 28 GDPR), ad esempio i servizi di hosting, di posta elettronica e [[Altri fornitori]];
- professionisti e consulenti che ci assistono, ad esempio [[Commercialista, consulente legale]];
- autorità pubbliche, quando la legge lo richiede.

I dati non vengono diffusi. L’elenco aggiornato dei responsabili è disponibile su richiesta.

### Servizi di terze parti usati dal sito

{{services-list}}

## 7. Trasferimento dei dati fuori dallo Spazio economico europeo

Alcuni fornitori possono trattare dati al di fuori dello Spazio economico europeo (SEE). In questi casi il trasferimento avviene solo sulla base di una decisione di adeguatezza della Commissione europea (art. 45 GDPR), come l’EU-US Data Privacy Framework per le società statunitensi certificate, oppure con garanzie adeguate come le clausole contrattuali standard approvate dalla Commissione (art. 46 GDPR). I paesi e le garanzie, quando noti, sono indicati nell’elenco dei servizi qui sopra. Puoi chiedere una copia delle garanzie scrivendo a [[Indirizzo email per la privacy]].

## 8. I tuoi diritti

In qualsiasi momento puoi esercitare i diritti previsti dagli articoli 15–22 del GDPR:

- **accesso** ai tuoi dati e alle informazioni sul trattamento (art. 15);
- **rettifica** dei dati inesatti o incompleti (art. 16);
- **cancellazione** dei dati (art. 17);
- **limitazione** del trattamento (art. 18);
- **portabilità** dei dati che ci hai fornito, in un formato strutturato e leggibile da dispositivo automatico (art. 20);
- **opposizione** al trattamento basato sul legittimo interesse e, sempre, al marketing diretto (art. 21);
- non essere sottoposto a **decisioni basate unicamente su un trattamento automatizzato** che producono effetti giuridici o incidono in modo analogo significativamente sulla tua persona (art. 22).

Quando il trattamento si basa sul consenso, puoi **revocarlo** in qualsiasi momento, senza pregiudicare la liceità del trattamento svolto prima della revoca (art. 7.3). Per i cookie: {{preferences-link}}.

Per esercitare i diritti scrivi a [[Indirizzo email per la privacy]]. Rispondiamo senza ingiustificato ritardo e comunque entro un mese, prorogabile di due mesi nei casi previsti dall’art. 12.3 GDPR.

[[Conferma o modifica: il Titolare non adotta processi decisionali automatizzati, compresa la profilazione, che producano effetti giuridici sugli interessati.]]

## 9. Reclamo all’autorità di controllo

Se ritieni che il trattamento violi il GDPR, hai il diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it) o all’autorità di controllo dello Stato membro in cui risiedi, lavori o in cui è avvenuta la presunta violazione (art. 77 GDPR).

## 10. Modifiche a questa informativa

Possiamo aggiornare questa informativa, ad esempio per cambiamenti normativi o dei servizi che usiamo. La versione in vigore è sempre pubblicata su questa pagina, con la data dell’ultimo aggiornamento.

## 11. Contatti

[[Ragione sociale o nome e cognome del titolare]] · [[Indirizzo completo]] · [[Indirizzo email per la privacy]]

{{last-updated}}
`,
  },
  en: {
    title: 'Privacy policy',
    body: `[[DRAFT: this text is a generic template, not legal advice. Fill in the highlighted fields, adapt it to how you actually process data and have it reviewed by a professional before publishing it. Then delete this line.]]

This policy explains how {{site.name}} processes the personal data of people who visit {{site.domain}} and use its services, under Articles 13 and 14 of Regulation (EU) 2016/679 (“GDPR”).

## 1. Data controller

The data controller is [[Company name or full name of the controller]], located at [[Full address]], VAT / tax number [[VAT or tax number]] (the “Controller”).

You can contact the Controller at [[Privacy contact email]].

[[If you have appointed a Data Protection Officer (DPO), give their name and contact here; otherwise delete this line.]]

## 2. Data we process

- **Browsing data.** The systems that run the site automatically collect some data, such as the IP address, the type of browser and device, the pages requested, and the date and time of the request. We need it to run and protect the site.
- **Data you give us.** When you write to us, fill in a form, sign up or buy, we process the data you enter, for example your name, email address and [[Other data collected, for example phone number, billing address]].
- **Cookies and similar technologies.** They are described in the cookie policy: [[Link to the cookie policy]].
- [[Other categories of data you process, for example payment or account data. Delete this item if not needed.]]

[[Confirm or change:]] We do not ask for special categories of data (Article 9 GDPR), such as health data. Please do not send them to us.

## 3. Purposes and legal bases

| Purpose | Legal basis (Article 6 GDPR) |
| --- | --- |
| Replying to your contact requests | Pre-contractual steps you asked for (Art. 6(1)(b)) or our legitimate interest in replying (Art. 6(1)(f)) |
| Providing the service or product you asked for and managing the contract | Performance of a contract (Art. 6(1)(b)) |
| Meeting legal obligations, for example tax and accounting | Legal obligation (Art. 6(1)(c)) |
| Keeping the site secure and preventing abuse | Legitimate interest (Art. 6(1)(f)) |
| Statistics, embedded content and marketing through non-essential cookies | Consent (Art. 6(1)(a)), which you can withdraw at any time |
| [[Other purpose, for example sending the newsletter]] | [[Legal basis, for example consent (Art. 6(1)(a))]] |

Where the legal basis is legitimate interest, you can object to the processing at any time (see “Your rights”).

## 4. Whether you must provide data

Browsing data is needed to use the site. Providing other data is optional, but without the data marked as required we cannot answer your request or provide the service.

## 5. How we process and keep data

We process data electronically, with technical and organisational measures appropriate to protect it. We keep it only as long as needed:

- contact requests: [[Retention period, for example 12 months after the last message]];
- contract and billing data: for the duration of the contract, then for the period the law requires for tax and accounting obligations ([[Period, usually 10 years in Italy]]);
- browsing data (technical logs): [[Log retention period]];
- proof of cookie consent: [[Retention period of the consent proof]];
- cookies: for the duration shown in the cookie policy.

Afterwards we delete or anonymise it.

## 6. Recipients

Data may be shared with:

- providers that process it on our behalf as processors (Article 28 GDPR), for example hosting, email and [[Other providers]];
- professionals and advisers who assist us, for example [[Accountant, legal adviser]];
- public authorities, when the law requires it.

Data is not made public. The current list of processors is available on request.

### Third-party services used by the site

{{services-list}}

## 7. Transfers outside the European Economic Area

Some providers may process data outside the European Economic Area (EEA). In that case the transfer takes place only on the basis of a European Commission adequacy decision (Article 45 GDPR), such as the EU-US Data Privacy Framework for certified US companies, or with appropriate safeguards such as the standard contractual clauses approved by the Commission (Article 46 GDPR). Countries and safeguards, when known, are listed with the services above. You can ask for a copy of the safeguards at [[Privacy contact email]].

## 8. Your rights

At any time you can exercise the rights in Articles 15–22 GDPR:

- **access** to your data and to information about the processing (Art. 15);
- **rectification** of inaccurate or incomplete data (Art. 16);
- **erasure** of your data (Art. 17);
- **restriction** of processing (Art. 18);
- **portability** of the data you gave us, in a structured, machine-readable format (Art. 20);
- **objection** to processing based on legitimate interest and, always, to direct marketing (Art. 21);
- not to be subject to **decisions based solely on automated processing** that produce legal effects concerning you or similarly significantly affect you (Art. 22).

Where processing is based on consent, you can **withdraw** it at any time, without affecting the lawfulness of processing before the withdrawal (Art. 7(3)). For cookies: {{preferences-link}}.

To exercise your rights, write to [[Privacy contact email]]. We reply without undue delay and in any case within one month, which may be extended by two months in the cases set out in Article 12(3) GDPR.

[[Confirm or change: the Controller does not use automated decision-making, including profiling, that produces legal effects on data subjects.]]

## 9. Complaints to a supervisory authority

If you believe the processing infringes the GDPR, you have the right to lodge a complaint with the Italian Data Protection Authority (Garante per la protezione dei dati personali, www.garanteprivacy.it) or with the supervisory authority of the Member State where you live, work or where the alleged infringement took place (Article 77 GDPR).

## 10. Changes to this policy

We may update this policy, for example when the law or the services we use change. The current version is always published on this page, with the date of the last update.

## 11. Contact

[[Company name or full name of the controller]] · [[Full address]] · [[Privacy contact email]]

{{last-updated}}
`,
  },
};
