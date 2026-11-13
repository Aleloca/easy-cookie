import { describe, expect, it } from 'vitest';
import { getLoc, renameKey, setIn, setInPruned, setLoc, servicesUsing } from './configEdit';
import { jsonDiff } from './diff';
import { normalizeQuery, percent, revisionLabel, shortHash, shortId, stampDate, todayRevision } from './format';
import { previewConfig } from './preview';
import { periodFrom } from '../screens/site/Register';
import { issueMessage, tabForPath } from '../screens/site/config/IssueList';
import { validateConfig } from '@easy-cookie/core/shared';
import it_ from '../i18n/it';
import en from '../i18n/en';
import { isValidOrigin } from '../screens/site/Keys';
import type { EasyCookieConfig } from '@easy-cookie/core/shared';

describe('format', () => {
  it('shortens date revisions for stamps', () => {
    expect(revisionLabel('2026-11-13')).toBe('r26-11-13');
    expect(revisionLabel('2026-11-13-2')).toBe('r26-11-13-2');
    expect(revisionLabel('v3')).toBe('rv3');
  });

  it('prints stamp dates with year only outside the current year', () => {
    const now = new Date(2026, 10, 13, 12);
    expect(stampDate(new Date(2026, 10, 13, 9, 42, 17).toISOString(), now)).toBe('13/11 09:42:17');
    expect(stampDate(new Date(2025, 0, 2, 8, 5, 0).toISOString(), now)).toBe('02/01/25 08:05:00');
    expect(stampDate(new Date(2026, 10, 13, 9, 42, 17).toISOString(), now, false)).toBe('13/11 09:42');
    expect(stampDate('nope', now)).toBe('—');
  });

  it('abbreviates ids and hashes, and normalises pasted stamps', () => {
    expect(shortId('c7e14a9f-1234-4abc-a123-0123456789ab')).toBe('c7e1·4a9f');
    expect(normalizeQuery(' c7e1·4a9f ')).toBe('c7e14a9f');
    expect(shortHash('9f3a00000000000000e21')).toBe('9f3a…e21');
    expect(shortHash(null)).toBe('—');
  });

  it('computes percentages safely', () => {
    expect(percent(41, 100)).toBe('41%');
    expect(percent(1, 0)).toBe('0%');
  });

  it('defaults the revision id to the local date', () => {
    expect(todayRevision(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('configEdit', () => {
  it('sets and removes nested keys immutably', () => {
    const a = { x: { y: 1 } };
    const b = setIn(a, ['x', 'z'], 2);
    expect(b).toEqual({ x: { y: 1, z: 2 } });
    expect(a).toEqual({ x: { y: 1 } });
    expect(setIn(b, ['x', 'y'], undefined)).toEqual({ x: { z: 2 } });
    expect(setIn({ list: [1, 2, 3] }, ['list', 1], undefined)).toEqual({ list: [1, 3] });
  });

  it('prunes empty override objects', () => {
    const c = { texts: { it: { banner: { title: 'Ciao' } } } };
    expect(setInPruned(c, ['texts', 'it', 'banner', 'title'], undefined)).toEqual({});
  });

  it('reads and writes localized values', () => {
    expect(getLoc('Ciao', 'it', 'it')).toBe('Ciao');
    expect(getLoc('Ciao', 'en', 'it')).toBe('');
    expect(setLoc('Ciao', 'en', 'Hello', 'it')).toEqual({ it: 'Ciao', en: 'Hello' });
    expect(setLoc({ it: 'Ciao' }, 'it', '', 'it')).toBeUndefined();
  });

  it('renames keys in place and finds service references', () => {
    expect(Object.keys(renameKey({ a: 1, b: 2, c: 3 }, 'b', 'z'))).toEqual(['a', 'z', 'c']);
    const config = {
      revision: 'x',
      categories: { necessary: { readOnly: true }, measurement: {} },
      services: { ga4: { category: 'measurement' }, hj: { category: 'measurement' } },
    } as EasyCookieConfig;
    expect(servicesUsing(config, 'measurement')).toEqual(['ga4', 'hj']);
  });
});

describe('jsonDiff', () => {
  it('lists added, removed and changed leaves', () => {
    const before = { revision: 'a', categories: { necessary: { readOnly: true } }, list: [1, 2] };
    const after = { revision: 'b', categories: { necessary: { readOnly: true }, marketing: {} }, list: [1] };
    expect(jsonDiff(before, after)).toEqual([
      { path: 'categories.marketing', kind: 'added', after: {} },
      { path: 'list[1]', kind: 'removed', before: 2 },
      { path: 'revision', kind: 'changed', before: 'a', after: 'b' },
    ]);
    expect(jsonDiff(before, structuredClone(before))).toEqual([]);
  });
});

describe('preview config', () => {
  it('never logs to the server and uses its own cookie', () => {
    const c = previewConfig(
      { revision: 'r', categories: { necessary: { readOnly: true } }, log: { endpoint: 'https://x', siteKey: 'pk_x' }, cookie: { name: 'ec_consent', domain: '.x.it' } },
      'en',
    );
    expect(c.log).toBeUndefined();
    expect(c.cookie?.name).toBe('ec_console_preview');
    expect(c.cookie?.domain).toBeUndefined();
    expect(c.language?.default).toBe('en');
    expect(c.revision).toBe('preview');
  });
});

describe('screen helpers', () => {
  it('turns a period into a start-of-day bound', () => {
    const now = new Date(2026, 10, 13, 15, 30);
    expect(periodFrom('all', now)).toBeUndefined();
    expect(new Date(periodFrom('1', now)!).getDate()).toBe(13);
    expect(new Date(periodFrom('7', now)!).getDate()).toBe(7);
  });

  it('maps issue paths to editor tabs', () => {
    expect(tabForPath('categories.necessary.gcm.0')).toBe('categories');
    expect(tabForPath('services.ga4.cookies.0.name')).toBe('services');
    expect(tabForPath('cookie.secure')).toBe('cookie');
    expect(tabForPath('expiryDays')).toBe('cookie');
    expect(tabForPath('log')).toBe('json');
  });

  it('validates origins', () => {
    expect(isValidOrigin('https://www.esempio.it')).toBe(true);
    expect(isValidOrigin('http://localhost:3000')).toBe(true);
    expect(isValidOrigin('*')).toBe(true);
    expect(isValidOrigin('https://esempio.it/path')).toBe(false);
    expect(isValidOrigin('esempio.it')).toBe(false);
  });
});

describe('validator messages', () => {
  it('localizes every message validateConfig produces for a broken config', () => {
    const issues = validateConfig({
      revision: '',
      expiryDays: 500,
      categories: { necessary: { title: 3, gcm: ['nope'] }, 'bad id': {} },
      services: { x: { category: 'ghost', cookies: [{}], privacyUrl: 1 } },
      log: {},
      cookie: { sameSite: 'None', secure: false },
      language: { default: 1 },
    });
    expect(issues.length).toBeGreaterThan(8);
    for (const i of issues) {
      expect(issueMessage(i, it_)).not.toBe(i.message);
      expect(issueMessage(i, en)).not.toBe(i.message);
    }
    expect(issueMessage({ path: 'categories.necessary.gcm.0', message: 'Unknown Consent Mode signal "nope"' }, it_)).toContain('«nope»');
  });
  it('falls back to the raw message when unknown', () => {
    expect(issueMessage({ path: 'x', message: 'Something new' }, it_)).toBe('Something new');
  });
});

describe('count strings', () => {
  it('agree with the count in both languages', () => {
    expect(it_.register.showing(1, '1')).toBe('1 registrazione mostrata');
    expect(it_.register.showing(2, '2')).toBe('2 registrazioni mostrate');
    expect(en.register.showing(1, '1')).toBe('1 record shown');
    expect(it_.overview.revisionNotice('r', 'oggi', 1, '1')).toContain('1 consenso registrato da allora');
    expect(it_.overview.revisionNotice('r', 'oggi', 3, '3')).toContain('3 consensi registrati da allora');
    expect(en.overview.revisionNotice('r', 'today', 1, '1')).toContain('1 consent recorded since');
  });
});
