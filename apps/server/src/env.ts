import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** apps/server (works from both src/*.ts and the bundled dist/*.js). */
export const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export interface ServerConfig {
  databaseUrl: string;
  port: number;
  /** Interface to listen on (e.g. 127.0.0.1 behind a reverse proxy). Default: all interfaces. */
  host?: string;
  /** Public base URL of this server, without trailing slash. Empty = derive from the request. */
  publicUrl: string;
  adminEmail?: string;
  adminPassword?: string;
  /** Built assets of @easy-cookie/core (easy-cookie.iife.js, easy-cookie.css). */
  staticDir: string;
  /** Build of @easy-cookie/policy; `/static/easy-cookie-legal.css` falls back to it when missing from staticDir. */
  policyDir: string;
  /** Built console SPA, served under /admin. */
  consoleDir: string;
  /** Read the client IP from X-Forwarded-For (behind a reverse proxy). */
  trustProxy: boolean;
  /** Consent records per minute per IP hash per site. */
  rateLimitPerMinute: number;
}

/** Load `.env` from the working directory when present (never overrides real env vars). */
export function loadDotEnv() {
  try {
    process.loadEnvFile?.('.env');
  } catch {
    /* no .env file */
  }
}

const truthy =(v: string | undefined) => !!v && ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    databaseUrl: env.DATABASE_URL ?? '',
    port: Number(env.PORT ?? 8787),
    host: env.HOST || undefined,
    publicUrl: (env.PUBLIC_URL ?? '').replace(/\/+$/, ''),
    adminEmail: env.ADMIN_EMAIL || undefined,
    adminPassword: env.ADMIN_PASSWORD || undefined,
    staticDir: resolve(APP_ROOT, env.STATIC_DIR ?? '../../packages/core/dist'),
    policyDir: resolve(APP_ROOT, env.POLICY_DIR ?? '../../packages/policy/dist'),
    consoleDir: resolve(APP_ROOT, env.CONSOLE_DIR ?? '../console/dist'),
    trustProxy: truthy(env.TRUST_PROXY),
    rateLimitPerMinute: Number(env.RATE_LIMIT_PER_MINUTE ?? 60),
  };
}
