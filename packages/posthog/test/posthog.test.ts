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
    clear_opt_in_out_capturing: vi.fn(() => {
      state = 'pending';
    }),
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
    setState(s: 'pending' | 'in' | 'out') {
      state = s;
    },
    identify: vi.fn((id?: string) => {
      distinctId = id ?? distinctId;
    }),
    get_distinct_id: () => distinctId,
  } satisfies PostHogLike & { setState(s: "pending" | "in" | "out"): void };
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

describe('connectPostHog options', () => {
  it('clears a stale opt-in before the first choice', async () => {
    const { api } = createFakeApi();
    await api.run(testConfig);
    const ph = fakePostHog();
    ph.setState('in');
    connectPostHog(ph, api);
    expect(ph.clear_opt_in_out_capturing).toHaveBeenCalledTimes(1);
    expect(ph.has_opted_in_capturing()).toBe(false);
  });

  it('counts cookieless before the first choice when asked', async () => {
    const { api } = createFakeApi();
    await api.run(testConfig);
    const ph = fakePostHog();
    connectPostHog(ph, api, { beforeChoice: 'cookieless' });
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
  });

  it('opts in without an $opt_in event and drives session replay', async () => {
    const { api } = createFakeApi({ categories: ['necessary', 'measurement'] });
    const ph = fakePostHog();
    connectPostHog(ph, api, { sessionReplay: true });
    await api.run(testConfig);
    expect(ph.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(ph.startSessionRecording).toHaveBeenCalledTimes(1);
  });
});

describe('connectPostHog with posthog-js consent status', () => {
  it('opts out for cookieless counting even when has_opted_out_capturing() is already true while pending', async () => {
    const { api } = createFakeApi();
    await api.run(testConfig);
    const ph = { ...fakePostHog(), has_opted_out_capturing: () => true, get_explicit_consent_status: () => 'pending' };
    connectPostHog(ph, api, { beforeChoice: 'cookieless' });
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
  });

  it('waits for run() before acting, so a returning visitor is not opted out', async () => {
    const { api } = createFakeApi({ categories: ['necessary', 'measurement'] });
    const ph = fakePostHog();
    connectPostHog(ph, api, { beforeChoice: 'cookieless' });
    expect(ph.opt_out_capturing).not.toHaveBeenCalled();
    await api.run(testConfig);
    expect(ph.opt_out_capturing).not.toHaveBeenCalled();
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1);
  });
});

describe('connectPostHog first page load', () => {
  it('calls opt_out_capturing once per page load even when already out, so the landing pageview is counted', async () => {
    const { api } = createFakeApi({ categories: ['necessary'] });
    await api.run(testConfig);
    const ph = { ...fakePostHog(), get_explicit_consent_status: () => 'denied' };
    connectPostHog(ph, api);
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    api.rejectAll();
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
  });
});

describe('session replay after a cookieless opt-in', () => {
  it('hands the remote config received by posthog-js to the new recorder', async () => {
    const { api } = createFakeApi();
    await api.run(testConfig);
    const recorder = { onRemoteConfig: vi.fn() };
    const original = vi.fn();
    const ph = { ...fakePostHog(), _onRemoteConfig: original, sessionRecording: null as typeof recorder | null };
    connectPostHog(ph, api, { beforeChoice: 'cookieless', sessionReplay: true });
    // posthog-js receives its remote config while cookieless (no recorder yet)
    ph._onRemoteConfig({ sessionRecording: { endpoint: '/s/' } });
    expect(original).toHaveBeenCalledTimes(1);
    // opt-in creates a new recorder (as posthog-js does after reset)
    ph.sessionRecording = recorder;
    api.acceptAll();
    await new Promise((r) => setTimeout(r, 0));
    expect(recorder.onRemoteConfig).toHaveBeenCalledWith({ sessionRecording: { endpoint: '/s/' } });
    expect(ph.startSessionRecording).toHaveBeenCalled();
  });

  it('fetches the remote config when it was not seen', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ sessionRecording: { endpoint: '/s/' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { api } = createFakeApi();
    await api.run(testConfig);
    const recorder = { onRemoteConfig: vi.fn() };
    const ph = {
      ...fakePostHog(),
      sessionRecording: recorder,
      config: { token: 'phc_x' },
      requestRouter: { endpointFor: (_t: string, path: string) => `https://eu-assets.i.posthog.com${path}` },
    };
    connectPostHog(ph, api, { beforeChoice: 'cookieless', sessionReplay: true });
    api.acceptAll();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith('https://eu-assets.i.posthog.com/array/phc_x/config');
    expect(recorder.onRemoteConfig).toHaveBeenCalledWith({ sessionRecording: { endpoint: '/s/' } });
    vi.unstubAllGlobals();
  });
});

describe('connectPostHog with posthog-js signatures', () => {
  it('accepts a client whose internals have stricter types, and restores _onRemoteConfig on disconnect', async () => {
    interface RemoteConfig { sessionRecording?: { endpoint: string } | false; supportedCompression?: string[] }
    class StrictClient {
      opt_in_capturing = vi.fn();
      opt_out_capturing = vi.fn();
      _onRemoteConfig(config: RemoteConfig): void {
        void config;
      }
    }
    const client = new StrictClient();
    const { api } = createFakeApi();
    await api.run(testConfig);
    // Compiles without a cast: the internals are not part of PostHogLike.
    const disconnect = connectPostHog(client, api, { sessionReplay: true });
    expect(Object.prototype.hasOwnProperty.call(client, '_onRemoteConfig')).toBe(true);
    disconnect();
    expect(Object.prototype.hasOwnProperty.call(client, '_onRemoteConfig')).toBe(false);
    expect(client._onRemoteConfig).toBe(StrictClient.prototype._onRemoteConfig);
    // Reconnecting twice does not stack wrappers.
    connectPostHog(client, api, { sessionReplay: true })();
    connectPostHog(client, api, { sessionReplay: true })();
    expect(client._onRemoteConfig).toBe(StrictClient.prototype._onRemoteConfig);
  });
});
