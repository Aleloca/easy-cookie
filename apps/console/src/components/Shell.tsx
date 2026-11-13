import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import type { Site } from '../api/types';
import { useAuth } from '../auth';
import { useI18n, useT } from '../i18n';
import { revisionLabel } from '../lib/format';
import { Icon } from './Icon';

export const IS_MOCK = import.meta.env.VITE_MOCK === '1';

const SECTIONS = [
  { path: '', key: 'overview' },
  { path: 'consents', key: 'register' },
  { path: 'config', key: 'config' },
  { path: 'revisions', key: 'revisions' },
  { path: 'legal', key: 'legal' },
  { path: 'keys', key: 'keys' },
  { path: 'settings', key: 'settings' },
] as const;

function SiteSwitcher({ site, sites }: { site: Site; sites: Site[] | undefined }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="switcher" ref={ref}>
      <button
        type="button"
        className="switcher-btn"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">{t.nav.switchSite}: </span>
        <span className="switcher-name">{site.domain}</span>
        <Icon name="chevronDown" />
      </button>
      <ul id={listId} className="switcher-list" hidden={!open}>
        {(sites ?? []).map((s) => (
          <li key={s.id}>
            <Link
              to={`/sites/${s.id}`}
              aria-current={s.id === site.id ? 'true' : undefined}
              onClick={() => setOpen(false)}
            >
              <span>{s.domain}</span>
              <span className="switcher-sub">{s.name}</span>
            </Link>
          </li>
        ))}
        <li className="switcher-all">
          <Link to="/sites" onClick={() => setOpen(false)}>
            {t.nav.allSites}
          </Link>
        </li>
      </ul>
    </div>
  );
}

/** Revision stamp drawn in rail ink; it turns violet when its row is inverted to paper. */
function RailStamp({ revision }: { revision: string | null }) {
  const t = useT();
  return revision ? <span className="rail-stamp">{revisionLabel(revision)}</span> : <span className="rail-draft">{t.nav.draftOnly}</span>;
}

/** Console-wide entries: every site, and the service library. */
function ConsoleNav({ sites }: { sites?: Site[] }) {
  const t = useT();
  return (
    <ul className="rail-nav">
      <li>
        <NavLink to="/sites" end>
          {t.nav.sites}
          {sites && <span className="rail-count">{sites.length}</span>}
        </NavLink>
      </li>
      <li>
        <NavLink to="/library">
          {t.nav.library}
        </NavLink>
      </li>
    </ul>
  );
}

function RailBody({ site, sites }: { site?: Site; sites?: Site[] }) {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const sitesId = useId();
  const consoleId = useId();
  return (
    <>
      {site ? (
        <>
          <SiteSwitcher site={site} sites={sites} />
          <p className="rail-site-meta">
            <span className="rail-site-name">{site.name}</span>
            <RailStamp revision={site.publishedRevision} />
          </p>
          <nav aria-label={t.nav.main}>
            <ul className="rail-nav">
              {SECTIONS.map((s) => (
                <li key={s.key}>
                  <NavLink to={`/sites/${site.id}${s.path ? `/${s.path}` : ''}`} end={s.path === ''}>
                    {t.nav[s.key]}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="rail-group" aria-labelledby={consoleId}>
            <h2 className="rail-label" id={consoleId}>
              {t.nav.consoleNav}
            </h2>
            <ConsoleNav sites={sites} />
          </nav>
        </>
      ) : (
        <>
          <nav className="rail-nav-top" aria-label={t.nav.consoleNav}>
            <ConsoleNav sites={sites} />
          </nav>
          <nav className="rail-group" aria-labelledby={sitesId}>
            <h2 className="rail-label" id={sitesId}>
              {t.nav.yourSites}
            </h2>
            {sites === undefined ? null : sites.length === 0 ? (
              <p className="rail-empty">{t.nav.noSites}</p>
            ) : (
              <ul className="rail-sites">
                {sites.map((s) => (
                  <li key={s.id}>
                    <NavLink to={`/sites/${s.id}`}>
                      <span className="rail-site-domain">{s.domain}</span>
                      <span className="rail-site-sub">
                        <span className="rail-site-name">{s.name}</span>
                        <RailStamp revision={s.publishedRevision} />
                      </span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </>
      )}
      <div className="rail-foot">
        {user && (
          <div className="rail-account">
            <span className="rail-label">{t.nav.account}</span>
            <p className="rail-user">
              <span className="sr-only">{t.nav.signedInAs} </span>
              {user.email}
            </p>
            <button type="button" className="rail-logout" onClick={() => void logout()}>
              <Icon name="logout" />
              {t.nav.logout}
            </button>
          </div>
        )}
        <div className="rail-foot-row">
          <div className="lang" role="group" aria-label={t.common.language}>
            {(['it', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} lang={l}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {IS_MOCK && <p className="rail-mock">{t.common.mockBadge}</p>}
        </div>
      </div>
    </>
  );
}

/** Navy rail on desktop; top bar + disclosure menu under 900px. */
export function Shell({ site, sites, children }: { site?: Site; sites?: Site[]; children: ReactNode }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuId = useId();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="shell">
      <a className="skip" href="#main">
        {t.common.skipToContent}
      </a>
      <aside className="rail">
        <Link to="/sites" className="brand">
          {t.common.brand}
        </Link>
        <div className="rail-desktop">
          <RailBody site={site} sites={sites} />
        </div>
      </aside>
      <header className="topbar">
        <Link to="/sites" className="brand">
          {t.common.brand}
        </Link>
        {site && <span className="topbar-site">{site.domain}</span>}
        <button
          type="button"
          className="topbar-menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
          {t.nav.menu}
        </button>
        <div id={menuId} className="topbar-panel" hidden={!menuOpen}>
          <RailBody site={site} sites={sites} />
        </div>
      </header>
      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/** Page header on the guilloche band: title, actions at right. */
export function PageHeader({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="top">
      <div className="top-text">
        <h1>{title}</h1>
        {children}
      </div>
      {actions && <div className="top-actions">{actions}</div>}
    </div>
  );
}
