import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { setCsrfToken, setUnauthorizedHandler } from './api/client';
import { auth } from './api/endpoints';
import type { AdminUser } from './api/types';
import { Loading } from './components/ui';

type Status = 'loading' | 'in' | 'out';

interface AuthState {
  status: Status;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let live = true;
    auth.me().then(
      (s) => {
        if (!live) return;
        setCsrfToken(s.csrfToken);
        setUser(s.user);
        setStatus('in');
      },
      () => live && setStatus('out'),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('out');
      const next = window.location.pathname.replace(/^\/admin/, '') + window.location.search;
      navigate(`/login?expired=1&next=${encodeURIComponent(next)}`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const s = await auth.login(email, password);
    setCsrfToken(s.csrfToken);
    setUser(s.user);
    setStatus('in');
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setCsrfToken(null);
      setUser(null);
      setStatus('out');
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading')
    return (
      <div className="boot">
        <Loading rows={3} />
      </div>
    );
  if (status === 'out') return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <>{children}</>;
}
