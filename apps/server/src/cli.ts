#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { loadDotEnv } from './env.js';
import { createAdmin } from './services/admins.js';
import { csvHeader, csvRow, iterateConsents, serializeRecord } from './services/consents.js';
import { createSite, parseSiteInput } from './services/sites.js';

const USAGE = `easy-cookie-server <command>

Commands:
  create-admin <email> [--password <pw>]     Create an admin (password prompted, or $ADMIN_PASSWORD)
  create-site --name <n> --domain <d> [--origin <o>]...
                                             Create a site; prints the public and secret keys
  export <siteId> [--format csv|jsonl] [--from <iso>] [--to <iso>]
                                             Export consent records to stdout (default csv)

Requires DATABASE_URL.`;

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function main() {
  loadDotEnv();
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE);
    return;
  }
  const prisma = new PrismaClient();
  try {
    switch (command) {
      case 'create-admin': {
        const { values, positionals } = parseArgs({
          args: rest,
          allowPositionals: true,
          options: { password: { type: 'string' } },
        });
        const email = positionals[0];
        if (!email) throw new Error('Usage: create-admin <email> [--password <pw>]');
        const password = values.password ?? process.env.ADMIN_PASSWORD ?? (await prompt('Password: '));
        const user = await createAdmin(prisma, email, password);
        console.log(`Created admin ${user.email}`);
        break;
      }
      case 'create-site': {
        const { values } = parseArgs({
          args: rest,
          options: {
            name: { type: 'string' },
            domain: { type: 'string' },
            origin: { type: 'string', multiple: true },
          },
        });
        const origins = values.origin ?? (values.domain ? [`https://${values.domain}`] : []);
        const input = parseSiteInput({ name: values.name, domain: values.domain, origins }, false);
        const { site, secretKey } = await createSite(prisma, input as { name: string; domain: string; origins: string[] });
        console.log(
          JSON.stringify(
            { id: site.id, name: site.name, domain: site.domain, origins: site.origins, publicKey: site.publicKey, secretKey },
            null,
            2,
          ),
        );
        console.error('\nStore the secret key now: it is not shown again.');
        break;
      }
      case 'export': {
        const { values, positionals } = parseArgs({
          args: rest,
          allowPositionals: true,
          options: { format: { type: 'string', default: 'csv' }, from: { type: 'string' }, to: { type: 'string' } },
        });
        const siteId = positionals[0];
        if (!siteId) throw new Error('Usage: export <siteId> [--format csv|jsonl]');
        const site = await prisma.site.findUnique({ where: { id: siteId } });
        if (!site) throw new Error(`Site ${siteId} not found`);
        const filters = {
          from: values.from ? new Date(values.from) : undefined,
          to: values.to ? new Date(values.to) : undefined,
        };
        const out = (s: string) =>
          new Promise<void>((res) => (process.stdout.write(s) ? res() : process.stdout.once('drain', () => res())));
        if (values.format === 'csv') await out(csvHeader());
        else if (values.format !== 'jsonl') throw new Error('--format must be csv or jsonl');
        let n = 0;
        for await (const r of iterateConsents(prisma, site.id, filters)) {
          await out(values.format === 'csv' ? csvRow(r) : `${JSON.stringify(serializeRecord(r))}\n`);
          n++;
        }
        console.error(`Exported ${n} records`);
        break;
      }
      default:
        throw new Error(`Unknown command "${command}"\n\n${USAGE}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
