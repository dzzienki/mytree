// In-memory sliding-window limiter. Fine for a single self-hosted instance;
// swap for a shared store if the app ever runs on multiple instances.
const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** Returns true if the caller is over the limit. Only call `record` for failures. */
export function isLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  return recent.length >= max;
}

export function record(key: string) {
  const list = hits.get(key) ?? [];
  list.push(Date.now());
  hits.set(key, list);
}

export function clear(key: string) {
  hits.delete(key);
}
