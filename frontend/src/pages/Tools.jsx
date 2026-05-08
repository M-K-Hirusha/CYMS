import { useEffect, useMemo, useRef, useState } from "react";
import {
  Wrench,
  Plus,
  Search,
  RotateCcw,
  Send,
  Undo2,
  ArrowRightLeft,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
} from "lucide-react";
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
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { theme } from "../styles/theme";

export default function Tools() {
  const { showToast } = useToast();
  const actionMenuRef = useRef(null);

  const [screenWidth, setScreenWidth] = useState(() => {
    if (typeof window === "undefined") return 1200;
    return window.innerWidth;
  });

  const isMobile = screenWidth <= 900;
  const isTablet = screenWidth > 900 && screenWidth < 1200;

  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yardFilter, setYardFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const toolsPerPage = 5;

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

  const [statusConfirmTool, setStatusConfirmTool] = useState(null);
  const [statusConfirmValue, setStatusConfirmValue] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [hoveredAction, setHoveredAction] = useState(null);
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
  const canCreateTool = role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN";

  const summary = useMemo(() => {
    return {
      total: tools.length,
      available: tools.filter((tool) => tool.status === "AVAILABLE").length,
      issued: tools.filter((tool) => tool.status === "ISSUED").length,
      maintenance: tools.filter((tool) => tool.status === "MAINTENANCE").length,
      retired: tools.filter((tool) => tool.status === "RETIRED").length,
    };
  }, [tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const q = search.trim().toLowerCase();

      const toolName = tool.name?.toLowerCase() || "";
      const toolCode = tool.code?.toLowerCase() || "";

      const currentYardId =
        tool.currentYard?._id ||
        tool.currentYard?.id ||
        tool.currentYardId ||
        tool.yard?._id ||
        tool.yard ||
        "";

      if (q && !toolName.includes(q) && !toolCode.includes(q)) return false;
      if (statusFilter && tool.status !== statusFilter) return false;
      if (yardFilter && String(currentYardId) !== String(yardFilter)) return false;

      return true;
    });
  }, [tools, search, statusFilter, yardFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTools.length / toolsPerPage));

  const paginatedTools = filteredTools.slice(
    (currentPage - 1) * toolsPerPage,
    currentPage * toolsPerPage
  );

  async function loadTools(customFilters) {
    try {
      setLoading(true);
      setError("");

      const data = await getTools(
        customFilters || {
          search: search.trim(),
          status: statusFilter,
          yardId: yardFilter,
        }
      );

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
      const yards = Array.isArray(data?.yards) ? data.yards : [];
      setMainYards(yards.filter((yard) => yard.isActive !== false));
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
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadTools();
    loadMainYards();
    loadYards();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, yardFilter]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleResetFilters() {
    setSearch("");
    setStatusFilter("");
    setYardFilter("");
    setCurrentPage(1);
    await loadTools({});
  }

  async function handleCreateTool() {
    try {
      if (!formData.name.trim()) {
        showToast("Tool name is required", "error");
        return;
      }

      if (!formData.code.trim()) {
        showToast("Tool code is required", "error");
        return;
      }

      if (!formData.currentYard) {
        showToast("Please select a MAIN yard", "error");
        return;
      }

      setCreating(true);

      await createTool({
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim() || null,
        currentYard: formData.currentYard,
        currentLocationCode: "MAIN_STORE",
      });

      setFormData({ name: "", code: "", description: "", currentYard: "" });
      setShowCreate(false);
      setCurrentPage(1);
      await loadTools();
      showToast("Tool created successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to create tool", "error");
    } finally {
      setCreating(false);
    }
  }

  function openIssueModal(tool) {
    setActionMenuOpen(null);
    setSelectedTool(tool);
    setIssueForm({ issuedTo: "", note: "" });
    setShowIssue(true);
  }

  async function handleIssueTool() {
    try {
      if (!selectedTool?._id) {
        showToast("No tool selected", "error");
        return;
      }

      if (!issueForm.issuedTo.trim()) {
        showToast("Issued To is required", "error");
        return;
      }

      setIssuing(true);

      await issueTool(selectedTool._id, {
        issuedTo: issueForm.issuedTo.trim(),
        note: issueForm.note.trim() || undefined,
      });

      setShowIssue(false);
      setSelectedTool(null);
      setIssueForm({ issuedTo: "", note: "" });

      setCurrentPage(1);
      await loadTools();
      showToast("Tool issued successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to issue tool", "error");
    } finally {
      setIssuing(false);
    }
  }

  function openReturnModal(tool) {
    setActionMenuOpen(null);
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
        showToast("No tool selected", "error");
        return;
      }

      if (!returnForm.toLocationCode.trim()) {
        showToast("Return location is required", "error");
        return;
      }

      setReturning(true);

      await returnTool(selectedTool._id, {
        toLocationCode: returnForm.toLocationCode.trim().toUpperCase(),
        note: returnForm.note.trim() || undefined,
      });

      setShowReturn(false);
      setSelectedTool(null);
      setReturnForm({ toLocationCode: "MAIN_STORE", note: "" });

      setCurrentPage(1);
      await loadTools();
      showToast("Tool returned successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to return tool", "error");
    } finally {
      setReturning(false);
    }
  }

  function openTransferModal(tool) {
    setActionMenuOpen(null);
    setSelectedTool(tool);
    setTransferForm({ toYard: "", toLocationCode: "", note: "" });
    setShowTransfer(true);
  }

  async function handleTransferTool() {
    try {
      if (!selectedTool?._id) {
        showToast("No tool selected", "error");
        return;
      }

      if (!transferForm.toYard) {
        showToast("Destination yard is required", "error");
        return;
      }

      if (!transferForm.toLocationCode.trim()) {
        showToast("Destination location code is required", "error");
        return;
      }

      setTransferring(true);

      await transferTool(selectedTool._id, {
        toYard: transferForm.toYard,
        toLocationCode: transferForm.toLocationCode.trim().toUpperCase(),
        note: transferForm.note.trim() || undefined,
      });

      setShowTransfer(false);
      setSelectedTool(null);
      setTransferForm({ toYard: "", toLocationCode: "", note: "" });

      setCurrentPage(1);
      await loadTools();
      showToast("Tool transferred successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to transfer tool", "error");
    } finally {
      setTransferring(false);
    }
  }

  async function handleConfirmStatusUpdate() {
    try {
      if (!statusConfirmTool?._id || !statusConfirmValue) return;

      setStatusUpdating(true);

      await updateToolStatus(statusConfirmTool._id, {
        status: statusConfirmValue,
      });

      setCurrentPage(1);
      await loadTools();

      showToast(`Tool marked as ${statusConfirmValue}`, "success");

      setStatusConfirmTool(null);
      setStatusConfirmValue("");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to update status", "error");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleViewMovements(tool, page = 1) {
    try {
      setActionMenuOpen(null);
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
      setMovementPagination({
        page: data?.page,
        pages: data?.pages || data?.totalPages || data?.pageCount,
        total: data?.total,
        limit: data?.limit,
      });
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to load tool movements", "error");
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

  function askStatusUpdate(tool, status) {
    setActionMenuOpen(null);
    setStatusConfirmTool(tool);
    setStatusConfirmValue(status);
  }

  const filteredTransferYards = allYards.filter((yard) => {
    const currentYardId = selectedTool?.currentYard?._id || selectedTool?.currentYard;

    return yard.isActive !== false && String(yard._id) !== String(currentYardId);
  });

  const movementRows = Array.isArray(toolMovements?.items) ? toolMovements.items : [];
  const totalMovementPages = movementPagination?.pages || movementPagination?.totalPages || null;

  function openActionMenuForTool(toolId, event, menuHeight = 230) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const gap = 8;

    let top = rect.bottom + gap;
    let left = rect.right - menuWidth;

    if (top + menuHeight > window.innerHeight - 12) {
      top = rect.top - menuHeight - gap;
    }

    if (top < 12) top = 12;
    if (left < 12) left = 12;

    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    setMenuPosition({ top, left });
    setActionMenuOpen(actionMenuOpen === toolId ? null : toolId);
  }

  return (
    <div style={pageStyle}>
      <div style={getPageHeaderStyle(isMobile)}>
        <div>
          <p style={sectionEyebrowStyle}>CYMS OPERATIONS</p>

          <div style={titleRowStyle}>
            <Wrench size={isMobile ? 24 : 28} color={theme.text} />
            <h2 style={getPageTitleStyle(isMobile)}>Tools</h2>
          </div>

          <p style={pageSubtitleStyle}>
            Manage tool availability, issuing, returns, transfers, and movement history.
          </p>
        </div>

        {canCreateTool && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={getPrimaryButtonStyle(isMobile)}
          >
            <Plus size={16} />
            Create Tool
          </button>
        )}
      </div>

      <div style={getSummaryGridStyle(isMobile, isTablet)}>
        <SummaryCard title="Total Tools" value={summary.total} icon={<Wrench size={20} />} />
        <SummaryCard title="Available" value={summary.available} icon={<CheckCircle2 size={20} />} />
        <SummaryCard title="Issued" value={summary.issued} icon={<Send size={20} />} />
        <SummaryCard title="Maintenance" value={summary.maintenance} icon={<AlertTriangle size={20} />} />
        <SummaryCard title="Retired" value={summary.retired} icon={<XCircle size={20} />} />
      </div>

      <div style={filterCardStyle}>
        <div style={getFilterGridStyle(isMobile)}>
          <div>
            <label style={labelStyle}>Search</label>
            <div style={inputIconWrapStyle}>
              <Search size={16} style={inputIconStyle} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tool name or code"
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
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

          <div>
            <label style={labelStyle}>Yard</label>
            <select
              value={yardFilter}
              onChange={(e) => setYardFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">All yards</option>
              {allYards.map((yard) => (
                <option key={yard._id} value={yard._id}>
                  {yard.name} {yard.code ? `(${yard.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={getFilterButtonGroupStyle(isMobile)}>
            <button
              type="button"
              onClick={handleResetFilters}
              style={getSecondaryButtonStyle(isMobile)}
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={loadingBoxStyle}>Loading tools...</div>}
      {error && <div style={errorBoxStyle}>{error}</div>}

      {!loading && !error && (
        <div style={tableCardStyle}>
          <div style={tableHeaderStyle}>
            <h3 style={sectionTitleStyle}>Tool Register</h3>
            <p style={sectionSubtitleStyle}>
              Showing {filteredTools.length} tool{filteredTools.length === 1 ? "" : "s"}
            </p>
          </div>

          {!isMobile ? (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
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
                  {paginatedTools.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={emptyStyle}>
                        No tools found.
                      </td>
                    </tr>
                  ) : (
                    paginatedTools.map((tool) => (
                      <tr key={tool._id} className="tool-table-row">
                        <td style={tdStyle}>
                          <strong style={{ color: theme.text }}>{tool.code || "-"}</strong>
                        </td>
                        <td style={tdStyle}>{tool.name || "-"}</td>
                        <td style={tdStyle}>
                          <span style={getStatusBadgeStyle(tool.status)}>{tool.status || "-"}</span>
                        </td>
                        <td style={tdStyle}>
                          {tool.currentYard?.name || tool.currentYard?.code || tool.currentYard || "-"}
                        </td>
                        <td style={tdStyle}>{tool.currentLocationCode || "-"}</td>
                        <td style={tdStyle}>{tool.currentHolder || "-"}</td>
                        <td style={tdStyle}>
                          <div
                            ref={actionMenuOpen === tool._id ? actionMenuRef : null}
                            style={{ position: "relative" }}
                          >
                            <button
                              type="button"
                              onClick={(e) => openActionMenuForTool(tool._id, e)}
                              style={smallSecondaryButtonStyle}
                            >
                              <MoreHorizontal size={16} />
                              
                            </button>

                            {actionMenuOpen === tool._id && (
                              <ToolActionDropdown
                                tool={tool}
                                menuPosition={menuPosition}
                                hoveredAction={hoveredAction}
                                setHoveredAction={setHoveredAction}
                                onHistory={() => handleViewMovements(tool)}
                                onIssue={() => openIssueModal(tool)}
                                onTransfer={() => openTransferModal(tool)}
                                onReturn={() => openReturnModal(tool)}
                                onStatus={(status) => askStatusUpdate(tool, status)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={mobileListStyle}>
              {paginatedTools.length === 0 ? (
                <div style={mobileEmptyStyle}>No tools found.</div>
              ) : (
                paginatedTools.map((tool) => (
                  <ToolMobileCard
                    key={tool._id}
                    tool={tool}
                    actionMenuOpen={actionMenuOpen}
                    actionMenuRef={actionMenuOpen === tool._id ? actionMenuRef : null}
                    menuPosition={menuPosition}
                    hoveredAction={hoveredAction}
                    setHoveredAction={setHoveredAction}
                    openActionMenuForTool={openActionMenuForTool}
                    onHistory={() => handleViewMovements(tool)}
                    onIssue={() => openIssueModal(tool)}
                    onTransfer={() => openTransferModal(tool)}
                    onReturn={() => openReturnModal(tool)}
                    onStatus={(status) => askStatusUpdate(tool, status)}
                  />
                ))
              )}
            </div>
          )}

          {filteredTools.length > toolsPerPage && (
            <div style={getPaginationStyle(isMobile)}>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  ...getSecondaryButtonStyle(isMobile),
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>

              <span style={paginationTextStyle}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  ...getSecondaryButtonStyle(isMobile),
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <ToolModal
          title="Create Tool"
          icon={<Plus size={18} />}
          onClose={() => !creating && setShowCreate(false)}
          isMobile={isMobile}
        >
          <div style={modalGridStyle}>
            <Field label="Tool Name">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter tool name"
                style={inputStyle}
              />
            </Field>

            <Field label="Tool Code">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Enter tool code"
                style={inputStyle}
              />
            </Field>

            <Field label="Description (Optional)">
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                style={inputStyle}
              />
            </Field>

            <Field label="MAIN Yard">
              <select
                value={formData.currentYard}
                onChange={(e) => setFormData({ ...formData, currentYard: e.target.value })}
                style={inputStyle}
              >
                <option value="">
                  {mainYardsLoading ? "Loading MAIN yards..." : "Select MAIN yard"}
                </option>

                {mainYards.map((yard) => (
                  <option key={yard._id} value={yard._id}>
                    {yard.name} {yard.code ? `(${yard.code})` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Initial Location">
              <input
                type="text"
                value="MAIN_STORE"
                disabled
                style={{ ...inputStyle, opacity: 0.75, cursor: "not-allowed" }}
              />
            </Field>
          </div>

          <ModalActions
            isMobile={isMobile}
            onCancel={() => setShowCreate(false)}
            cancelDisabled={creating}
            onSubmit={handleCreateTool}
            submitDisabled={creating}
            submitText={creating ? "Creating..." : "Create Tool"}
            submitStyle={primaryButtonStyle}
          />
        </ToolModal>
      )}

      {showIssue && (
        <ToolModal
          title="Issue Tool"
          icon={<Send size={18} />}
          onClose={() => {
            if (!issuing) {
              setShowIssue(false);
              setSelectedTool(null);
            }
          }}
          isMobile={isMobile}
        >
          <SelectedToolInfo tool={selectedTool} />

          <div style={modalGridStyle}>
            <Field label="Issued To">
              <input
                type="text"
                value={issueForm.issuedTo}
                onChange={(e) => setIssueForm({ ...issueForm, issuedTo: e.target.value })}
                placeholder="Enter person name"
                style={inputStyle}
              />
            </Field>

            <Field label="Note (Optional)">
              <input
                type="text"
                value={issueForm.note}
                onChange={(e) => setIssueForm({ ...issueForm, note: e.target.value })}
                placeholder="Enter note"
                style={inputStyle}
              />
            </Field>
          </div>

          <ModalActions
            isMobile={isMobile}
            onCancel={() => {
              setShowIssue(false);
              setSelectedTool(null);
            }}
            cancelDisabled={issuing}
            onSubmit={handleIssueTool}
            submitDisabled={issuing}
            submitText={issuing ? "Issuing..." : "Issue Tool"}
            submitStyle={issueButtonStyle}
          />
        </ToolModal>
      )}

      {showReturn && (
        <ToolModal
          title="Return Tool"
          icon={<Undo2 size={18} />}
          onClose={() => {
            if (!returning) {
              setShowReturn(false);
              setSelectedTool(null);
            }
          }}
          isMobile={isMobile}
        >
          <SelectedToolInfo tool={selectedTool} />

          <div style={modalGridStyle}>
            <Field label="Return Location Code">
              <input
                type="text"
                value={returnForm.toLocationCode}
                onChange={(e) => setReturnForm({ ...returnForm, toLocationCode: e.target.value })}
                placeholder="Enter location code"
                style={inputStyle}
              />
            </Field>

            <Field label="Note (Optional)">
              <input
                type="text"
                value={returnForm.note}
                onChange={(e) => setReturnForm({ ...returnForm, note: e.target.value })}
                placeholder="Enter note"
                style={inputStyle}
              />
            </Field>
          </div>

          <ModalActions
            isMobile={isMobile}
            onCancel={() => {
              setShowReturn(false);
              setSelectedTool(null);
            }}
            cancelDisabled={returning}
            onSubmit={handleReturnTool}
            submitDisabled={returning}
            submitText={returning ? "Returning..." : "Return Tool"}
            submitStyle={returnButtonStyle}
          />
        </ToolModal>
      )}

      {showTransfer && (
        <ToolModal
          title="Transfer Tool"
          icon={<ArrowRightLeft size={18} />}
          onClose={() => {
            if (!transferring) {
              setShowTransfer(false);
              setSelectedTool(null);
            }
          }}
          isMobile={isMobile}
        >
          <SelectedToolInfo tool={selectedTool} />

          <div style={modalGridStyle}>
            <Field label="Destination Yard">
              <select
                value={transferForm.toYard}
                onChange={(e) => {
                  const selectedYard = allYards.find(
                    (yard) => String(yard._id) === String(e.target.value)
                  );

                  setTransferForm({
                    ...transferForm,
                    toYard: e.target.value,
                    toLocationCode: selectedYard?.type === "MAIN" ? "MAIN_STORE" : "SITE_STORE",
                  });
                }}
                style={inputStyle}
              >
                <option value="">
                  {yardsLoading ? "Loading yards..." : "Select destination yard"}
                </option>

                {filteredTransferYards.map((yard) => (
                  <option key={yard._id} value={yard._id}>
                    {yard.name} {yard.code ? `(${yard.code})` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Destination Location Code">
              <input
                type="text"
                value={transferForm.toLocationCode}
                onChange={(e) => setTransferForm({ ...transferForm, toLocationCode: e.target.value })}
                placeholder="Enter location code"
                style={inputStyle}
              />
            </Field>

            <Field label="Note (Optional)">
              <input
                type="text"
                value={transferForm.note}
                onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
                placeholder="Enter note"
                style={inputStyle}
              />
            </Field>
          </div>

          <ModalActions
            isMobile={isMobile}
            onCancel={() => {
              setShowTransfer(false);
              setSelectedTool(null);
            }}
            cancelDisabled={transferring}
            onSubmit={handleTransferTool}
            submitDisabled={transferring}
            submitText={transferring ? "Transferring..." : "Transfer Tool"}
            submitStyle={transferButtonStyle}
          />
        </ToolModal>
      )}

      {showMovements && (
        <div style={overlayStyle}>
          <div style={getMovementsModalStyle(isMobile)}>
            <div style={modalHeaderStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={modalIconStyle}>
                  <History size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={modalTitleStyle}>Tool Movement History</h3>
                  <p style={modalSubtitleStyle}>
                    {selectedTool?.name || "-"} {selectedTool?.code ? `• ${selectedTool.code}` : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !movementsLoading && closeMovementsModal()}
                style={closeButtonStyle}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <div style={movementsListStyle}>
              {movementsLoading ? (
                <p style={{ color: theme.textSoft }}>Loading movements...</p>
              ) : movementRows.length === 0 ? (
                <p style={{ color: theme.muted }}>No movements found.</p>
              ) : (
                movementRows.map((row, index) => (
                  <MovementCard key={row._id || index} row={row} allYards={allYards} />
                ))
              )}
            </div>

            <div style={getModalFooterStyle(isMobile)}>
              <div style={getMovementPagerStyle(isMobile)}>
                <button
                  type="button"
                  onClick={() => handleViewMovements(selectedTool, movementPage - 1)}
                  style={getSecondaryButtonStyle(isMobile)}
                  disabled={movementsLoading || movementPage <= 1}
                >
                  Previous
                </button>

                <span style={{ color: theme.textSoft, fontSize: 14, textAlign: "center" }}>
                  Page {movementPagination?.page || movementPage}
                  {totalMovementPages ? ` of ${totalMovementPages}` : ""}
                </span>

                <button
                  type="button"
                  onClick={() => handleViewMovements(selectedTool, movementPage + 1)}
                  style={getSecondaryButtonStyle(isMobile)}
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
                style={getSecondaryButtonStyle(isMobile)}
                disabled={movementsLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!statusConfirmTool}
        title="Confirm Tool Status"
        message={`Mark ${statusConfirmTool?.name || "this tool"} as ${statusConfirmValue}?`}
        loading={statusUpdating}
        onCancel={() => {
          if (!statusUpdating) {
            setStatusConfirmTool(null);
            setStatusConfirmValue("");
          }
        }}
        onConfirm={handleConfirmStatusUpdate}
      />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div style={summaryCardStyle}>
      <div style={summaryIconStyle}>{icon}</div>
      <div>
        <p style={summaryLabelStyle}>{title}</p>
        <h3 style={summaryValueStyle}>{value}</h3>
      </div>
    </div>
  );
}

function ToolModal({ title, icon, children, onClose, isMobile = false }) {
  return (
    <div style={overlayStyle}>
      <div style={getModalStyle(isMobile)}>
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={modalIconStyle}>{icon}</div>
            <h3 style={modalTitleStyle}>{title}</h3>
          </div>

          <button type="button" onClick={onClose} style={closeButtonStyle} className="close-btn">
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function SelectedToolInfo({ tool }) {
  return (
    <div style={selectedToolCardStyle}>
      <span style={{ color: theme.muted, fontSize: 13 }}>Selected Tool</span>
      <strong style={{ color: theme.text, fontSize: 15, overflowWrap: "anywhere" }}>
        {tool?.name || "-"} {tool?.code ? `(${tool.code})` : ""}
      </strong>
    </div>
  );
}

function ModalActions({
  isMobile = false,
  onCancel,
  cancelDisabled,
  onSubmit,
  submitDisabled,
  submitText,
  submitStyle,
}) {
  return (
    <div style={getModalActionsStyle(isMobile)}>
      <button
        type="button"
        onClick={onCancel}
        style={getSecondaryButtonStyle(isMobile)}
        disabled={cancelDisabled}
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={onSubmit}
        style={{
          ...submitStyle,
          width: isMobile ? "100%" : "auto",
          justifyContent: "center",
          opacity: submitDisabled ? 0.7 : 1,
          cursor: submitDisabled ? "not-allowed" : "pointer",
        }}
        disabled={submitDisabled}
      >
        {submitDisabled ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="spinner" />
            Processing...
          </span>
        ) : (
          submitText
        )}
      </button>
    </div>
  );
}

function ToolActionDropdown({
  tool,
  menuPosition,
  hoveredAction,
  setHoveredAction,
  onHistory,
  onIssue,
  onTransfer,
  onReturn,
  onStatus,
}) {
  return (
    <div style={getDropdownStyle(menuPosition)}>
      <button
        type="button"
        onClick={onHistory}
        style={getDropdownItemStyle(hoveredAction === `${tool._id}-history`)}
        onMouseEnter={() => setHoveredAction(`${tool._id}-history`)}
        onMouseLeave={() => setHoveredAction(null)}
      >
        <History size={14} />
        History
      </button>

      {tool.status === "AVAILABLE" && (
        <>
          <button
            type="button"
            onClick={onIssue}
            style={getDropdownItemStyle(hoveredAction === `${tool._id}-issue`)}
            onMouseEnter={() => setHoveredAction(`${tool._id}-issue`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <Send size={14} />
            Issue
          </button>

          <button
            type="button"
            onClick={onTransfer}
            style={getDropdownItemStyle(hoveredAction === `${tool._id}-transfer`)}
            onMouseEnter={() => setHoveredAction(`${tool._id}-transfer`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <ArrowRightLeft size={14} />
            Transfer
          </button>

          <button
            type="button"
            onClick={() => onStatus("MAINTENANCE")}
            style={getDropdownItemStyle(hoveredAction === `${tool._id}-maintenance`)}
            onMouseEnter={() => setHoveredAction(`${tool._id}-maintenance`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <AlertTriangle size={14} />
            Maintenance
          </button>

          <button
            type="button"
            onClick={() => onStatus("RETIRED")}
            style={getDropdownItemStyle(hoveredAction === `${tool._id}-retire`, true)}
            onMouseEnter={() => setHoveredAction(`${tool._id}-retire`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <XCircle size={14} />
            Retire
          </button>
        </>
      )}

      {tool.status === "MAINTENANCE" && (
        <>
          <button
            type="button"
            onClick={() => onStatus("AVAILABLE")}
            style={getDropdownItemStyle(hoveredAction === `${tool._id}-available`)}
            onMouseEnter={() => setHoveredAction(`${tool._id}-available`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <CheckCircle2 size={14} />
            Available
          </button>

          <button
            type="button"
            onClick={() => onStatus("RETIRED")}
            style={getDropdownItemStyle(hoveredAction === `${tool._id}-retire`, true)}
            onMouseEnter={() => setHoveredAction(`${tool._id}-retire`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <XCircle size={14} />
            Retire
          </button>
        </>
      )}

      {tool.status === "ISSUED" && (
        <button
          type="button"
          onClick={onReturn}
          style={getDropdownItemStyle(hoveredAction === `${tool._id}-return`)}
          onMouseEnter={() => setHoveredAction(`${tool._id}-return`)}
          onMouseLeave={() => setHoveredAction(null)}
        >
          <Undo2 size={14} />
          Return
        </button>
      )}

      {tool.status === "RETIRED" && (
        <div style={{ ...dropdownItemStyle, opacity: 0.6 }}>Retired</div>
      )}
    </div>
  );
}

function ToolMobileCard({
  tool,
  actionMenuOpen,
  actionMenuRef,
  menuPosition,
  hoveredAction,
  setHoveredAction,
  openActionMenuForTool,
  onHistory,
  onIssue,
  onTransfer,
  onReturn,
  onStatus,
}) {
  return (
  <div style={mobileToolCardStyle}>
    <div style={mobileCardHeaderStyle}>
      <div style={{ minWidth: 0 }}>
        <p style={mobileCardLabelStyle}>Tool</p>

        <h3 style={mobileToolTitleStyle}>
          {tool.name || "-"}
        </h3>

        <p style={mobileToolCodeStyle}>
          {tool.code || "-"}
        </p>
      </div>

      <div
        ref={actionMenuRef}
        style={mobileHeaderRightStyle}
      >
        <span style={getStatusBadgeStyle(tool.status)}>
          {tool.status || "-"}
        </span>

        <button
          type="button"
          onClick={(event) =>
            openActionMenuForTool(tool._id, event)
          }
          style={mobileMoreButtonStyle}
        >
          <MoreHorizontal size={16} />
        </button>

        {actionMenuOpen === tool._id && (
          <ToolActionDropdown
            tool={tool}
            menuPosition={menuPosition}
            hoveredAction={hoveredAction}
            setHoveredAction={setHoveredAction}
            onHistory={onHistory}
            onIssue={onIssue}
            onTransfer={onTransfer}
            onReturn={onReturn}
            onStatus={onStatus}
          />
        )}
      </div>
    </div>

    <div style={mobileMetaGridStyle}>
      <MobileInfo
        label="Current Yard"
        value={
          tool.currentYard?.name ||
          tool.currentYard?.code ||
          tool.currentYard ||
          "-"
        }
      />

      <MobileInfo
        label="Location"
        value={tool.currentLocationCode || "-"}
      />

      <MobileInfo
        label="Holder"
        value={tool.currentHolder || "-"}
      />
    </div>
  </div>
)};

function MobileInfo({ label, value }) {
  return (
    <div style={mobileMetaItemStyle}>
      <span style={mobileMetaLabelStyle}>{label}</span>
      <strong style={mobileMetaValueStyle}>{value}</strong>
    </div>
  );
}

function MovementCard({ row, allYards }) {
  const fromYardValue = row.fromYard;
  const toYardValue = row.toYard;

  const matchedFromYard = allYards.find((yard) => String(yard._id) === String(fromYardValue));
  const matchedToYard = allYards.find((yard) => String(yard._id) === String(toYardValue));

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
    (typeof row.performedBy === "string" ? row.performedBy : null) ||
    "N/A";

  return (
    <div style={movementCardStyle}>
      <MovementRow label="Type" value={row.type || "N/A"} />
      <MovementRow label="From" value={fromYardText} />
      <MovementRow label="To" value={toYardText} />
      <MovementRow
        label="Location"
        value={`${row.fromLocationCode || "N/A"} → ${row.toLocationCode || "N/A"}`}
      />
      <MovementRow label="Issued To" value={row.issuedTo || "N/A"} />
      <MovementRow label="Performed By" value={performedByText} />
      <MovementRow
        label="Date"
        value={row.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A"}
      />
      <MovementRow label="Note" value={row.note || "N/A"} last />
    </div>
  );
}

function MovementRow({ label, value, last = false }) {
  return (
    <div style={{ ...movementRowStyle, marginBottom: last ? 0 : 7 }}>
      <span style={movementLabelStyle}>{label}</span>
      <strong style={{ textAlign: "right", overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}

const cardBaseStyle = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 18,
  boxShadow: theme.shadow,
};

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "hidden",
};

function getPageHeaderStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 0,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const titleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  flexWrap: "nowrap",
};

function getPageTitleStyle(isMobile) {
  return {
    margin: 0,
    fontSize: isMobile ? 28 : 34,
    fontWeight: 900,
    color: theme.text,
    letterSpacing: "-0.04em",
    lineHeight: 1.15,
    whiteSpace: "nowrap",
    minWidth: 0,
  };
}

const pageSubtitleStyle = {
  margin: "8px 0 0 0",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.5,
};

const sectionEyebrowStyle = {
  margin: "0 0 6px",
  color: theme.primary,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

function getSummaryGridStyle(isMobile, isTablet) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : isTablet
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(5, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const summaryCardStyle = {
  ...cardBaseStyle,
  padding: 16,
  minHeight: 108,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const summaryIconStyle = {
  color: theme.primary,
  width: 38,
  height: 38,
  borderRadius: 13,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 12,
};

const summaryLabelStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 13,
  fontWeight: 700,
};

const summaryValueStyle = {
  margin: "8px 0 0",
  fontSize: 30,
  fontWeight: 900,
  color: theme.text,
};

const filterCardStyle = {
  ...cardBaseStyle,
  padding: 16,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

function getFilterGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1.4fr auto",
    gap: 16,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

function getFilterButtonGroupStyle(isMobile) {
  return {
    display: "flex",
    gap: 10,
    alignItems: isMobile ? "stretch" : "end",
    flexWrap: "wrap",
  };
}

const inputIconWrapStyle = {
  position: "relative",
};

const inputIconStyle = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: theme.muted,
};

const tableCardStyle = {
  ...cardBaseStyle,
  padding: 20,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "visible",
};

const tableHeaderStyle = {
  marginBottom: 12,
};

const sectionTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 18,
  fontWeight: 800,
};

const sectionSubtitleStyle = {
  margin: "4px 0 0 0",
  fontSize: 13,
  color: theme.muted,
};

const tableWrapStyle = {
  overflowX: "auto",
  overflowY: "visible",
  position: "relative",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  WebkitOverflowScrolling: "touch",
};

const tableStyle = {
  width: "100%",
  minWidth: 920,
  borderCollapse: "collapse",
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: theme.textSoft,
  fontSize: 14,
  fontWeight: 600,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.primary,
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(37,99,235,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 44,
};

function getPrimaryButtonStyle(isMobile) {
  return {
    ...primaryButtonStyle,
    width: isMobile ? "100%" : "auto",
  };
}

const secondaryButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 44,
};

function getSecondaryButtonStyle(isMobile) {
  return {
    ...secondaryButtonStyle,
    width: isMobile ? "100%" : "auto",
  };
}

const issueButtonStyle = {
  border: `1px solid ${theme.warning}`,
  borderRadius: 10,
  padding: "10px 14px",
  background: theme.warningSoft,
  color: theme.warning,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const returnButtonStyle = {
  border: `1px solid ${theme.primary}`,
  borderRadius: 10,
  padding: "10px 14px",
  background: theme.primarySoft,
  color: theme.primary,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const transferButtonStyle = {
  border: `1px solid ${theme.primary}`,
  borderRadius: 10,
  padding: "10px 14px",
  background: theme.primarySoft,
  color: theme.primary,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const smallSecondaryButtonStyle = {
  ...secondaryButtonStyle,
  padding: "6px 10px",
  fontSize: 12,
  minHeight: 34,
};

const closeButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  background: theme.surfaceSoft,
  color: theme.text,
  width: 34,
  height: 34,
  cursor: "pointer",
  fontSize: 14,
  transition: "all 0.2s ease",
  flexShrink: 0,
};

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.text,
  fontSize: 14,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "14px 16px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.textSoft,
  fontSize: 14,
  verticalAlign: "middle",
};

const emptyStyle = {
  padding: "24px 16px",
  textAlign: "center",
  color: theme.muted,
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
  boxSizing: "border-box",
};

function getModalStyle(isMobile) {
  return {
    width: "100%",
    maxWidth: isMobile ? "calc(100vw - 32px)" : 540,
    maxHeight: "92vh",
    overflowY: "auto",
    overflowX: "hidden",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: isMobile ? 18 : 20,
    padding: isMobile ? 16 : 22,
    boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
    boxSizing: "border-box",
  };
}

function getMovementsModalStyle(isMobile) {
  return {
    width: "100%",
    maxWidth: isMobile ? "calc(100vw - 32px)" : 760,
    maxHeight: "92vh",
    overflowY: "auto",
    overflowX: "hidden",
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: isMobile ? 18 : 20,
    padding: isMobile ? 16 : 22,
    boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
    boxSizing: "border-box",
  };
}

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
  minWidth: 0,
};

const modalIconStyle = {
  background: theme.primarySoft,
  padding: 8,
  borderRadius: 8,
  color: theme.primary,
  display: "flex",
  flexShrink: 0,
};

const modalTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 20,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const modalSubtitleStyle = {
  margin: "2px 0 0 0",
  fontSize: 12,
  color: theme.muted,
  overflowWrap: "anywhere",
};

const modalGridStyle = {
  display: "grid",
  gap: 14,
  width: "100%",
  minWidth: 0,
};

function getModalActionsStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column-reverse" : "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
    width: "100%",
  };
}

const selectedToolCardStyle = {
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  padding: 12,
  borderRadius: 12,
  marginBottom: 14,
  display: "grid",
  gap: 4,
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const movementsListStyle = {
  maxHeight: "60vh",
  overflowY: "auto",
  paddingRight: 4,
};

function getModalFooterStyle(isMobile) {
  return {
    marginTop: 18,
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "center",
    gap: 12,
    flexWrap: "wrap",
  };
}

function getMovementPagerStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
    gap: 8,
    width: isMobile ? "100%" : "auto",
  };
}

const movementCardStyle = {
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  padding: 14,
  borderRadius: 12,
  marginBottom: 10,
  color: theme.text,
  minWidth: 0,
};

const movementRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  fontSize: 13,
  marginBottom: 7,
  minWidth: 0,
};

const movementLabelStyle = {
  color: theme.muted,
  flexShrink: 0,
};

const loadingBoxStyle = {
  padding: 20,
  color: theme.textSoft,
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
};

const errorBoxStyle = {
  padding: 20,
  color: theme.danger,
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
};

function getPaginationStyle(isMobile) {
  return {
    marginTop: 18,
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "flex-end",
    alignItems: isMobile ? "stretch" : "center",
    gap: 12,
    flexWrap: "wrap",
  };
}

const paginationTextStyle = {
  color: theme.textSoft,
  fontSize: 14,
  fontWeight: 700,
  textAlign: "center",
};

function getDropdownStyle(menuPosition) {
  return {
    position: "fixed",
    top: menuPosition.top,
    left: menuPosition.left,
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    width: 190,
    zIndex: 9999,
    boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
    overflow: "hidden",
  };
}

const dropdownItemStyle = {
  width: "100%",
  padding: "10px 14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  color: theme.text,
  fontSize: 13,
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const mobileListStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const mobileToolCardStyle = {
  ...cardBaseStyle,
  padding: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const mobileCardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  minWidth: 0,
};

const mobileCardLabelStyle = {
  margin: "0 0 4px",
  color: theme.muted,
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const mobileToolTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 16,
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const mobileToolCodeStyle = {
  margin: "5px 0 0",
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const mobileMetaGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
  marginTop: 12,
};

const mobileMetaItemStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  minWidth: 0,
};

const mobileMetaLabelStyle = {
  display: "block",
  color: theme.muted,
  fontSize: 11,
  fontWeight: 800,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const mobileMetaValueStyle = {
  display: "block",
  color: theme.text,
  fontSize: 13,
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const mobileHeaderRightStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 10,
  flexShrink: 0,
};

const mobileMoreButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  width: 42,
  height: 38,
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const mobileEmptyStyle = {
  ...cardBaseStyle,
  padding: 18,
  textAlign: "center",
  color: theme.muted,
  fontSize: 13,
};

function getDropdownItemStyle(isHovered, danger = false) {
  return {
    ...dropdownItemStyle,
    color: danger ? theme.danger : theme.text,
    background: isHovered ? (danger ? theme.dangerSoft : theme.surfaceSoft) : "transparent",
  };
}

function getStatusBadgeStyle(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid",
    whiteSpace: "nowrap",
    lineHeight: 1,
  };

  if (status === "AVAILABLE") {
    return {
      ...base,
      background: theme.successSoft,
      color: theme.success,
      borderColor: theme.success,
    };
  }

  if (status === "ISSUED") {
    return {
      ...base,
      background: theme.warningSoft,
      color: theme.warning,
      borderColor: theme.warning,
    };
  }

  if (status === "MAINTENANCE") {
    return {
      ...base,
      background: theme.primarySoft,
      color: theme.primary,
      borderColor: theme.primary,
    };
  }

  if (status === "RETIRED") {
    return {
      ...base,
      background: theme.dangerSoft,
      color: theme.danger,
      borderColor: theme.danger,
    };
  }

  return {
    ...base,
    background: theme.surfaceSoft,
    color: theme.textSoft,
    borderColor: theme.border,
  };
}
