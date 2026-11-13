import type { ConsentLogOptions, ConsentRecordInput } from '../shared/types';

const QUEUE_KEY = 'ec_log_queue';
const MAX_QUEUE = 20;

const url = (log: ConsentLogOptions, path: string) =>
  `${log.endpoint.replace(/\/$/, '')}${path}?key=${encodeURIComponent(log.siteKey)}`;

/**
 * POST as a CORS "simple request" (text/plain, key in the query string) so no
 * preflight is needed and `keepalive` survives the page unloading.
 */
async function post(target: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(target, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function readQueue(): ConsentRecordInput[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(q: ConsentRecordInput[]) {
  try {
    if (q.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* storage blocked: nothing to do, the record is lost (documented) */
  }
}

/** Send a consent record; on failure keep it for a retry on the next page load. */
export async function sendRecord(log: ConsentLogOptions, record: ConsentRecordInput): Promise<boolean> {
  const ok = await post(url(log, '/v1/consents'), record);
  if (!ok) writeQueue([...readQueue(), record]);
  return ok;
}

export async function flushQueue(log: ConsentLogOptions): Promise<void> {
  const q = readQueue();
  if (!q.length) return;
  const left: ConsentRecordInput[] = [];
  for (const r of q) if (!(await post(url(log, '/v1/consents'), r))) left.push(r);
  writeQueue(left);
}

export function sendSubject(log: ConsentLogOptions, consentId: string, subjectId: string): Promise<boolean> {
  return post(url(log, `/v1/consents/${encodeURIComponent(consentId)}/subject`), { subjectId });
}
