/**
 * Tiny typed client for the Admin API (`/admin/api`, docs/api.md).
 *
 * - Sends the double-submit CSRF header on every mutating request.
 * - Turns error bodies `{ error: { code, message, issues? } }` into `ApiError`.
 * - On 401 (outside the auth endpoints) calls the registered handler, which
 *   sends the user back to the login screen.
 */
import type { ConfigIssue } from './types';

export type Transport = (input: string, init: RequestInit) => Promise<Response>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: ConfigIssue[];

  constructor(status: number, code: string, message: string, issues: ConfigIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

export const API_BASE = '/admin/api';

let csrfToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let transport: Transport = (input, init) => fetch(input, init);

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/** Swap the network layer (mock mode, tests). */
export function setTransport(fn: Transport): void {
  transport = fn;
}

/** GET through the current transport and return the raw body (CSV download in mock mode). */
export async function fetchText(url: string): Promise<string> {
  const res = await transport(url, { method: 'GET', credentials: 'same-origin' });
  if (!res.ok) throw new ApiError(res.status, `http_${res.status}`, res.statusText);
  return res.text();
}

const MUTATING =new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function toQuery(params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (MUTATING.has(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let res: Response;
  try {
    res = await transport(API_BASE + path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network', 'network');
  }

  if (res.status === 401 && !path.startsWith('/auth/')) {
    csrfToken = null;
    onUnauthorized?.();
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; issues?: ConfigIssue[] } } | undefined)?.error;
    throw new ApiError(res.status, err?.code ?? `http_${res.status}`, err?.message ?? res.statusText, err?.issues ?? []);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
