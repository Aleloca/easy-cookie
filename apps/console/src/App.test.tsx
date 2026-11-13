import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { setTransport } from './api/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { createMockServer } from './mock/server';
import { useAutosave } from './lib/autosave';
import { renderHook } from '@testing-library/react';
import { catalog } from './api/endpoints';

function mount(path: string, loggedIn = true) {
  setTransport(createMockServer({ latency: 0, scenario: null, loggedIn }));
  catalog.reset();
  return render(
    <I18nProvider lang="it">
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );
}

describe('console screens (mock mode)', () => {
  it('redirects to login and shows a clear error on wrong credentials', async () => {
    mount('/sites', false);
    expect(await screen.findByRole('heading', { name: 'Accedi alla console' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.it' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'sbagliata' } });
    fireEvent.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByText('Email o password non corretti.')).toBeTruthy();
  });

  it('lists sites with their published revision stamp', async () => {
    mount('/sites');
    expect(await screen.findByRole('link', { name: 'fermounattimo.it' })).toBeTruthy();
    expect(screen.getByText('non pubblicata')).toBeTruthy();
  });

  it('expands a register row in place with the proof and its history', async () => {
    mount('/sites/site_fua/consents');
    const stamps = await screen.findAllByRole('button', { name: /Mostra la prova/ }, { timeout: 4000 });
    fireEvent.click(stamps[0]);
    expect(stamps[0].getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByText('Prova del consenso')).toBeTruthy();
    expect(await screen.findByText(/Storico di questo consentId/)).toBeTruthy();
  });
});

describe('service library', () => {
  it('adds catalog entries to the draft with their category and a provenance tag', async () => {
    mount('/sites/site_mv/config');
    fireEvent.click(await screen.findByRole('tab', { name: 'Servizi' }, { timeout: 4000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi dalla libreria' }));
    const dialog = await screen.findByRole('dialog', { name: 'Aggiungi dalla libreria' });
    // GA4 is already in the draft: listed, but not selectable.
    const ga4 = await within(dialog).findByRole('checkbox', { name: /Google Analytics 4/ });
    expect((ga4 as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Intercom/ }));
    expect(within(dialog).getByText(/Verrà aggiunta anche la categoria Funzionalità/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aggiungi 1 servizio' }));
    expect(await screen.findByText(/1 servizio aggiunto alla bozza, insieme alla categoria Funzionalità/)).toBeTruthy();
    expect(screen.getByText('dalla libreria: Intercom')).toBeTruthy();
  });

  it('browses the read-only catalog with an entry in detail', async () => {
    mount('/library/stripe');
    expect(await screen.findByRole('heading', { name: 'Stripe' }, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('__stripe_mid')).toBeTruthy();
    expect(screen.getByText(/Necessario solo nelle pagine di pagamento/)).toBeTruthy();
  });
});

describe('useAutosave', () => {
  it('debounces saves and reports status', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => {});
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save, { delay: 500 }), { initialProps: { v: { a: 1 } } });
    expect(result.current.status).toBe('saved');
    rerender({ v: { a: 2 } });
    expect(result.current.status).toBe('dirty');
    rerender({ v: { a: 3 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ a: 3 });
    expect(result.current.status).toBe('saved');
    vi.useRealTimers();
  });

  it('flush saves immediately', async () => {
    const save = vi.fn(async () => {});
    const { result, rerender } = renderHook(({ v }) => useAutosave(v, save, { delay: 10_000 }), { initialProps: { v: { a: 1 } } });
    rerender({ v: { a: 2 } });
    await act(async () => {
      await result.current.flush();
    });
    expect(save).toHaveBeenCalledWith({ a: 2 });
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });
});
