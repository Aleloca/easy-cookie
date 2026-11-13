import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../../api/client';
import { legal } from '../../../api/endpoints';
import type { LegalKind, LegalVersionSummary } from '../../../api/types';
import { Dialog } from '../../../components/Dialog';
import { Icon } from '../../../components/Icon';
import { Button, Field, errorMessage } from '../../../components/ui';
import { useT } from '../../../i18n';
import { todayRevision } from '../../../lib/format';

const VERSION_ID = /^[A-Za-z0-9._-]{1,64}$/;

/** Same grammar as the banner's PublishDialog: an ID, a note, then the stamp. */
export function LegalPublishDialog({
  open,
  siteId,
  kind,
  placeholders,
  onClose,
  beforePublish,
  onPublished,
}: {
  open: boolean;
  siteId: string;
  kind: LegalKind;
  placeholders: number;
  onClose: () => void;
  beforePublish: () => Promise<void>;
  onPublished: (v: Omit<LegalVersionSummary, 'publishedBy'>) => void;
}) {
  const t = useT();
  const [version, setVersion] = useState(todayRevision());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVersion(todayRevision());
      setNote('');
      setError(null);
      setFieldError(null);
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = version.trim();
    if (v && !VERSION_ID.test(v)) {
      setFieldError(t.legal.versionInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    setFieldError(null);
    try {
      await beforePublish();
      // The default date id lets the server add -2, -3… on collision; a typed id must be new.
      const explicit = v && v !== todayRevision() ? v : undefined;
      onPublished(await legal.publish(siteId, kind, { version: explicit, note: note.trim() || undefined }));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'version_exists') setFieldError(t.legal.versionExists);
      else if (err instanceof ApiError && err.code === 'invalid_version') setFieldError(t.legal.versionInvalid);
      else if (err instanceof ApiError && err.code === 'empty_document') setError(t.legal.emptyDocument);
      else setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.legal.publishTitle(t.legal.kinds[kind])}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="legal-publish-form" icon="stamp" busy={busy}>
            {busy ? t.legal.publishing : t.legal.publishConfirm}
          </Button>
        </>
      }
    >
      <form id="legal-publish-form" className="stack" onSubmit={submit} noValidate>
        <p>{t.legal.publishLead}</p>
        {placeholders > 0 && (
          <p className="warn-line" role="note">
            <Icon name="alert" />
            {t.legal.publishWarn(placeholders)}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            <Icon name="alert" />
            {error}
          </p>
        )}
        <Field label={t.legal.versionId} hint={t.legal.versionIdHint} error={fieldError ?? undefined}>
          {(p) => (
            <input
              {...p}
              className="input mono"
              value={version}
              maxLength={64}
              spellCheck={false}
              onChange={(e) => {
                setVersion(e.target.value);
                setFieldError(null);
              }}
            />
          )}
        </Field>
        <Field label={<>{t.legal.note} <span className="dim">({t.common.optional})</span></>}>
          {(p) => <textarea {...p} className="input" rows={2} value={note} placeholder={t.legal.notePlaceholder} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}
