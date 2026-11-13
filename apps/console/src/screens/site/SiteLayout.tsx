import { createContext, useContext, type ReactNode } from 'react';
import { Outlet, useParams } from 'react-router';
import { sites as sitesApi } from '../../api/endpoints';
import type { Site } from '../../api/types';
import { Shell } from '../../components/Shell';
import { ErrorState, Loading } from '../../components/ui';
import { useResource } from '../../lib/hooks';

interface SiteCtx {
  site: Site;
  setSite: (s: Site) => void;
  reloadSites: () => void;
}

const Ctx = createContext<SiteCtx | null>(null);

export function useSite(): SiteCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSite outside SiteLayout');
  return v;
}

/** Loads the current site (and the list for the switcher) and renders the shell around the section. */
export function SiteLayout() {
  const { siteId = '' } = useParams();
  const site = useResource(() => sitesApi.get(siteId), [siteId]);
  const list = useResource(() => sitesApi.list(), []);

  let body: ReactNode;
  if (site.error) body = <div className="pad"><ErrorState error={site.error} onRetry={site.reload} /></div>;
  else if (!site.data || site.data.id !== siteId) body = <div className="pad"><Loading /></div>;
  else
    body = (
      <Ctx.Provider value={{ site: site.data, setSite: site.setData, reloadSites: list.reload }}>
        <Outlet />
      </Ctx.Provider>
    );

  return (
    <Shell site={site.data && site.data.id === siteId ? site.data : undefined} sites={list.data}>
      {body}
    </Shell>
  );
}
