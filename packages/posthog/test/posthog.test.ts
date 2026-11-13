import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectPostHog, consentBeforeSend, posthogInitOptions, type PostHogLike } from '../src';
// Shared in-memory EasyCookieApi used by the adapter tests.
import { createFakeApi, testConfig } from '../../react/test/fake-api';

function fakePostHog() {
  let state: 'pending' | 'in' | 'out' = 'pending';
  let distinctId = 'anon';
  const ph = {
    opt_in_capturing: vi.fn(() => {
      state = 'in';
    }),
    opt_out_capturing: vi.fn(() => {
      state = 'out';
    }),
    has_opted_in_capturing: () => state === 'in',
    has_opted_out_capturing: () => state === 'out',
    identify: vi.fn((id?: string) => {
      distinctId = id ?? distinctId;
    }),
    get_distinct_id: () => distinctId,
  } satisfies PostHogLike;
  return ph;
}

describe('connectPostHog', () => {
  it('does nothing until the visitor chooses', async () => {
    const { api } = createFakeApi();
    await api.run(testConfig);
    const ph = fakePostHog();
    connectPostHog(ph, api);
    expect(ph.opt_in_capturing).not.toHaveBeenCalled();
    expect(ph.opt_out_capturing).not.toHaveBeenCalled();
  });

  it('opts in on replay of a stored acceptance and identifies the user', async () => {
    const { api } = createFakeApi({ categories: ['necessary', 'measurement'] });
    const ph = fakePostHog();
    connectPostHog(ph, api, { identify: () => 'user-42' });
    await api.run(testConfig);
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(ph.identify).toHaveBeenCalledWith('user-42');
  });

  it('applies a choice replayed before connecting', async () => {
    const { api } = createFakeApi({ categories: ['necessary'] });
    await api.run(testConfig);
    const ph = fakePostHog();
    connectPostHog(ph, api);
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
  });

  it('follows consent and change events without duplicate calls', async () => {
    const { api } = createFakeApi();
    await api.run(testConfig);
    const ph = fakePostHog();
    const identify = vi.fn(() => undefined);
    connectPostHog(ph, api, { identify });

    api.rejectAll();
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(identify).not.toHaveBeenCalled();

    api.accept(['experience']); // measurement still off
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    expect(ph.opt_in_capturing).not.toHaveBeenCalled();

    api.acceptAll();
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledTimes(1);

    api.rejectAll();
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(2);
  });

  it('can follow a single service and be unsubscribed', async () => {
    const { api, listenerCount } = createFakeApi();
    await api.run(testConfig);
    const ph = fakePostHog();
    const off = connectPostHog(ph, api, { service: 'ga4' });
    api.accept(['measurement'], { measurement: [] });
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    api.accept(['measurement'], { measurement: ['ga4'] });
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
    off();
    expect(listenerCount('change')).toBe(0);
    api.rejectAll();
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
  });

  it('does not re-identify an already identified user', async () => {
    const { api } = createFakeApi({ categories: ['necessary', 'measurement'] });
    const ph = fakePostHog();
    ph.identify('user-1');
    ph.identify.mockClear();
    connectPostHog(ph, api, { identify: () => 'user-1' });
    await api.run(testConfig);
    expect(ph.identify).not.toHaveBeenCalled();
  });
});

describe('consentBeforeSend', () => {
  afterEach(() => {
    delete (globalThis as any).__easyCookieHead;
  });

  it('drops non-essential events without consent and keeps pageviews', () => {
    let granted = false;
    const filter = consentBeforeSend({ isGranted: () => granted });
    expect(filter({ event: '$autocapture' })).toBeNull();
    expect(filter({ event: '$exception' })).toBeNull();
    expect(filter({ event: '$web_vitals' })).toBeNull();
    expect(filter({ event: '$$heatmap' })).toBeNull();
    expect(filter({ event: '$pageview' })).toEqual({ event: '$pageview' });
    expect(filter(null)).toBeNull();
    granted = true;
    expect(filter({ event: '$autocapture' })).toEqual({ event: '$autocapture' });
  });

  it('reads the runtime when given', async () => {
    const { api } = createFakeApi({ categories: ['necessary', 'measurement'] });
    await api.run(testConfig);
    expect(consentBeforeSend({ api })({ event: '$autocapture' })).not.toBeNull();
    expect(consentBeforeSend({ api, category: 'experience' })({ event: '$autocapture' })).toBeNull();
  });

  it('falls back to the head script state', () => {
    const filter = consentBeforeSend();
    expect(filter({ event: '$autocapture' })).toBeNull();
    (globalThis as any).__easyCookieHead = { granted: ['necessary', 'measurement'], valid: true };
    expect(filter({ event: '$autocapture' })).not.toBeNull();
  });
});

describe('posthogInitOptions', () => {
  it('returns cookieless on_reject defaults with a before_send filter', () => {
    const opts = posthogInitOptions({ isGranted: () => false });
    expect(opts).toMatchObject({
      cookieless_mode: 'on_reject',
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
    });
    expect(opts.before_send({ event: '$autocapture' })).toBeNull();
    expect(opts.before_send({ event: 'signup' })).toEqual({ event: 'signup' });
  });
});
