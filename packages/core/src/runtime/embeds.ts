import { localize, type ResolvedConfig } from '../shared/config';
import type { EasyCookieApi, Texts } from '../shared/types';

const SELECTOR = 'iframe[data-category][data-src]';

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/**
 * Blocked embeds: `<iframe data-category="experience" data-service="youtube" data-src="…">`.
 * While the category is off, the iframe stays empty and a placeholder sits in
 * its place with two choices: show this one content now (no consent stored),
 * or turn the whole category on.
 */
export function mountEmbeds(
  c: ResolvedConfig,
  texts: () => Texts,
  lang: () => string,
  api: EasyCookieApi,
): { refresh(): void } {
  const loaded = new WeakSet<HTMLIFrameElement>();

  const load = (frame: HTMLIFrameElement) => {
    loaded.add(frame);
    frame.src = frame.dataset.src!;
    frame.hidden = false;
    const ph = frame.previousElementSibling;
    if (ph?.classList.contains('ec-embed')) ph.remove();
  };

  const placeholder = (frame: HTMLIFrameElement) => {
    if (frame.previousElementSibling?.classList.contains('ec-embed')) return;
    const t = texts();
    const catId = frame.dataset.category!;
    const cat = c.resolvedCategories.find((x) => x.id === catId);
    const catName = cat ? localize(cat.title, lang(), c.language.default) : catId;
    const svcId = frame.dataset.service;
    const svc = svcId ? c.services?.[svcId] : undefined;
    const svcName = (svc && localize(svc.label, lang(), c.language.default)) || svcId || frame.title || catName;

    const box = document.createElement('div');
    box.className = 'ec-embed';
    if (cat) box.style.setProperty('--ec-cat', cat.color);
    const w = frame.getAttribute('width');
    const hgt = frame.getAttribute('height');
    if (w && /^\d+$/.test(w)) box.style.maxWidth = `${w}px`;
    if (hgt && /^\d+$/.test(hgt) && w && /^\d+$/.test(w)) box.style.aspectRatio = `${w} / ${hgt}`;

    const sw = document.createElement('span');
    sw.className = 'ec-module';
    sw.setAttribute('aria-hidden', 'true');
    const msg = document.createElement('p');
    msg.className = 'ec-embed__text';
    msg.textContent = fill(t.embed.blocked, { service: svcName, category: catName });
    const actions = document.createElement('div');
    actions.className = 'ec-embed__actions';
    const once = document.createElement('button');
    once.type = 'button';
    once.className = 'ec-btn';
    once.textContent = t.embed.enable;
    once.addEventListener('click', () => load(frame));
    const always = document.createElement('button');
    always.type = 'button';
    always.className = 'ec-btn ec-btn--secondary';
    always.textContent = fill(t.embed.enableAlways, { category: catName });
    always.addEventListener('click', () => api.accept([catId]));
    actions.append(once, always);
    box.append(sw, msg, actions);
    frame.hidden = true;
    frame.parentNode?.insertBefore(box, frame);
  };

  const refresh = () => {
    document.querySelectorAll<HTMLIFrameElement>(SELECTOR).forEach((frame) => {
      if (loaded.has(frame)) return;
      const svc = frame.dataset.service;
      const granted = svc ? api.isServiceGranted(svc) || api.isGranted(frame.dataset.category!) : api.isGranted(frame.dataset.category!);
      if (granted) load(frame);
      else placeholder(frame);
    });
  };

  // Embeds added later (SPA navigation, CMS widgets).
  const mo = new MutationObserver((muts) => {
    if (muts.some((m) => Array.from(m.addedNodes).some((n) => n instanceof Element && (n.matches(SELECTOR) || n.querySelector(SELECTOR)))))
      refresh();
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return { refresh };
}
