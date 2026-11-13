import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEasyCookie } from '../../core/src/index';
import { ConsentGate, EasyCookieProvider, PreferencesLink, useConsent } from '../src';

// The real browser runtime (not the fake) driven through the React adapter.
const config = {
  revision: 'int-1',
  hideFromBots: false,
  categories: { necessary: { readOnly: true }, measurement: {}, marketing: {} },
  ui: { reloadOnWithdraw: false },
};

function Status() {
  const c = useConsent();
  return (
    <div>
      <span data-testid="ready">{String(c.ready)}</span>
      <span data-testid="m">{String(c.isGranted('measurement'))}</span>
    </div>
  );
}

it('real runtime: banner choice re-renders consumers and opens the gate', async () => {
  (window as any)._ccRun = false;
  const api = createEasyCookie();
  render(
    <EasyCookieProvider config={config as any} api={api}>
      <Status />
      <ConsentGate category="measurement" fallback={<p>analytics off</p>}>
        <p>analytics on</p>
      </ConsentGate>
      <PreferencesLink>Preferenze</PreferencesLink>
    </EasyCookieProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('true'));
  expect(screen.getByText('analytics off')).toBeTruthy();
  fireEvent.click(document.querySelector('#cc-main .cm [data-role="all"]')!);
  await waitFor(() => expect(screen.getByTestId('m').textContent).toBe('true'));
  expect(screen.getByText('analytics on')).toBeTruthy();
  expect(api.get()?.method).toBe('accept_all');
});
