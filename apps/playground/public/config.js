// Demo config. All data is illustrative.
window.demoConfig = {
  revision: '2026-11-13',
  policyUrl: { it: '/cookie-policy.html', en: '/cookie-policy.html' },
  language: { default: 'it', available: ['it', 'en'] },
  googleConsentMode: { enabled: true },
  ui: { position: 'bottom-left', reopenButton: { hideOn: ['/dashboard'] } },
  categories: {
    necessary: { readOnly: true },
    measurement: {},
    experience: {},
    marketing: {},
  },
  services: {
    session: { category: 'necessary', label: 'Sessione', provider: 'Rivista Esempio',
      cookies: [{ name: 'ec_consent', duration: { it: '6 mesi', en: '6 months' }, description: { it: 'Ricorda le tue scelte sui cookie', en: 'Remembers your cookie choices' } }] },
    ga4: { category: 'measurement', label: 'Google Analytics 4', provider: 'Google Ireland Ltd',
      purpose: { it: 'Statistiche anonime sulle visite', en: 'Visit statistics' }, privacyUrl: 'https://policies.google.com/privacy',
      cookies: [{ name: '^_ga', pattern: true, duration: { it: '2 anni', en: '2 years' } }] },
    youtube: { category: 'experience', label: 'YouTube', provider: 'Google Ireland Ltd',
      purpose: { it: 'Video incorporati', en: 'Embedded videos' }, privacyUrl: 'https://policies.google.com/privacy',
      cookies: [{ name: 'VISITOR_INFO1_LIVE', duration: { it: '6 mesi', en: '6 months' }, domain: '.youtube.com' }] },
    meta: { category: 'marketing', label: 'Meta Pixel', provider: 'Meta Platforms Ireland Ltd',
      purpose: { it: 'Misura delle campagne pubblicitarie', en: 'Ad campaign measurement' }, privacyUrl: 'https://www.facebook.com/privacy/policy',
      cookies: [{ name: '_fbp', duration: { it: '3 mesi', en: '3 months' } }] },
  },
};
