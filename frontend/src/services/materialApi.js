import { getCache, setCache, clearCache } from "../utils/apiCache";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

function clearMaterialCaches() {
  clearCache("materials:");
  clearCache("mrs:");
  clearCache("stock:");
  clearCache("dashboard:");
}

/* =========================
   GET MATERIALS
========================= */

export async function getMaterials(params = {}) {
  const cacheKey = `materials:${JSON.stringify({
    search: params.search || "",
    page: params.page || "",
    limit: params.limit || "",
  })}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  const query = new URLSearchParams();

  if (params.search) query.append("search", params.search);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const url = `${API_BASE}/api/materials${
    query.toString() ? `?${query}` : ""
  }`;

  const res = await fetch(url, {
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load materials");
  }

  setCache(cacheKey, data, 30 * 1000);
  return data;
}

/* =========================
   CREATE MATERIAL
========================= */

export async function createMaterial(payload) {
  const res = await fetch(`${API_BASE}/api/materials`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to create material");
  }

  clearMaterialCaches();
  return data;
}

/* =========================
   UPDATE MATERIAL
========================= */

export async function updateMaterial(id, payload) {
  const res = await fetch(`${API_BASE}/api/materials/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to update material");
  }

  clearMaterialCaches();
  return data;
}

/* =========================
   DELETE MATERIAL
========================= */

export async function deleteMaterial(id) {
  const res = await fetch(`${API_BASE}/api/materials/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete material");
  }

  clearMaterialCaches();
  return data;
}