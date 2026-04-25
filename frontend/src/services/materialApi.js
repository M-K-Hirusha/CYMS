const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// Get all materials
export async function getMaterials() {
  const res = await fetch(`${API_BASE}/api/materials`, {
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to load materials");
  }

  return data;
}

// Create material
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

  return data;
}

export async function deleteMaterial(id) {
  const res = await fetch(`${API_BASE}/api/materials/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete material");
  }

  return data;
}

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

  return data;
}