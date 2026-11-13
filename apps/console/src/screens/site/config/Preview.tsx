import { useEffect, useMemo, useRef, useState } from 'react';
import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import { useT } from '../../../i18n';
import { useDebounced } from '../../../lib/hooks';
import { previewConfig, previewDocument } from '../../../lib/preview';

type State = 'loading' | 'ready' | 'unavailable';
type View = 'banner' | 'preferences';

/**
 * Live preview: an iframe running the real core runtime with the draft.
 * The runtime is not designed to be re-initialised, so every (debounced)
 * change remounts the frame and posts the config once it is ready.
 */
export function Preview({ config, lang }: { config: EasyCookieConfig; lang: string }) {
  const t = useT();
  const [state, setState] = useState<State>('loading');
  const [view, setView] = useState<View>('banner');
  const frame = useRef<HTMLIFrameElement>(null);
  const settled = useDebounced(config, 600);
  const runConfig = useMemo(() => previewConfig(settled, lang), [settled, lang]);
  const key = useMemo(() => JSON.stringify([runConfig, view]), [runConfig, view]);
  const doc = useMemo(() => previewDocument(window.location.origin), []);
  const unavailable = useRef(false);

  useEffect(() => {
    if (unavailable.current) return;
    setState('loading');
    const timer = setTimeout(() => {
      unavailable.current = true;
      setState('unavailable');
    }, 6000);
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const type = (e.data as { type?: string } | null)?.type;
      if (type === 'ec-preview:ready') frame.current.contentWindow?.postMessage({ type: 'ec-preview:run', config: runConfig, view }, '*');
      else if (type === 'ec-preview:ran') {
        clearTimeout(timer);
        setState('ready');
      } else if (type === 'ec-preview:unavailable') {
        clearTimeout(timer);
        unavailable.current = true;
        setState('unavailable');
      }
    };
    window.addEventListener('message', onMsg);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
    };
  }, [key, runConfig, view]);

  return (
    <section className="preview" aria-labelledby="preview-h">
      <header className="preview-head">
        <h2 id="preview-h">{t.config.preview}</h2>
        <div className="seg" role="group" aria-label={t.config.preview}>
          {(['banner', 'preferences'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} disabled={state === 'unavailable'}>
              {v === 'banner' ? t.config.previewBanner : t.config.previewPreferences}
            </button>
          ))}
        </div>
      </header>
      <div className="preview-stage">
        {state === 'unavailable' ? (
          <div className="preview-off">
            <p className="state-title">{t.config.previewUnavailable}</p>
            <p className="hint">{t.config.previewUnavailableLead}</p>
          </div>
        ) : (
          <>
            <iframe key={key} ref={frame} title={t.config.previewFrameTitle} srcDoc={doc} className="preview-frame" />
            {state === 'loading' && (
              <p className="preview-loading" role="status">
                {t.config.previewLoading}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
