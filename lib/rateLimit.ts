type Bucket = { tokens: number; updated: number };
const buckets = new Map<string, Bucket>();

/** Token Bucket פשוט: rate בקשות לכל perMs מילישניות. */
export function rateLimit(key: string, rate = 10, perMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: rate, updated: now };
  const elapsed = now - b.updated;
  b.tokens = Math.min(rate, b.tokens + elapsed * (rate / perMs));
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
