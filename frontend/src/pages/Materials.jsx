import { useEffect, useMemo, useRef, useState } from "react";
import {
  createMaterial,
  deleteMaterial,
  getMaterials,
  updateMaterial,
} from "../services/materialApi";
import {
  getMCRs,
  createMCR,
  approveMCR,
  rejectMCR,
} from "../services/mcrApi";
import {
  Package,
  Plus,
  Search,
  RotateCcw,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  Bell,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { theme } from "../styles/theme";
import { clearMultipleCache } from "../utils/apiCache";

const UNITS = ["PCS", "KG", "G", "L", "ML", "M", "M2", "M3", "BAG", "BOX"];
const pageSize = 5;
const MCR_PAGE_SIZE = 5;
const MOBILE_BREAKPOINT = 900;

export default function Materials() {
  const { showToast } = useToast();
  const currentRole = localStorage.getItem("role");

  const [screenWidth, setScreenWidth] = useState(() => window.innerWidth);
  const isMobile = screenWidth <= MOBILE_BREAKPOINT;
  const isTablet = screenWidth > MOBILE_BREAKPOINT && screenWidth < 1100;

  const canManageMaterials =
    currentRole === "SYSTEM_ADMIN" || currentRole === "HEAD_OFFICE_ADMIN";
  const canRequestMaterial = currentRole === "SITE_ADMIN";
  const canViewMCRs =
    currentRole === "SYSTEM_ADMIN" ||
    currentRole === "HEAD_OFFICE_ADMIN" ||
    currentRole === "SITE_ADMIN";

  function clearMaterialRelatedCache() {
    clearMultipleCache([
      "dashboard",
      "materials",
      "inventory",
      "mrs",
      "reports",
    ]);
  }

  const actionMenuRef = useRef(null);

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mcrs, setMCRs] = useState([]);
  const [mcrLoading, setMCRLoading] = useState(true);
  const [mcrPage, setMcrPage] = useState(1);
  const [showMCRPopup, setShowMCRPopup] = useState(false);

  const [showRequest, setShowRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    name: "",
    unit: "",
    description: "",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [hoveredAction, setHoveredAction] = useState(null);

  const [confirmConfig, setConfirmConfig] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  const [rejectMcr, setRejectMcr] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [approveMcr, setApproveMcr] = useState(null);
  const [approveForm, setApproveForm] = useState({ name: "", code: "" });
  const [approving, setApproving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    unit: "",
    category: "",
  });

  const summary = useMemo(() => {
    return {
      total: materials.length,
      active: materials.filter((material) => material.isActive !== false).length,
      inactive: materials.filter((material) => material.isActive === false).length,
      unitsUsed: new Set(materials.map((material) => material.unit).filter(Boolean)).size,
    };
  }, [materials]);

  const availableUnits = useMemo(() => {
    return [...new Set(materials.map((material) => material.unit).filter(Boolean))].sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();

    return materials.filter((material) => {
      const name = material.name?.toLowerCase() || "";
      const code = material.code?.toLowerCase() || "";
      const unit = material.unit?.toLowerCase() || "";
      const category = material.category?.toLowerCase() || "";

      if (q && !name.includes(q) && !code.includes(q) && !unit.includes(q) && !category.includes(q)) {
        return false;
      }

      if (statusFilter === "ACTIVE" && material.isActive === false) return false;
      if (statusFilter === "INACTIVE" && material.isActive !== false) return false;
      if (unitFilter && material.unit !== unitFilter) return false;

      return true;
    });
  }, [materials, search, statusFilter, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const visibleMCRs = mcrs.filter((mcr) => mcr.status === "PENDING");
  const totalMcrPages = Math.max(1, Math.ceil(visibleMCRs.length / MCR_PAGE_SIZE));
  const paginatedMCRs = visibleMCRs.slice(
    (mcrPage - 1) * MCR_PAGE_SIZE,
    mcrPage * MCR_PAGE_SIZE
  );
  const pendingMCRCount = visibleMCRs.length;

  const modalOpen = showCreate || Boolean(editingMaterial);
  const isEdit = Boolean(editingMaterial);

  async function loadMaterials() {
    try {
      setLoading(true);
      setError("");
      const data = await getMaterials();
      setMaterials(data.data || data || []);
    } catch (err) {
      setError(err.message || "Failed to load materials");
      showToast(err.message || "Failed to load materials", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadMCRs() {
    if (!canViewMCRs) return;

    try {
      setMCRLoading(true);
      const data = await getMCRs();
      setMCRs(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load material requests", "error");
    } finally {
      setMCRLoading(false);
    }
  }

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
      setActionMenuOpen(null);
    }

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadMaterials();
    loadMCRs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, unitFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(visibleMCRs.length / MCR_PAGE_SIZE));
    if (mcrPage > maxPage) setMcrPage(maxPage);
  }, [visibleMCRs.length, mcrPage]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function resetForm() {
    setForm({ name: "", code: "", unit: "", category: "" });
  }

  function openCreateModal() {
    resetForm();
    setShowCreate(true);
  }

  function openEditModal(material) {
    setActionMenuOpen(null);
    setEditingMaterial(material);
    setForm({
      name: material.name || "",
      code: material.code || "",
      unit: material.unit || "",
      category: material.category || "",
    });
  }

  function closeModal() {
    setShowCreate(false);
    setEditingMaterial(null);
    resetForm();
  }

  function handleResetFilters() {
    setSearch("");
    setStatusFilter("");
    setUnitFilter("");
    setCurrentPage(1);
  }

  async function handleCreateMaterial(e) {
    e.preventDefault();

    try {
      if (!form.name.trim()) return showToast("Material name is required", "error");
      if (!form.code.trim()) return showToast("Material code is required", "error");
      if (!form.unit.trim()) return showToast("Unit is required", "error");

      setCreating(true);

      await createMaterial({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        unit: form.unit.trim().toUpperCase(),
        category: form.category.trim() || null,
      });

      clearMaterialRelatedCache();

      closeModal();
      setCurrentPage(1);
      await loadMaterials();
      showToast("Material created successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to create material", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateMaterial(e) {
    e.preventDefault();
    if (!editingMaterial?._id) return;

    try {
      if (!form.name.trim()) return showToast("Material name is required", "error");
      if (!form.code.trim()) return showToast("Material code is required", "error");
      if (!form.unit.trim()) return showToast("Unit is required", "error");

      setUpdating(true);

      const updatedPayload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        unit: form.unit.trim().toUpperCase(),
        category: form.category.trim() || null,
      };

      await updateMaterial(editingMaterial._id, updatedPayload);

      clearMaterialRelatedCache();

      setMaterials((prev) =>
        prev.map((material) =>
          material._id === editingMaterial._id
            ? { ...material, ...updatedPayload }
            : material
        )
      );

      closeModal();
      showToast("Material updated successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to update material", "error");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCreateMCR(e) {
    e.preventDefault();

    if (!requestForm.name.trim()) return showToast("Material name is required", "error");
    if (!requestForm.unit.trim()) return showToast("Unit is required", "error");

    const tempId = `temp-${Date.now()}`;
    const optimisticMCR = {
      _id: tempId,
      mcrNo: "Submitting...",
      name: requestForm.name.trim(),
      unit: requestForm.unit.trim().toUpperCase(),
      description: requestForm.description.trim(),
      status: "PENDING",
      requestYard: { name: "Current Yard" },
      createdAt: new Date().toISOString(),
    };

    try {
      setRequesting(true);
      setMCRs((prev) => [optimisticMCR, ...prev]);
      setShowRequest(false);
      setRequestForm({ name: "", unit: "", description: "" });
      setMcrPage(1);

      const created = await createMCR({
        name: optimisticMCR.name,
        unit: optimisticMCR.unit,
        description: optimisticMCR.description,
      });

      clearMaterialRelatedCache();

      setMCRs((prev) => prev.map((mcr) => (mcr._id === tempId ? created.data || created : mcr)));
      showToast("Material request submitted successfully", "success");
    } catch (err) {
      setMCRs((prev) => prev.filter((mcr) => mcr._id !== tempId));
      showToast(err.message || "Failed to submit material request", "error");
    } finally {
      setRequesting(false);
    }
  }

  function askToggleStatus(material) {
    setActionMenuOpen(null);
    const shouldActivate = material.isActive === false;

    setConfirmConfig({
      title: shouldActivate ? "Activate Material" : "Deactivate Material",
      message: shouldActivate
        ? `Are you sure you want to activate ${material.name}?`
        : `Are you sure you want to deactivate ${material.name}?`,
      confirmText: shouldActivate ? "Activate" : "Deactivate",
      danger: !shouldActivate,
      onConfirm: () => handleToggleStatus(material),
    });
  }

  async function handleToggleStatus(material) {
    try {
      setProcessingAction(true);
      const nextStatus = material.isActive === false;

      await updateMaterial(material._id, { isActive: nextStatus });

      clearMaterialRelatedCache();

      setMaterials((prev) =>
        prev.map((item) =>
          item._id === material._id ? { ...item, isActive: nextStatus } : item
        )
      );

      setConfirmConfig(null);
      showToast(
        nextStatus ? "Material activated successfully" : "Material deactivated successfully",
        "success"
      );
      await loadMaterials();
    } catch (err) {
      showToast(err.message || "Failed to update material status", "error");
    } finally {
      setProcessingAction(false);
    }
  }

  function askDelete(material) {
    setActionMenuOpen(null);
    setConfirmConfig({
      title: "Delete Material",
      message: `Are you sure you want to permanently delete ${material.name}?`,
      confirmText: "Delete",
      danger: true,
      onConfirm: () => handleDelete(material),
    });
  }

  async function handleDelete(material) {
    try {
      setProcessingAction(true);
      await deleteMaterial(material._id);
      clearMaterialRelatedCache();
      setConfirmConfig(null);
      await loadMaterials();
      showToast("Material deleted successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to delete material", "error");
    } finally {
      setProcessingAction(false);
    }
  }

  function openApproveMCRModal(mcr) {
    setApproveMcr(mcr);
    setApproveForm({
      name: mcr.name || "",
      code: generateMaterialCode(mcr.name || ""),
    });
  }

  function openRejectMCRModal(mcr) {
    setRejectMcr(mcr);
    setRejectReason("");
  }

  async function handleRejectMCR() {
    if (!rejectMcr?._id) return;
    if (!rejectReason.trim()) return showToast("Rejection reason is required", "error");

    const rejectedId = rejectMcr._id;
    const previousMcrs = mcrs;

    try {
      setRejecting(true);
      setMCRs((prev) => prev.filter((mcr) => mcr._id !== rejectedId));
      setRejectMcr(null);
      setRejectReason("");
      await rejectMCR(rejectedId, rejectReason.trim());
      clearMaterialRelatedCache();
      showToast("MCR rejected", "success");
    } catch (err) {
      setMCRs(previousMcrs);
      showToast(err.message || "Failed to reject MCR", "error");
    } finally {
      setRejecting(false);
    }
  }

  async function handleApproveWithEdit() {
    if (!approveMcr?._id) return;
    if (!approveForm.name.trim()) return showToast("Material name is required", "error");
    if (!approveForm.code.trim()) return showToast("Material code is required", "error");

    const approvedId = approveMcr._id;
    const previousMcrs = mcrs;

    try {
      setApproving(true);
      setMCRs((prev) => prev.filter((mcr) => mcr._id !== approvedId));
      setApproveMcr(null);
      setApproveForm({ name: "", code: "" });

      await approveMCR(approvedId, {
        name: approveForm.name.trim(),
        code: approveForm.code.trim().toUpperCase(),
      });

      clearMaterialRelatedCache();

      await loadMaterials();
      showToast("Material approved and created", "success");
    } catch (err) {
      setMCRs(previousMcrs);
      showToast(err.message || "Failed to approve MCR", "error");
    } finally {
      setApproving(false);
    }
  }

  function generateMaterialCode(name) {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 25);
  }

  function openActionMenu(material, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = currentRole === "SYSTEM_ADMIN" ? 140 : 96;
    const gap = 8;

    let top = rect.bottom + gap;
    let left = rect.right - menuWidth;

    if (top + menuHeight > window.innerHeight - 12) top = rect.top - menuHeight - gap;
    if (top < 12) top = 12;
    if (left < 12) left = 12;
    if (left + menuWidth > window.innerWidth - 12) left = window.innerWidth - menuWidth - 12;

    setMenuPosition({ top, left });
    setActionMenuOpen(actionMenuOpen === material._id ? null : material._id);
  }

  function renderActionDropdown(material) {
    return (
      <div style={getDropdownStyle(menuPosition)}>
        <button
          type="button"
          onClick={() => openEditModal(material)}
          style={getDropdownItemStyle(hoveredAction === `${material._id}-edit`)}
          onMouseEnter={() => setHoveredAction(`${material._id}-edit`)}
          onMouseLeave={() => setHoveredAction(null)}
        >
          <Pencil size={14} />
          Edit
        </button>

        <button
          type="button"
          onClick={() => askToggleStatus(material)}
          style={getDropdownItemStyle(
            hoveredAction === `${material._id}-status`,
            material.isActive !== false
          )}
          onMouseEnter={() => setHoveredAction(`${material._id}-status`)}
          onMouseLeave={() => setHoveredAction(null)}
        >
          {material.isActive === false ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {material.isActive === false ? "Activate" : "Deactivate"}
        </button>

        {currentRole === "SYSTEM_ADMIN" && (
          <button
            type="button"
            onClick={() => askDelete(material)}
            style={getDropdownItemStyle(hoveredAction === `${material._id}-delete`, true)}
            onMouseEnter={() => setHoveredAction(`${material._id}-delete`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={getPageHeaderStyle(isMobile)}>
        <div style={{ minWidth: 0 }}>
          <p style={sectionEyebrowStyle}>CYMS OPERATIONS</p>

          <div style={titleRowStyle}>
            <Package size={isMobile ? 24 : 28} color={theme.text} />
            <h2 style={getPageTitleStyle(isMobile)}>Materials</h2>
          </div>

          <p style={pageSubtitleStyle}>
            Manage construction materials, units, categories, and material status.
          </p>
        </div>

        <div style={getHeaderActionsStyle(isMobile)}>
          {canViewMCRs && (
            <button
              type="button"
              onClick={() => setShowMCRPopup(true)}
              style={notificationButtonStyle}
              aria-label="Material requests"
            >
              <Bell size={16} />
              {pendingMCRCount > 0 && <span style={notificationBadgeStyle}>{pendingMCRCount}</span>}
            </button>
          )}

          {canManageMaterials && (
            <button type="button" onClick={openCreateModal} style={getPrimaryButtonStyle(isMobile)}>
              <Plus size={16} />
              Add Material
            </button>
          )}

          {canRequestMaterial && (
            <button type="button" onClick={() => setShowRequest(true)} style={getPrimaryButtonStyle(isMobile)}>
              <Plus size={16} />
              Request Material
            </button>
          )}
        </div>
      </div>

      <div style={getSummaryGridStyle(isMobile, isTablet)}>
        <SummaryCard title="Total Materials" value={summary.total} icon={<Package size={20} />} />
        <SummaryCard title="Active" value={summary.active} icon={<CheckCircle2 size={20} />} green />
        <SummaryCard title="Inactive" value={summary.inactive} icon={<XCircle size={20} />} red />
        <SummaryCard title="Units Used" value={summary.unitsUsed} icon={<Layers size={20} />} />
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
                placeholder="Search by material name, code, unit, or category"
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <Field label="Status">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </Field>

          <Field label="Unit">
            <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} style={inputStyle}>
              <option value="">All units</option>
              {availableUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </Field>

          <div style={getFilterButtonGroupStyle(isMobile)}>
            <button type="button" onClick={handleResetFilters} style={getSecondaryButtonStyle(isMobile)}>
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={loadingBoxStyle}>Loading materials...</div>}
      {error && <div style={errorBoxStyle}>{error}</div>}

      {!loading && !error && (
        <div style={tableCardStyle}>
          <div style={tableHeaderStyle}>
            <h3 style={sectionTitleStyle}>Material Register</h3>
            <p style={sectionSubtitleStyle}>
              Showing {filteredMaterials.length} material{filteredMaterials.length === 1 ? "" : "s"}
            </p>
          </div>

          {isMobile ? (
            <div style={mobileListStyle}>
              {paginatedMaterials.length === 0 ? (
                <div style={emptyMobileCardStyle}>No materials found.</div>
              ) : (
                paginatedMaterials.map((material) => {
                  const status = material.isActive === false ? "INACTIVE" : "ACTIVE";

                  return (
                    <div key={material._id} style={mobileMaterialCardStyle}>
                      <div style={mobileCardHeaderStyle}>
                        <div style={{ minWidth: 0 }}>
                          <strong style={mobileMaterialNameStyle}>{material.name || "-"}</strong>
                          <p style={mobileMaterialCodeStyle}>{material.code || "-"}</p>
                        </div>

                        <span style={getStatusBadgeStyle(status)}>{status}</span>
                      </div>

                      {canManageMaterials && (
                        <div
                          ref={actionMenuOpen === material._id ? actionMenuRef : null}
                          style={mobileActionWrapStyle}
                        >
                          <button
                            type="button"
                            onClick={(e) => openActionMenu(material, e)}
                            style={actionMenuButtonStyle}
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {actionMenuOpen === material._id && renderActionDropdown(material)}
                        </div>
                      )}

                      <div style={mobileMetaGridStyle}>
                        <InfoBlock label="Category" value={material.category || "-"} />
                        <InfoBlock label="Unit" value={material.unit || "-"} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={tableScrollStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Material Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Unit</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedMaterials.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={emptyStyle}>
                        No materials found.
                      </td>
                    </tr>
                  ) : (
                    paginatedMaterials.map((material) => (
                      <tr key={material._id} className="material-table-row">
                        <td style={tdStyle}>
                          <strong style={{ color: theme.text }}>{material.code || "-"}</strong>
                        </td>
                        <td style={tdStyle}>{material.name || "-"}</td>
                        <td style={tdStyle}>{material.category || "-"}</td>
                        <td style={tdStyle}>{material.unit || "-"}</td>
                        <td style={tdStyle}>
                          <span style={getStatusBadgeStyle(material.isActive === false ? "INACTIVE" : "ACTIVE")}>
                            {material.isActive === false ? "INACTIVE" : "ACTIVE"}
                          </span>
                        </td>

                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <div
                            ref={actionMenuOpen === material._id ? actionMenuRef : null}
                            style={{ position: "relative" }}
                          >
                            <button
                              type="button"
                              onClick={(e) => openActionMenu(material, e)}
                              style={actionMenuButtonStyle}
                            >
                              <MoreHorizontal size={16} />
                            
                            </button>

                            {actionMenuOpen === material._id && renderActionDropdown(material)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filteredMaterials.length > pageSize && (
            <div style={getPaginationStyle(isMobile)}>
              <span style={paginationTextStyle}>
                Showing {paginatedMaterials.length} of {filteredMaterials.length} materials
              </span>

              <div style={getPaginationButtonRowStyle(isMobile)}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  style={getDisabledButtonStyle(isMobile, currentPage === 1)}
                >
                  Previous
                </button>

                <span style={paginationTextStyle}>Page {currentPage} of {totalPages}</span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={getDisabledButtonStyle(isMobile, currentPage === totalPages)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <MaterialModal
          isMobile={isMobile}
          title={isEdit ? "Edit Material" : "Create Material"}
          icon={isEdit ? <Pencil size={18} /> : <Plus size={18} />}
          onClose={() => {
            if (!creating && !updating) closeModal();
          }}
        >
          <form onSubmit={isEdit ? handleUpdateMaterial : handleCreateMaterial} style={modalGridStyle}>
            <Field label="Material Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter material name"
                style={inputStyle}
                disabled={creating || updating}
              />
            </Field>

            <Field label="Material Code">
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Enter material code"
                style={inputStyle}
                disabled={creating || updating}
              />
            </Field>

            <Field label="Unit">
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value.toUpperCase() })}
                style={inputStyle}
                disabled={creating || updating}
              >
                <option value="">Select unit</option>
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category (Optional)">
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Enter category"
                style={inputStyle}
                disabled={creating || updating}
              />
            </Field>

            <ModalActions
              isMobile={isMobile}
              onCancel={closeModal}
              cancelDisabled={creating || updating}
              submitDisabled={creating || updating}
              submitText={isEdit ? (updating ? "Updating..." : "Update Material") : creating ? "Creating..." : "Create Material"}
            />
          </form>
        </MaterialModal>
      )}

      {showRequest && (
        <MaterialModal
          isMobile={isMobile}
          title="Request New Material"
          icon={<Plus size={18} />}
          onClose={() => {
            if (!requesting) setShowRequest(false);
          }}
        >
          <form onSubmit={handleCreateMCR} style={modalGridStyle}>
            <Field label="Material Name">
              <input
                type="text"
                value={requestForm.name}
                onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                placeholder="Enter requested material name"
                style={inputStyle}
                disabled={requesting}
              />
            </Field>

            <Field label="Unit">
              <select
                value={requestForm.unit}
                onChange={(e) => setRequestForm({ ...requestForm, unit: e.target.value.toUpperCase() })}
                style={inputStyle}
                disabled={requesting}
              >
                <option value="">Select unit</option>
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Description (Optional)">
              <input
                type="text"
                value={requestForm.description}
                onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                placeholder="Reason or extra details"
                style={inputStyle}
                disabled={requesting}
              />
            </Field>

            <ModalActions
              isMobile={isMobile}
              onCancel={() => setShowRequest(false)}
              cancelDisabled={requesting}
              submitDisabled={requesting}
              submitText={requesting ? "Submitting..." : "Submit Request"}
            />
          </form>
        </MaterialModal>
      )}

      {rejectMcr && (
        <MaterialModal
          isMobile={isMobile}
          zIndex={1200}
          title="Reject Material Request"
          icon={<XCircle size={18} />}
          onClose={() => {
            if (!rejecting) {
              setRejectMcr(null);
              setRejectReason("");
            }
          }}
        >
          <div style={modalGridStyle}>
            <Field label="Rejection Reason">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason"
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                disabled={rejecting}
              />
            </Field>

            <ModalActions
              isMobile={isMobile}
              onCancel={() => {
                setRejectMcr(null);
                setRejectReason("");
              }}
              cancelDisabled={rejecting}
              submitDisabled={rejecting}
              submitText={rejecting ? "Rejecting..." : "Reject Request"}
              onSubmit={handleRejectMCR}
            />
          </div>
        </MaterialModal>
      )}

      {approveMcr && (
        <MaterialModal
          isMobile={isMobile}
          zIndex={1200}
          title="Approve Material Request"
          icon={<CheckCircle2 size={18} />}
          onClose={() => {
            if (!approving) {
              setApproveMcr(null);
              setApproveForm({ name: "", code: "" });
            }
          }}
        >
          <div style={modalGridStyle}>
            <Field label="Material Name">
              <input
                type="text"
                value={approveForm.name}
                onChange={(e) =>
                  setApproveForm({
                    name: e.target.value,
                    code: generateMaterialCode(e.target.value),
                  })
                }
                style={inputStyle}
                disabled={approving}
              />
            </Field>

            <Field label="Material Code">
              <input
                type="text"
                value={approveForm.code}
                onChange={(e) => setApproveForm({ ...approveForm, code: e.target.value.toUpperCase() })}
                placeholder="Enter material code"
                style={inputStyle}
                disabled={approving}
              />
            </Field>

            <ModalActions
              isMobile={isMobile}
              onCancel={() => setApproveMcr(null)}
              cancelDisabled={approving}
              submitDisabled={approving}
              submitText={approving ? "Approving..." : "Approve & Create"}
              onSubmit={handleApproveWithEdit}
            />
          </div>
        </MaterialModal>
      )}

      {showMCRPopup && (
        <MaterialModal
          isMobile={isMobile}
          title="Material Creation Requests"
          icon={<Bell size={18} />}
          onClose={() => setShowMCRPopup(false)}
        >
          <div style={mcrModalBodyStyle}>
            {mcrLoading ? (
              <div style={emptyStyle}>Loading material requests...</div>
            ) : visibleMCRs.length === 0 ? (
              <div style={emptyStyle}>No material creation requests found.</div>
            ) : isMobile ? (
              <div style={mobileListStyle}>
                {paginatedMCRs.map((mcr) => (
                  <div key={mcr._id} style={mobileMaterialCardStyle}>
                    <div style={mobileCardHeaderStyle}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={mobileMaterialNameStyle}>{mcr.name || "-"}</strong>
                        <p style={mobileMaterialCodeStyle}>{mcr.mcrNo || "-"}</p>
                      </div>
                      <span style={getMCRStatusBadgeStyle(mcr.status)}>{mcr.status || "-"}</span>
                    </div>

                    <div style={mobileMetaGridStyle}>
                      <InfoBlock label="Unit" value={mcr.unit || "-"} />
                      <InfoBlock label="Yard" value={mcr.requestYard?.name || mcr.requestYard?.code || "-"} />
                    </div>

                    {canManageMaterials && mcr.status === "PENDING" && (
                      <div style={mcrActionGridStyle}>
                        <button type="button" onClick={() => openApproveMCRModal(mcr)} style={approveButtonStyle}>
                          Approve
                        </button>
                        <button type="button" onClick={() => openRejectMCRModal(mcr)} style={rejectButtonStyle}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={tableScrollStyle}>
                <table style={{ ...tableStyle, minWidth: 850 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>MCR No</th>
                      <th style={thStyle}>Material</th>
                      <th style={thStyle}>Unit</th>
                      <th style={thStyle}>Yard</th>
                      <th style={thStyle}>Status</th>
                      {canManageMaterials && <th style={thStyle}>Actions</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedMCRs.map((mcr) => (
                      <tr key={mcr._id}>
                        <td style={tdStyle}>{mcr.mcrNo || "-"}</td>
                        <td style={tdStyle}>{mcr.name || "-"}</td>
                        <td style={tdStyle}>{mcr.unit || "-"}</td>
                        <td style={tdStyle}>{mcr.requestYard?.name || mcr.requestYard?.code || "-"}</td>
                        <td style={tdStyle}>
                          <span style={getMCRStatusBadgeStyle(mcr.status)}>{mcr.status || "-"}</span>
                        </td>
                        {canManageMaterials && (
                          <td style={tdStyle}>
                            {mcr.status === "PENDING" ? (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button type="button" onClick={() => openApproveMCRModal(mcr)} style={approveButtonStyle}>
                                  Approve
                                </button>
                                <button type="button" onClick={() => openRejectMCRModal(mcr)} style={rejectButtonStyle}>
                                  Reject
                                </button>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {visibleMCRs.length > MCR_PAGE_SIZE && (
              <div style={getPaginationStyle(isMobile)}>
                <span style={paginationTextStyle}>
                  Showing {paginatedMCRs.length} of {visibleMCRs.length} requests
                </span>
                <div style={getPaginationButtonRowStyle(isMobile)}>
                  <button
                    type="button"
                    onClick={() => setMcrPage((p) => Math.max(p - 1, 1))}
                    disabled={mcrPage === 1}
                    style={getDisabledButtonStyle(isMobile, mcrPage === 1)}
                  >
                    Previous
                  </button>
                  <span style={paginationTextStyle}>Page {mcrPage} of {totalMcrPages}</span>
                  <button
                    type="button"
                    onClick={() => setMcrPage((p) => Math.min(p + 1, totalMcrPages))}
                    disabled={mcrPage === totalMcrPages}
                    style={getDisabledButtonStyle(isMobile, mcrPage === totalMcrPages)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </MaterialModal>
      )}

      <ConfirmModal
        open={!!confirmConfig}
        title={confirmConfig?.title || ""}
        message={confirmConfig?.message || ""}
        loading={processingAction}
        onCancel={() => {
          if (!processingAction) setConfirmConfig(null);
        }}
        onConfirm={confirmConfig?.onConfirm}
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

function InfoBlock({ label, value }) {
  return (
    <div style={mobileMetaItemStyle}>
      <span style={mobileMetaLabelStyle}>{label}</span>
      <strong style={mobileMetaValueStyle}>{value}</strong>
    </div>
  );
}

function SummaryCard({ title, value, icon, green, red }) {
  const accentColor = green ? theme.success : red ? theme.danger : theme.primary;
  const accentBackground = green ? theme.successSoft : red ? theme.dangerSoft : theme.primarySoft;
  const accentBorder = green
    ? "rgba(22,163,74,0.18)"
    : red
    ? "rgba(239,68,68,0.18)"
    : theme.primaryBorder;

  return (
    <div style={summaryCardStyle}>
      <div
        style={{
          ...summaryIconStyle,
          color: accentColor,
          background: accentBackground,
          border: `1px solid ${accentBorder}`,
        }}
      >
        {icon}
      </div>

      <div>
        <p style={summaryLabelStyle}>{title}</p>
        <h3 style={{ ...summaryValueStyle, color: accentColor }}>{value}</h3>
      </div>
    </div>
  );
}

function MaterialModal({ title, icon, children, onClose, zIndex = 1000, isMobile = false }) {
  return (
    <div style={{ ...overlayStyle, zIndex }}>
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

function ModalActions({
  isMobile = false,
  onCancel,
  cancelDisabled,
  submitDisabled,
  submitText,
  onSubmit,
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
        type={onSubmit ? "button" : "submit"}
        onClick={onSubmit}
        style={{
          ...getPrimaryButtonStyle(isMobile),
          opacity: submitDisabled ? 0.7 : 1,
          cursor: submitDisabled ? "not-allowed" : "pointer",
        }}
        disabled={submitDisabled}
      >
        {submitDisabled ? "Processing..." : submitText}
      </button>
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
    marginBottom: 10,
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
};

function getHeaderActionsStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: 12,
    alignItems: isMobile ? "stretch" : "center",
    flexWrap: "wrap",
    width: isMobile ? "100%" : "auto",
    position: "relative",
    overflow: "visible",
  };
}

function getPageTitleStyle(isMobile) {
  return {
    margin: 0,
    fontSize: isMobile ? 28 : 34,
    fontWeight: 900,
    color: theme.text,
    letterSpacing: "-0.04em",
    lineHeight: 1.1,
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
      : "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginTop: 6,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

const summaryCardStyle = {
  ...cardBaseStyle,
  padding: 16,
  minHeight: 108,
  boxSizing: "border-box",
};

const summaryIconStyle = {
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
    width: isMobile ? "100%" : "auto",
  };
}

const inputIconWrapStyle = { position: "relative" };

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
  overflow: "visible",
  boxSizing: "border-box",
};

const tableHeaderStyle = { marginBottom: 12 };

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

const tableScrollStyle = {
  overflowX: "auto",
  overflowY: "visible",
  position: "relative",
  width: "100%",
  maxWidth: "100%",
  WebkitOverflowScrolling: "touch",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 920,
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
  whiteSpace: "nowrap",
};

function getPrimaryButtonStyle(isMobile) {
  return {
    ...primaryButtonStyle,
    width: isMobile ? "100%" : "fit-content",
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
  whiteSpace: "nowrap",
};

function getSecondaryButtonStyle(isMobile) {
  return {
    ...secondaryButtonStyle,
    width: isMobile ? "100%" : "auto",
  };
}

function getDisabledButtonStyle(isMobile, disabled) {
  return {
    ...getSecondaryButtonStyle(isMobile),
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

const actionMenuButtonStyle = {
  ...secondaryButtonStyle,
  padding: "8px 12px",
  fontSize: 13,
  minHeight: 36,
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

const emptyMobileCardStyle = {
  ...cardBaseStyle,
  padding: 18,
  textAlign: "center",
  color: theme.muted,
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
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "center",
    gap: 12,
    flexWrap: "wrap",
  };
}

function getPaginationButtonRowStyle(isMobile) {
  return {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: "center",
    gap: 12,
    width: isMobile ? "100%" : "fit-content",
  };
}

const paginationTextStyle = {
  color: theme.textSoft,
  fontSize: 14,
  fontWeight: 700,
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

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  padding: 16,
  boxSizing: "border-box",
};

function getModalStyle(isMobile) {
  return {
    width: "100%",
    maxWidth: isMobile ? "calc(100vw - 32px)" : "min(94vw, 980px)",
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
    flexWrap: "wrap",
    width: "100%",
  };
}

const mobileListStyle = {
  display: "grid",
  gap: 12,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const mobileMaterialCardStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
  background: theme.surface,
  padding: 14,
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const mobileCardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  minWidth: 0,
};

const mobileMaterialNameStyle = {
  display: "block",
  color: theme.text,
  fontSize: 15,
  fontWeight: 900,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const mobileMaterialCodeStyle = {
  margin: "5px 0 0",
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const mobileMetaGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 12,
};

const mobileMetaItemStyle = {
  padding: 10,
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
  letterSpacing: "0.04em",
};

const mobileMetaValueStyle = {
  display: "block",
  color: theme.text,
  fontSize: 13,
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const mobileActionWrapStyle = {
  position: "relative",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  marginTop: 10,
  paddingTop: 10,
  borderTop: `1px solid ${theme.border}`,
};

const notificationButtonStyle = {
  position: "relative",
  width: 44,
  height: 44,
  borderRadius: 14,
  border: `1px solid ${theme.primaryBorder}`,
  background: theme.primarySoft,
  color: theme.primary,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  overflow: "visible",
  flexShrink: 0,
};

const notificationBadgeStyle = {
  position: "absolute",
  top: 2,
  right: 2,
  minWidth: 16,
  height: 16,
  borderRadius: 999,
  background: "#ef4444",
  color: "#ffffff",
  fontSize: 9,
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 4px",
  border: "1.5px solid #ffffff",
  zIndex: 10,
  lineHeight: 1,
};

const approveButtonStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid rgba(22,163,74,0.28)`,
  background: theme.successSoft,
  color: theme.success,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const rejectButtonStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid rgba(239,68,68,0.28)`,
  background: theme.dangerSoft,
  color: theme.danger,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const mcrActionGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  marginTop: 12,
};

const mcrModalBodyStyle = {
  maxHeight: "70vh",
  overflowX: "auto",
  overflowY: "auto",
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
    minWidth: 78,
    padding: "7px 11px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    border: "1px solid",
    whiteSpace: "nowrap",
    lineHeight: 1,
    textAlign: "center",
  };

  if (status === "ACTIVE") {
    return {
      ...base,
      background: theme.successSoft,
      color: theme.success,
      borderColor: "rgba(22,163,74,0.28)",
    };
  }

  if (status === "INACTIVE") {
    return {
      ...base,
      background: theme.dangerSoft,
      color: theme.danger,
      borderColor: "rgba(239,68,68,0.28)",
    };
  }

  return {
    ...base,
    background: theme.surfaceSoft,
    color: theme.textSoft,
    borderColor: theme.border,
  };
}

function getMCRStatusBadgeStyle(status) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  };

  if (status === "APPROVED") {
    return {
      ...base,
      background: theme.successSoft,
      color: theme.success,
      borderColor: "rgba(22,163,74,0.28)",
    };
  }

  if (status === "PENDING") {
    return {
      ...base,
      background: theme.warningSoft,
      color: theme.warning,
      borderColor: "rgba(245,158,11,0.28)",
    };
  }

  if (status === "REJECTED") {
    return {
      ...base,
      background: theme.dangerSoft,
      color: theme.danger,
      borderColor: "rgba(239,68,68,0.28)",
    };
  }

  return {
    ...base,
    background: theme.surfaceSoft,
    color: theme.textSoft,
    borderColor: theme.border,
  };
}
