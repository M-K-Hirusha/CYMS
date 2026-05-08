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
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

function clearUserCaches() {
  clearCache("users:all");
}

/* ================================
   GET USERS
================================ */

export async function getUsers() {
  const cacheKey = "users:all";

  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  const res = await fetch(`${API_BASE}/api/users`, {
    headers: authHeaders(),
  });

  const data = await handleResponse(res, "Failed to load users");

  setCache(cacheKey, data, 2 * 60 * 1000);

  return data;
}

/* ================================
   CREATE USER
================================ */

export async function createUser(payload) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res, "Failed to create user");

  clearUserCaches();

  return data;
}

/* ================================
   UPDATE USER STATUS
================================ */

export async function updateUserStatus(id, isActive) {
  const res = await fetch(`${API_BASE}/api/users/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });

  const data = await handleResponse(
    res,
    "Failed to update user status"
  );

  clearUserCaches();

  return data;
}

/* ================================
   ASSIGN USER TO YARD
================================ */

export async function assignUserToYard(userId, payload) {
  const body =
    typeof payload === "string"
      ? { yardId: payload }
      : payload;

  const res = await fetch(
    `${API_BASE}/api/users/${userId}/assign-yard`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    }
  );

  const data = await handleResponse(
    res,
    "Failed to assign yard"
  );

  clearUserCaches();

  return data;
}