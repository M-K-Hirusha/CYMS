const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// ========================
// GET MRs
// ========================
export async function getMRs() {
  const res = await fetch(`${API_BASE}/api/mrs`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to load MRs");
  }

  return res.json();
}

// ========================
// CREATE MR
// ========================
export async function createMR(payload) {
  const res = await fetch(`${API_BASE}/api/mrs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Create MR error response:", data);
    throw new Error(
      data?.message || data?.error || "Failed to create MR"
    );
  }

  return data;
}

// ========================
// APPROVE MR (UPDATED)
// ========================
export async function approveMR(id, payload) {
  const res = await fetch(`${API_BASE}/api/mrs/${id}/approve`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload), // ✅ IMPORTANT
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Approve MR error:", data);
    throw new Error(
      data?.message || data?.error || "Failed to approve MR"
    );
  }

  return data;
}

// ========================
// REJECT MR
// ========================
export async function rejectMR(id, payload) {
  const res = await fetch(`${API_BASE}/api/mrs/${id}/reject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Reject MR error:", data);
    throw new Error(
      data?.message || data?.error || "Failed to reject MR"
    );
  }

  return data;
}