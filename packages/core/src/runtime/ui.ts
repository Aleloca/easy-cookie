import { localize, type ResolvedConfig } from '../shared/config';
import type { ConsentState, ReopenButtonOptions, Texts } from '../shared/types';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};

const isOn = (cat: ResolvedConfig['resolvedCategories'][number], state: ConsentState | null) =>
  cat.readOnly || !!state?.categories.includes(cat.id);

/** Build one module per category, once. `--i` drives the staggered fill. */
function buildModules(row: HTMLElement, c: ResolvedConfig, extra = '') {
  c.resolvedCategories.forEach((cat, i) => {
    const m = h('span', `ec-module${extra}`);
    m.dataset.cat = cat.id;
    m.style.setProperty('--ec-cat', cat.color);
    m.style.setProperty('--i', String(i));
    row.appendChild(m);
  });
}

function syncModules(row: Element, c: ResolvedConfig, state: ConsentState | null) {
  row.querySelectorAll<HTMLElement>('.ec-module').forEach((m) => {
    const cat = c.resolvedCategories.find((x) => x.id === m.dataset.cat);
    if (cat) m.classList.toggle('ec-module--on', isOn(cat, state));
  });
}

/**
 * The consent mosaic: one colour module per category, filled when granted,
 * outlined when off. Necessary categories are always filled. State is never
 * colour alone: every module has a text label and state in the legend.
 * Modules are created once and toggled in place so the fill can animate.
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
  if (!mosaic || mosaic.dataset.lang !== lang) {
    mosaic?.remove();
    mosaic = h('div', 'ec-mosaic');
    mosaic.dataset.lang = lang;
    const row = h('div', 'ec-mosaic__row');
    row.setAttribute('aria-hidden', 'true');
    buildModules(row, c);
    const legend = h('ul', 'ec-mosaic__legend');
    for (const cat of c.resolvedCategories) {
      const li = h('li', 'ec-mosaic__item');
      li.dataset.cat = cat.id;
      const sw = h('span', 'ec-swatch');
      sw.style.setProperty('--ec-cat', cat.color);
      sw.setAttribute('aria-hidden', 'true');
      li.append(sw, document.createTextNode(localize(cat.title, lang, c.language.default)), h('span', 'ec-mosaic__state'));
      legend.appendChild(li);
    }
    mosaic.append(row, legend);
    body.insertBefore(mosaic, body.firstChild);
  }
  syncModules(mosaic.querySelector('.ec-mosaic__row')!, c, state);
  mosaic.querySelectorAll<HTMLElement>('.ec-mosaic__item').forEach((li) => {
    const cat = c.resolvedCategories.find((x) => x.id === li.dataset.cat)!;
    const on = isOn(cat, state);
    li.classList.toggle('is-on', on);
    li.querySelector('.ec-swatch')!.classList.toggle('ec-swatch--on', on);
    li.querySelector('.ec-mosaic__state')!.textContent = cat.readOnly
      ? texts.banner.legendAlways
      : on
        ? texts.banner.legendOn
        : texts.banner.legendOff;
  });
}

export interface ReopenHandle {
  update(state: ConsentState | null): void;
  destroy(): void;
}

/** Floating "cookie preferences" button carrying a miniature of the visitor's mosaic. */
export function mountReopenButton(
  c: ResolvedConfig,
  texts: Texts,
  _lang: string,
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
  buildModules(grid, c, ' ec-module--mini');
  btn.appendChild(grid);
  btn.addEventListener('click', open);
  document.body.appendChild(btn);

  let current: ConsentState | null = null;
  let revealed = false;
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
      sync();
      if (!revealed && state && !btn.hidden) {
        // First appearance: start empty, then let the modules fill one step at a time.
        revealed = true;
        syncModules(grid, c, null);
        grid.querySelectorAll('.ec-module').forEach((m) => m.classList.remove('ec-module--on'));
        requestAnimationFrame(() => requestAnimationFrame(() => syncModules(grid, c, state)));
        return;
      }
      syncModules(grid, c, state);
    },
    destroy() {
      unwrap.forEach((u) => u());
      removeEventListener('popstate', onNav);
      btn.remove();
    },
  };
}
