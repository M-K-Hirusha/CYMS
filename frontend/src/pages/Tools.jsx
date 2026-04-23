import { useEffect, useState } from "react";
import {
  getTools,
  createTool,
  issueTool,
  returnTool,
  transferTool,
  getToolMovements,
  updateToolStatus,
} from "../services/toolApi";
import { getMainYards, getAllYards } from "../services/yardApi";

export default function Tools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showIssue, setShowIssue] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [showReturn, setShowReturn] = useState(false);
  const [returning, setReturning] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const [showMovements, setShowMovements] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [toolMovements, setToolMovements] = useState(null);
  const [movementPage, setMovementPage] = useState(1);
  const [movementLimit] = useState(5);
  const [movementPagination, setMovementPagination] = useState(null);

  const [selectedTool, setSelectedTool] = useState(null);

  const [mainYards, setMainYards] = useState([]);
  const [mainYardsLoading, setMainYardsLoading] = useState(true);

  const [allYards, setAllYards] = useState([]);
  const [yardsLoading, setYardsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    currentYard: "",
  });

  const [issueForm, setIssueForm] = useState({
    issuedTo: "",
    note: "",
  });

  const [returnForm, setReturnForm] = useState({
    toLocationCode: "MAIN_STORE",
    note: "",
  });

  const [transferForm, setTransferForm] = useState({
    toYard: "",
    toLocationCode: "",
    note: "",
  });

  const role = localStorage.getItem("role");
  const canCreateTool =
    role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN";

  async function loadTools() {
    try {
      setLoading(true);
      setError("");

      const data = await getTools({
        search: search.trim(),
        status: statusFilter,
      });

      setTools(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load tools");
    } finally {
      setLoading(false);
    }
  }

  async function loadMainYards() {
    try {
      const data = await getMainYards();
      setMainYards(Array.isArray(data?.yards) ? data.yards : []);
    } catch (err) {
      console.error("Failed to load MAIN yards:", err);
    } finally {
      setMainYardsLoading(false);
    }
  }

  async function loadYards() {
    try {
      const data = await getAllYards();
      setAllYards(Array.isArray(data?.yards) ? data.yards : []);
    } catch (err) {
      console.error("Failed to load yards:", err);
    } finally {
      setYardsLoading(false);
    }
  }

  useEffect(() => {
    loadTools();
    loadMainYards();
    loadYards();
  }, []);

  async function handleFilter() {
    await loadTools();
  }

  async function handleCreateTool() {
    try {
      if (!formData.name.trim()) {
        alert("Tool name is required");
        return;
      }

      if (!formData.code.trim()) {
        alert("Tool code is required");
        return;
      }

      if (!formData.currentYard) {
        alert("Please select a MAIN yard");
        return;
      }

      setCreating(true);

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim() || null,
        currentYard: formData.currentYard,
        currentLocationCode: "MAIN_STORE",
      };

      console.log(
        "FINAL create tool payload:",
        JSON.stringify(payload, null, 2)
      );

      await createTool(payload);

      setFormData({
        name: "",
        code: "",
        description: "",
        currentYard: "",
      });

      setShowCreate(false);
      await loadTools();
      alert("Tool created successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create tool");
    } finally {
      setCreating(false);
    }
  }

  function openIssueModal(tool) {
    setSelectedTool(tool);
    setIssueForm({
      issuedTo: "",
      note: "",
    });
    setShowIssue(true);
  }

  async function handleIssueTool() {
    try {
      if (!selectedTool?._id) {
        alert("No tool selected");
        return;
      }

      if (!issueForm.issuedTo.trim()) {
        alert("Issued To is required");
        return;
      }

      setIssuing(true);

      const payload = {
        issuedTo: issueForm.issuedTo.trim(),
        note: issueForm.note.trim() || undefined,
      };

      console.log(
        "FINAL issue tool payload:",
        JSON.stringify(payload, null, 2)
      );

      await issueTool(selectedTool._id, payload);

      setShowIssue(false);
      setSelectedTool(null);
      setIssueForm({
        issuedTo: "",
        note: "",
      });

      await loadTools();
      alert("Tool issued successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to issue tool");
    } finally {
      setIssuing(false);
    }
  }

  function openReturnModal(tool) {
    setSelectedTool(tool);
    setReturnForm({
      toLocationCode: tool.currentLocationCode || "MAIN_STORE",
      note: "",
    });
    setShowReturn(true);
  }

  async function handleReturnTool() {
    try {
      if (!selectedTool?._id) {
        alert("No tool selected");
        return;
      }

      if (!returnForm.toLocationCode.trim()) {
        alert("Return location is required");
        return;
      }

      setReturning(true);

      const payload = {
        toLocationCode: returnForm.toLocationCode.trim().toUpperCase(),
        note: returnForm.note.trim() || undefined,
      };

      console.log(
        "FINAL return tool payload:",
        JSON.stringify(payload, null, 2)
      );

      await returnTool(selectedTool._id, payload);

      setShowReturn(false);
      setSelectedTool(null);
      setReturnForm({
        toLocationCode: "",
        note: "",
      });

      await loadTools();
      alert("Tool returned successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to return tool");
    } finally {
      setReturning(false);
    }
  }

  function openTransferModal(tool) {
    setSelectedTool(tool);
    setTransferForm({
      toYard: "",
      toLocationCode: "",
      note: "",
    });
    setShowTransfer(true);
  }

  async function handleTransferTool() {
    try {
      if (!selectedTool?._id) {
        alert("No tool selected");
        return;
      }

      if (!transferForm.toYard) {
        alert("Destination yard is required");
        return;
      }

      if (!transferForm.toLocationCode.trim()) {
        alert("Destination location code is required");
        return;
      }

      setTransferring(true);

      const payload = {
        toYard: transferForm.toYard,
        toLocationCode: transferForm.toLocationCode.trim().toUpperCase(),
        note: transferForm.note.trim() || undefined,
      };

      console.log(
        "FINAL transfer tool payload:",
        JSON.stringify(payload, null, 2)
      );

      await transferTool(selectedTool._id, payload);

      setShowTransfer(false);
      setSelectedTool(null);
      setTransferForm({
        toYard: "",
        toLocationCode: "",
        note: "",
      });

      await loadTools();
      alert("Tool transferred successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to transfer tool");
    } finally {
      setTransferring(false);
    }
  }

  async function handleUpdateStatus(tool, status) {
    try {
      if (!tool?._id) {
        alert("No tool selected");
        return;
      }

      await updateToolStatus(tool._id, { status });
      await loadTools();
      alert(`Tool marked as ${status}`);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to update status");
    }
  }

  async function handleViewMovements(tool, page = 1) {
    try {
      setSelectedTool(tool);
      setShowMovements(true);
      setMovementsLoading(true);
      setToolMovements(null);

      const data = await getToolMovements(tool._id, {
        page,
        limit: movementLimit,
      });

      setToolMovements(data);
      setMovementPage(page);
      setMovementPagination(
        data?.pagination || {
          page: data?.page,
          pages: data?.pages || data?.totalPages || data?.pageCount,
          total: data?.total,
          limit: data?.limit,
        }
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load tool movements");
    } finally {
      setMovementsLoading(false);
    }
  }

  function closeMovementsModal() {
    setShowMovements(false);
    setToolMovements(null);
    setSelectedTool(null);
    setMovementPage(1);
    setMovementPagination(null);
  }

  const filteredTransferYards = allYards.filter((yard) => {
    const currentYardId =
      selectedTool?.currentYard?._id || selectedTool?.currentYard;
    return String(yard._id) !== String(currentYardId);
  });

  const movementRows = Array.isArray(toolMovements?.items)
    ? toolMovements.items
    : Array.isArray(toolMovements?.rows)
    ? toolMovements.rows
    : Array.isArray(toolMovements)
    ? toolMovements
    : [];

  const totalMovementPages =
    movementPagination?.pages ||
    movementPagination?.totalPages ||
    movementPagination?.pageCount ||
    null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
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
            Tools
          </h2>
          <p
            style={{
              margin: "8px 0 0 0",
              color: "#94a3b8",
              fontSize: 14,
            }}
          >
            View tools available in the system.
          </p>
        </div>

        {canCreateTool && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={primaryButtonStyle}
          >
            + Create Tool
          </button>
        )}
      </div>

      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr auto",
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tool name or code"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">All statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ISSUED">ISSUED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="RETIRED">RETIRED</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button
              type="button"
              onClick={handleFilter}
              style={primaryButtonStyle}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {loading && <p>Loading tools...</p>}
      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

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
                <th style={thStyle}>Tool Code</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Current Yard</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Holder</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {tools.length === 0 ? (
                <tr>
                  <td colSpan="7" style={emptyStyle}>
                    No tools found.
                  </td>
                </tr>
              ) : (
                tools.map((tool) => (
                  <tr key={tool._id}>
                    <td style={tdStyle}>{tool.code || "-"}</td>
                    <td style={tdStyle}>{tool.name || "-"}</td>
                    <td style={tdStyle}>
                      <span style={getStatusBadgeStyle(tool.status)}>
                        {tool.status || "-"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {tool.currentYard?.name ||
                        tool.currentYard?.code ||
                        tool.currentYard ||
                        "-"}
                    </td>
                    <td style={tdStyle}>{tool.currentLocationCode || "-"}</td>
                    <td style={tdStyle}>{tool.currentHolder || "-"}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleViewMovements(tool)}
                          style={secondaryButtonStyle}
                        >
                          View Movements
                        </button>

                        {tool.status === "AVAILABLE" && (
                          <>
                            <button
                              type="button"
                              onClick={() => openIssueModal(tool)}
                              style={issueButtonStyle}
                            >
                              Issue
                            </button>

                            <button
                              type="button"
                              onClick={() => openTransferModal(tool)}
                              style={transferButtonStyle}
                            >
                              Transfer
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(tool, "MAINTENANCE")
                              }
                              style={secondaryButtonStyle}
                            >
                              Maintenance
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(tool, "RETIRED")}
                              style={secondaryButtonStyle}
                            >
                              Retire
                            </button>
                          </>
                        )}

                        {tool.status === "MAINTENANCE" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(tool, "AVAILABLE")
                              }
                              style={secondaryButtonStyle}
                            >
                              Mark Available
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(tool, "RETIRED")}
                              style={secondaryButtonStyle}
                            >
                              Retire
                            </button>
                          </>
                        )}

                        {tool.status === "ISSUED" && (
                          <button
                            type="button"
                            onClick={() => openReturnModal(tool)}
                            style={returnButtonStyle}
                          >
                            Return
                          </button>
                        )}

                        {tool.status === "RETIRED" && (
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>
                            Retired
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Create Tool
              </h3>

              <button
                type="button"
                onClick={() => {
                  if (!creating) {
                    setShowCreate(false);
                  }
                }}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Tool Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter tool name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Tool Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Enter tool code"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter description"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>MAIN Yard</label>
                <select
                  value={formData.currentYard}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currentYard: e.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">
                    {mainYardsLoading
                      ? "Loading MAIN yards..."
                      : "Select MAIN yard"}
                  </option>

                  {mainYards.map((yard) => (
                    <option key={yard._id} value={yard._id}>
                      {yard.name} {yard.code ? `(${yard.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Initial Location</label>
                <input
                  type="text"
                  value="MAIN_STORE"
                  disabled
                  style={{
                    ...inputStyle,
                    opacity: 0.75,
                    cursor: "not-allowed",
                  }}
                />
              </div>
            </div>

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
                onClick={() => setShowCreate(false)}
                style={secondaryButtonStyle}
                disabled={creating}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateTool}
                style={primaryButtonStyle}
                disabled={creating}
              >
                {creating ? "Creating..." : "Create Tool"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showIssue && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Issue Tool
              </h3>

              <button
                type="button"
                onClick={() => {
                  if (!issuing) {
                    setShowIssue(false);
                    setSelectedTool(null);
                  }
                }}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#94a3b8", marginTop: 0 }}>
              Tool:{" "}
              <strong style={{ color: "#ffffff" }}>
                {selectedTool?.name || "-"}
              </strong>
            </p>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Issued To</label>
                <input
                  type="text"
                  value={issueForm.issuedTo}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, issuedTo: e.target.value })
                  }
                  placeholder="Enter person name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Note (Optional)</label>
                <input
                  type="text"
                  value={issueForm.note}
                  onChange={(e) =>
                    setIssueForm({ ...issueForm, note: e.target.value })
                  }
                  placeholder="Enter note"
                  style={inputStyle}
                />
              </div>
            </div>

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
                  setShowIssue(false);
                  setSelectedTool(null);
                }}
                style={secondaryButtonStyle}
                disabled={issuing}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleIssueTool}
                style={issueButtonStyle}
                disabled={issuing}
              >
                {issuing ? "Issuing..." : "Issue Tool"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturn && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Return Tool
              </h3>

              <button
                type="button"
                onClick={() => {
                  if (!returning) {
                    setShowReturn(false);
                    setSelectedTool(null);
                  }
                }}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#94a3b8", marginTop: 0 }}>
              Tool:{" "}
              <strong style={{ color: "#ffffff" }}>
                {selectedTool?.name || "-"}
              </strong>
            </p>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Return Location Code</label>
                <input
                  type="text"
                  value={returnForm.toLocationCode}
                  onChange={(e) =>
                    setReturnForm({
                      ...returnForm,
                      toLocationCode: e.target.value,
                    })
                  }
                  placeholder="Enter location code"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Note (Optional)</label>
                <input
                  type="text"
                  value={returnForm.note}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, note: e.target.value })
                  }
                  placeholder="Enter note"
                  style={inputStyle}
                />
              </div>
            </div>

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
                  setShowReturn(false);
                  setSelectedTool(null);
                }}
                style={secondaryButtonStyle}
                disabled={returning}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReturnTool}
                style={returnButtonStyle}
                disabled={returning}
              >
                {returning ? "Returning..." : "Return Tool"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Transfer Tool
              </h3>

              <button
                type="button"
                onClick={() => {
                  if (!transferring) {
                    setShowTransfer(false);
                    setSelectedTool(null);
                  }
                }}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#94a3b8", marginTop: 0 }}>
              Tool:{" "}
              <strong style={{ color: "#ffffff" }}>
                {selectedTool?.name || "-"}
              </strong>
            </p>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={labelStyle}>Destination Yard</label>
                <select
                  value={transferForm.toYard}
                  onChange={(e) => {
                    const selectedYard = allYards.find(
                      (yard) => String(yard._id) === String(e.target.value)
                    );

                    setTransferForm({
                      ...transferForm,
                      toYard: e.target.value,
                      toLocationCode:
                        selectedYard?.type === "MAIN"
                          ? "MAIN_STORE"
                          : "SITE_STORE",
                    });
                  }}
                  style={inputStyle}
                >
                  <option value="">
                    {yardsLoading
                      ? "Loading yards..."
                      : "Select destination yard"}
                  </option>

                  {filteredTransferYards.map((yard) => (
                    <option key={yard._id} value={yard._id}>
                      {yard.name} {yard.code ? `(${yard.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Destination Location Code</label>
                <input
                  type="text"
                  value={transferForm.toLocationCode}
                  onChange={(e) =>
                    setTransferForm({
                      ...transferForm,
                      toLocationCode: e.target.value,
                    })
                  }
                  placeholder="Enter location code"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Note (Optional)</label>
                <input
                  type="text"
                  value={transferForm.note}
                  onChange={(e) =>
                    setTransferForm({
                      ...transferForm,
                      note: e.target.value,
                    })
                  }
                  placeholder="Enter note"
                  style={inputStyle}
                />
              </div>
            </div>

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
                  setShowTransfer(false);
                  setSelectedTool(null);
                }}
                style={secondaryButtonStyle}
                disabled={transferring}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleTransferTool}
                style={transferButtonStyle}
                disabled={transferring}
              >
                {transferring ? "Transferring..." : "Transfer Tool"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMovements && (
        <div style={overlayStyle}>
          <div style={movementsModalStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Tool Movement History
              </h3>

              <button
                type="button"
                onClick={() => {
                  if (!movementsLoading) {
                    closeMovementsModal();
                  }
                }}
                style={closeButtonStyle}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#94a3b8", marginTop: 0, marginBottom: 16 }}>
              Tool:{" "}
              <strong style={{ color: "#ffffff" }}>
                {selectedTool?.name || "-"}
              </strong>
            </p>

            <div
              style={{
                maxHeight: "60vh",
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {movementsLoading ? (
                <p style={{ color: "#cbd5e1" }}>Loading movements...</p>
              ) : movementRows.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>No movements found.</p>
              ) : (
                movementRows.map((row, index) => {
                  const fromYardValue = row.fromYard;
                  const toYardValue = row.toYard;

                  const matchedFromYard = allYards.find(
                    (yard) => String(yard._id) === String(fromYardValue)
                  );

                  const matchedToYard = allYards.find(
                    (yard) => String(yard._id) === String(toYardValue)
                  );

                  const fromYardText =
                    fromYardValue?.name ||
                    fromYardValue?.code ||
                    fromYardValue?.projectCode ||
                    matchedFromYard?.name ||
                    matchedFromYard?.code ||
                    (typeof fromYardValue === "string" ? fromYardValue : null) ||
                    "N/A";

                  const toYardText =
                    toYardValue?.name ||
                    toYardValue?.code ||
                    toYardValue?.projectCode ||
                    matchedToYard?.name ||
                    matchedToYard?.code ||
                    (typeof toYardValue === "string" ? toYardValue : null) ||
                    "N/A";

                  const performedByText =
                    row.performedBy?.fullName ||
                    row.performedBy?.name ||
                    row.performedBy?.email ||
                    row.performedBy?._id ||
                    (typeof row.performedBy === "string"
                      ? row.performedBy
                      : null) ||
                    "N/A";

                  return (
                    <div
                      key={row._id || index}
                      style={{
                        marginBottom: 12,
                        padding: 14,
                        border: "1px solid #1e293b",
                        borderRadius: 12,
                        background: "#020617",
                      }}
                    >
                      <p style={movementTextStyle}>
                        Type: <strong>{row.type || "N/A"}</strong>
                      </p>

                      <p style={movementTextStyle}>
                        From Yard: <strong>{fromYardText}</strong>
                      </p>

                      <p style={movementTextStyle}>
                        From Location:{" "}
                        <strong>{row.fromLocationCode || "N/A"}</strong>
                      </p>

                      <p style={movementTextStyle}>
                        To Yard: <strong>{toYardText}</strong>
                      </p>

                      <p style={movementTextStyle}>
                        To Location:{" "}
                        <strong>{row.toLocationCode || "N/A"}</strong>
                      </p>

                      <p style={movementTextStyle}>
                        Issued To: <strong>{row.issuedTo || "N/A"}</strong>
                      </p>

                      <p style={movementTextStyle}>
                        Performed By: <strong>{performedByText}</strong>
                      </p>

                      <p style={movementTextStyle}>
                        Date:{" "}
                        <strong>
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : "N/A"}
                        </strong>
                      </p>

                      <p style={{ ...movementTextStyle, marginBottom: 0 }}>
                        Note: <strong>{row.note || "N/A"}</strong>
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    handleViewMovements(selectedTool, movementPage - 1)
                  }
                  style={secondaryButtonStyle}
                  disabled={movementsLoading || movementPage <= 1}
                >
                  Previous
                </button>

                <span style={{ color: "#cbd5e1", fontSize: 14 }}>
                  Page {movementPagination?.page || movementPage}
                  {totalMovementPages ? ` of ${totalMovementPages}` : ""}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    handleViewMovements(selectedTool, movementPage + 1)
                  }
                  style={secondaryButtonStyle}
                  disabled={
                    movementsLoading ||
                    (totalMovementPages
                      ? movementPage >= totalMovementPages
                      : movementRows.length < movementLimit)
                  }
                >
                  Next
                </button>
              </div>

              <button
                type="button"
                onClick={closeMovementsModal}
                style={secondaryButtonStyle}
                disabled={movementsLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
};

const primaryButtonStyle = {
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

const issueButtonStyle = {
  border: "1px solid rgba(245,158,11,0.35)",
  borderRadius: 8,
  padding: "8px 12px",
  background: "rgba(245,158,11,0.15)",
  color: "#fbbf24",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const returnButtonStyle = {
  border: "1px solid rgba(59,130,246,0.35)",
  borderRadius: 8,
  padding: "8px 12px",
  background: "rgba(59,130,246,0.15)",
  color: "#60a5fa",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const transferButtonStyle = {
  border: "1px solid rgba(168,85,247,0.35)",
  borderRadius: 8,
  padding: "8px 12px",
  background: "rgba(168,85,247,0.15)",
  color: "#c084fc",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const closeButtonStyle = {
  border: "1px solid #334155",
  borderRadius: 8,
  background: "#1e293b",
  color: "#ffffff",
  width: 34,
  height: 34,
  cursor: "pointer",
  fontSize: 14,
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
  maxWidth: 520,
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
};

const movementsModalStyle = {
  width: "100%",
  maxWidth: 720,
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
};

const movementTextStyle = {
  margin: "0 0 8px 0",
  color: "#cbd5e1",
  fontSize: 14,
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

  if (status === "AVAILABLE") {
    return {
      ...base,
      background: "rgba(34,197,94,0.15)",
      color: "#4ade80",
      borderColor: "rgba(34,197,94,0.35)",
    };
  }

  if (status === "ISSUED") {
    return {
      ...base,
      background: "rgba(245,158,11,0.15)",
      color: "#fbbf24",
      borderColor: "rgba(245,158,11,0.35)",
    };
  }

  if (status === "MAINTENANCE") {
    return {
      ...base,
      background: "rgba(59,130,246,0.15)",
      color: "#60a5fa",
      borderColor: "rgba(59,130,246,0.35)",
    };
  }

  if (status === "RETIRED") {
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