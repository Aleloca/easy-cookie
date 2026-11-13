import { Navigate, Route, Routes } from 'react-router';
import { AuthProvider, RequireAuth } from './auth';
import { Login } from './screens/Login';
import { SitesList } from './screens/SitesList';
import { SiteLayout } from './screens/site/SiteLayout';
import { Overview } from './screens/site/Overview';
import { Register } from './screens/site/Register';
import { ConfigEditor } from './screens/site/ConfigEditor';
import { Revisions } from './screens/site/Revisions';
import { Keys } from './screens/site/Keys';
import { Settings } from './screens/site/Settings';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/sites"
          element={
            <RequireAuth>
              <SitesList />
            </RequireAuth>
          }
        />
        <Route
          path="/sites/:siteId"
          element={
            <RequireAuth>
              <SiteLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="consents" element={<Register />} />
          <Route path="config" element={<ConfigEditor />} />
          <Route path="revisions" element={<Revisions />} />
          <Route path="keys" element={<Keys />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/sites" replace />} />
      </Routes>
    </AuthProvider>
  );
}
