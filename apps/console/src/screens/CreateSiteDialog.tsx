import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { sites } from '../api/endpoints';
import type { CreatedSite } from '../api/types';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { Button, CopyBlock, Field, errorMessage } from '../components/ui';
import { useT } from '../i18n';
import { lines } from '../lib/configEdit';
import { embedSnippet, serverOrigin } from '../lib/snippets';

const DOMAIN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export function CreateSiteDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [origins, setOrigins] = useState('');
  const [originsTouched, setOriginsTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedSite | null>(null);

  const domainClean = domain.trim().toLowerCase();
  const nameErr = submitted && !name.trim() ? t.createSite.required : null;
  const domainErr = submitted ? (!domainClean ? t.createSite.required : !DOMAIN.test(domainClean) ? t.createSite.invalidDomain : null) : null;
  const suggested = domainClean && DOMAIN.test(domainClean) ? `https://${domainClean}\nhttps://www.${domainClean.replace(/^www\./, '')}` : '';

  const reset = () => {
    setName('');
    setDomain('');
    setOrigins('');
    setOriginsTouched(false);
    setSubmitted(false);
    setError(null);
    setCreated(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim() || !DOMAIN.test(domainClean)) return;
    setBusy(true);
    setError(null);
    try {
      const site = await sites.create({
        name: name.trim(),
        domain: domainClean,
        origins: lines(originsTouched ? origins : suggested),
      });
      setCreated(site);
      onCreated();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Dialog
        open={open}
        onClose={close}
        title={t.createSite.createdTitle}
        wide
        dismissable={false}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              {t.createSite.confirmCopied}
            </Button>
            <Button
              onClick={() => {
                const id = created.id;
                reset();
                onClose();
                navigate(`/sites/${id}/config`);
              }}
            >
              {t.createSite.goToSite}
            </Button>
          </>
        }
      >
        <p className="secret-warning">
          <Icon name="key" />
          {t.createSite.secretOnce}
        </p>
        <CopyBlock label={t.createSite.secretKey} value={created.secretKey} secret />
        <CopyBlock
          label={t.createSite.snippet}
          value={embedSnippet(serverOrigin(), created.publicKey)}
          hint={t.createSite.snippetHint}
          multiline
        />
        <p className="hint">{t.createSite.draftNote}</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t.createSite.title}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="create-site" busy={busy}>
            {busy ? t.createSite.submitting : t.createSite.submit}
          </Button>
        </>
      }
    >
      <form id="create-site" onSubmit={submit} noValidate className="stack">
        {error && (
          <p className="form-error" role="alert">
            <Icon name="alert" />
            {error}
          </p>
        )}
        <Field label={t.createSite.name} error={nameErr}>
          {(p) => (
            <input {...p} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.createSite.namePlaceholder} autoFocus />
          )}
        </Field>
        <Field label={t.createSite.domain} hint={t.createSite.domainHint} error={domainErr}>
          {(p) => (
            <input
              {...p}
              className="input mono"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              inputMode="url"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="esempio.it"
            />
          )}
        </Field>
        <Field label={t.createSite.origins} hint={t.createSite.originsHint}>
          {(p) => (
            <textarea
              {...p}
              className="input mono"
              rows={3}
              value={originsTouched ? origins : suggested}
              onChange={(e) => {
                setOriginsTouched(true);
                setOrigins(e.target.value);
              }}
              spellCheck={false}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
