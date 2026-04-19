const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getToolsSummary() {
  const res = await fetch(`${API_BASE}/api/reports/tools/summary`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load tools summary");
  return res.json();
}

export async function getMRSummary() {
  const res = await fetch(`${API_BASE}/api/reports/mr/summary`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load MR summary");
  return res.json();
}

export async function getStockSummary() {
  const res = await fetch(`${API_BASE}/api/reports/stock/summary`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load stock summary");
  return res.json();
}

export async function getToolMovements() {
  const res = await fetch(`${API_BASE}/api/reports/tools/movements`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load tool movements");
  return res.json();
}