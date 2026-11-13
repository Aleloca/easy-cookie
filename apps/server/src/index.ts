import { serve } from '@hono/node-server';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app.js';
import { loadConfig, loadDotEnv } from './env.js';
import { bootstrapAdmin } from './services/admins.js';

loadDotEnv();
const config = loadConfig();
if (!config.databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const created = await bootstrapAdmin(prisma, config.adminEmail, config.adminPassword);
  if (created) console.log(`[easy-cookie] created first admin ${created}`);
} catch (e) {
  console.error('[easy-cookie] could not create the first admin:', (e as Error).message);
}

const { app } = createApp({ config, prisma });
const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[easy-cookie] listening on http://localhost:${info.port}`);
  if (!config.publicUrl) console.warn('[easy-cookie] PUBLIC_URL is not set: URLs are derived from each request');
});

const shutdown = () => {
  server.close();
  void prisma.$disconnect().finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
