import { getCache, setCache, clearCache } from "../utils/apiCache";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function handleResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error(fallbackMessage, data);
    throw new Error(data?.message || data?.error || fallbackMessage);
  }

  return data;
}

function clearToolCaches() {
  clearCache("tools:");
  clearCache("reports:tools-summary");
  clearCache("reports:tools-movements");
}

function buildToolCacheKey(params = {}) {
  return `tools:${JSON.stringify({
    status: params.status || "",
    currentLocationCode: params.currentLocationCode || "",
    currentYard: params.currentYard || "",
    search: params.search || "",
    page: params.page || "",
    limit: params.limit || "",
  })}`;
}

export async function getTools(params = {}) {
  const cacheKey = buildToolCacheKey(params);
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const query = new URLSearchParams();

  if (params.status) query.append("status", params.status);
  if (params.currentLocationCode) {
    query.append("currentLocationCode", params.currentLocationCode);
  }
  if (params.currentYard) query.append("currentYard", params.currentYard);
  if (params.search) query.append("search", params.search);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const url = `${API_BASE}/api/tools${query.toString() ? `?${query}` : ""}`;

  const res = await fetch(url, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res, "Failed to load tools");

  setCache(cacheKey, data, 60 * 1000);

  return data;
}

export async function createTool(payload) {
  const res = await fetch(`${API_BASE}/api/tools`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res, "Failed to create tool");
  clearToolCaches();

  return data;
}

export async function issueTool(id, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${id}/issue`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res, "Failed to issue tool");
  clearToolCaches();

  return data;
}

export async function returnTool(id, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${id}/return`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res, "Failed to return tool");
  clearToolCaches();

  return data;
}

export async function transferTool(id, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${id}/transfer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res, "Failed to transfer tool");
  clearToolCaches();

  return data;
}

export async function getToolMovements(id, params = {}) {
  const cacheKey = `tools:${id}:movements:${JSON.stringify({
    page: params.page || "",
    limit: params.limit || "",
  })}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const query = new URLSearchParams();

  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const url = `${API_BASE}/api/tools/${id}/movements${
    query.toString() ? `?${query}` : ""
  }`;

  const res = await fetch(url, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res, "Failed to load tool movements");

  setCache(cacheKey, data, 30 * 1000);

  return data;
}

export async function updateToolStatus(toolId, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${toolId}/status`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res, "Failed to update tool status");
  clearToolCaches();

  return data;
}