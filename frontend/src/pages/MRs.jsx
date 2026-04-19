import { useEffect, useState } from "react";
import {
  getMRs,
  createMR,
  approveMR,
  rejectMR,
} from "../services/mrApi";
import { getMaterials } from "../services/materialApi";
import { getMainYards } from "../services/yardApi";

export default function MRs() {
  const [mrs, setMRs] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [mainYards, setMainYards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedMainYardId, setSelectedMainYardId] = useState("");

  const role = localStorage.getItem("role");
  const canApprove =
    role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN";
  const canCreateMR = role === "SITE_ADMIN" || role === "SYSTEM_ADMIN";

  const [formData, setFormData] = useState({
    materialId: "",
    quantity: "",
  });

  async function loadMRs() {
    try {
      const data = await getMRs();
      setMRs(Array.isArray(data) ? data : data.rows || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load material requests");
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials() {
    try {
      const data = await getMaterials();
      setMaterials(Array.isArray(data) ? data : data.rows || []);
    } catch (err) {
      console.error(err);
    } finally {
      setMaterialsLoading(false);
    }
  }

  async function loadMainYards() {
    try {
      const data = await getMainYards();
      console.log("Main yards loaded:", data);
      setMainYards(data.yards || []);
    } catch (err) {
      console.error("Failed to load MAIN yards:", err);
    }
  }

  useEffect(() => {
    loadMRs();
    loadMaterials();
    loadMainYards();
  }, []);

  async function handleSubmitMR() {
    try {
      setSubmitting(true);

      if (!formData.materialId.trim()) {
        alert("Please select a material");
        return;
      }

      if (!formData.quantity || Number(formData.quantity) <= 0) {
        alert("Requested quantity must be greater than 0");
        return;
      }

      await createMR({
        toLocationCode: "SITE_STORE",
        items: [
          {
            material: formData.materialId.trim(),
            requestedQty: Number(formData.quantity),
          },
        ],
      });

      await loadMRs();

      setFormData({
        materialId: "",
        quantity: "",
      });
      setShowCreateForm(false);
      alert("Material request created successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create material request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(mr) {
    const ok = window.confirm("Approve this MR?");
    if (!ok) return;

    try {
      console.log("MR before approve:", mr);
      console.log("MR items:", mr.items);

      if (!selectedMainYardId) {
        alert("Please select a dispatch MAIN yard first.");
        return;
      }

      if (!mr.items || mr.items.length === 0) {
        alert(
          "No items found in this MR. The list endpoint is not returning MR items."
        );
        return;
      }

      const approvalLines = mr.items.map((item) => ({
        material: item.material?._id || item.material,
        approvedQty: item.requestedQty,
        fromLocationCode: "MAIN_STORE",
      }));

      console.log(
        "FINAL approve payload:", 
        JSON.stringify(
          {
          dispatchMainYardId: selectedMainYardId,
          approvalLines,
         },
          null,
          2
        )
      );

      setActionLoadingId(mr._id);

      await approveMR(mr._id, {
        dispatchMainYardId: selectedMainYardId,
        approvalLines,
      });

      await loadMRs();
      alert("MR approved successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Approve failed");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(id) {
    const ok = window.confirm("Reject this MR?");
    if (!ok) return;

    try {
      setActionLoadingId(id);
      await rejectMR(id);
      await loadMRs();
      alert("MR rejected successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Reject failed");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            Material Requests
          </h2>
          <p
            style={{
              margin: "8px 0 0 0",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            View and manage material requests in the system.
          </p>
        </div>

        {canCreateMR && (
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            style={createButtonStyle}
          >
            {showCreateForm ? "Close Form" : "+ Create MR"}
          </button>
        )}
      </div>

      {canCreateMR && showCreateForm && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: "#ffffff",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Create Material Request
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Material</label>
              <select
                value={formData.materialId}
                onChange={(e) =>
                  setFormData({ ...formData, materialId: e.target.value })
                }
                style={inputStyle}
              >
                <option value="">
                  {materialsLoading
                    ? "Loading materials..."
                    : "Select a material"}
                </option>

                {materials.map((material) => (
                  <option key={material._id} value={material._id}>
                    {material.name} {material.code ? `(${material.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Requested Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Enter quantity"
                style={inputStyle}
              />
            </div>
          </div>

          <p
            style={{
              margin: "14px 0 0 0",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            Requests will be created to location code: SITE_STORE
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({
                  materialId: "",
                  quantity: "",
                });
              }}
              style={secondaryButtonStyle}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmitMR}
              style={createButtonStyle}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit MR"}
            </button>
          </div>
        </div>
      )}

      {canApprove && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <label style={labelStyle}>Dispatch MAIN Yard</label>
          <select
            value={selectedMainYardId}
            onChange={(e) => setSelectedMainYardId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select MAIN yard</option>
            {mainYards.map((yard) => (
              <option key={yard._id} value={yard._id}>
                {yard.name} {yard.code ? `(${yard.code})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 16,
            padding: 20,
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>MR Number</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Requested By</th>
                <th style={thStyle}>Yard</th>
                {canApprove && <th style={thStyle}>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {mrs.length === 0 ? (
                <tr>
                  <td colSpan={canApprove ? "5" : "4"} style={emptyStyle}>
                    No material requests found.
                  </td>
                </tr>
              ) : (
                mrs.map((mr) => (
                  <tr key={mr._id}>
                    <td style={tdStyle}>{mr.mrNo || "-"}</td>

                    <td style={tdStyle}>
                      <span style={getStatusBadgeStyle(mr.status)}>
                        {mr.status || "-"}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      {mr.requestedBy?.fullName ||
                        mr.requestedBy?.name ||
                        mr.createdBy?.fullName ||
                        mr.createdBy?.name ||
                        "-"}
                    </td>

                    <td style={tdStyle}>
                      {mr.siteYard?.name ||
                        mr.siteYard?.code ||
                        mr.yard?.name ||
                        "-"}
                    </td>

                    {canApprove && (
                      <td style={tdStyle}>
                        {mr.status === "PENDING" ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleApprove(mr)}
                              style={approveBtn}
                              disabled={actionLoadingId === mr._id}
                            >
                              {actionLoadingId === mr._id
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReject(mr._id)}
                              style={rejectBtn}
                              disabled={actionLoadingId === mr._id}
                            >
                              {actionLoadingId === mr._id
                                ? "Processing..."
                                : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>
                            -
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const createButtonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "12px 16px",
  background: "#1e293b",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const approveBtn = {
  background: "rgba(34,197,94,0.15)",
  color: "#4ade80",
  border: "1px solid rgba(34,197,94,0.35)",
  padding: "6px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const rejectBtn = {
  background: "rgba(239,68,68,0.15)",
  color: "#f87171",
  border: "1px solid rgba(239,68,68,0.35)",
  padding: "6px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: "#cbd5e1",
  fontSize: 14,
  fontWeight: 600,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#ffffff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  appearance: "none",
};

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  borderBottom: "1px solid #1e293b",
  color: "#ffffff",
  fontSize: 14,
};

const tdStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #1e293b",
  color: "#cbd5e1",
  fontSize: 14,
};

const emptyStyle = {
  padding: "20px 16px",
  textAlign: "center",
  color: "#94a3b8",
};

function getStatusBadgeStyle(status) {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
  };

  if (status === "APPROVED") {
    return {
      ...base,
      background: "rgba(34,197,94,0.15)",
      color: "#4ade80",
      borderColor: "rgba(34,197,94,0.35)",
    };
  }

  if (status === "PENDING") {
    return {
      ...base,
      background: "rgba(245,158,11,0.15)",
      color: "#fbbf24",
      borderColor: "rgba(245,158,11,0.35)",
    };
  }

  if (status === "REJECTED") {
    return {
      ...base,
      background: "rgba(239,68,68,0.15)",
      color: "#f87171",
      borderColor: "rgba(239,68,68,0.35)",
    };
  }

  return {
    ...base,
    background: "rgba(148,163,184,0.15)",
    color: "#cbd5e1",
    borderColor: "rgba(148,163,184,0.35)",
  };
}