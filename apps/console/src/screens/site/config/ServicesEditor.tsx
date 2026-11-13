import { useState } from 'react';
import type { CookieDeclaration } from '@easy-cookie/core/shared';
import type { CatalogEntry, ConfigService } from '../../../api/types';
import { Icon } from '../../../components/Icon';
import { Button, Field } from '../../../components/ui';
import { useI18n, useT } from '../../../i18n';
import { addFromCatalog } from '../../../lib/catalog';
import { ID_PATTERN, freeId, getLoc, renameKey, setIn, setLoc } from '../../../lib/configEdit';
import { LibraryDialog } from '../../library/LibraryDialog';
import { useCatalog } from '../../library/parts';
import { categoryTitle } from '../common';
import { IdField, LocField, SelectField, TextField, type EditorProps } from './shared';

function CookiesTable({
  cookies,
  onChange,
  lang,
  defaultLang,
}: {
  cookies: CookieDeclaration[];
  onChange: (c: CookieDeclaration[]) => void;
  lang: string;
  defaultLang: string;
}) {
  const t = useT();
  const set = (i: number, patch: Partial<CookieDeclaration>) => {
    const next = cookies.slice();
    const row: CookieDeclaration = { ...next[i], ...patch };
    for (const k of Object.keys(row) as (keyof CookieDeclaration)[]) if (row[k] === undefined) delete row[k];
    next[i] = row;
    onChange(next);
  };
  return (
    <div className="cookies">
      <table className="table table-edit">
        <thead>
          <tr>
            <th scope="col">{t.config.cookieName}</th>
            <th scope="col" className="c-narrow">
              {t.config.cookiePattern}
            </th>
            <th scope="col">
              {t.config.cookieDuration} <span className="lang-tag">{lang.toUpperCase()}</span>
            </th>
            <th scope="col">
              {t.config.cookieDescription} <span className="lang-tag">{lang.toUpperCase()}</span>
            </th>
            <th scope="col" className="c-narrow">
              <span className="sr-only">{t.common.remove}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {cookies.length === 0 && (
            <tr>
              <td colSpan={5} className="dim">
                {t.config.noCookies}
              </td>
            </tr>
          )}
          {cookies.map((ck, i) => (
            <tr key={i}>
              <td data-label={t.config.cookieName}>
                <input
                  className="input mono"
                  aria-label={`${t.config.cookieName} ${i + 1}`}
                  value={ck.name}
                  spellCheck={false}
                  onChange={(e) => set(i, { name: e.target.value })}
                />
              </td>
              <td className="c-narrow" data-label={t.config.cookiePattern}>
                <input
                  type="checkbox"
                  aria-label={`${t.config.cookiePattern} ${ck.name}`}
                  checked={!!ck.pattern}
                  onChange={(e) => set(i, { pattern: e.target.checked || undefined })}
                />
              </td>
              <td data-label={t.config.cookieDuration}>
                <input
                  className="input"
                  aria-label={`${t.config.cookieDuration} ${ck.name}`}
                  value={getLoc(ck.duration, lang, defaultLang)}
                  onChange={(e) => set(i, { duration: setLoc(ck.duration, lang, e.target.value, defaultLang) })}
                />
              </td>
              <td data-label={t.config.cookieDescription}>
                <input
                  className="input"
                  aria-label={`${t.config.cookieDescription} ${ck.name}`}
                  value={getLoc(ck.description, lang, defaultLang)}
                  onChange={(e) => set(i, { description: setLoc(ck.description, lang, e.target.value, defaultLang) })}
                />
              </td>
              <td className="c-narrow">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t.config.removeCookie(ck.name)}
                  onClick={() => onChange(cookies.filter((_, j) => j !== i))}
                >
                  <Icon name="close" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="quiet" icon="plus" onClick={() => onChange([...cookies, { name: '' }])}>
        {t.config.addCookie}
      </Button>
    </div>
  );
}

export function ServicesEditor({ config, update, lang, defaultLang }: EditorProps) {
  const { t, lang: uiLang } = useI18n();
  const services = (config.services ?? {}) as Record<string, ConfigService>;
  const ids = Object.keys(services);
  const catIds = Object.keys(config.categories ?? {});
  const [newId, setNewId] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [added, setAdded] = useState<{ ids: string[]; text: string } | null>(null);
  const catalogList = useCatalog();
  const catalogLabel = (id: string) => catalogList.data?.find((e) => e.id === id)?.label ?? id;

  const addFromLibrary = (entries: CatalogEntry[]) => {
    const r = addFromCatalog(config, entries);
    update(() => r.config);
    setLibraryOpen(false);
    const cats = r.addedCategories.map((c) => categoryTitle(c, uiLang)).join(', ');
    setAdded({
      ids: r.serviceIds,
      text: t.config.libraryAdded(r.serviceIds.length, cats ? t.library.categoryWord(r.addedCategories.length, cats) : ''),
    });
    // Bring the first new service into view once it is rendered.
    requestAnimationFrame(() => document.getElementById(`svc-${r.serviceIds[0]}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };
  const suggestion = freeId(ids, 'service');
  const newErr = newId && (!ID_PATTERN.test(newId) ? t.config.idInvalid : ids.includes(newId) ? t.config.idTaken : null);

  const add = () => {
    const id = newId || suggestion;
    if (!ID_PATTERN.test(id) || ids.includes(id)) return;
    const category = catIds.find((c) => !config.categories[c].readOnly) ?? catIds[0] ?? '';
    update((c) => setIn(c, ['services', id], { category, cookies: [] }));
    setNewId('');
  };

  return (
    <div className="blocks">
      <div className="services-bar">
        <Button variant="ghost" icon="plus" onClick={() => setLibraryOpen(true)}>
          {t.config.addFromLibrary}
        </Button>
        {ids.length === 0 && <p className="hint">{t.config.noServices}</p>}
      </div>
      {added && (
        <p className="notice notice-ink" role="status">
          {added.text}
        </p>
      )}
      {ids.map((id) => {
        const s = services[id];
        const p = (k: string) => ['services', id, k];
        return (
          <fieldset className={`block${added?.ids.includes(id) ? ' block-new' : ''}`} key={id} id={`svc-${id}`}>
            <legend className="block-legend">
              <span className="mono">{id}</span>
              <span className="block-title">{getLoc(s.label, lang, defaultLang)}</span>
              <span className="mono dim block-cat">{s.category}</span>
              {s.from && (
                <span className="from-tag" title={t.config.fromLibraryLabel(catalogLabel(s.from))}>
                  {t.config.fromLibrary}: {catalogLabel(s.from)}
                </span>
              )}
            </legend>
            <div className="row row-end">
              <IdField
                label={t.config.serviceId}
                value={id}
                validate={(v) => (!ID_PATTERN.test(v) ? t.config.idInvalid : v !== id && ids.includes(v) ? t.config.idTaken : null)}
                onCommit={(to) => update((c) => ({ ...c, services: renameKey(c.services ?? {}, id, to) }))}
              />
              <SelectField
                label={t.config.category}
                value={s.category}
                options={[
                  ...catIds.map((c) => ({ value: c, label: c })),
                  ...(catIds.includes(s.category) ? [] : [{ value: s.category, label: `${s.category} (?)` }]),
                ]}
                onChange={(v) => update((c) => setIn(c, p('category'), v))}
              />
              <div className="row-push">
                <Button variant="quiet" icon="trash" aria-label={t.config.removeService(id)} onClick={() => update((c) => setIn(c, ['services', id], undefined))}>
                  {t.common.remove}
                </Button>
              </div>
            </div>
            <div className="grid-2">
              <LocField label={t.config.label} value={s.label} lang={lang} defaultLang={defaultLang} placeholder={id} onChange={(v) => update((c) => setIn(c, p('label'), v))} />
              <TextField label={t.config.provider} value={s.provider} onChange={(v) => update((c) => setIn(c, p('provider'), v))} />
              <LocField label={t.config.purpose} value={s.purpose} lang={lang} defaultLang={defaultLang} onChange={(v) => update((c) => setIn(c, p('purpose'), v))} />
              <TextField
                label={t.config.privacyUrl}
                value={s.privacyUrl}
                mono
                type="url"
                placeholder="https://"
                onChange={(v) => update((c) => setIn(c, p('privacyUrl'), v))}
              />
            </div>
            <div className="subgroup">
              <p className="label">{t.config.cookies}</p>
              <CookiesTable cookies={s.cookies ?? []} lang={lang} defaultLang={defaultLang} onChange={(v) => update((c) => setIn(c, p('cookies'), v))} />
            </div>
          </fieldset>
        );
      })}
      <div className="adder">
        <Field label={t.config.newServiceId} error={newErr || undefined}>
          {(p) => (
            <input
              {...p}
              className="input mono"
              value={newId}
              placeholder={suggestion}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => setNewId(e.target.value.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
          )}
        </Field>
        <Button variant="ghost" icon="plus" onClick={add} disabled={!!newErr || catIds.length === 0}>
          {t.config.addService}
        </Button>
        <p className="hint adder-hint">{t.config.customHint}</p>
      </div>
      <LibraryDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} config={config} onAdd={addFromLibrary} />
    </div>
  );
}
