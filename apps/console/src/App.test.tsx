import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { setTransport } from './api/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { createMockServer } from './mock/server';
import { useAutosave } from './lib/autosave';
import { renderHook } from '@testing-library/react';

function mount(path: string, loggedIn = true) {
  setTransport(createMockServer({ latency: 0, scenario: null, loggedIn }));
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
