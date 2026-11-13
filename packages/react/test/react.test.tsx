import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  ConsentEmbed,
  ConsentGate,
  ConsentScript,
  EasyCookieProvider,
  PreferencesLink,
  pickApi,
  useConsent,
} from '../src';
import { __resetInjectedScripts } from '../src/components';
import { createFakeApi, testConfig } from './fake-api';
import stubApi from './core-stub';

describe('default runtime', () => {
  it('lazily imports @easy-cookie/core when no api prop is given', async () => {
    render(
      <EasyCookieProvider config={testConfig}>
        <Status />
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(stubApi.run).toHaveBeenCalledWith(testConfig);
  });
});

function Status() {
  const c = useConsent();
  return (
    <div>
      <span data-testid="ready">{String(c.ready)}</span>
      <span data-testid="measurement">{String(c.isGranted('measurement'))}</span>
      <span data-testid="youtube">{String(c.isServiceGranted('youtube'))}</span>
      <span data-testid="method">{c.consent?.method ?? 'none'}</span>
      <button onClick={c.acceptAll}>all</button>
      <button onClick={c.rejectAll}>none</button>
      <button onClick={() => c.accept(['measurement'])}>some</button>
    </div>
  );
}

beforeEach(() => {
  __resetInjectedScripts();
  document.head.innerHTML = '';
});

describe('EasyCookieProvider', () => {
  it('calls run() once under StrictMode and becomes ready', async () => {
    const { api } = createFakeApi();
    render(
      <StrictMode>
        <EasyCookieProvider config={testConfig} api={api}>
          <Status />
        </EasyCookieProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(api.run).toHaveBeenCalledTimes(1);
    expect(api.run).toHaveBeenCalledWith(testConfig);
  });

  it('passes the remote config to run()', async () => {
    const { api } = createFakeApi();
    const remote = { endpoint: 'https://consent.example.com', siteKey: 'pk_test' };
    render(
      <EasyCookieProvider remote={remote} api={api}>
        <Status />
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
    expect(api.run).toHaveBeenCalledWith({ remote });
  });

  it('reflects replayed consent and re-renders on consent/change', async () => {
    const { api } = createFakeApi({ categories: ['necessary'] });
    render(
      <EasyCookieProvider config={testConfig} api={api}>
        <Status />
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('method').textContent).toBe('custom'));
    expect(screen.getByTestId('measurement').textContent).toBe('false');

    fireEvent.click(screen.getByText('all'));
    await waitFor(() => expect(screen.getByTestId('measurement').textContent).toBe('true'));
    expect(screen.getByTestId('method').textContent).toBe('accept_all');
    expect(screen.getByTestId('youtube').textContent).toBe('true');

    fireEvent.click(screen.getByText('none'));
    await waitFor(() => expect(screen.getByTestId('measurement').textContent).toBe('false'));
    expect(screen.getByTestId('method').textContent).toBe('reject_all');

    fireEvent.click(screen.getByText('some'));
    await waitFor(() => expect(screen.getByTestId('measurement').textContent).toBe('true'));
    expect(api.accept).toHaveBeenCalledWith(['measurement'], undefined);
  });

  it('unsubscribes from runtime events on unmount', async () => {
    const { api, listenerCount } = createFakeApi();
    const view = render(
      <EasyCookieProvider config={testConfig} api={api}>
        <Status />
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(listenerCount('change')).toBe(1));
    view.unmount();
    expect(listenerCount('change')).toBe(0);
    expect(listenerCount('consent')).toBe(0);
  });

  it('renders on the server with nothing granted and without loading the runtime', () => {
    const html = renderToString(
      <EasyCookieProvider config={testConfig}>
        <Status />
        <ConsentGate category="measurement" fallback={<i>blocked</i>}>
          <b>analytics</b>
        </ConsentGate>
      </EasyCookieProvider>,
    );
    expect(html).toContain('false');
    expect(html).toContain('blocked');
    expect(html).not.toContain('analytics');
  });

  it('throws a clear error outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Status />)).toThrow(/EasyCookieProvider/);
    spy.mockRestore();
  });

  it('reports run() failures to onError', async () => {
    const { api } = createFakeApi();
    (api.run as any).mockImplementationOnce(async () => {
      throw new Error('boom');
    });
    const onError = vi.fn();
    render(
      <EasyCookieProvider config={testConfig} api={api} onError={onError}>
        <Status />
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByTestId('ready').textContent).toBe('true');
  });
});

describe('pickApi', () => {
  it('finds the API on default, named or namespace exports', () => {
    const { api } = createFakeApi();
    expect(pickApi({ default: api })).toBe(api);
    expect(pickApi({ easyCookie: api })).toBe(api);
    expect(pickApi(api)).toBe(api);
    expect(() => pickApi({})).toThrow(/EasyCookieApi/);
  });
});

describe('ConsentGate', () => {
  it('switches from fallback to children when the category is granted', async () => {
    const { api } = createFakeApi();
    render(
      <EasyCookieProvider config={testConfig} api={api}>
        <ConsentGate category="measurement" fallback={<span>fallback</span>}>
          <span>content</span>
        </ConsentGate>
        <ConsentGate service="ga4">
          <span>ga4 content</span>
        </ConsentGate>
      </EasyCookieProvider>,
    );
    expect(screen.getByText('fallback')).toBeTruthy();
    await waitFor(() => expect(api.run).toHaveBeenCalled());
    act(() => api.acceptAll());
    await waitFor(() => expect(screen.getByText('content')).toBeTruthy());
    expect(screen.getByText('ga4 content')).toBeTruthy();
    expect(screen.queryByText('fallback')).toBeNull();
  });
});

describe('PreferencesLink', () => {
  it('opens preferences with the localized default label', async () => {
    const { api } = createFakeApi();
    render(
      <EasyCookieProvider config={testConfig} api={api}>
        <PreferencesLink className="footer-link" />
      </EasyCookieProvider>,
    );
    const btn = await screen.findByRole('button', { name: 'Cookie preferences' });
    expect(btn.className).toBe('footer-link');
    expect(btn.getAttribute('type')).toBe('button');
    fireEvent.click(btn);
    await waitFor(() => expect(api.openPreferences).toHaveBeenCalledTimes(1));
  });

  it('uses Italian texts and custom children', async () => {
    const { api } = createFakeApi();
    const itConfig = { ...testConfig, language: { default: 'it' } };
    render(
      <EasyCookieProvider config={itConfig} api={api}>
        <PreferencesLink />
        <PreferencesLink>Gestisci</PreferencesLink>
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(api.run).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Preferenze cookie' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gestisci' })).toBeTruthy();
  });
});

describe('ConsentScript', () => {
  it('injects an external script only after consent, once', async () => {
    const { api } = createFakeApi();
    render(
      <EasyCookieProvider config={testConfig} api={api}>
        <ConsentScript category="measurement" service="ga4" src="https://example.com/ga.js" id="ga" />
        <ConsentScript category="measurement" src="https://example.com/ga.js" />
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(api.run).toHaveBeenCalled());
    expect(document.head.querySelectorAll('script').length).toBe(0);
    act(() => api.acceptAll());
    await waitFor(() => expect(document.head.querySelectorAll('script').length).toBe(1));
    const el = document.getElementById('ga') as HTMLScriptElement;
    expect(el.src).toBe('https://example.com/ga.js');
    expect(el.async).toBe(true);
    expect(el.getAttribute('data-category')).toBe('measurement');
    expect(el.getAttribute('data-service')).toBe('ga4');
  });

  it('injects inline code when granted', async () => {
    const { api } = createFakeApi({ categories: ['necessary', 'measurement'] });
    render(
      <EasyCookieProvider config={testConfig} api={api}>
        <ConsentScript category="measurement">{'window.__inline = 1;'}</ConsentScript>
        <ConsentScript category="experience">{'window.__blocked = 1;'}</ConsentScript>
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(document.head.querySelectorAll('script').length).toBe(1));
    expect(document.head.querySelector('script')!.text).toBe('window.__inline = 1;');
  });
});

describe('ConsentEmbed', () => {
  const embed = (
    <ConsentEmbed
      category="experience"
      service="youtube"
      src="https://www.youtube-nocookie.com/embed/x"
      title="Demo video"
      width={560}
      height={315}
    />
  );

  it('renders a themed placeholder with localized texts', async () => {
    const { api } = createFakeApi();
    const { container } = render(
      <EasyCookieProvider config={testConfig} api={api}>
        {embed}
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(container.querySelector('.ec-embed[data-ready]')).toBeTruthy());
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.ec-embed__text')!.textContent).toBe(
      'This YouTube content is blocked until you accept “Experience” cookies.',
    );
    expect(screen.getByRole('button', { name: 'Show content' }).className).toContain('ec-embed__btn--primary');
    expect(screen.getByRole('button', { name: 'Always enable “Experience”' })).toBeTruthy();
  });

  it('"show content" accepts only that service and keeps other choices', async () => {
    const { api } = createFakeApi({ categories: ['necessary', 'measurement'] });
    const { container } = render(
      <EasyCookieProvider config={testConfig} api={api}>
        {embed}
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(container.querySelector('.ec-embed[data-ready]')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Show content' }));
    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    const [cats, services] = (api.accept as any).mock.calls[0];
    expect(cats.sort()).toEqual(['experience', 'measurement', 'necessary']);
    expect(services.experience).toEqual(['youtube']);
    expect(services.measurement).toEqual(['ga4']);
    expect(api.isServiceGranted('vimeo')).toBe(false);
    const iframe = container.querySelector('iframe')!;
    expect(iframe.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/x');
    expect(iframe.getAttribute('title')).toBe('Demo video');
  });

  it('"always enable" accepts every service of the category', async () => {
    const { api } = createFakeApi();
    const { container } = render(
      <EasyCookieProvider config={testConfig} api={api}>
        {embed}
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(container.querySelector('.ec-embed[data-ready]')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Always enable “Experience”' }));
    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy());
    expect(api.isServiceGranted('vimeo')).toBe(true);
  });

  it('without a service shows a single enable button for the category', async () => {
    const { api } = createFakeApi();
    render(
      <EasyCookieProvider config={{ ...testConfig, language: { default: 'it' } }} api={api}>
        <ConsentEmbed category="experience" src="https://maps.example.com" title="Mappa" />
      </EasyCookieProvider>,
    );
    await waitFor(() => expect(api.run).toHaveBeenCalled());
    const buttons = await screen.findAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe('Mostra il contenuto');
  });
});
