import type { EasyCookieConfig } from '@easy-cookie/core/shared';

export const PREVIEW_COOKIE = 'ec_console_preview';

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
  .host{max-width:640px;margin:0 auto;padding:28px 22px}
  .bar{height:12px;background:#e9ebe7;margin:0 0 10px}
  .hd{height:22px;width:55%;background:#d9dcd6;margin:0 0 22px}
  .img{height:150px;background:#eef0ec;margin:18px 0}
</style></head>
<body><div class="host" aria-hidden="true"><div class="hd"></div><div class="bar"></div><div class="bar" style="width:92%"></div><div class="bar" style="width:84%"></div><div class="img"></div><div class="bar"></div><div class="bar" style="width:76%"></div><div class="bar" style="width:88%"></div></div>
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
