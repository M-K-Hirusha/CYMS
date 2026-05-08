const cache = new Map();

const DEFAULT_TTL = 60 * 1000; // 1 minute

export function getCache(key) {
  const item = cache.get(key);

  if (!item) return null;

  const isExpired = Date.now() - item.createdAt > item.ttl;

  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return item.data;
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    ttl,
    createdAt: Date.now(),
  });
}

export function clearCache(key) {
  if (key) {
    cache.delete(key);
    return;
  }

  cache.clear();
}