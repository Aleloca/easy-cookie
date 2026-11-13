import { useEffect, useId, useMemo, useState } from 'react';
import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import { CATALOG_GROUPS, type CatalogEntry, type CatalogGroup } from '../../api/types';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { Button, ErrorState, Loading } from '../../components/ui';
import { useI18n } from '../../i18n';
import { addedAs, filterCatalog, missingCategories } from '../../lib/catalog';
import { categoryTitle } from '../site/common';
import { CategoryTag, useCatalog } from './parts';

/**
 * "Add from library": search, filter by group, tick several entries, add them
 * in one go. Entries already in the draft stay listed but cannot be ticked.
 */
export function LibraryDialog({
  open,
  onClose,
  config,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  config: EasyCookieConfig;
  onAdd: (entries: CatalogEntry[]) => void;
}) {
  const { t, lang } = useI18n();
  const list = useCatalog();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<CatalogGroup | 'all'>('all');
  const [picked, setPicked] = useState<string[]>([]);
  const searchId = useId();
  const groupsId = useId();

  useEffect(() => {
    if (open) {
      setQuery('');
      setGroup('all');
      setPicked([]);
    }
  }, [open]);

  const entries = list.data ?? [];
  const shown = useMemo(() => filterCatalog(entries, query, group), [entries, query, group]);
  const groups = CATALOG_GROUPS.filter((g) => entries.some((e) => e.group === g));
  const chosen = entries.filter((e) => picked.includes(e.id));
  const newCats = missingCategories(config, chosen);
  const catList = newCats.map((c) => categoryTitle(c, lang)).join(', ');

  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  let body;
  if (list.error) body = <ErrorState error={list.error} onRetry={list.reload} title={t.library.loadError} />;
  else if (!list.data) body = <Loading rows={6} />;
  else
    body = (
      <>
        <div className="lib-tools">
          <div className="field lib-search">
            <label className="label" htmlFor={searchId}>
              {t.library.search}
            </label>
            <div className="input-icon">
              <Icon name="search" />
              <input
                id={searchId}
                className="input"
                type="search"
                value={query}
                placeholder={t.library.searchPlaceholder}
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <span className="label" id={groupsId}>
              {t.library.groupFilter}
            </span>
            <div className="chips" role="group" aria-labelledby={groupsId}>
              {(['all', ...groups] as const).map((g) => (
                <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
                  {g === 'all' ? t.library.allGroups : t.library.groups[g]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="lib-count" role="status">
          {shown.length ? t.library.results(shown.length) : t.library.noResults}
        </p>
        {shown.length > 0 && (
          <ul className="lib-list">
            {shown.map((e, i) => {
              const as = addedAs(config, e.id, e.label);
              const on = picked.includes(e.id);
              const head = group === 'all' && (i === 0 || shown[i - 1].group !== e.group);
              return (
                <li key={e.id} className={`lib-row${as ? ' is-added' : ''}${on ? ' is-on' : ''}${head ? ' has-head' : ''}`}>
                  {head && (
                    <span className="lib-group" aria-hidden="true">
                      {t.library.groups[e.group]}
                    </span>
                  )}
                  <label className="lib-pick">
                    <input type="checkbox" checked={on || !!as} disabled={!!as} onChange={(ev) => toggle(e.id, ev.target.checked)} />
                    <span className="lib-name">
                      <span className="lib-label">{e.label}</span>
                      {e.provider && <span className="lib-provider">{e.provider}</span>}
                    </span>
                    <CategoryTag id={e.category} />
                    <span className="lib-cookies">{t.library.cookieCount(e.cookies.length)}</span>
                    {as && <span className="lib-added">{as === e.id ? t.library.added : t.library.addedAs(as)}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {newCats.length > 0 && (
          <p className="notice notice-ink lib-cats-note" role="status">
            {t.library.willAddCategories(newCats.length, catList)}
          </p>
        )}
      </>
    );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={t.library.dialogTitle}
      footer={
        <>
          <span className="dialog-foot-note">{picked.length ? t.library.selected(picked.length) : ''}</span>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button icon="plus" disabled={!chosen.length} onClick={() => onAdd(chosen)}>
            {t.library.addN(chosen.length)}
          </Button>
        </>
      }
    >
      {body}
    </Dialog>
  );
}
