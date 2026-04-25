import { useEffect, useState } from "react";
import {
  createMaterial,
  deleteMaterial,
  getMaterials,
  updateMaterial,
} from "../services/materialApi";

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editingMaterial, setEditingMaterial] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({ name: "", code: "", unit: "" });

  async function loadMaterials() {
    try {
      const data = await getMaterials();
      setMaterials(data.data || data || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load materials");
    }
  }

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      setCreating(true);
      await createMaterial({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        unit: form.unit.trim().toUpperCase(),
      });

      setForm({ name: "", code: "", unit: "" });
      setShowCreate(false);
      await loadMaterials();
    } catch (err) {
      alert(err.message || "Failed to create material");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(material) {
    setEditingMaterial(material);
    setForm({
      name: material.name || "",
      code: material.code || "",
      unit: material.unit || "",
    });
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!editingMaterial) return;

    try {
      setUpdating(true);
      await updateMaterial(editingMaterial._id, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        unit: form.unit.trim().toUpperCase(),
      });

      setEditingMaterial(null);
      setForm({ name: "", code: "", unit: "" });
      await loadMaterials();
    } catch (err) {
      alert(err.message || "Failed to update material");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(material) {
    const ok = window.confirm(
      `Are you sure you want to delete "${material.name}"?`
    );
    if (!ok) return;

    try {
      await deleteMaterial(material._id);
      await loadMaterials();
    } catch (err) {
      alert(err.message || "Failed to delete material");
    }
  }

  function closeModal() {
    setShowCreate(false);
    setEditingMaterial(null);
    setForm({ name: "", code: "", unit: "" });
  }

  const filteredMaterials = materials.filter((material) => {
    const q = search.toLowerCase();
    return (
      material.name?.toLowerCase().includes(q) ||
      material.code?.toLowerCase().includes(q) ||
      material.unit?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredMaterials.length / pageSize) || 1;

  const paginatedMaterials = filteredMaterials.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const modalOpen = showCreate || editingMaterial;
  const isEdit = Boolean(editingMaterial);

  return (
    <div style={{ padding: 16 }}>
      <div style={headerStyle}>
        <h1 style={{ color: "#ffffff", margin: 0 }}>Materials</h1>

        <button
          onClick={() => {
            setForm({ name: "", code: "", unit: "" });
            setShowCreate(true);
          }}
          style={buttonStyle}
        >
          + Add Material
        </button>
      </div>

      <input
        type="text"
        placeholder="Search materials..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      <div style={cardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedMaterials.map((material) => (
              <tr key={material._id}>
                <td style={tdStyle}>{material.name}</td>
                <td style={tdStyle}>{material.code}</td>
                <td style={tdStyle}>{material.unit}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEdit(material)} style={smallBtn}>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(material)}
                      style={deleteBtn}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMaterials.length > 0 && (
          <div style={paginationStyle}>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>
              Showing {paginatedMaterials.length} of {filteredMaterials.length}{" "}
              materials
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={{
                  ...paginationButtonStyle,
                  opacity: page === 1 ? 0.5 : 1,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Prev
              </button>

              <span style={{ color: "#e2e8f0", fontSize: 13 }}>
                Page {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                style={{
                  ...paginationButtonStyle,
                  opacity: page === totalPages ? 0.5 : 1,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {filteredMaterials.length === 0 && (
          <p style={{ color: "#94a3b8" }}>No materials found.</p>
        )}
      </div>

      {modalOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>
                {isEdit ? "Edit Material" : "Create Material"}
              </h3>
              <button onClick={closeModal} style={closeBtn}>
                ✕
              </button>
            </div>

            <form
              onSubmit={isEdit ? handleUpdate : handleCreate}
              style={{ display: "grid", gap: 12 }}
            >
              <input
                placeholder="Material Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
                required
              />

              <input
                placeholder="Material Code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                style={inputStyle}
                required
              />

              <input
                list="unit-options"
                placeholder="Unit (e.g., KG, BAG, M3)"
                value={form.unit}
                onChange={(e) =>
                  setForm({ ...form, unit: e.target.value.toUpperCase() })
                }
                style={inputStyle}
                required
              />

              <datalist id="unit-options">
                <option value="BAG" />
                <option value="PCS" />
                <option value="M3" />
                <option value="KG" />
                <option value="TON" />
                <option value="LTR" />
                <option value="BOX" />
                <option value="ROLL" />
                <option value="SHEET" />
              </datalist>

              <div style={footerStyle}>
                <button type="button" onClick={closeModal} style={buttonStyle}>
                  Cancel
                </button>

                <button
                  type="submit"
                  style={buttonStyle}
                  disabled={creating || updating}
                >
                  {isEdit
                    ? updating
                      ? "Updating..."
                      : "Update"
                    : creating
                    ? "Creating..."
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};

const cardStyle = {
  background: "#0f172a",
  border: "1px solid #1f2937",
  borderRadius: 16,
  padding: 20,
};

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 16,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#ffffff",
  fontWeight: 600,
  cursor: "pointer",
};

const smallBtn = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
};

const deleteBtn = {
  ...smallBtn,
  border: "1px solid rgba(239,68,68,0.4)",
  background: "rgba(239,68,68,0.15)",
  color: "#f87171",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  width: "100%",
  maxWidth: 500,
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 20,
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 16,
};

const modalTitleStyle = {
  margin: 0,
  color: "#ffffff",
};

const closeBtn = {
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#fff",
  borderRadius: 8,
  width: 32,
  height: 32,
  cursor: "pointer",
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const paginationStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 14,
};

const paginationButtonStyle = {
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#1e293b",
  color: "#ffffff",
  fontWeight: 700,
};

const thStyle = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #1f2937",
  color: "#94a3b8",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #1f2937",
  color: "#e2e8f0",
};