import { getCache, setCache, clearCache } from "../utils/apiCache";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function clearInventoryCaches() {
  clearCache("inventory:");
}

/* =========================
   GET STOCK
========================= */

export async function getStock(yardId) {
  const cacheKey = `inventory:${yardId}`;

  const cached = getCache(cacheKey);

  if (cached) return cached;

  const res = await fetch(
    `${API_BASE}/api/inventory/stock?yardId=${yardId}`,
    {
      headers: authHeaders(),
    }
  );

  const data = await handleResponse(res);

  setCache(cacheKey, data, 15 * 1000);

  return data;
}

/* =========================
   RECEIVE STOCK
========================= */

export async function receiveStock(payload) {
  const res = await fetch(`${API_BASE}/api/inventory/receive`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);

  clearInventoryCaches();

  return data;
}

/* =========================
   ISSUE STOCK
========================= */

export async function issueStock(payload) {
  const res = await fetch(`${API_BASE}/api/inventory/issue`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);

  clearInventoryCaches();

  return data;
}

/* =========================
   TRANSFER STOCK
========================= */

export async function transferStock(payload) {
  const res = await fetch(`${API_BASE}/api/inventory/transfer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);

  clearInventoryCaches();

  return data;
}