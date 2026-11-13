import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { sites } from '../../api/endpoints';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/Shell';
import { Button, Field, errorMessage } from '../../components/ui';
import { useT } from '../../i18n';
import { useTitle } from '../../lib/hooks';
import { useSite } from './SiteLayout';

export function Settings() {
  const { site, setSite, reloadSites } = useSite();
  const t = useT();
  const navigate = useNavigate();
  useTitle(`${t.settings.title} · ${site.domain}`);
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const changed = name.trim() !== site.name || domain.trim() !== site.domain;
  const nameErr = !name.trim() ? t.createSite.required : null;
  const domainErr = !domain.trim() ? t.createSite.required : /[/:]/.test(domain) ? t.createSite.invalidDomain : null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (nameErr || domainErr) return;
    setBusy(true);
    setMsg(null);
    try {
      const s = await sites.update(site.id, { name: name.trim(), domain: domain.trim().toLowerCase() });
      setSite(s);
      reloadSites();
      setMsg({ kind: 'ok', text: t.settings.saved });
    } catch (err) {
      setMsg({ kind: 'error', text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    if (typed.trim() !== site.domain) return;
    setDelBusy(true);
    setDelError(null);
    try {
      await sites.remove(site.id);
      navigate('/sites', { replace: true });
    } catch (err) {
      setDelError(errorMessage(err, t));
      setDelBusy(false);
    }
  };

  return (
    <>
      <PageHeader crumbs={[{ label: site.domain, to: `/sites/${site.id}` }, { label: t.settings.title }]} title={t.settings.title} />
      <div className="pad settings">
        <section className="section" aria-labelledby="gen-h">
          <h2 id="gen-h" className="section-title">
            {t.settings.general}
          </h2>
          <form className="stack form-narrow" onSubmit={save} noValidate>
            <Field label={t.settings.name} error={nameErr}>
              {(p) => <input {...p} className="input" value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label={t.settings.domain} hint={t.createSite.domainHint} error={domainErr}>
              {(p) => <input {...p} className="input mono" value={domain} spellCheck={false} onChange={(e) => setDomain(e.target.value)} />}
            </Field>
            <div className="row">
              <Button type="submit" disabled={!changed || !!nameErr || !!domainErr} busy={busy}>
                {busy ? t.common.saving : t.common.save}
              </Button>
              {msg && (
                <span className={msg.kind === 'ok' ? 'ok-msg' : 'field-error'} role="status">
                  {msg.text}
                </span>
              )}
            </div>
          </form>
        </section>
        <section className="section section-danger" aria-labelledby="del-h">
          <h2 id="del-h" className="section-title">
            {t.settings.danger}
          </h2>
          <p className="section-lead">{t.settings.dangerLead}</p>
          <Button variant="danger" icon="trash" onClick={() => setDeleting(true)}>
            {t.settings.deleteButton}
          </Button>
        </section>
      </div>
      <Dialog
        open={deleting}
        onClose={() => {
          setDeleting(false);
          setTyped('');
          setDelError(null);
        }}
        title={t.settings.deleteTitle}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleting(false);
                setTyped('');
              }}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" form="delete-form" variant="danger" disabled={typed.trim() !== site.domain} busy={delBusy}>
              {delBusy ? t.settings.deleting : t.settings.deleteConfirm}
            </Button>
          </>
        }
      >
        <form id="delete-form" className="stack" onSubmit={remove} noValidate>
          <p>{t.settings.dangerLead}</p>
          {delError && (
            <p className="form-error" role="alert">
              <Icon name="alert" />
              {delError}
            </p>
          )}
          <Field label={t.settings.deleteField} hint={t.settings.deleteLead(site.domain)}>
            {(p) => <input {...p} className="input mono" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />}
          </Field>
        </form>
      </Dialog>
    </>
  );
}
