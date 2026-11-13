import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

/**
 * Debounced autosave. `value` is compared by its JSON; after `delay` ms of no
 * change the latest value is saved. Only one save runs at a time; a change
 * that lands during a save is saved right after it.
 */
export function useAutosave<T>(
  value: T | undefined,
  save: (v: T) => Promise<void>,
  { delay = 800, initialSavedAt = null }: { delay?: number; initialSavedAt?: string | null } = {},
) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const lastSaved = useRef<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const valueRef = useRef(value);
  valueRef.current = value;

  const json = value === undefined ? null : JSON.stringify(value);

  // First value is what the server already has.
  useEffect(() => {
    if (lastSaved.current === null && json !== null) lastSaved.current = json;
  }, [json]);

  useEffect(() => {
    if (initialSavedAt) setSavedAt(initialSavedAt);
  }, [initialSavedAt]);

  const run = useCallback(async (): Promise<void> => {
    if (inflight.current) await inflight.current.catch(() => {});
    const v = valueRef.current;
    if (v === undefined) return;
    const snapshot = JSON.stringify(v);
    if (snapshot === lastSaved.current) {
      setStatus('saved');
      return;
    }
    setStatus('saving');
    const p = saveRef.current(v).then(
      () => {
        lastSaved.current = snapshot;
        setSavedAt(new Date().toISOString());
        setStatus(JSON.stringify(valueRef.current) === snapshot ? 'saved' : 'dirty');
      },
      (e) => {
        setStatus('error');
        throw e;
      },
    );
    inflight.current = p;
    try {
      await p;
    } finally {
      if (inflight.current === p) inflight.current = null;
    }
  }, []);

  useEffect(() => {
    if (json === null || lastSaved.current === null || json === lastSaved.current) return;
    setStatus('dirty');
    const timer = setTimeout(() => {
      run().catch(() => {});
    }, delay);
    return () => clearTimeout(timer);
  }, [json, delay, run]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (status !== 'dirty' && status !== 'saving' && status !== 'error') return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [status]);

  /** Save now (used before publishing). Rejects if the save fails. */
  const flush = useCallback(() => run(), [run]);

  return { status, savedAt, flush };
}
