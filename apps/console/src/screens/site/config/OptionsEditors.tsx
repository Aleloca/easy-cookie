import { useEffect, useState } from 'react';
import { DEFAULT_COOKIE_NAME, DEFAULT_EXPIRY_DAYS, DEFAULT_GCM_EVENT, DEFAULT_TEXTS, DEFAULT_WAIT_FOR_UPDATE, type EasyCookieConfig, type Texts, type UiOptions, type UiPosition } from '@easy-cookie/core/shared';
import { Button, Check, Field } from '../../../components/ui';
import { useT } from '../../../i18n';
import { getIn, setIn, setInPruned } from '../../../lib/configEdit';
import { LinesField, LocField, NumberField, SelectField, TextField, type EditorProps } from './shared';

/* ----------------------------------------------------------------- Texts */

const LONG = new Set(['description', 'intro', 'blocked']);

export function TextsEditor({ config, update, lang }: EditorProps) {
  const t = useT();
  const defaults: Texts = (DEFAULT_TEXTS as Record<string, Texts>)[lang] ?? DEFAULT_TEXTS.en;
  const groups = Object.keys(defaults) as (keyof Texts)[];
  return (
    <div className="blocks">
      <p className="hint">{t.config.textsLead}</p>
      {groups.map((g) => (
        <fieldset className="block" key={g}>
          <legend className="block-legend">
            <span className="block-title">{t.config.textGroups[g]}</span>
            <span className="mono dim">texts.{lang}.{g}</span>
          </legend>
          <div className="grid-2">
            {Object.entries(defaults[g]).map(([k, def]) => {
              const path = ['texts', lang, g, k];
              const v = (getIn(config, path) as string | undefined) ?? '';
              return (
                <Field key={k} label={<span className="mono">{k}</span>} className={LONG.has(k) ? 'span-2' : undefined}>
                  {(p) =>
                    LONG.has(k) ? (
                      <textarea {...p} className="input" rows={3} value={v} placeholder={def as string} onChange={(e) => update((c) => setInPruned(c, path, e.target.value || undefined))} />
                    ) : (
                      <input {...p} className="input" value={v} placeholder={def as string} onChange={(e) => update((c) => setInPruned(c, path, e.target.value || undefined))} />
                    )
                  }
                </Field>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ Consent Mode */

export function GcmEditor({ config, update }: EditorProps) {
  const t = useT();
  const g = config.googleConsentMode ?? { enabled: false };
  const set = (k: string, v: unknown) => update((c) => setIn(c, ['googleConsentMode', k], v));
  return (
    <div className="blocks">
      <fieldset className="block">
        <legend className="block-legend">
          <span className="block-title">Google Consent Mode v2</span>
          <span className="mono dim">googleConsentMode</span>
        </legend>
        <Check label={t.config.gcmEnabled} checked={!!g.enabled} onChange={(v) => update((c) => setIn(c, ['googleConsentMode', 'enabled'], v))} />
        <p className="hint">{t.config.gcmLead}</p>
        <div className="grid-2" aria-disabled={!g.enabled || undefined}>
          <NumberField label={t.config.waitForUpdate} value={g.waitForUpdate} min={0} placeholder={String(DEFAULT_WAIT_FOR_UPDATE)} onChange={(v) => set('waitForUpdate', v)} />
          <LinesField label={t.config.region} hint={t.config.regionHint} value={g.region} rows={1} separator=", " onChange={(v) => set('region', v)} />
          <TextField label={t.config.dataLayerName} value={g.dataLayerName} mono placeholder="dataLayer" onChange={(v) => set('dataLayerName', v)} />
          <TextField label={t.config.eventName} value={g.eventName} mono placeholder={DEFAULT_GCM_EVENT} onChange={(v) => set('eventName', v)} />
        </div>
        <div className="checks checks-col">
          <Check label={t.config.adsDataRedaction} checked={!!g.adsDataRedaction} onChange={(v) => set('adsDataRedaction', v || undefined)} />
          <Check label={t.config.urlPassthrough} checked={!!g.urlPassthrough} onChange={(v) => set('urlPassthrough', v || undefined)} />
        </div>
      </fieldset>
    </div>
  );
}

/* ---------------------------------------------------------------- UI */

const POSITIONS: UiPosition[] = ['bottom-left', 'bottom-right', 'bottom', 'center'];

export function UiEditor({ config, update }: EditorProps) {
  const t = useT();
  const ui: UiOptions = config.ui ?? {};
  const reopen = ui.reopenButton ?? true;
  const reopenObj = typeof reopen === 'object' ? reopen : {};
  const reopenOn = reopen !== false;
  const setReopen = (patch: Record<string, unknown>) =>
    update((c) => {
      const cur = c.ui?.reopenButton;
      const base = typeof cur === 'object' ? cur : {};
      const next = { ...base, ...patch };
      for (const k of Object.keys(next)) if ((next as Record<string, unknown>)[k] === undefined) delete (next as Record<string, unknown>)[k];
      return setIn(c, ['ui', 'reopenButton'], Object.keys(next).length ? next : true);
    });
  return (
    <div className="blocks">
      <fieldset className="block">
        <legend className="block-legend">
          <span className="block-title">{t.config.position}</span>
          <span className="mono dim">ui.position</span>
        </legend>
        <div className="radios" role="radiogroup" aria-label={t.config.position}>
          {POSITIONS.map((p) => (
            <label key={p} className={`radio-card${(ui.position ?? 'bottom-left') === p ? ' is-on' : ''}`}>
              <input type="radio" name="ui-position" value={p} checked={(ui.position ?? 'bottom-left') === p} onChange={() => update((c) => setIn(c, ['ui', 'position'], p))} />
              <span className={`pos-glyph pos-${p}`} aria-hidden="true">
                <i />
              </span>
              <span>{t.config.positions[p]}</span>
            </label>
          ))}
        </div>
        <div className="grid-2">
          <SelectField
            label={t.config.colorScheme}
            value={ui.colorScheme ?? 'light'}
            options={(['light', 'dark', 'auto'] as const).map((v) => ({ value: v, label: t.config.schemes[v] }))}
            onChange={(v) => update((c) => setIn(c, ['ui', 'colorScheme'], v))}
          />
        </div>
      </fieldset>
      <fieldset className="block">
        <legend className="block-legend">
          <span className="block-title">{t.config.reopenButton}</span>
          <span className="mono dim">ui.reopenButton</span>
        </legend>
        <Check label={t.config.reopenButton} checked={reopenOn} onChange={(v) => update((c) => setIn(c, ['ui', 'reopenButton'], v ? true : false))} />
        {reopenOn && (
          <div className="grid-2">
            <SelectField
              label={t.config.reopenPosition}
              value={reopenObj.position ?? 'bottom-left'}
              options={(['bottom-left', 'bottom-right'] as const).map((v) => ({ value: v, label: t.config.positions[v] }))}
              onChange={(v) => setReopen({ position: v })}
            />
            <LinesField label={t.config.hideOn} hint={t.config.hideOnHint} value={reopenObj.hideOn} onChange={(v) => setReopen({ hideOn: v })} />
          </div>
        )}
      </fieldset>
      <fieldset className="block">
        <legend className="block-legend">
          <span className="block-title">{t.config.tabs.ui}</span>
          <span className="mono dim">ui</span>
        </legend>
        <div className="checks checks-col">
          <Check label={t.config.reloadOnWithdraw} checked={ui.reloadOnWithdraw ?? true} onChange={(v) => update((c) => setIn(c, ['ui', 'reloadOnWithdraw'], v))} />
          <Check label={t.config.serviceToggles} checked={ui.serviceToggles ?? true} onChange={(v) => update((c) => setIn(c, ['ui', 'serviceToggles'], v))} />
        </div>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------ Cookie & languages */

export function CookieEditor({ config, update, lang, defaultLang }: EditorProps) {
  const t = useT();
  const ck = config.cookie ?? {};
  const language = config.language ?? { default: defaultLang };
  const auto = language.autoDetect === false ? 'off' : (language.autoDetect ?? 'document');
  return (
    <div className="blocks">
      <fieldset className="block">
        <legend className="block-legend">
          <span className="block-title">{t.config.groupRevision}</span>
        </legend>
        <div className="grid-2">
          <Field label={t.config.revisionField} hint={t.config.revisionHint}>
            {(p) => <input {...p} className="input mono" value={config.revision} readOnly />}
          </Field>
          <NumberField
            label={t.config.expiryDays}
            hint={t.config.expiryHint}
            value={config.expiryDays}
            min={1}
            max={395}
            placeholder={String(DEFAULT_EXPIRY_DAYS)}
            onChange={(v) => update((c) => setIn(c, ['expiryDays'], v))}
          />
          <LocField label={t.config.policyUrl} value={config.policyUrl} lang={lang} defaultLang={defaultLang} placeholder="/cookie-policy" onChange={(v) => update((c) => setIn(c, ['policyUrl'], v))} />
          <div className="field field-check">
            <Check label={t.config.respectGpc} checked={config.respectGpc ?? true} onChange={(v) => update((c) => setIn(c, ['respectGpc'], v))} />
          </div>
        </div>
      </fieldset>
      <fieldset className="block">
        <legend className="block-legend">
          <span className="block-title">{t.config.groupCookie}</span>
          <span className="mono dim">cookie</span>
        </legend>
        <div className="grid-2">
          <TextField label={t.config.cookieNameField} value={ck.name} mono placeholder={DEFAULT_COOKIE_NAME} onChange={(v) => update((c) => setInPruned(c, ['cookie', 'name'], v))} />
          <TextField label={t.config.cookieDomain} value={ck.domain} mono placeholder=".esempio.it" onChange={(v) => update((c) => setInPruned(c, ['cookie', 'domain'], v))} />
          <TextField label={t.config.cookiePath} value={ck.path} mono placeholder="/" onChange={(v) => update((c) => setInPruned(c, ['cookie', 'path'], v))} />
          <SelectField
            label={t.config.sameSite}
            value={ck.sameSite ?? 'Lax'}
            options={(['Lax', 'Strict', 'None'] as const).map((v) => ({ value: v, label: v }))}
            onChange={(v) => update((c) => setInPruned(c, ['cookie', 'sameSite'], v))}
          />
        </div>
        <Check label={t.config.secure} checked={ck.secure ?? true} onChange={(v) => update((c) => setIn(c, ['cookie', 'secure'], v))} />
      </fieldset>
      <fieldset className="block">
        <legend className="block-legend">
          <span className="block-title">{t.config.groupLanguages}</span>
          <span className="mono dim">language</span>
        </legend>
        <div className="grid-2">
          <TextField label={t.config.defaultLanguage} value={language.default} mono placeholder="it" onChange={(v) => update((c) => setIn(c, ['language', 'default'], v ?? ''))} />
          <LinesField
            label={t.config.availableLanguages}
            hint={t.config.availableHint}
            value={language.available}
            rows={1}
            separator=", "
            onChange={(v) => update((c) => setIn(c, ['language', 'available'], v))}
          />
          <SelectField
            label={t.config.autoDetect}
            value={auto}
            options={(['document', 'browser', 'off'] as const).map((v) => ({ value: v, label: t.config.autoDetects[v] }))}
            onChange={(v) => update((c) => setIn(c, ['language', 'autoDetect'], v === 'off' ? false : v))}
          />
        </div>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------------------ JSON */

export function JsonEditor({ config, update }: { config: EasyCookieConfig; update: EditorProps['update'] }) {
  const t = useT();
  const pretty = JSON.stringify(config, null, 2);
  const [text, setText] = useState(pretty);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  useEffect(() => {
    if (!dirty) setText(pretty);
  }, [pretty, dirty]);

  const apply = () => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setMsg({ kind: 'error', text: t.config.jsonNotObject });
        return;
      }
      update(() => parsed as EasyCookieConfig);
      setDirty(false);
      setMsg({ kind: 'ok', text: t.config.jsonApplied });
    } catch (e) {
      setMsg({ kind: 'error', text: t.config.jsonInvalid((e as Error).message) });
    }
  };

  return (
    <div className="json-editor">
      <Field label={t.config.jsonLabel} error={msg?.kind === 'error' ? msg.text : undefined}>
        {(p) => (
          <textarea
            {...p}
            className="input mono json-area"
            value={text}
            spellCheck={false}
            autoCapitalize="off"
            rows={28}
            onChange={(e) => {
              setText(e.target.value);
              setDirty(true);
              setMsg(null);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') apply();
            }}
          />
        )}
      </Field>
      <div className="row">
        <Button onClick={apply} disabled={!dirty}>
          {t.config.jsonApply}
        </Button>
        {dirty && (
          <Button
            variant="quiet"
            onClick={() => {
              setDirty(false);
              setText(pretty);
              setMsg(null);
            }}
          >
            {t.common.cancel}
          </Button>
        )}
        {msg?.kind === 'ok' && (
          <span className="ok-msg" role="status">
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
