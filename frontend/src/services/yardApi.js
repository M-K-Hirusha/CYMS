const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function getMainYards() {
  const res = await fetch(`${API_BASE}/api/yards?type=MAIN`, {
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load MAIN yards");
  }

  return data;
}

export async function getSiteYards() {
  const res = await fetch(`${API_BASE}/api/yards?type=SITE`, {
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load SITE yards");
  }

  return data;
}

export async function getAllYards() {
  const res = await fetch(`${API_BASE}/api/yards`, {
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load yards");
  }

  return data;
}