import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { setTransport } from './api/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/library.css';
import './styles/legal.css';

async function boot() {
  if (import.meta.env.VITE_MOCK === '1') {
    // Mock mode: in-memory Admin API with SYNTHETIC data, no server needed.
    const { createMockServer } = await import('./mock/server');
    setTransport(createMockServer());
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </StrictMode>,
  );
}

void boot();
