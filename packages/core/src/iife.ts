import EasyCookie from './index';
import { renderHeadScript, resolveConfig, consentFromCookieHeader } from './shared';

// `window.EasyCookie` for <script> and embed.js users.
const g = window as any;
g.EasyCookie = Object.assign(EasyCookie, { renderHeadScript, resolveConfig, consentFromCookieHeader });
