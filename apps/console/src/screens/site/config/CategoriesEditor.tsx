import { useState } from 'react';
import { KNOWN_CATEGORIES, type GcmSignal } from '@easy-cookie/core/shared';
import { Button, Check, Field } from '../../../components/ui';
import { useT } from '../../../i18n';
import { ID_PATTERN, freeId, getLoc, renameKey, servicesUsing, setIn } from '../../../lib/configEdit';
import { IdField, LocField, type EditorProps } from './shared';

export const GCM_SIGNALS: GcmSignal[] = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
];

export function CategoriesEditor({ config, update, lang, defaultLang }: EditorProps) {
  const t = useT();
  const ids = Object.keys(config.categories ?? {});
  const [newId, setNewId] = useState('');
  const suggestion = Object.keys(KNOWN_CATEGORIES).find((k) => !ids.includes(k)) ?? freeId(ids, 'category');
  const newErr = newId && (!ID_PATTERN.test(newId) ? t.config.idInvalid : ids.includes(newId) ? t.config.idTaken : null);

  const validateRename = (from: string) => (v: string) =>
    !ID_PATTERN.test(v) ? t.config.idInvalid : v !== from && ids.includes(v) ? t.config.idTaken : null;

  const rename = (from: string, to: string) =>
    update((c) => {
      let next = { ...c, categories: renameKey(c.categories, from, to) };
      for (const [sid, s] of Object.entries(next.services ?? {}))
        if (s.category === from) next = setIn(next, ['services', sid, 'category'], to);
      return next;
    });

  const add = () => {
    const id = newId || suggestion;
    if (!ID_PATTERN.test(id) || ids.includes(id)) return;
    update((c) => setIn(c, ['categories', id], {}));
    setNewId('');
  };

  return (
    <div className="blocks">
      {ids.length === 0 && <p className="hint">{t.config.noCategories}</p>}
      {ids.map((id) => {
        const cat = config.categories[id];
        const known = KNOWN_CATEGORIES[id];
        const usedBy = servicesUsing(config, id);
        const gcm = cat.gcm ?? known?.gcm ?? [];
        const knownTitle = known?.title[lang as 'it' | 'en'];
        const knownDesc = known?.description[lang as 'it' | 'en'];
        return (
          <fieldset className="block" key={id}>
            <legend className="block-legend">
              <span className="mono">{id}</span>
              <span className="block-title">{getLoc(cat.title, lang, defaultLang) || knownTitle || ''}</span>
            </legend>
            <div className="row row-end">
              <IdField label={t.config.categoryId} value={id} validate={validateRename(id)} onCommit={(to) => rename(id, to)} />
              <Check label={t.config.readOnly} checked={!!cat.readOnly} onChange={(v) => update((c) => setIn(c, ['categories', id, 'readOnly'], v || undefined))} />
              <div className="row-push">
                <Button
                  variant="quiet"
                  icon="trash"
                  disabled={usedBy.length > 0}
                  aria-label={t.config.removeCategory(id)}
                  title={usedBy.length ? t.config.categoryUsedBy(usedBy.join(', ')) : undefined}
                  onClick={() => update((c) => setIn(c, ['categories', id], undefined))}
                >
                  {t.common.remove}
                </Button>
              </div>
            </div>
            {usedBy.length > 0 && <p className="hint">{t.config.categoryUsedBy(usedBy.join(', '))}</p>}
            {usedBy.length === 0 && !cat.readOnly && Object.keys(config.services ?? {}).length > 0 && (
              <p className="hint">{t.config.categoryHidden}</p>
            )}
            <div className="grid-2">
              <LocField
                label={t.config.titleField}
                value={cat.title}
                lang={lang}
                defaultLang={defaultLang}
                placeholder={knownTitle}
                onChange={(v) => update((c) => setIn(c, ['categories', id, 'title'], v))}
              />
              <LocField
                label={t.config.descriptionField}
                value={cat.description}
                lang={lang}
                defaultLang={defaultLang}
                placeholder={knownDesc}
                multiline
                onChange={(v) => update((c) => setIn(c, ['categories', id, 'description'], v))}
              />
            </div>
            <fieldset className="subgroup">
              <legend className="label">{t.config.gcmSignals}</legend>
              <div className="checks">
                {GCM_SIGNALS.map((s) => (
                  <Check
                    key={s}
                    mono
                    label={s}
                    checked={gcm.includes(s)}
                    onChange={(on) =>
                      update((c) => {
                        const base = c.categories[id].gcm ?? known?.gcm ?? [];
                        const list = on ? [...base.filter((x) => x !== s), s] : base.filter((x) => x !== s);
                        return setIn(c, ['categories', id, 'gcm'], GCM_SIGNALS.filter((x) => list.includes(x)));
                      })
                    }
                  />
                ))}
              </div>
            </fieldset>
          </fieldset>
        );
      })}
      <div className="adder">
        <Field label={t.config.newCategoryId} error={newErr || undefined}>
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
        <Button variant="ghost" icon="plus" onClick={add} disabled={!!newErr}>
          {t.config.addCategory}
        </Button>
      </div>
    </div>
  );
}
