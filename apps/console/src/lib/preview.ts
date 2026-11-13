import type { EasyCookieConfig } from '@easy-cookie/core/shared';

export const PREVIEW_COOKIE = 'ec_console_preview';

export type Device = 'desktop' | 'mobile';
export const DEVICES: Record<Device, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 780 },
};
export const DEVICE_STORAGE_KEY = 'ec-console-preview-device';

export function readDevice(): Device {
  try {
    return localStorage.getItem(DEVICE_STORAGE_KEY) === 'mobile' ? 'mobile' : 'desktop';
  } catch {
    return 'desktop';
  }
}

export function storeDevice(d: Device): void {
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, d);
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

/**
 * How to fit a device viewport into the preview stage: the frame is rendered
 * at the real viewport size and scaled with a CSS transform, never stretched.
 * Width always fits; height fits too when `maxHeight` is given (mobile, so the
 * whole phone is visible). Never scales above 1.
 */
export function fitViewport(
  device: { width: number; height: number },
  available: { width: number; maxHeight?: number },
): { scale: number; width: number; height: number } {
  if (available.width <= 0) return { scale: 0, width: 0, height: 0 };
  let scale = Math.min(1, available.width / device.width);
  if (available.maxHeight && available.maxHeight > 0) scale = Math.min(scale, available.maxHeight / device.height);
  scale = Math.floor(scale * 1000) / 1000;
  return { scale, width: Math.round(device.width * scale), height: Math.round(device.height * scale) };
}

/**
 * Config actually run in the preview: never logs consents to the server,
 * uses its own cookie (so it cannot clash with a real choice on this origin)
 * and always shows the banner in the language being edited.
 */
export function previewConfig(config: EasyCookieConfig, lang: string): EasyCookieConfig {
  const { log: _log, ...rest } = config;
  return {
    ...rest,
    // The revision never changes what the banner looks like; pinning it keeps
    // a publish (which stamps a new revision) from remounting the preview.
    revision: 'preview',
    cookie: { ...rest.cookie, name: PREVIEW_COOKIE, domain: undefined, secure: false },
    language: { ...(rest.language ?? { default: lang }), default: lang, autoDetect: false },
    ui: { ...rest.ui, reloadOnWithdraw: false },
  };
}

/**
 * Document loaded in the preview iframe. It draws a neutral host page, loads
 * the core runtime from `/static`, and runs whatever config the console posts:
 *   parent → frame  { type: 'ec-preview:run', config, view: 'banner' | 'preferences' }
 *   frame → parent  { type: 'ec-preview:ready' | 'ec-preview:unavailable' | 'ec-preview:ran' }
 */
export function previewDocument(origin: string): string {
  const css = `${origin}/static/easy-cookie.css`;
  const js = `${origin}/static/easy-cookie.iife.js`;
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${css}">
<style>
  body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#fff;color:#2a2c30}
  .nav{display:flex;align-items:center;gap:28px;height:64px;padding:0 max(22px,calc((100vw - 1120px)/2));border-bottom:1px solid #e4e6e1}
  .logo{width:112px;height:18px;background:#c9cdc5}
  .links{display:flex;gap:22px;margin-left:auto}
  .links i{display:block;width:58px;height:10px;background:#e1e4de}
  .cta{width:96px;height:32px;background:#d5d9d1}
  .host{max-width:1120px;margin:0 auto;padding:36px 22px 120px}
  .hero{display:grid;grid-template-columns:1.1fr 1fr;gap:40px;align-items:center;margin-bottom:44px}
  .bar{height:12px;background:#e9ebe7;margin:0 0 10px}
  .hd{height:30px;width:80%;background:#d9dcd6;margin:0 0 12px}
  .hd2{height:30px;width:56%;background:#d9dcd6;margin:0 0 22px}
  .img{height:260px;background:#eef0ec}
  .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
  .card .img{height:140px;margin-bottom:14px}
  @media (max-width:720px){
    .links,.cta{display:none}
    .nav{height:56px}
    .host{padding:24px 22px 120px}
    .hero{grid-template-columns:1fr;gap:20px}
    .img{height:170px}
    .cols{grid-template-columns:1fr}
  }
</style></head>
<body><div aria-hidden="true">
<div class="nav"><div class="logo"></div><div class="links"><i></i><i></i><i></i><i></i></div><div class="cta"></div></div>
<div class="host">
<div class="hero"><div><div class="hd"></div><div class="hd2"></div><div class="bar"></div><div class="bar" style="width:92%"></div><div class="bar" style="width:84%"></div></div><div class="img"></div></div>
<div class="cols">
<div class="card"><div class="img"></div><div class="bar"></div><div class="bar" style="width:76%"></div></div>
<div class="card"><div class="img"></div><div class="bar"></div><div class="bar" style="width:88%"></div></div>
<div class="card"><div class="img"></div><div class="bar"></div><div class="bar" style="width:70%"></div></div>
</div></div></div>
<script>
(function(){
  var post=function(m){parent.postMessage(m,'*')};
  var s=document.createElement('script');
  s.src=${JSON.stringify(js)};
  s.onload=function(){ if(window.EasyCookie&&typeof window.EasyCookie.run==='function') post({type:'ec-preview:ready'}); else post({type:'ec-preview:unavailable'}); };
  s.onerror=function(){ post({type:'ec-preview:unavailable'}); };
  window.addEventListener('message',function(e){
    if(e.source!==parent||!e.data||e.data.type!=='ec-preview:run')return;
    document.cookie='${PREVIEW_COOKIE}=; Max-Age=0; path=/';
    try{
      Promise.resolve(window.EasyCookie.run(e.data.config)).then(function(){
        if(e.data.view==='preferences'&&window.EasyCookie.openPreferences) window.EasyCookie.openPreferences();
        else if(window.EasyCookie.showBanner) window.EasyCookie.showBanner();
        post({type:'ec-preview:ran'});
      },function(){ post({type:'ec-preview:unavailable'}); });
    }catch(err){ post({type:'ec-preview:unavailable'}); }
  });
  document.head.appendChild(s);
})();
</script></body></html>`;
}
