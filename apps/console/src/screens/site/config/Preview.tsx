import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { EasyCookieConfig } from '@easy-cookie/core/shared';
import { useT } from '../../../i18n';
import { useDebounced } from '../../../lib/hooks';
import { DEVICES, fitViewport, previewConfig, previewDocument, readDevice, storeDevice, type Device } from '../../../lib/preview';

type State = 'loading' | 'ready' | 'unavailable';
type View = 'banner' | 'preferences';

/** Stage padding around the scaled viewport, in px (matches .preview-stage). */
const PAD = 14;
/** Chrome strip drawn above the viewport (address bar), in px. */
const CHROME = 22;

/** Inner size of the stage, following resizes. */
function useStageSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * Live preview: an iframe running the real core runtime with the draft.
 * The frame is laid out at a real device viewport (desktop 1280×800, phone
 * 390×780) and scaled down with a transform, so the banner position reads the
 * way visitors will see it. The runtime is not designed to be re-initialised,
 * so every (debounced) change remounts the frame and posts the config once it
 * is ready.
 */
export function Preview({ config, lang, domain }: { config: EasyCookieConfig; lang: string; domain?: string }) {
  const t = useT();
  const [state, setState] = useState<State>('loading');
  const [view, setView] = useState<View>('banner');
  const [device, setDeviceState] = useState<Device>(readDevice);
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const size = useStageSize(stage);
  const settled = useDebounced(config, 600);
  const runConfig = useMemo(() => previewConfig(settled, lang), [settled, lang]);
  const key = useMemo(() => JSON.stringify([runConfig, view, device]), [runConfig, view, device]);
  const doc = useMemo(() => previewDocument(window.location.origin), []);
  const unavailable = useRef(false);
  // `key` encodes all three; the frame only restarts when what it shows changes.
  const run = useRef({ runConfig, view });
  run.current = { runConfig, view };

  const dev = DEVICES[device];
  const fit = fitViewport(dev, {
    width: size.width - PAD * 2 - 2,
    maxHeight: device === 'mobile' ? size.height - PAD * 2 - CHROME : undefined,
  });

  const setDevice = (d: Device) => {
    setDeviceState(d);
    storeDevice(d);
  };

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
      if (type === 'ec-preview:ready')
        frame.current.contentWindow?.postMessage({ type: 'ec-preview:run', config: run.current.runConfig, view: run.current.view }, '*');
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
  }, [key]);

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
      <div className="preview-bar">
        <div className="seg seg-sm" role="group" aria-label={t.config.device}>
          {(['desktop', 'mobile'] as const).map((d) => (
            <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>
              {t.config.devices[d]}
            </button>
          ))}
        </div>
        <span className="preview-meta mono" aria-hidden={fit.scale === 0 || undefined}>
          {fit.scale > 0 ? t.config.viewport(dev.width, dev.height, Math.round(fit.scale * 100)) : `${dev.width} × ${dev.height}`}
        </span>
      </div>
      <div
        ref={stage}
        className={`preview-stage preview-${device}`}
        style={device === 'desktop' && fit.height ? { height: fit.height + CHROME + PAD * 2 } : undefined}
      >
        {state === 'unavailable' ? (
          <div className="preview-off">
            <p className="state-title">{t.config.previewUnavailable}</p>
            <p className="hint">{t.config.previewUnavailableLead}</p>
          </div>
        ) : (
          <>
            <div className="device" style={{ width: fit.width || undefined, visibility: fit.scale ? undefined : 'hidden' }}>
              <div className="device-chrome" aria-hidden="true">
                <i />
                <i />
                <i />
                {domain && <span className="device-url">{domain}</span>}
              </div>
              <div className="device-viewport" style={{ width: fit.width || undefined, height: fit.height || undefined }}>
                <iframe
                  key={key}
                  ref={frame}
                  title={t.config.previewFrameTitle}
                  srcDoc={doc}
                  className="preview-frame"
                  style={{ width: dev.width, height: dev.height, transform: `scale(${fit.scale || 1})` }}
                />
              </div>
            </div>
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
