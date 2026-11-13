import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth';
import { Icon } from '../components/Icon';
import { IS_MOCK } from '../components/Shell';
import { Button, Field } from '../components/ui';
import { useI18n } from '../i18n';
import { useTitle } from '../lib/hooks';

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
      <div className="login-band" aria-hidden="true" />
      <main className="login-main" id="main">
        <div className="login-head">
          <div className="login-brand">{t.common.brand}</div>
        </div>
        <div className="login-body">
        <h1>{t.login.title}</h1>
        <p className="login-lead">{t.login.lead}</p>
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
        <div className="login-foot">
          <div className="lang lang-light" role="group" aria-label={t.common.language}>
            {(['it', 'en'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} lang={l}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {IS_MOCK && <span className="mock-badge">{t.common.mockBadge}</span>}
        </div>
        </div>
      </main>
    </div>
  );
}
