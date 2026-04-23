const API_BASE = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

export async function getTools(params = {}) {
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

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Get tools error:", data);
    throw new Error(data?.message || data?.error || "Failed to load tools");
  }

  return data;
}

export async function createTool(payload) {
  const res = await fetch(`${API_BASE}/api/tools`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Create tool error:", data);
    throw new Error(data?.message || data?.error || "Failed to create tool");
  }

  return data;
}

export async function issueTool(id, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${id}/issue`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Issue tool error:", data);
    throw new Error(data?.message || data?.error || "Failed to issue tool");
  }

  return data;
}

export async function returnTool(id, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${id}/return`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Return tool error:", data);
    throw new Error(data?.message || data?.error || "Failed to return tool");
  }

  return data;
}

export async function transferTool(id, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${id}/transfer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Transfer tool error:", data);
    throw new Error(data?.message || data?.error || "Failed to transfer tool");
  }

  return data;
}

export async function getToolMovements(id, params = {}) {
  const query = new URLSearchParams();

  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);

  const url = `${API_BASE}/api/tools/${id}/movements${
    query.toString() ? `?${query}` : ""
  }`;

  const res = await fetch(url, {
    headers: authHeaders(),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Get tool movements error:", data);
    throw new Error(
      data?.message || data?.error || "Failed to load tool movements"
    );
  }

  return data;
}

export async function updateToolStatus(toolId, payload) {
  const res = await fetch(`${API_BASE}/api/tools/${toolId}/status`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to update tool status");
  }

  return data;
}