import { getCache, setCache, clearCache } from "../utils/apiCache";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

function clearYardCaches() {
  clearCache("yards:all");
  clearCache("yards:main");
  clearCache("yards:site");
}

/* ================================
   GET YARDS
================================ */

export async function getAllYards() {
  const cacheKey = "yards:all";
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const res = await fetch(`${API_BASE}/api/yards`, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res);
  setCache(cacheKey, data, 2 * 60 * 1000);

  return data;
}

export async function getMainYards() {
  const cacheKey = "yards:main";
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const res = await fetch(`${API_BASE}/api/yards?type=MAIN`, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res);
  setCache(cacheKey, data, 2 * 60 * 1000);

  return data;
}

export async function getSiteYards() {
  const cacheKey = "yards:site";
  const cached = getCache(cacheKey);

  if (cached) return cached;

  const res = await fetch(`${API_BASE}/api/yards?type=SITE`, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res);
  setCache(cacheKey, data, 2 * 60 * 1000);

  return data;
}

/* ================================
   CREATE YARD
================================ */

export async function createYard(payload) {
  const res = await fetch(`${API_BASE}/api/yards`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);
  clearYardCaches();

  return data;
}

/* ================================
   UPDATE STATUS
================================ */

export async function updateYardStatus(id, isActive) {
  const res = await fetch(`${API_BASE}/api/yards/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });

  const data = await handleResponse(res);
  clearYardCaches();

  return data;
}

/* ================================
   ADD YARD LOCATION
================================ */

export async function addYardLocation(id, payload) {
  const res = await fetch(`${API_BASE}/api/yards/${id}/locations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);
  clearYardCaches();

  return data;
}