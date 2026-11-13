import type { AdminSession, PrismaClient, Site } from '@prisma/client';
import type { ServerConfig } from './env.js';
import type { RateLimiter } from './lib/rate-limit.js';

export interface AppDeps {
  prisma: PrismaClient;
  config: ServerConfig;
  /** Consent-record limiter (60/min per IP hash per site by default). */
  consentLimiter: RateLimiter;
  /** Admin login limiter (per IP). */
  loginLimiter: RateLimiter;
}

export interface AdminPrincipal {
  id: string;
  email: string;
}

export type AppEnv = {
  Variables: {
    site: Site;
    admin: AdminPrincipal;
    session: AdminSession;
  };
};
