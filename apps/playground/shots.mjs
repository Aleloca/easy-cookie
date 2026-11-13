// Screenshots of the consent UI states into .impeccable/review/banner/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.BASE || 'http://localhost:5180';
const out = new URL('../../.impeccable/review/banner/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const errors = [];

for (const [name, viewport] of Object.entries(sizes)) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.addInitScript(() => { window.__noBotCheck = true; });
    page.on('pageerror', (e) => errors.push(`${name}/${scheme}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${name}/${scheme} console: ${m.text()}`));
    await page.goto(base + (scheme === 'dark' ? '/?dark' : '/'));
    if (scheme === 'dark') await page.evaluate(() => document.documentElement.classList.add('ec--dark'));
    await page.waitForSelector('#cc-main .cm', { state: 'visible' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}${name}-${scheme}-banner.png` });
    if (scheme === 'light') {
      await page.click('#cc-main [data-role="show"]');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}${name}-preferences.png` });
      await page.click('#cc-main .pm .pm__section--expandable:nth-of-type(3) .pm__section-title').catch(() => {});
      await page.click('#cc-main .pm label.section__toggle-wrapper >> nth=1').catch(() => {});
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}${name}-preferences-expanded.png` });
      await page.click('#cc-main .pm [data-role="all"]');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}${name}-after-accept.png` });
      const state = await page.evaluate(() => ({ consent: EasyCookie.get(), dl: JSON.parse(JSON.stringify(window.dataLayer.map((x) => (x.length !== undefined ? Array.from(x) : x)))), ran: !!window.__analyticsRan }));
      console.log(name, JSON.stringify(state).slice(0, 900));
    }
    await ctx.close();
  }
}
// Embed placeholder after a rejection.
{
  const ctx = await browser.newContext({ viewport: sizes.desktop });
  const page = await ctx.newPage();
    await page.addInitScript(() => { window.__noBotCheck = true; });
  await page.goto(base);
  await page.waitForSelector('#cc-main .cm', { state: 'visible' });
  await page.click('#cc-main .cm [data-role="necessary"]');
  await page.waitForTimeout(300);
  await page.locator('.ec-embed').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}desktop-embed-placeholder.png` });
  console.log('after reject', JSON.stringify(await page.evaluate(() => EasyCookie.get())));
  await ctx.close();
}
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
