import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth';
import { Icon } from '../components/Icon';
import { IS_MOCK } from '../components/Shell';
import { Button, Field } from '../components/ui';
import { useI18n } from '../i18n';
import { useTitle } from '../lib/hooks';

/**
 * A small specimen of each section, drawn with the console's own marks: the
 * register's category squares, the banner position glyph, the revision stamp
 * (in words, no invented data) and a ruled document.
 */
const SPECIMENS = [
  <span className="squares" key="r">
    <i className="on" />
    <i className="on" />
    <i />
    <i />
  </span>,
  <span className="pos-glyph pos-bottom-left" key="c">
    <i />
  </span>,
  null, // the stamp, worded in the interface language

  <span className="doc-glyph" key="d">
    <i />
    <i />
    <i />
  </span>,
];

export function Login() {
  const { t, lang, setLang } = useI18n();
  const { status, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get('expired') ? t.login.sessionExpired : null);
  useTitle(t.login.title);

  const next = params.get('next');
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/sites';

  useEffect(() => {
    if (params.get('expired')) setError(t.login.sessionExpired);
  }, [t, params]);

  if (status === 'in' && !busy) return <Navigate to={target} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === 429) setError(t.login.rateLimited);
      else if (err instanceof ApiError && (err.status === 401 || err.status === 400)) setError(t.login.invalid);
      else if (err instanceof ApiError && err.status === 0) setError(t.common.networkError);
      else setError(t.common.genericError(String((err as Error).message)));
    }
  };

  return (
    <div className="login">
      <aside className="login-rail">
        <span className="brand">{t.common.brand}</span>
        <div className="rail-foot">
          <span className="rail-stamp login-version">
            {t.login.version} v{__CONSOLE_VERSION__}
          </span>
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
      </aside>
      <main className="login-main" id="main">
        <div className="login-head">
          <h1>{t.login.title}</h1>
          <p className="login-lead">{t.login.lead}</p>
        </div>
        <div className="login-spread">
        <div className="login-body">
          <form onSubmit={submit} noValidate className="login-form">
            {error && (
              <p className="form-error" role="alert">
                <Icon name="alert" />
                {error}
              </p>
            )}
            <Field label={t.login.email}>
              {(p) => (
                <input
                  {...p}
                  className="input"
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label={t.login.password}>
              {(p) => (
                <input
                  {...p}
                  className="input"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" busy={busy} className="btn-block">
              {busy ? t.login.submitting : t.login.submit}
            </Button>
          </form>
          <p className="hint login-hint">{t.login.hint}</p>
        </div>
        <section className="login-contents" aria-labelledby="contents-h">
          <h2 id="contents-h">{t.login.contentsTitle}</h2>
          <p className="login-contents-lead">{t.login.contentsLead}</p>
          <ol className="contents">
            {t.login.contents.map((c, i) => (
              <li key={c.name}>
                <span className="contents-mark" aria-hidden="true">
                  {i === 2 ? <span className="stamp">{t.login.stampSample}</span> : SPECIMENS[i]}
                </span>
                <div>
                  <h3>{c.name}</h3>
                  <p>{c.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="login-contents-foot">{t.login.selfHosted}</p>
        </section>
        </div>
      </main>
    </div>
  );
}
