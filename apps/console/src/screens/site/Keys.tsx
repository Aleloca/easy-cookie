import { useState } from 'react';
import { sites } from '../../api/endpoints';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/Shell';
import { Button, CopyBlock, errorMessage } from '../../components/ui';
import { useT } from '../../i18n';
import { useTitle } from '../../lib/hooks';
import { ciSnippet, embedSnippet, nextSnippet, serverOrigin } from '../../lib/snippets';
import { useSite } from './SiteLayout';

/** `https://host[:port]` with no path, or `*`. */
export function isValidOrigin(o: string): boolean {
  if (o === '*') return true;
  try {
    const u = new URL(o);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.origin === o.replace(/\/$/, '');
  } catch {
    return false;
  }
}

function OriginsEditor() {
  const { site, setSite } = useSite();
  const t = useT();
  const [list, setList] = useState<string[]>(site.origins);
  const [draft, setDraft] = useState('');
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const changed = JSON.stringify(list) !== JSON.stringify(site.origins);

  const add = () => {
    const o = draft.trim().replace(/\/$/, '');
    if (!o) return;
    if (!isValidOrigin(o)) {
      setDraftErr(t.keys.originInvalid);
      return;
    }
    if (!list.includes(o)) setList([...list, o]);
    setDraft('');
    setDraftErr(null);
    setMsg(null);
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const updated = await sites.update(site.id, { origins: list });
      setSite(updated);
      setMsg({ kind: 'ok', text: t.keys.originsSaved });
    } catch (e) {
      setMsg({ kind: 'error', text: errorMessage(e, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section" aria-labelledby="origins-h">
      <h2 id="origins-h" className="section-title">
        {t.keys.origins}
      </h2>
      <p className="section-lead">{t.keys.originsLead}</p>
      {list.includes('*') && (
        <p className="warn-line" role="note">
          <Icon name="alert" />
          {t.keys.wildcardWarning}
        </p>
      )}
      {list.length === 0 ? (
        <p className="hint">{t.keys.noOrigins}</p>
      ) : (
        <ul className="origins">
          {list.map((o) => (
            <li key={o}>
              <code className="mono">{o}</code>
              <button type="button" className="icon-btn" aria-label={t.keys.removeOrigin(o)} onClick={() => setList(list.filter((x) => x !== o))}>
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="adder">
        <div className={`field${draftErr ? ' field-invalid' : ''}`}>
          <label className="label" htmlFor="origin-new">
            {t.keys.addOrigin}
          </label>
          <input
            id="origin-new"
            className="input mono"
            value={draft}
            placeholder={t.keys.originPlaceholder}
            inputMode="url"
            spellCheck={false}
            autoCapitalize="off"
            aria-invalid={draftErr ? true : undefined}
            aria-describedby={draftErr ? 'origin-new-err' : undefined}
            onChange={(e) => {
              setDraft(e.target.value);
              setDraftErr(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          {draftErr && (
            <p className="field-error" id="origin-new-err">
              {draftErr}
            </p>
          )}
        </div>
        <Button variant="ghost" icon="plus" onClick={add}>
          {t.common.add}
        </Button>
      </div>
      <div className="row">
        <Button onClick={save} disabled={!changed} busy={busy}>
          {busy ? t.common.saving : t.keys.saveOrigins}
        </Button>
        {msg && (
          <span className={msg.kind === 'ok' ? 'ok-msg' : 'field-error'} role="status">
            {msg.text}
          </span>
        )}
      </div>
    </section>
  );
}

export function Keys() {
  const { site } = useSite();
  const t = useT();
  useTitle(`${t.keys.title} · ${site.domain}`);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const origin = serverOrigin();

  const rotate = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await sites.rotateSecret(site.id);
      setSecret(r.secretKey);
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };
  const closeDialog = () => {
    setConfirm(false);
    setSecret(null);
    setError(null);
  };

  return (
    <>
      <PageHeader crumbs={[{ label: site.domain, to: `/sites/${site.id}` }, { label: t.keys.title }]} title={t.keys.title} />
      <div className="pad keys">
        <section className="section" aria-labelledby="pk-h">
          <h2 id="pk-h" className="section-title">
            {t.keys.publicKey}
          </h2>
          <CopyBlock label={t.keys.publicKey} value={site.publicKey} hint={t.keys.publicKeyLead} hideLabel />
        </section>
        <section className="section" aria-labelledby="sk-h">
          <h2 id="sk-h" className="section-title">
            {t.keys.secretKey}
          </h2>
          <p className="section-lead">{t.keys.secretLead}</p>
          <div className="row">
            <code className="code code-line code-muted">{t.keys.hidden}</code>
            <Button variant="ghost" icon="refresh" onClick={() => setConfirm(true)}>
              {t.keys.rotate}
            </Button>
          </div>
        </section>
        <OriginsEditor />
        <section className="section" aria-labelledby="snip-h">
          <h2 id="snip-h" className="section-title">
            {t.keys.snippets}
          </h2>
          <div className="snippets">
            <CopyBlock label={t.keys.snippetEmbed} value={embedSnippet(origin, site.publicKey)} hint={t.keys.snippetEmbedHint} multiline />
            <CopyBlock label={t.keys.snippetNext} value={nextSnippet(origin, site.publicKey)} hint={t.keys.snippetNextHint} multiline />
            <CopyBlock label={t.keys.snippetCi} value={ciSnippet(origin)} hint={t.keys.snippetCiHint} multiline />
          </div>
        </section>
      </div>
      <Dialog
        open={confirm}
        onClose={closeDialog}
        title={secret ? t.keys.newSecret : t.keys.rotateTitle}
        dismissable={!secret}
        footer={
          secret ? (
            <Button onClick={closeDialog}>{t.createSite.confirmCopied}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={closeDialog}>
                {t.common.cancel}
              </Button>
              <Button variant="danger" onClick={rotate} busy={busy}>
                {busy ? t.keys.rotating : t.keys.rotateConfirm}
              </Button>
            </>
          )
        }
      >
        {secret ? (
          <>
            <p className="secret-warning">
              <Icon name="key" />
              {t.createSite.secretOnce}
            </p>
            <CopyBlock label={t.keys.newSecret} value={secret} secret />
          </>
        ) : (
          <>
            <p>{t.keys.rotateLead}</p>
            {error && (
              <p className="form-error" role="alert">
                <Icon name="alert" />
                {error}
              </p>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
