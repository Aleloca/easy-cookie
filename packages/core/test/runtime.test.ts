import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const base = {
  revision: 'r1',
  hideFromBots: false,
  googleConsentMode: { enabled: true },
  categories: { necessary: { readOnly: true }, measurement: {}, marketing: {} },
  services: {
    ga4: { category: 'measurement', cookies: [{ name: '^_ga', pattern: true }] },
    meta: { category: 'marketing', cookies: [{ name: '_fbp' }] },
  },
  ui: { reloadOnWithdraw: false },
};

async function fresh() {
  vi.resetModules();
  document.body.innerHTML = '';
  document.documentElement.className = '';
  (window as any).dataLayer = [];
  delete (window as any).gtag;
  (window as any)._ccRun = false;
  const mod = await import('../src/index');
  return mod.createEasyCookie();
}

function clearCookies() {
  document.cookie.split(';').forEach((c) => {
    const n = c.split('=')[0].trim();
    if (n) document.cookie = `${n}=; Max-Age=0; Path=/`;
  });
}

const tick = () => new Promise((r) => setTimeout(r, 30));

describe('runtime', () => {
  beforeEach(clearCookies);
  afterEach(clearCookies);

  it('shows the banner with the mosaic and equal accept/reject buttons', async () => {
    const ec = await fresh();
    await ec.run(base as any);
    expect(document.querySelector('#cc-main .cm')).not.toBeNull();
    expect(document.querySelectorAll('#cc-main .ec-mosaic .ec-module')).toHaveLength(3);
    expect(document.querySelectorAll('#cc-main .ec-module--on')).toHaveLength(1); // necessary only
    expect(document.querySelector('#cc-main [data-role="all"]')?.className).toBe(
      document.querySelector('#cc-main [data-role="necessary"]')?.className,
    );
    expect(document.querySelector('#cc-main .cm__btn--close')).not.toBeNull();
    expect(ec.get()).toBeNull();
  });

  it('records accept_all, stores revision and pushes Consent Mode + dataLayer event', async () => {
    const ec = await fresh();
    const onConsent = vi.fn();
    ec.on('consent', onConsent);
    await ec.run(base as any);
    (document.querySelector('#cc-main .cm [data-role="all"]') as HTMLButtonElement).click();
    await tick();
    const s = ec.get()!;
    expect(s.method).toBe('accept_all');
    expect(s.revision).toBe('r1');
    expect(s.categories).toEqual(expect.arrayContaining(['necessary', 'measurement', 'marketing']));
    expect(onConsent).toHaveBeenCalledTimes(1);
    const dl = (window as any).dataLayer as any[];
    const update = dl.find((x) => x[0] === 'consent' && x[1] === 'update');
    expect(update[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'granted' });
    expect(dl.find((x) => x.event === 'easy_cookie_update')).toMatchObject({ easyCookie: { first: true, method: 'accept_all' } });
  });

  it('treats the X as a rejection', async () => {
    const ec = await fresh();
    await ec.run(base as any);
    (document.querySelector('#cc-main .cm__btn--close') as HTMLButtonElement).click();
    await tick();
    expect(ec.get()).toMatchObject({ method: 'close', categories: ['necessary'] });
  });

  it('re-prompts when the revision changes', async () => {
    let ec = await fresh();
    await ec.run(base as any);
    ec.rejectAll();
    await tick();
    expect(ec.get()?.method).toBe('reject_all');
    ec = await fresh();
    const ready = vi.fn();
    ec.on('ready', ready);
    await ec.run({ ...base, revision: 'r2' } as any);
    expect(ec.get()).toBeNull();
    expect(ready).toHaveBeenCalled();
  });

  it('replays a stored choice without a dataLayer event', async () => {
    let ec = await fresh();
    await ec.run(base as any);
    ec.accept(['measurement']);
    await tick();
    ec = await fresh();
    const replay = vi.fn();
    ec.on('replay', replay);
    await ec.run(base as any);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(ec.isGranted('measurement')).toBe(true);
    expect(ec.isGranted('marketing')).toBe(false);
    expect(((window as any).dataLayer as any[]).some((x) => x.event === 'easy_cookie_update')).toBe(false);
  });

  it('sends the record to the consent server as a simple request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const ec = await fresh();
    await ec.run({ ...base, log: { endpoint: 'https://consent.test/', siteKey: 'pk_x' } } as any);
    ec.acceptAll();
    await tick();
    const [url, init] = fetchMock.mock.calls.find((c) => String(c[0]).includes('/v1/consents'))!;
    expect(url).toBe('https://consent.test/v1/consents?key=pk_x');
    expect(init.headers['Content-Type']).toMatch(/^text\/plain/);
    expect(init.keepalive).toBe(true);
    expect(JSON.parse(init.body)).toMatchObject({ method: 'accept_all', revision: 'r1', categories: { necessary: true, measurement: true, marketing: true } });
    vi.unstubAllGlobals();
  });

  it('replaces blocked iframes with a placeholder until granted', async () => {
    const ec = await fresh();
    document.body.innerHTML = '<iframe data-category="marketing" data-src="https://example.com/x"></iframe>';
    await ec.run(base as any);
    expect(document.querySelector('.ec-embed')).not.toBeNull();
    expect(document.querySelector('iframe')!.getAttribute('src')).toBeNull();
    ec.accept(['marketing']);
    await tick();
    expect(document.querySelector('.ec-embed')).toBeNull();
    expect(document.querySelector('iframe')!.getAttribute('src')).toBe('https://example.com/x');
  });
  it('opens the preferences from any [data-ec-open-preferences] element, even one added later', async () => {
    const ec = await fresh();
    await ec.run(base as any);
    const spy = vi.spyOn(ec, 'openPreferences');
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('data-ec-open-preferences', '');
    link.innerHTML = '<span>Preferenze cookie</span>';
    document.body.appendChild(link);
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    const notPrevented = link.querySelector('span')!.dispatchEvent(ev);
    expect(notPrevented).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    // Other clicks are untouched.
    const other = document.createElement('a');
    other.href = '#x';
    document.body.appendChild(other);
    expect(other.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
