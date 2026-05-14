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
  if (!key) {
    cache.clear();
    notifyCacheChanged();
    return;
  }

  for (const cacheKey of cache.keys()) {
    if (
      cacheKey === key ||
      cacheKey.startsWith(`${key}-`) ||
      cacheKey.includes(key)
    ) {
      cache.delete(cacheKey);
    }
  }

  notifyCacheChanged();
}

export function clearMultipleCache(keys = []) {
  keys.forEach((key) => clearCache(key));
}

export function notifyCacheChanged() {
  window.dispatchEvent(new Event("cyms-cache-changed"));
}