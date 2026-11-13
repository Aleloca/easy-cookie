import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Apply migrations to the test database once per run. */
export default function setup() {
  try {
    execSync('pnpm exec prisma migrate deploy', {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: process.env,
      stdio: 'pipe',
    });
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      `prisma migrate deploy failed for ${process.env.DATABASE_URL}\n${err.stdout ?? ''}${err.stderr ?? ''}` +
        '\nStart the test database first (see README "Tests").',
    );
  }
}
