import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../../api/client';
import { revisions } from '../../../api/endpoints';
import type { ConfigIssue, RevisionSummary } from '../../../api/types';
import { Dialog } from '../../../components/Dialog';
import { Icon } from '../../../components/Icon';
import { Button, Field, errorMessage } from '../../../components/ui';
import { useT } from '../../../i18n';
import { todayRevision } from '../../../lib/format';
import { IssueList } from './IssueList';

export function PublishDialog({
  open,
  siteId,
  onClose,
  beforePublish,
  onPublished,
  onIssues,
}: {
  open: boolean;
  siteId: string;
  onClose: () => void;
  /** Flush the pending autosave so the server publishes what is on screen. */
  beforePublish: () => Promise<void>;
  onPublished: (r: RevisionSummary) => void;
  onIssues: (issues: ConfigIssue[]) => void;
}) {
  const t = useT();
  const [revision, setRevision] = useState(todayRevision());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ConfigIssue[]>([]);

  useEffect(() => {
    if (open) {
      setRevision(todayRevision());
      setNote('');
      setError(null);
      setIssues([]);
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setIssues([]);
    try {
      await beforePublish();
      const r = await revisions.publish(siteId, { revision: revision.trim() || undefined, note: note.trim() || undefined });
      onPublished(r);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(t.config.publishBlocked);
        setIssues(err.issues);
        onIssues(err.issues);
      } else setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.config.publishTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="publish-form" icon="stamp" busy={busy}>
            {busy ? t.config.publishing : t.config.publishConfirm}
          </Button>
        </>
      }
    >
      <form id="publish-form" className="stack" onSubmit={submit} noValidate>
        <p>{t.config.publishLead}</p>
        {error && (
          <div className="form-error" role="alert">
            <Icon name="alert" />
            <div>
              <p>{error}</p>
              {issues.length > 0 && <IssueList issues={issues} />}
            </div>
          </div>
        )}
        <Field label={t.config.revisionId} hint={t.config.revisionIdHint}>
          {(p) => <input {...p} className="input mono" value={revision} onChange={(e) => setRevision(e.target.value)} spellCheck={false} />}
        </Field>
        <Field label={<>{t.config.note} <span className="dim">({t.common.optional})</span></>}>
          {(p) => <textarea {...p} className="input" rows={2} value={note} placeholder={t.config.notePlaceholder} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </form>
    </Dialog>
  );
}
