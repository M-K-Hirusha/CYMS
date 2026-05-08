const API_URL = import.meta.env.VITE_API_BASE_URL;

async function handleResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

/* =========================
   REGISTER
========================= */

export async function registerUser(payload) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(res, "Register failed");
}

/* =========================
   LOGIN
========================= */

export async function loginUser(payload) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(res, "Login failed");
}

/* =========================
   LOAD CURRENT USER
========================= */

export async function getCurrentUser() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res, "Failed to load user");
}