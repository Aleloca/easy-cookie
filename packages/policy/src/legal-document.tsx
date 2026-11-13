'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { fetchLegalDocument, type FetchLegalDocumentOptions, type PublishedLegalDocument } from './legal-client';

export interface LegalDocumentProps extends Omit<FetchLegalDocumentOptions, 'init'> {
  className?: string;
  /** Shown while loading. */
  loading?: ReactNode;
  /** Shown when nothing is published or the request fails. */
  fallback?: ReactNode;
}

type State = { status: 'loading' | 'missing'; doc?: undefined } | { status: 'ready'; doc: PublishedLegalDocument };

/**
 * Fetch a published legal document in the browser and render it. For
 * server-rendered, indexable pages prefer `getLegalDocument()` (Next.js) or
 * `fetchLegalDocument()` + `<LegalDocumentHtml>`.
 */
export function LegalDocument({
  endpoint,
  siteKey,
  kind,
  lang,
  fetch: fetchImpl,
  className,
  loading = null,
  fallback = null,
}: LegalDocumentProps) {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetchLegalDocument({ endpoint, siteKey, kind, lang, fetch: fetchImpl })
      .then((doc) => alive && setState(doc ? { status: 'ready', doc } : { status: 'missing' }))
      .catch(() => alive && setState({ status: 'missing' }));
    return () => {
      alive = false;
    };
  }, [endpoint, siteKey, kind, lang, fetchImpl]);
  if (state.status !== 'ready') return <>{state.status === 'loading' ? loading : fallback}</>;
  // Same markup as <LegalDocumentHtml>: the server's HTML is already safe.
  return <div className={className} dangerouslySetInnerHTML={{ __html: state.doc.html }} />;
}
