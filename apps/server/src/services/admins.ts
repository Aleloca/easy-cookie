import type { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/crypto.js';

export const MIN_PASSWORD = 10;

export async function createAdmin(prisma: PrismaClient, email: string, password: string) {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(e)) throw new Error('Invalid email');
  if (password.length < MIN_PASSWORD) throw new Error(`Password must be at least ${MIN_PASSWORD} characters`);
  return prisma.adminUser.create({ data: { email: e, passwordHash: await hashPassword(password) } });
}

/** First boot: create the admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists. */
export async function bootstrapAdmin(prisma: PrismaClient, email?: string, password?: string): Promise<string | null> {
  if (!email || !password) return null;
  if ((await prisma.adminUser.count()) > 0) return null;
  const user = await createAdmin(prisma, email, password);
  return user.email;
}
