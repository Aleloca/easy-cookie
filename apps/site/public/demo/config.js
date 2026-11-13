// Demo configuration for the landing page. Illustrative data only.
// The demo stores its choice in a technical cookie `ec_demo`, scoped to the
// demo's own path, and sends nothing anywhere (no `log` block).
(function () {
  var dir = location.pathname.replace(/[^/]*$/, '');
  var en = /[?&]lang=en\b/.test(location.search);
  document.documentElement.lang = en ? 'en' : 'it';
  window.demoConfig = {
    revision: '2026-11-13',
    expiryDays: 182,
    cookie: { name: 'ec_demo', path: dir, sameSite: 'Lax' },
    policyUrl: dir + (en ? 'cookie-policy.html?lang=en' : 'cookie-policy.html'),
    language: { default: 'it', available: ['it', 'en'], autoDetect: 'document' },
    googleConsentMode: { enabled: true },
    hideFromBots: false,
    respectGpc: false,
    ui: { position: 'bottom-left', reopenButton: true, reloadOnWithdraw: false },
    categories: {
      necessary: { readOnly: true },
      experience: {},
      measurement: {},
      marketing: {},
    },
    services: {
      demo: {
        category: 'necessary',
        label: { it: 'Scelta sui cookie', en: 'Cookie choice' },
        provider: 'Rivista Esempio',
        cookies: [{ name: 'ec_demo', duration: { it: '6 mesi', en: '6 months' }, description: { it: 'Ricorda la scelta fatta in questa demo', en: 'Remembers the choice made in this demo' } }],
      },
      video: {
        category: 'experience',
        label: { it: 'Lettore video', en: 'Video player' },
        provider: 'Video Esempio Srl',
        purpose: { it: 'Video incorporati negli articoli', en: 'Videos embedded in articles' },
        cookies: [{ name: 'vid_session', duration: { it: 'sessione', en: 'session' }, domain: '.video.example' }],
      },
      ga4: {
        category: 'measurement',
        label: 'Google Analytics 4',
        provider: 'Google Ireland Ltd',
        purpose: { it: 'Statistiche sulle visite', en: 'Visit statistics' },
        privacyUrl: 'https://policies.google.com/privacy',
        cookies: [{ name: '^_ga', pattern: true, duration: { it: '2 anni', en: '2 years' } }],
      },
      meta: {
        category: 'marketing',
        label: 'Meta Pixel',
        provider: 'Meta Platforms Ireland Ltd',
        purpose: { it: 'Misura delle campagne pubblicitarie', en: 'Ad campaign measurement' },
        privacyUrl: 'https://www.facebook.com/privacy/policy',
        cookies: [{ name: '_fbp', duration: { it: '3 mesi', en: '3 months' } }],
      },
    },
  };
})();
