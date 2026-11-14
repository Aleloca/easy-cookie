// @vitest-environment-options { "url": "https://www.example.com/" }
import { describe, expect, it, vi } from 'vitest';

const base = {
  revision: 'r1',
  hideFromBots: false,
  categories: { necessary: { readOnly: true }, marketing: {} },
  services: { meta: { category: 'marketing', cookies: [{ name: '_fbp' }] } },
  ui: { reloadOnWithdraw: false },
};

async function fresh() {
  vi.resetModules();
  document.body.innerHTML = '';
  (window as any)._ccRun = false;
  return (await import('../src/index')).createEasyCookie();
}

const tick = () => new Promise((r) => setTimeout(r, 30));

// On a real hostname the engine stores the choice as a domain cookie
// (Domain=location.hostname). A new revision must still remove it.
describe('runtime on a real hostname', () => {
  it('re-prompts after a revision change even though the cookie has a Domain', async () => {
    let ec = await fresh();
    await ec.run(base as any);
    ec.rejectAll();
    await tick();
    expect(document.cookie).toContain('ec_consent=');
    ec = await fresh();
    // jsdom does not keep host-only and domain cookies apart (Chrome does), so also
    // assert the delete writes themselves.
    const proto = Document.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'cookie')!;
    const writes: string[] = [];
    const spy = vi.spyOn(document, 'cookie', 'set').mockImplementation((v: string) => {
      writes.push(v);
      desc.set!.call(document, v);
    });
    await ec.run({ ...base, revision: 'r2' } as any);
    spy.mockRestore();
    const erases = writes.filter((w) => w.startsWith('ec_consent=; Max-Age=0'));
    expect(erases).toContain('ec_consent=; Max-Age=0; Path=/; Domain=www.example.com');
    expect(erases).toContain('ec_consent=; Max-Age=0; Path=/; Domain=example.com');
    expect(document.cookie).not.toContain('ec_consent=');
    expect(ec.get()).toBeNull();
    expect(document.querySelector('#cc-main .cm')).not.toBeNull();
  });
});
