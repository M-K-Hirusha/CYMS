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

function clearMCRCaches() {
  clearCache("mcrs:");
}

/* ========================
   GET MCRs
======================== */

export async function getMCRs(params = {}) {
  const cacheKey = `mcrs:${JSON.stringify({
    status: params.status || "",
    search: params.search || "",
    page: params.page || "",
    limit: params.limit || "",
  })}`;

  const cached = getCache(cacheKey);

  if (cached) return cached;

  const query = new URLSearchParams();

  if (params.status) query.append("status", params.status);
  if (params.search) query.append("search", params.search);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const url = `${API_BASE}/api/mcrs${
    query.toString() ? `?${query}` : ""
  }`;

  const res = await fetch(url, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res);

  setCache(cacheKey, data, 30 * 1000);

  return data;
}

/* ========================
   CREATE MCR
======================== */

export async function createMCR(payload) {
  const res = await fetch(`${API_BASE}/api/mcrs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);

  clearMCRCaches();

  return data;
}

/* ========================
   APPROVE MCR
======================== */

export async function approveMCR(id, payload = {}) {
  const res = await fetch(`${API_BASE}/api/mcrs/${id}/approve`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);

  clearMCRCaches();

  return data;
}

/* ========================
   REJECT MCR
======================== */

export async function rejectMCR(id, reason) {
  const res = await fetch(`${API_BASE}/api/mcrs/${id}/reject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });

  const data = await handleResponse(res);

  clearMCRCaches();

  return data;
}