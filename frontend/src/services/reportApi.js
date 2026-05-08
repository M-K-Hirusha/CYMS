import { getCache, setCache } from "../utils/apiCache";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

export async function getToolsSummary() {
  const cacheKey = "reports:tools-summary";
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const res = await fetch(`${API_BASE}/api/reports/tools/summary`, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res, "Failed to load tools summary");
  setCache(cacheKey, data, 30 * 1000);

  return data;
}

export async function getMRSummary() {
  const cacheKey = "reports:mr-summary";
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const res = await fetch(`${API_BASE}/api/reports/mr/summary`, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res, "Failed to load MR summary");
  setCache(cacheKey, data, 30 * 1000);

  return data;
}

export async function getStockSummary() {
  const cacheKey = "reports:stock-summary";
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const res = await fetch(`${API_BASE}/api/reports/stock/summary`, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res, "Failed to load stock summary");
  setCache(cacheKey, data, 30 * 1000);

  return data;
}

export async function getToolMovements(filters = {}) {
  const cacheKey = `reports:tools-movements:${JSON.stringify({
    from: filters.from || "",
    to: filters.to || "",
  })}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();

  if (filters.from) params.append("from", filters.from);
  if (filters.to) params.append("to", filters.to);

  const query = params.toString();

  const res = await fetch(
    `${API_BASE}/api/reports/tools/movements${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(),
    }
  );

  const data = await handleResponse(res, "Failed to load tool movements");
  setCache(cacheKey, data, 30 * 1000);

  return data;
}