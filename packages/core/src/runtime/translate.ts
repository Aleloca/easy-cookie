import { localize, resolveTexts, type ResolvedConfig } from '../shared/config';
import type { Texts } from '../shared/types';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Build the engine (vanilla-cookieconsent) translation object for one language. */
export function engineTranslation(c: ResolvedConfig, lang: string, texts: Texts = resolveTexts(c, lang)) {
  const policyUrl = localize(c.policyUrl, lang, c.language.default);
  const policyLink = policyUrl
    ? ` <a class="ec-link" href="${esc(policyUrl)}">${esc(texts.banner.policyLink)}</a>`
    : '';
  const services = c.services ?? {};

  const sections = c.resolvedCategories.map((cat) => {
    const rows = cat.services.flatMap((sid) => {
      const svc = services[sid]!;
      const label = localize(svc.label, lang, c.language.default) || sid;
      return (svc.cookies ?? []).map((ck) => ({
        name: `<code>${esc(ck.pattern ? ck.name.replace(/^\^|\$$/g, '') + '…' : ck.name)}</code>`,
        service: esc(label),
        duration: esc(localize(ck.duration, lang, c.language.default)),
        desc: esc(localize(ck.description, lang, c.language.default) || localize(svc.purpose, lang, c.language.default)),
      }));
    });
    const serviceFurniture = cat.services
      .map((sid) => {
        const svc = services[sid]!;
        const label = localize(svc.label, lang, c.language.default) || sid;
        const purpose = localize(svc.purpose, lang, c.language.default);
        const bits = [
          svc.provider ? `<span class="ec-svc__provider">${esc(texts.preferences.provider)}: ${esc(svc.provider)}</span>` : '',
          svc.privacyUrl
            ? `<a class="ec-link" href="${esc(svc.privacyUrl)}" target="_blank" rel="noopener">${esc(texts.preferences.privacyPolicy)}</a>`
            : '',
        ].filter(Boolean);
        return `<li class="ec-svc"><strong class="ec-svc__name">${esc(label)}</strong>${
          purpose ? `<span class="ec-svc__purpose">${esc(purpose)}</span>` : ''
        }${bits.length ? `<span class="ec-svc__meta">${bits.join(' · ')}</span>` : ''}</li>`;
      })
      .join('');

    return {
      title: `<span class="ec-swatch" style="--ec-cat:${esc(cat.color)}" aria-hidden="true"></span>${esc(
        localize(cat.title, lang, c.language.default),
      )}${cat.readOnly ? ` <span class="ec-always">${esc(texts.preferences.alwaysOn)}</span>` : ''}`,
      description:
        esc(localize(cat.description, lang, c.language.default)) +
        (serviceFurniture ? `<ul class="ec-svcs" aria-label="${esc(texts.preferences.services)}">${serviceFurniture}</ul>` : ''),
      linkedCategory: cat.id,
      ...(rows.length
        ? {
            cookieTable: {
              caption: esc(texts.preferences.cookieName),
              headers: {
                name: esc(texts.preferences.cookieName),
                service: esc(texts.preferences.services),
                duration: esc(texts.preferences.cookieDuration),
                desc: esc(texts.preferences.cookieDescription),
              },
              body: rows,
            },
          }
        : {}),
    };
  });

  return {
    consentModal: {
      title: esc(texts.banner.title),
      description: esc(texts.banner.description) + policyLink,
      acceptAllBtn: esc(texts.banner.acceptAll),
      acceptNecessaryBtn: esc(texts.banner.rejectAll),
      showPreferencesBtn: esc(texts.banner.customize),
      // The X closes the banner and counts as a rejection (Garante 2021).
      closeIconLabel: esc(texts.banner.close),
    },
    preferencesModal: {
      title: esc(texts.preferences.title),
      acceptAllBtn: esc(texts.preferences.acceptAll),
      acceptNecessaryBtn: esc(texts.preferences.rejectAll),
      savePreferencesBtn: esc(texts.preferences.save),
      closeIconLabel: esc(texts.preferences.close),
      serviceCounterLabel: esc(texts.preferences.serviceCounter),
      sections: [{ description: esc(texts.preferences.intro) + policyLink }, ...sections],
    },
  };
}

/** Engine `categories` block: enabled false by default, readOnly, services and autoClear rules. */
export function engineCategories(c: ResolvedConfig, lang: string, serviceToggles: boolean) {
  const services = c.services ?? {};
  const out: Record<string, unknown> = {};
  for (const cat of c.resolvedCategories) {
    const cookies = cat.services.flatMap((sid) =>
      (services[sid]!.cookies ?? []).map((ck) => ({ name: ck.pattern ? new RegExp(ck.name) : ck.name })),
    );
    const svc: Record<string, { label: string }> = {};
    if (serviceToggles && !cat.readOnly)
      for (const sid of cat.services) svc[sid] = { label: localize(services[sid]!.label, lang, c.language.default) || sid };
    out[cat.id] = {
      enabled: false,
      readOnly: cat.readOnly,
      ...(Object.keys(svc).length ? { services: svc } : {}),
      ...(cookies.length && !cat.readOnly ? { autoClear: { cookies, reloadPage: false } } : {}),
    };
  }
  return out;
}
