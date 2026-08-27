/**
 * Non-blocking cache for AI-enriched dashboard content.
 *
 * The dashboard must render immediately. Awaiting the model on every request
 * made GET /api/dashboard take 11-16 seconds, which broke live updates after
 * logging food: the refetch was firing, it just had not returned yet.
 *
 * So: the deterministic value is returned straight away, and enrichment runs in
 * the background. The next request for the same state picks up the enriched
 * copy. A user therefore sees correct numbers instantly, and better wording a
 * moment later — never a spinner waiting on a model.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

const cache = new Map<string, Entry<unknown>>();
const inFlight = new Set<string>();

function prune() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
  // Bound memory on long-lived instances.
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * Returns the cached enriched value when one exists for this exact state,
 * otherwise returns `deterministic` immediately and refreshes in the background.
 *
 * @param key   Must capture everything the enrichment depends on, so a stale
 *              brief is never shown for changed intake.
 */
export function getOrRefresh<T>(key: string, deterministic: T, produce: () => Promise<T>): T {
  prune();

  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  if (!inFlight.has(key)) {
    inFlight.add(key);
    // Deliberately not awaited: this is a background refresh.
    produce()
      .then((value) => {
        cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
      })
      .catch((err) => {
        console.warn('[ai-cache] background enrichment failed:', (err as Error)?.message);
      })
      .finally(() => {
        inFlight.delete(key);
      });
  }

  return deterministic;
}

/** Test/maintenance helper. */
export function clearAICache() {
  cache.clear();
  inFlight.clear();
}
