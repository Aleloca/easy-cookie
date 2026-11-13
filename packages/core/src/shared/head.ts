import { resolveConfig, type ResolvedConfig } from './config';
import type { EasyCookieConfig, GcmSignal } from './types';

/**
 * Build the inline `<head>` script that must run before GTM / gtag.
 *
 * It reads the consent cookie synchronously and calls
 * `gtag('consent','default', …)` with the visitor's real stored state
 * (everything denied when there is no valid choice for this revision), so tags
 * fired on `gtm.init` already see the right consent from the second page on.
 *
 * The output is dependency-free ES5, generated from the same config the
 * runtime uses: no hand-copied cookie parsing in host apps.
 */
export function renderHeadScript(config: EasyCookieConfig | ResolvedConfig): string {
  const c = 'resolvedCategories' in config ? (config as ResolvedConfig) : resolveConfig(config);
  const map: Record<string, GcmSignal[]> = {};
  const always: string[] = [];
  const signals = new Set<GcmSignal>(['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage']);
  for (const cat of c.resolvedCategories) {
    map[cat.id] = cat.gcm;
    cat.gcm.forEach((s) => signals.add(s));
    if (cat.readOnly) always.push(cat.id);
  }
  signals.delete('security_storage');

  const data = {
    n: c.cookie.name,
    r: c.revision,
    e: c.expiryDays * 86400000,
    m: map,
    a: always,
    s: Array.from(signals),
    w: c.gcm.waitForUpdate,
    g: c.gcm.region ?? null,
    d: c.gcm.dataLayerName,
    x: c.gcm.adsDataRedaction,
    u: c.gcm.urlPassthrough,
    on: c.gcm.enabled,
  };

  // Keep this ES5 and tiny: it runs render-blocking in <head>.
  return `(function(w,d,o){
var dl=o.d;w[dl]=w[dl]||[];
w.gtag=w.gtag||function(){w[dl].push(arguments);};
var granted=o.a.slice(),state=null;
var i,k,s,v=null,p=d.cookie.split(/;\\s*/);
for(i=0;i<p.length;i++){var q=p[i].indexOf('=');if(q>0&&p[i].slice(0,q)===o.n){v=p[i].slice(q+1);break;}}
try{if(v){if(v.charAt(0)!=='{')v=decodeURIComponent(v);var c=JSON.parse(v);
var ec=c.data&&c.data.ec,t=Date.parse(c.lastConsentTimestamp||c.consentTimestamp);
if(ec&&ec.rev===o.r&&t&&(new Date().getTime()-t)<=o.e){state=c;granted=c.categories||granted;}}}catch(e){}
w.__easyCookieHead={granted:granted,valid:!!state};
if(!o.on)return;
var cs={};
for(i=0;i<o.s.length;i++)cs[o.s[i]]='denied';
for(k in o.m){if(granted.indexOf(k)>-1){s=o.m[k];for(i=0;i<s.length;i++)cs[s[i]]='granted';}}
cs.security_storage='granted';
if(!state)cs.wait_for_update=o.w;
if(o.g)cs.region=o.g;
w.gtag('consent','default',cs);
if(o.x)w.gtag('set','ads_data_redaction',true);
if(o.u)w.gtag('set','url_passthrough',true);
})(window,document,${JSON.stringify(data)});`;
}
