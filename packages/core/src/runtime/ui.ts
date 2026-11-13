import { localize, type ResolvedConfig } from '../shared/config';
import type { ConsentState, ReopenButtonOptions, Texts } from '../shared/types';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};

/**
 * The consent mosaic: one colour module per category, filled when granted,
 * outlined when off. Necessary categories are always filled. State is never
 * colour alone: every module has a text label and state in the legend.
 */
export function renderMosaic(
  modal: Element | null,
  c: ResolvedConfig,
  texts: Texts,
  lang: string,
  state: ConsentState | null,
) {
  if (!modal) return;
  const body = modal.querySelector('.cm__texts') ?? modal;
  let mosaic = modal.querySelector<HTMLElement>('.ec-mosaic');
  if (!mosaic) {
    mosaic = h('div', 'ec-mosaic');
    body.insertBefore(mosaic, body.firstChild);
  }
  mosaic.replaceChildren();
  const row = h('div', 'ec-mosaic__row');
  row.setAttribute('aria-hidden', 'true');
  const legend = h('ul', 'ec-mosaic__legend');
  for (const cat of c.resolvedCategories) {
    const on = cat.readOnly || !!state?.categories.includes(cat.id);
    const mod = h('span', `ec-module${on ? ' ec-module--on' : ''}`);
    mod.style.setProperty('--ec-cat', cat.color);
    row.appendChild(mod);
    const li = h('li', `ec-mosaic__item${on ? ' is-on' : ''}`);
    const sw = h('span', `ec-swatch${on ? ' ec-swatch--on' : ''}`);
    sw.style.setProperty('--ec-cat', cat.color);
    sw.setAttribute('aria-hidden', 'true');
    li.appendChild(sw);
    li.appendChild(document.createTextNode(localize(cat.title, lang, c.language.default)));
    const st = h('span', 'ec-mosaic__state', cat.readOnly ? texts.preferences.alwaysOn : on ? texts.banner.legendOn : texts.banner.legendOff);
    li.appendChild(st);
    legend.appendChild(li);
  }
  mosaic.append(row, legend);
}

export interface ReopenHandle {
  update(state: ConsentState | null): void;
  destroy(): void;
}

/** Floating "cookie preferences" button carrying a miniature of the visitor's mosaic. */
export function mountReopenButton(
  c: ResolvedConfig,
  texts: Texts,
  lang: string,
  opts: ReopenButtonOptions,
  open: () => void,
): ReopenHandle {
  const btn = h('button', `ec-reopen ec-reopen--${opts.position ?? (c.ui?.position === 'bottom-right' ? 'bottom-right' : 'bottom-left')}`);
  btn.type = 'button';
  btn.setAttribute('aria-label', texts.reopen.label);
  btn.title = texts.reopen.label;
  btn.hidden = true;
  const grid = h('span', 'ec-reopen__grid');
  grid.setAttribute('aria-hidden', 'true');
  btn.appendChild(grid);
  btn.addEventListener('click', open);
  document.body.appendChild(btn);

  let current: ConsentState | null = null;
  const hiddenHere = () => (opts.hideOn ?? []).some((p) => location.pathname.startsWith(p));
  const sync = () => {
    btn.hidden = !current || hiddenHere();
  };
  const onNav = () => sync();
  // SPA routers change the path without reloading: watch history too.
  const wrap = (k: 'pushState' | 'replaceState') => {
    const orig = history[k];
    history[k] = function (this: History, ...args: Parameters<History['pushState']>) {
      const r = orig.apply(this, args);
      queueMicrotask(onNav);
      return r;
    } as History['pushState'];
    return () => (history[k] = orig);
  };
  const unwrap = [wrap('pushState'), wrap('replaceState')];
  addEventListener('popstate', onNav);

  return {
    update(state) {
      current = state;
      grid.replaceChildren();
      for (const cat of c.resolvedCategories) {
        const on = cat.readOnly || !!state?.categories.includes(cat.id);
        const m = h('span', `ec-module ec-module--mini${on ? ' ec-module--on' : ''}`);
        m.style.setProperty('--ec-cat', cat.color);
        grid.appendChild(m);
      }
      void lang;
      sync();
    },
    destroy() {
      unwrap.forEach((u) => u());
      removeEventListener('popstate', onNav);
      btn.remove();
    },
  };
}
