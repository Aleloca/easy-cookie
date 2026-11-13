/**
 * Fixed-window in-memory rate limiter. Per process: run a single instance or
 * accept that each replica counts on its own.
 */
export class RateLimiter {
  private windows = new Map<string, { start: number; count: number }>();
  private lastSweep = Date.now();

  constructor(
    private limit: number,
    private windowMs = 60_000,
    private now: () => number = Date.now,
  ) {}

  /** Count a hit. Returns 0 when allowed, otherwise seconds until the window resets. */
  hit(key: string): number {
    const t = this.now();
    this.sweep(t);
    const w = this.windows.get(key);
    if (!w || t - w.start >= this.windowMs) {
      this.windows.set(key, { start: t, count: 1 });
      return 0;
    }
    w.count++;
    if (w.count > this.limit) return Math.max(1, Math.ceil((w.start + this.windowMs - t) / 1000));
    return 0;
  }

  reset() {
    this.windows.clear();
  }

  private sweep(t: number) {
    if (t - this.lastSweep < this.windowMs) return;
    this.lastSweep = t;
    for (const [k, w] of this.windows) if (t - w.start >= this.windowMs) this.windows.delete(k);
  }
}
