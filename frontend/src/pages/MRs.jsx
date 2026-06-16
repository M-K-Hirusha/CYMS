import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Plus,
  Search,
  RotateCcw,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { getMRs, createMR, approveMR, rejectMR } from "../services/mrApi";
import { getMaterials } from "../services/materialApi";
import { getMainYards } from "../services/yardApi";
import { useToast } from "../context/ToastContext";

import jsPDF from "jspdf";
import {
  addPdfHeader,
  addPdfFooter,
  addPdfTable,
} from "../utils/pdfUtils";
import { theme } from "../styles/theme";
import { clearMultipleCache } from "../utils/apiCache";

export default function MRs() {
  const { showToast } = useToast();
  const actionMenuRef = useRef(null);
  const { isMobile, isTablet } = useResponsive();

  const [mrs, setMRs] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [mainYards, setMainYards] = useState([]);

  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialOptions, setShowMaterialOptions] = useState(false);
  const [viewModalMR, setViewModalMR] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mrSearch, setMrSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [approveModalMR, setApproveModalMR] = useState(null);
  const [approveMainYardId, setApproveMainYardId] = useState("");
  const [approvalItems, setApprovalItems] = useState([]);

  const [rejectModalMR, setRejectModalMR] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [downloadModalMR, setDownloadModalMR] = useState(null);
  const [mrDownloading, setMrDownloading] = useState(false);
  const [mrPreparingDownload, setMrPreparingDownload] = useState(false);
  const [mrDownloadComplete, setMrDownloadComplete] = useState(false);
  const [mrDownloadProgress, setMrDownloadProgress] = useState(0);

  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);

  const [formData, setFormData] = useState({
    materialId: "",
    quantity: "",
  });

  const [mrItems, setMRItems] = useState([]);

  const role = localStorage.getItem("role");

  const canApprove = role === "SYSTEM_ADMIN" || role === "HEAD_OFFICE_ADMIN";
  const canCreateMR = role === "SITE_ADMIN" || role === "SITE_STAFF";

  function clearMRRelatedCache() {
    clearMultipleCache([
      "dashboard",
      "mrs",
      "inventory",
      "reports",
    ]);
  }

  async function loadMRs() {
    try {
      setLoading(true);
      const data = await getMRs();
      setMRs(Array.isArray(data) ? data : data.rows || data.mrs || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to load material requests");
      showToast(err.message || "Failed to load material requests", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadMaterials() {
    try {
      const data = await getMaterials();
      setMaterials(Array.isArray(data) ? data : data.data || data.rows || []);
    } catch (err) {
      console.error("Failed to load materials:", err);
      showToast("Failed to load materials", "error");
    } finally {
      setMaterialsLoading(false);
    }
  }

  async function loadMainYards() {
    try {
      const data = await getMainYards();
      setMainYards(data.yards || data || []);
    } catch (err) {
      console.error("Failed to load MAIN yards:", err);
      showToast("Failed to load MAIN yards", "error");
    }
  }

  useEffect(() => {
    loadMRs();

    if (canCreateMR) {
      loadMaterials();
    } else {
      setMaterialsLoading(false);
    }

    if (canApprove) {
      loadMainYards();
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setViewModalMR(null);
  }, [statusFilter, mrSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mrStats = useMemo(() => {
    return {
      total: mrs.length,
      pending: mrs.filter((mr) => mr.status === "PENDING").length,
      approved: mrs.filter((mr) => mr.status === "APPROVED").length,
      rejected: mrs.filter((mr) => mr.status === "REJECTED").length,
    };
  }, [mrs]);

  function openCreateModal() {
    resetCreateForm();
    setShowCreateForm(true);
  }

  function closeCreateModal() {
    setShowCreateForm(false);
    resetCreateForm();
  }

  function openApproveModal(mr) {
    setActionMenuOpen(null);

    const items =
      mr.items?.map((item) => ({
        material: item.material?._id || item.material,
        materialName: item.material?.name || "N/A",
        materialCode: item.material?.code || "N/A",
        requestedQty: Number(item.requestedQty || 0),
        approvedQty: Number(item.requestedQty || 0),
        unit: item.material?.unit || "-",
        fromLocationCode: "MAIN_STORE",
      })) || [];

    setApprovalItems(items);
    setApproveModalMR(mr);
    setApproveMainYardId("");
  }

  function closeApproveModal() {
    setApproveModalMR(null);
    setApproveMainYardId("");
    setApprovalItems([]);
  }

  function openRejectModal(mr) {
    setActionMenuOpen(null);
    setRejectModalMR(mr);
    setRejectReason("");
  }

  function closeRejectModal() {
    setRejectModalMR(null);
    setRejectReason("");
  }

  function openViewItemsModal(mr) {
    setActionMenuOpen(null);
    setViewModalMR(mr);
  }

  function openDownloadModal(mr) {
    setActionMenuOpen(null);
    setDownloadModalMR(mr);
  }

  const filteredMaterials = materials.filter((material) => {
    const q = materialSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      material.name?.toLowerCase().includes(q) ||
      material.code?.toLowerCase().includes(q) ||
      material.unit?.toLowerCase().includes(q)
    );
  });

  const filteredMRs = mrs.filter((mr) => {
    if (statusFilter !== "ALL" && mr.status !== statusFilter) return false;

    const q = mrSearch.trim().toLowerCase();
    if (!q) return true;

    const requestedBy =
      mr.requestedBy?.fullName ||
      mr.requestedBy?.name ||
      mr.createdBy?.fullName ||
      mr.createdBy?.name ||
      "";

    const yard = mr.siteYard?.name || mr.siteYard?.code || mr.yard?.name || "";

    return (
      mr.mrNo?.toLowerCase().includes(q) ||
      mr.status?.toLowerCase().includes(q) ||
      requestedBy.toLowerCase().includes(q) ||
      yard.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredMRs.length / pageSize));

  const paginatedMRs = filteredMRs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const selectedMaterial = materials.find(
    (material) => material._id === formData.materialId
  );

  const activeMainYards = mainYards.filter((yard) => yard.isActive !== false);

  function resetSelectedItemFields() {
    setFormData({
      materialId: "",
      quantity: "",
    });
    setMaterialSearch("");
    setShowMaterialOptions(false);
  }

  function resetCreateForm() {
    resetSelectedItemFields();
    setMRItems([]);
  }

  function handleResetFilters() {
    setMrSearch("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  }

  function handleAddItem() {
    if (!formData.materialId.trim()) {
      showToast("Please select a material from the list", "error");
      return;
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
      showToast("Requested quantity must be greater than 0", "error");
      return;
    }

    const alreadyAdded = mrItems.some(
      (item) => item.material === formData.materialId
    );

    if (alreadyAdded) {
      showToast("This material is already added to the MR", "error");
      return;
    }

    setMRItems((prev) => [
      ...prev,
      {
        material: formData.materialId,
        requestedQty: Number(formData.quantity),
        materialName: selectedMaterial?.name || "N/A",
        materialCode: selectedMaterial?.code || "N/A",
        materialUnit: selectedMaterial?.unit || "-",
      },
    ]);

    resetSelectedItemFields();
    showToast("Item added to MR", "success");
  }

  function handleRemoveItem(materialId) {
    setMRItems((prev) => prev.filter((item) => item.material !== materialId));
    showToast("Item removed", "success");
  }

  async function handleSubmitMR(e) {
    e?.preventDefault?.();

    try {
      if (mrItems.length === 0) {
        showToast("Please add at least one material item to the MR", "error");
        return;
      }

      setSubmitting(true);

      await createMR({
        toLocationCode: "SITE_STORE",
        items: mrItems.map((item) => ({
          material: item.material,
          requestedQty: item.requestedQty,
        })),
      });

      clearMRRelatedCache();

      await loadMRs();

      resetCreateForm();
      setShowCreateForm(false);

      showToast("Material request created successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to create material request", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproveFromModal() {
    const previousMRs = mrs;

    try {
      if (!approveModalMR) return;

      if (!approveMainYardId) {
        showToast("Please select a dispatch MAIN yard", "error");
        return;
      }

      if (!approvalItems || approvalItems.length === 0) {
        showToast("No items found in this MR", "error");
        return;
      }

      const hasApprovedQty = approvalItems.some(
        (item) => Number(item.approvedQty) > 0
      );

      if (!hasApprovedQty) {
        showToast(
          "At least one item must have approved quantity greater than 0",
          "error"
        );
        return;
      }

      for (const item of approvalItems) {
        const approvedQty = Number(item.approvedQty);

        if (Number.isNaN(approvedQty) || approvedQty < 0) {
          showToast("Approved quantity cannot be negative", "error");
          return;
        }
      }

      const approvalLines = approvalItems.map((item) => ({
        material: item.material,
        approvedQty: Number(item.approvedQty),
        fromLocationCode: item.fromLocationCode,
      }));

      const approvedId = approveModalMR._id;

      setActionLoadingId(approvedId);

      await approveMR(approvedId, {
        dispatchMainYardId: approveMainYardId,
        approvalLines,
      });

      clearMRRelatedCache();

      // instant UI update
      setMRs((prev) =>
        prev.map((mr) =>
          mr._id === approvedId
            ? {
                ...mr,
                status: "APPROVED",
                approvedAt: new Date().toISOString(),
              }
            : mr
        )
      );

      closeApproveModal();

      showToast("MR approved successfully", "success");

      // background refresh only
      loadMRs();
    } catch (err) {
      // rollback if failed
      setMRs(previousMRs);

      console.error(err);
      showToast(err.message || "Approve failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRejectFromModal() {
    const previousMRs = mrs;

    try {
      if (!rejectModalMR) return;

      const trimmedReason = rejectReason.trim();

      if (!trimmedReason) {
        showToast("Reject reason cannot be empty", "error");
        return;
      }

      const rejectedId = rejectModalMR._id;

      setActionLoadingId(rejectedId);

      await rejectMR(rejectedId, {
        reason: trimmedReason,
      });

      clearMRRelatedCache();

      // instant UI update
      setMRs((prev) =>
        prev.map((mr) =>
          mr._id === rejectedId
            ? {
                ...mr,
                status: "REJECTED",
                rejectedAt: new Date().toISOString(),
              }
            : mr
        )
      );

      closeRejectModal();

      showToast("MR rejected successfully", "success");

      // background refresh only
      loadMRs();
    } catch (err) {
      setMRs(previousMRs);

      console.error(err);
      showToast(err.message || "Reject failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleDownloadMRPDF(mr) {
    try {
      const doc = new jsPDF();

      const requestedBy =
        mr.requestedBy?.fullName ||
        mr.requestedBy?.name ||
        mr.createdBy?.fullName ||
        mr.createdBy?.name ||
        "-";

      const yard =
        mr.siteYard?.name ||
        mr.siteYard?.code ||
        mr.yard?.name ||
        "-";

      const rejectReason =
        mr.rejectReason ||
        mr.rejectionReason ||
        mr.reason ||
        mr.rejectedReason ||
        "";

      const status = mr.status || "-";

      addPdfHeader(doc, "Material Request Report");

      let statusColor = [22, 163, 74];
      if (status === "PENDING") statusColor = [245, 158, 11];
      if (status === "REJECTED") statusColor = [239, 68, 68];

      doc.setFillColor(...statusColor);
      doc.roundedRect(14, 42, 42, 10, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(status, 23, 48.5);

      let y = 64;

      const details = [
        ["MR Number", mr.mrNo || "-"],
        ["Requested By", requestedBy],
        ["Yard", yard],
        ["Generated Date", new Date().toLocaleString()],
      ];

      if (status === "REJECTED" && rejectReason) {
        details.splice(1, 0, ["Reject Reason", rejectReason]);
      }

      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`${label}:`, 18, y);

        doc.setFont("helvetica", "normal");
        doc.text(String(value), 54, y);

        y += 8;
      });

      addPdfTable(doc, {
        startY: y + 6,
        head: [["Material", "Code", "Requested Qty", "Approved Qty", "Unit"]],
        body:
          mr.items?.map((item) => [
            item.material?.name || "N/A",
            item.material?.code || "N/A",
            item.requestedQty ?? "-",
            item.approvedQty != null ? item.approvedQty : "-",
            item.material?.unit || "-",
          ]) || [],
      });

      addPdfFooter(doc);

      doc.save(`${mr.mrNo || "material-request"}.pdf`);
      showToast("MR PDF downloaded successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to download MR PDF", "error");
    }
  }

  function openActionMenuForMR(mrId) {
    setHoveredAction(null);
    setActionMenuOpen((prev) => (prev === mrId ? null : mrId));
  }

  return (
    <div style={pageStyle}>
      <div style={getPageHeaderStyle(isMobile)}>
        <div>
          <p style={eyebrowStyle}>CYMS OPERATIONS</p>
          <h2 style={getPageTitleStyle(isMobile)}>
            <ClipboardList size={30} />
            Material Requests
          </h2>
          <p style={pageSubtitleStyle}>
            View, create, approve, reject, and download material request reports.
          </p>
        </div>

        {canCreateMR && (
          <button
            type="button"
            onClick={openCreateModal}
            style={getPrimaryButtonStyle(isMobile)}
          >
            <Plus size={16} />
            Create MR
          </button>
        )}
      </div>

      <div style={getKpiGridStyle(isMobile, isTablet)}>
        <KpiCard
          label="Total MRs"
          value={loading ? "..." : mrStats.total}
          icon={<ClipboardList size={20} />}
        />
        <KpiCard
          label="Pending"
          value={loading ? "..." : mrStats.pending}
          icon={<Clock size={20} />}
          color={theme.warning}
        />
        <KpiCard
          label="Approved"
          value={loading ? "..." : mrStats.approved}
          icon={<CheckCircle2 size={20} />}
          color={theme.success}
        />
        <KpiCard
          label="Rejected"
          value={loading ? "..." : mrStats.rejected}
          icon={<XCircle size={20} />}
          color={theme.danger}
        />
      </div>

      {loading && (
        <div style={skeletonCardStyle}>
          <p style={loadingTextStyle}>Loading material requests...</p>
          <div style={skeletonLineStyle} />
          <div style={{ ...skeletonLineStyle, width: "75%" }} />
          <div style={{ ...skeletonLineStyle, width: "55%" }} />
        </div>
      )}

      {error && <p style={errorTextStyle}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={filterCardStyle}>
            <div style={getFilterGridStyle(isMobile)}>
              <div>
                <label style={labelStyle}>Search</label>
                <div style={inputIconWrapStyle}>
                  <Search size={16} style={inputIconStyle} />
                  <input
                    type="text"
                    placeholder="Search by MR number, status, requester, or yard"
                    value={mrSearch}
                    onChange={(e) => setMrSearch(e.target.value)}
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
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
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

          <div style={tableCardStyle}>
            <div style={tableHeaderStyle}>
              <h3 style={sectionTitleStyle}>MR Register</h3>
              <p style={sectionSubtitleStyle}>
                Showing {filteredMRs.length} material request
                {filteredMRs.length === 1 ? "" : "s"}
              </p>
            </div>

            <div style={tableOuterWrapStyle}>
              {!isMobile && (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>MR Number</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Items</th>
                      <th style={thStyle}>Requested By</th>
                      <th style={thStyle}>Yard</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMRs.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={emptyStyle}>
                          No material requests found.
                        </td>
                      </tr>
                    ) : (
                      paginatedMRs.map((mr) => (
                        <tr key={mr._id} className="material-table-row">
                          <td style={tdStyle}>
                            <strong style={{ color: theme.text }}>{mr.mrNo || "-"}</strong>
                          </td>

                          <td style={tdStyle}>
                            <span style={getStatusBadgeStyle(mr.status)}>
                              {mr.status || "-"}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            {mr.items?.length || 0} item
                            {(mr.items?.length || 0) === 1 ? "" : "s"}
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

                          <td style={tdStyle}>
                            <div
                              ref={actionMenuOpen === mr._id ? actionMenuRef : null}
                              style={actionMenuAnchorStyle}
                            >
                              <button
                                type="button"
                                onClick={() => openActionMenuForMR(mr._id)}
                                style={smallSecondaryButtonStyle}
                                disabled={actionLoadingId === mr._id}
                              >
                                <MoreHorizontal size={16} />
                                
                              </button>

                              {actionMenuOpen === mr._id && (
                                <div style={getDropdownStyle()}>
                                  <button
                                    type="button"
                                    onClick={() => openViewItemsModal(mr)}
                                    style={getDropdownItemStyle(hoveredAction === `${mr._id}-view`)}
                                    onMouseEnter={() => setHoveredAction(`${mr._id}-view`)}
                                    onMouseLeave={() => setHoveredAction(null)}
                                  >
                                    <Eye size={14} />
                                    View Items
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDownloadModal(mr)}
                                    style={getDropdownItemStyle(hoveredAction === `${mr._id}-download`)}
                                    onMouseEnter={() => setHoveredAction(`${mr._id}-download`)}
                                    onMouseLeave={() => setHoveredAction(null)}
                                  >
                                    <Download size={14} />
                                    Download PDF
                                  </button>

                                  {canApprove && mr.status === "PENDING" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openApproveModal(mr)}
                                        style={getDropdownItemStyle(
                                          hoveredAction === `${mr._id}-approve`
                                        )}
                                        onMouseEnter={() =>
                                          setHoveredAction(`${mr._id}-approve`)
                                        }
                                        onMouseLeave={() => setHoveredAction(null)}
                                      >
                                        <CheckCircle2 size={14} />
                                        Approve
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => openRejectModal(mr)}
                                        style={getDropdownItemStyle(
                                          hoveredAction === `${mr._id}-reject`,
                                          true
                                        )}
                                        onMouseEnter={() => setHoveredAction(`${mr._id}-reject`)}
                                        onMouseLeave={() => setHoveredAction(null)}
                                      >
                                        <XCircle size={14} />
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {isMobile && (
                <div style={mobileCardListStyle}>
                  {filteredMRs.length === 0 ? (
                    <div style={mobileEmptyCardStyle}>No material requests found.</div>
                  ) : (
                    paginatedMRs.map((mr) => (
                      <MRMobileCard
                        key={mr._id}
                        mr={mr}
                        canApprove={canApprove}
                        isActionLoading={actionLoadingId === mr._id}
                        actionMenuOpen={actionMenuOpen}
                        actionMenuRef={actionMenuOpen === mr._id ? actionMenuRef : null}
                        hoveredAction={hoveredAction}
                        setHoveredAction={setHoveredAction}
                        openActionMenuForMR={openActionMenuForMR}
                        onView={() => openViewItemsModal(mr)}
                        onDownload={() => openDownloadModal(mr)}
                        onApprove={() => openApproveModal(mr)}
                        onReject={() => openRejectModal(mr)}
                      />
                    ))
                  )}
                </div>
              )}

              {filteredMRs.length > pageSize && (
                <div style={paginationStyle}>
                  <span style={paginationTextStyle}>
                    Showing {paginatedMRs.length} of {filteredMRs.length} MRs
                  </span>

                  <div style={getPaginationButtonGroupStyle(isMobile)}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
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
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showCreateForm && (
        <MRModal
          title="Create Material Request"
          icon={<Plus size={18} />}
          onClose={() => {
            if (!submitting) closeCreateModal();
          }}
        >
          <form onSubmit={handleSubmitMR}>
            <div style={isMobile ? getFormGridStyle(isMobile) : createMRFormGridStyle}>
              <div style={materialFieldWrapStyle}>
                <label style={labelStyle}>Material</label>

                <input
                  type="text"
                  value={materialSearch}
                  onFocus={() => setShowMaterialOptions(true)}
                  onChange={(e) => {
                    setMaterialSearch(e.target.value);
                    setFormData({ ...formData, materialId: "" });
                    setShowMaterialOptions(true);
                  }}
                  placeholder={
                    materialsLoading
                      ? "Loading materials..."
                      : "Search material by name, code, or unit..."
                  }
                  style={inputStyle}
                  disabled={materialsLoading || submitting}
                />

                {selectedMaterial && (
                  <p style={selectedMaterialTextStyle}>
                    Selected: {selectedMaterial.name}
                    {selectedMaterial.code ? ` (${selectedMaterial.code})` : ""}
                  </p>
                )}

                {showMaterialOptions && !materialsLoading && (
                  <div style={materialDropdownStyle}>
                    {filteredMaterials.length > 0 ? (
                      filteredMaterials.slice(0, 8).map((material) => (
                        <button
                          key={material._id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              materialId: material._id,
                            });
                            setMaterialSearch(
                              `${material.name}${material.code ? ` (${material.code})` : ""}`
                            );
                            setShowMaterialOptions(false);
                          }}
                          style={materialOptionStyle}
                        >
                          <span style={{ color: theme.text, fontWeight: 700 }}>
                            {material.name}
                          </span>
                          <span style={{ color: theme.muted, fontSize: 12 }}>
                            {material.code || "No code"} • {material.unit || "-"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div style={noOptionStyle}>No materials found</div>
                    )}
                  </div>
                )}
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
                  min="1"
                  disabled={submitting}
                />
              </div>
            </div>

            <div style={getAddItemRowStyle(isMobile)}>
              <button
                type="button"
                onClick={handleAddItem}
                style={getAddItemButtonStyle(isMobile)}
                disabled={materialsLoading || submitting}
              >
                <Plus size={14} />
                Add Item
              </button>

              <p style={helperTextStyle}>
                Requests will be created to location code: SITE_STORE
              </p>
            </div>

            <div style={itemsPreviewStyle}>
              <div style={itemsHeaderStyle}>
                <strong>Items Added</strong>
                <span>{mrItems.length} total</span>
              </div>

              {mrItems.length === 0 ? (
                <p style={emptyItemsStyle}>
                  No items added yet. Select a material, enter quantity, then click Add Item.
                </p>
              ) : (
                <div style={approveItemsScrollStyle}>
                  <table style={innerTableStyle}>
                    <thead>
                      <tr>
                        <th style={innerThStyle}>Material</th>
                        <th style={innerThStyle}>Code</th>
                        <th style={innerThStyle}>Qty</th>
                        <th style={innerThStyle}>Unit</th>
                        <th style={innerThStyle}>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {mrItems.map((item) => (
                        <tr key={item.material}>
                          <td style={innerTdStyle}>{item.materialName}</td>
                          <td style={innerTdStyle}>{item.materialCode}</td>
                          <td style={innerTdStyle}>{item.requestedQty}</td>
                          <td style={innerTdStyle}>{item.materialUnit}</td>
                          <td style={innerTdStyle}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.material)}
                              style={removeItemButtonStyle}
                              disabled={submitting}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={getFormFooterStyle(isMobile)}>
              <button
                type="button"
                onClick={closeCreateModal}
                style={getSecondaryButtonStyle(isMobile)}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={getPrimaryButtonStyle(isMobile)}
                disabled={submitting || materialsLoading || mrItems.length === 0}
              >
                {submitting ? "Submitting..." : "Submit MR"}
              </button>
            </div>
          </form>
        </MRModal>
      )}

      {viewModalMR && (
        <MRModal
          title="MR Items"
          icon={<Eye size={18} />}
          subtitle={`MR Number: ${viewModalMR.mrNo || "-"}`}
          onClose={() => setViewModalMR(null)}
        >
          <div style={itemsPreviewStyle}>
            <div style={itemsHeaderStyle}>
              <strong>Requested Items</strong>
              <span>{viewModalMR.items?.length || 0} total</span>
            </div>

            {!viewModalMR.items || viewModalMR.items.length === 0 ? (
              <p style={emptyItemsStyle}>No items found for this MR.</p>
            ) : isMobile ? (
              <div style={approveMobileListStyle}>
                {viewModalMR.items.map((item, index) => (
                  <div key={item._id || index} style={approveMobileItemStyle}>
                    <div>
                      <strong style={approveMobileTitleStyle}>
                        {item.material?.name || "N/A"}
                      </strong>
                      <span style={approveMobileCodeStyle}>
                        {item.material?.code || "N/A"}
                      </span>
                    </div>

                    <div style={approveMobileInfoGridStyle}>
                      <MobileInfo label="Requested Qty" value={item.requestedQty ?? "-"} />
                      <MobileInfo
                        label="Approved Qty"
                        value={item.approvedQty != null ? item.approvedQty : "-"}
                      />
                      <MobileInfo label="Unit" value={item.material?.unit || "-"} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={approveItemsScrollStyle}>
                <table style={innerTableStyle}>
                  <thead>
                    <tr>
                      <th style={innerThStyle}>Material</th>
                      <th style={innerThStyle}>Code</th>
                      <th style={innerThStyle}>Requested Qty</th>
                      <th style={innerThStyle}>Approved Qty</th>
                      <th style={innerThStyle}>Unit</th>
                    </tr>
                  </thead>

                  <tbody>
                    {viewModalMR.items.map((item, index) => (
                      <tr key={item._id || index}>
                        <td style={innerTdStyle}>{item.material?.name || "N/A"}</td>
                        <td style={innerTdStyle}>{item.material?.code || "N/A"}</td>
                        <td style={innerTdStyle}>{item.requestedQty ?? "-"}</td>
                        <td style={innerTdStyle}>
                          {item.approvedQty != null ? item.approvedQty : "-"}
                        </td>
                        <td style={innerTdStyle}>{item.material?.unit || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={getFormFooterStyle(isMobile)}>
            <button
              type="button"
              onClick={() => setViewModalMR(null)}
              style={getSecondaryButtonStyle(isMobile)}
              className="close-btn"
            >
              Close
            </button>
          </div>
        </MRModal>
      )}

      {approveModalMR && (
        <MRModal
          title="Approve Material Request"
          icon={<CheckCircle2 size={18} />}
          subtitle={`MR Number: ${approveModalMR.mrNo || "-"}`}
          onClose={() => {
            if (actionLoadingId !== approveModalMR._id) closeApproveModal();
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Dispatch MAIN Yard</label>
            <select
              value={approveMainYardId}
              onChange={(e) => setApproveMainYardId(e.target.value)}
              style={inputStyle}
              disabled={actionLoadingId === approveModalMR._id}
            >
              <option value="">Select MAIN yard</option>
              {activeMainYards.length === 0 ? (
                <option disabled>No active MAIN yards available</option>
              ) : (
                activeMainYards.map((yard) => (
                  <option key={yard._id} value={yard._id}>
                    {yard.name} {yard.code ? `(${yard.code})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={itemsPreviewStyle}>
            <div style={itemsHeaderStyle}>
              <strong>Items to Approve</strong>
              <span>{approveModalMR.items?.length || 0} total</span>
            </div>

            {!approveModalMR.items || approveModalMR.items.length === 0 ? (
              <p style={emptyItemsStyle}>No items found for this MR.</p>
            ) : isMobile ? (
              <div style={approveMobileListStyle}>
                {approvalItems.map((item, index) => (
                  <div key={item.material || index} style={approveMobileItemStyle}>
                    <div>
                      <strong style={approveMobileTitleStyle}>
                        {item.materialName}
                      </strong>
                      <span style={approveMobileCodeStyle}>
                        {item.materialCode}
                      </span>
                    </div>

                    <div style={approveMobileInfoGridStyle}>
                      <MobileInfo label="Requested Qty" value={item.requestedQty} />
                      <MobileInfo label="Unit" value={item.unit} />
                      <MobileInfo label="From" value={item.fromLocationCode} />
                    </div>

                    <div>
                      <label style={labelStyle}>Approved Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={item.approvedQty}
                        onChange={(e) => {
                          const value = e.target.value;

                          setApprovalItems((prev) =>
                            prev.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, approvedQty: value } : row
                            )
                          );
                        }}
                        style={inputStyle}
                        disabled={actionLoadingId === approveModalMR._id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={approveItemsScrollStyle}>
                <table style={innerTableStyle}>
                  <thead>
                    <tr>
                      <th style={innerThStyle}>Material</th>
                      <th style={innerThStyle}>Code</th>
                      <th style={innerThStyle}>Requested Qty</th>
                      <th style={innerThStyle}>Approved Qty</th>
                      <th style={innerThStyle}>From Location</th>
                    </tr>
                  </thead>

                  <tbody>
                    {approvalItems.map((item, index) => (
                      <tr key={item.material || index}>
                        <td style={innerTdStyle}>{item.materialName}</td>
                        <td style={innerTdStyle}>{item.materialCode}</td>
                        <td style={innerTdStyle}>{item.requestedQty}</td>
                        <td style={innerTdStyle}>
                          <input
                            type="number"
                            min="0"
                            value={item.approvedQty}
                            onChange={(e) => {
                              const value = e.target.value;

                              setApprovalItems((prev) =>
                                prev.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, approvedQty: value } : row
                                )
                              );
                            }}
                            style={smallQtyInputStyle}
                            disabled={actionLoadingId === approveModalMR._id}
                          />
                        </td>
                        <td style={innerTdStyle}>{item.fromLocationCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={getFormFooterStyle(isMobile)}>
            <button
              type="button"
              onClick={closeApproveModal}
              style={getSecondaryButtonStyle(isMobile)}
              disabled={actionLoadingId === approveModalMR._id}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApproveFromModal}
              style={approveModalButtonStyle}
              disabled={actionLoadingId === approveModalMR._id}
            >
              {actionLoadingId === approveModalMR._id ? (
                <>
                  <Spinner size={14} />
                  Approving...
                </>
              ) : (
                "Confirm Approve"
              )}
            </button>
          </div>
        </MRModal>
      )}

      {rejectModalMR && (
        <MRModal
          title="Reject Material Request"
          icon={<XCircle size={18} />}
          subtitle={`MR Number: ${rejectModalMR.mrNo || "-"}`}
          onClose={() => {
            if (actionLoadingId !== rejectModalMR._id) closeRejectModal();
          }}
        >
          <div>
            <label style={labelStyle}>Reject Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejecting this material request..."
              style={textareaStyle}
              disabled={actionLoadingId === rejectModalMR._id}
            />
          </div>

          <div style={getFormFooterStyle(isMobile)}>
            <button
              type="button"
              onClick={closeRejectModal}
              style={getSecondaryButtonStyle(isMobile)}
              disabled={actionLoadingId === rejectModalMR._id}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleRejectFromModal}
              style={rejectModalButtonStyle}
              disabled={actionLoadingId === rejectModalMR._id}
            >
              {actionLoadingId === rejectModalMR._id ? "Rejecting..." : "Confirm Reject"}
            </button>
          </div>
        </MRModal>
      )}

      {downloadModalMR && (
        <MRModal
          title="Download MR Report"
          icon={<Download size={18} />}
          subtitle={`MR Number: ${downloadModalMR.mrNo || "-"}`}
          onClose={() => {
            if (!mrDownloading && !mrPreparingDownload) {
              setDownloadModalMR(null);
            }
          }}
        >
          <div style={downloadInfoBoxStyle}>
            <div style={getDownloadInfoGridStyle(isMobile)}>
              <InfoItem label="Status" value={downloadModalMR.status || "-"} />
              <InfoItem
                label="Requested By"
                value={
                  downloadModalMR.requestedBy?.fullName ||
                  downloadModalMR.requestedBy?.name ||
                  downloadModalMR.createdBy?.fullName ||
                  downloadModalMR.createdBy?.name ||
                  "-"
                }
              />
              <InfoItem
                label="Yard"
                value={
                  downloadModalMR.siteYard?.name ||
                  downloadModalMR.siteYard?.code ||
                  downloadModalMR.yard?.name ||
                  "-"
                }
              />
              <InfoItem label="Total Items" value={downloadModalMR.items?.length || 0} />
            </div>
          </div>

          {(mrPreparingDownload || mrDownloading || mrDownloadComplete) && (
            <div style={{ marginTop: 16 }}>
              <div style={progressTrackStyle}>
                <div
                  style={{
                    ...progressFillStyle,
                    width: `${mrDownloadProgress}%`,
                  }}
                />
              </div>

              <p style={progressTextStyle}>{mrDownloadProgress}% completed</p>
            </div>
          )}

          <div style={getFormFooterStyle(isMobile)}>
            <button
              type="button"
              disabled={mrDownloading || mrPreparingDownload}
              onClick={() => {
                if (!mrDownloading && !mrPreparingDownload) {
                  setDownloadModalMR(null);
                }
              }}
              style={{
                ...getSecondaryButtonStyle(isMobile),
                opacity: mrDownloading || mrPreparingDownload ? 0.5 : 1,
                cursor: mrDownloading || mrPreparingDownload ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={mrDownloading || mrPreparingDownload}
              onClick={async () => {
                setMrPreparingDownload(true);
                setMrDownloadComplete(false);
                setMrDownloadProgress(0);

                const interval = setInterval(() => {
                  setMrDownloadProgress((prev) => {
                    if (prev >= 90) return prev;
                    return prev + 10;
                  });
                }, 80);

                try {
                  await new Promise((resolve) => setTimeout(resolve, 500));

                  setMrPreparingDownload(false);
                  setMrDownloading(true);

                  handleDownloadMRPDF(downloadModalMR);

                  setMrDownloadProgress(100);
                  setMrDownloading(false);
                  setMrDownloadComplete(true);

                  setTimeout(() => {
                    setMrDownloadComplete(false);
                    setMrDownloadProgress(0);
                    setDownloadModalMR(null);
                  }, 1000);
                } catch (err) {
                  console.error(err);
                  setMrDownloadComplete(false);
                  setMrDownloadProgress(0);
                  showToast("Download failed", "error");
                } finally {
                  clearInterval(interval);
                  setMrPreparingDownload(false);
                  setMrDownloading(false);
                }
              }}
              style={{
                ...downloadModalButtonStyle,
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
                opacity: mrDownloading || mrPreparingDownload ? 0.6 : 1,
                cursor: mrDownloading || mrPreparingDownload ? "not-allowed" : "pointer",
              }}
            >
              {mrDownloadComplete ? (
                <>Completed</>
              ) : mrPreparingDownload ? (
                <>
                  <Spinner size={14} />
                  Preparing...
                </>
              ) : mrDownloading ? (
                <>
                  <Spinner size={14} />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </MRModal>
      )}
    </div>
  );
}

function MRMobileCard({
  mr,
  canApprove,
  isActionLoading,
  actionMenuOpen,
  actionMenuRef,
  hoveredAction,
  setHoveredAction,
  openActionMenuForMR,
  onView,
  onDownload,
  onApprove,
  onReject,
}) {
  const requestedBy =
    mr.requestedBy?.fullName ||
    mr.requestedBy?.name ||
    mr.createdBy?.fullName ||
    mr.createdBy?.name ||
    "-";

  const yard = mr.siteYard?.name || mr.siteYard?.code || mr.yard?.name || "-";
  const itemCount = mr.items?.length || 0;

  return (
    <div style={mobileCardStyle}>
      <div style={mobileCardHeaderStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={mobileCardLabelStyle}>MR Number</p>
          <h3 style={mobileCardTitleStyle}>{mr.mrNo || "-"}</h3>
        </div>

        <div ref={actionMenuRef} style={mobileHeaderRightStyle}>
          <span style={getStatusBadgeStyle(mr.status)}>{mr.status || "-"}</span>

          <button
            type="button"
            onClick={() => openActionMenuForMR(mr._id)}
            style={mobileMoreButtonStyle}
            disabled={isActionLoading}
          >
            <MoreHorizontal size={16} />
          </button>

          {actionMenuOpen === mr._id && (
            <div style={getDropdownStyle()}>
              <button
                type="button"
                onClick={onView}
                style={getDropdownItemStyle(hoveredAction === `${mr._id}-view`)}
                onMouseEnter={() => setHoveredAction(`${mr._id}-view`)}
                onMouseLeave={() => setHoveredAction(null)}
              >
                <Eye size={14} />
                View Items
              </button>

              <button
                type="button"
                onClick={onDownload}
                style={getDropdownItemStyle(hoveredAction === `${mr._id}-download`)}
                onMouseEnter={() => setHoveredAction(`${mr._id}-download`)}
                onMouseLeave={() => setHoveredAction(null)}
              >
                <Download size={14} />
                Download PDF
              </button>

              {canApprove && mr.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    onClick={onApprove}
                    style={getDropdownItemStyle(hoveredAction === `${mr._id}-approve`)}
                    onMouseEnter={() => setHoveredAction(`${mr._id}-approve`)}
                    onMouseLeave={() => setHoveredAction(null)}
                    disabled={isActionLoading}
                  >
                    <CheckCircle2 size={14} />
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={onReject}
                    style={getDropdownItemStyle(hoveredAction === `${mr._id}-reject`, true)}
                    onMouseEnter={() => setHoveredAction(`${mr._id}-reject`)}
                    onMouseLeave={() => setHoveredAction(null)}
                    disabled={isActionLoading}
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={mobileInfoGridStyle}>
        <MobileInfo label="Items" value={`${itemCount} item${itemCount === 1 ? "" : "s"}`} />
        <MobileInfo label="Requested By" value={requestedBy} />
        <MobileInfo label="Yard" value={yard} />
      </div>
    </div>
  );
}

function MobileInfo({ label, value }) {
  return (
    <div style={mobileInfoItemStyle}>
      <span style={mobileInfoLabelStyle}>{label}</span>
      <strong style={mobileInfoValueStyle}>{value}</strong>
    </div>
  );
}

function useResponsive() {
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window === "undefined") return 1200;
    return window.innerWidth;
  });

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    windowWidth,
    isMobile: windowWidth <= 900,
    isTablet: windowWidth > 900 && windowWidth <= 1200,
  };
}

function MRModal({ title, icon, subtitle, children, onClose }) {
  const { isMobile } = useResponsive();

  return (
    <div style={modalOverlayStyle}>
      <div style={getModalCardStyle(isMobile)}>
        <div style={getModalHeaderStyle(isMobile)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={modalIconStyle}>{icon}</div>
            <div style={{ minWidth: 0 }}>
              <h3 style={modalTitleStyle}>{title}</h3>
              {subtitle && <p style={modalSubtitleStyle}>{subtitle}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={modalCloseButtonStyle}
            className="close-btn"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={infoItemStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong style={infoValueStyle}>{value}</strong>
    </div>
  );
}

function KpiCard({ label, value, icon, color = theme.primary }) {
  return (
    <div style={kpiCardStyle}>
      <div style={{ ...kpiIconStyle, color }}>{icon}</div>
      <p style={kpiLabelStyle}>{label}</p>
      <h3 style={{ ...kpiValueStyle, color }}>{value}</h3>
    </div>
  );
}

function Spinner({ size = 14 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: `2px solid ${theme.primaryBorder}`,
        borderTopColor: theme.primary,
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

function getDropdownItemStyle(isHovered, danger = false) {
  return {
    ...dropdownItemStyle,
    color: danger ? theme.danger : theme.text,
    background: isHovered
      ? danger
        ? theme.dangerSoft
        : theme.surfaceSoft
      : "transparent",
  };
}

const pageStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "hidden",
};

const pageHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: theme.primary,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const pageTitleStyle = {
  margin: 0,
  fontSize: 34,
  fontWeight: 900,
  color: theme.text,
  letterSpacing: "-0.04em",
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const pageSubtitleStyle = {
  margin: "8px 0 0 0",
  color: theme.muted,
  fontSize: 14,
  lineHeight: 1.5,
};

const cardBaseStyle = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 18,
  boxShadow: theme.shadow,
};

const kpiGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const kpiCardStyle = {
  ...cardBaseStyle,
  padding: 18,
  minHeight: 120,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const kpiIconStyle = {
  width: 40,
  height: 40,
  borderRadius: 13,
  background: theme.primarySoft,
  border: `1px solid ${theme.primaryBorder}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 12,
};

const kpiLabelStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 13,
  fontWeight: 700,
};

const kpiValueStyle = {
  margin: "8px 0 0",
  fontSize: 30,
  fontWeight: 900,
};

const filterCardStyle = {
  ...cardBaseStyle,
  padding: 16,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr auto",
  gap: 16,
};

const filterButtonGroupStyle = {
  display: "flex",
  gap: 10,
  alignItems: "end",
  flexWrap: "wrap",
};

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

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const addItemRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 14,
};

const helperTextStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 13,
};

const selectedMaterialTextStyle = {
  margin: "8px 0 0 0",
  color: theme.success,
  fontSize: 13,
  fontWeight: 600,
};

const materialDropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 30,
  marginTop: 6,
  maxHeight: 260,
  overflowY: "auto",
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
};

const materialOptionStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "none",
  borderBottom: `1px solid ${theme.border}`,
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 4,
};

const noOptionStyle = {
  padding: "12px",
  color: theme.muted,
  fontSize: 13,
};

const formFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 24,
  paddingTop: 16,
  borderTop: `1px solid ${theme.border}`,
};

const createButtonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.primary,
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(37,99,235,0.20)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const addItemButtonStyle = {
  border: `1px solid ${theme.primaryBorder}`,
  borderRadius: 10,
  padding: "10px 14px",
  background: theme.primarySoft,
  color: theme.primary,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};

const removeItemButtonStyle = {
  background: theme.dangerSoft,
  color: theme.danger,
  border: `1px solid ${theme.border}`,
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

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
};

const smallSecondaryButtonStyle = {
  ...secondaryButtonStyle,
  padding: "6px 10px",
  fontSize: 12,
};

const approveModalButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.successSoft,
  color: theme.success,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const rejectModalButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.dangerSoft,
  color: theme.danger,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: theme.textSoft,
  fontSize: 14,
  fontWeight: 700,
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

const textareaStyle = {
  width: "100%",
  minHeight: 120,
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  fontSize: 14,
  outline: "none",
  resize: "vertical",
  boxSizing: "border-box",
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
  fontWeight: 900,
};

const sectionSubtitleStyle = {
  margin: "4px 0 0 0",
  fontSize: 13,
  color: theme.muted,
};

const tableStyle = {
  width: "100%",
  minWidth: 860,
  borderCollapse: "collapse",
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

const itemsPreviewStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  padding: 16,
  marginTop: 16,
  maxHeight: "360px",
  overflowX: "auto",
  overflowY: "auto",
};

const itemsHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  color: theme.text,
  fontSize: 14,
};

const emptyItemsStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 13,
};

const innerTableStyle = {
  width: "100%",
  minWidth: 480,
  borderCollapse: "collapse",
};

const innerThStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.muted,
  fontSize: 13,
  whiteSpace: "nowrap",
};

const innerTdStyle = {
  padding: "10px 12px",
  borderBottom: `1px solid ${theme.border}`,
  color: theme.textSoft,
  fontSize: 13,
  whiteSpace: "nowrap",
};

const paginationStyle = {
  marginTop: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const paginationTextStyle = {
  color: theme.textSoft,
  fontSize: 14,
  fontWeight: 700,
};

const actionMenuAnchorStyle = {
  position: "relative",
  display: "inline-flex",
  justifyContent: "flex-end",
};

function getDropdownStyle() {
  return {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 190,
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    boxShadow: "0 20px 45px rgba(15,23,42,0.18)",
    zIndex: 99999,
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

const modalOverlayStyle = {
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

const modalCardStyle = {
  width: "100%",
  maxWidth: 820,
  maxHeight: "88vh",
  overflow: "auto",
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
};

const modalHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
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
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const modalSubtitleStyle = {
  margin: "5px 0 0",
  color: theme.muted,
  fontSize: 14,
  overflowWrap: "anywhere",
};

const modalCloseButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: theme.surfaceSoft,
  color: theme.text,
  width: 38,
  height: 38,
  cursor: "pointer",
  fontSize: 18,
  transition: "all 0.2s ease",
  flexShrink: 0,
};

const loadingTextStyle = {
  color: theme.textSoft,
  fontSize: 14,
};

const errorTextStyle = {
  color: theme.danger,
  fontSize: 14,
  fontWeight: 600,
};

const downloadInfoBoxStyle = {
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
  padding: 18,
  color: theme.textSoft,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const downloadInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const infoItemStyle = {
  padding: "14px 16px",
  borderRadius: 12,
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  minWidth: 0,
};

const infoLabelStyle = {
  display: "block",
  marginBottom: 6,
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const infoValueStyle = {
  color: theme.text,
  fontSize: 15,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const downloadModalButtonStyle = {
  border: `1px solid ${theme.primaryBorder}`,
  borderRadius: 10,
  padding: "12px 16px",
  background: theme.primary,
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(37,99,235,0.18)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const progressTrackStyle = {
  height: 8,
  borderRadius: 999,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  overflow: "hidden",
};

const progressFillStyle = {
  height: "100%",
  background: theme.primary,
  transition: "width 0.2s ease",
};

const progressTextStyle = {
  marginTop: 6,
  fontSize: 12,
  color: theme.muted,
};

const skeletonCardStyle = {
  ...cardBaseStyle,
  padding: 20,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const skeletonLineStyle = {
  height: 14,
  width: "100%",
  borderRadius: 999,
  background: theme.surfaceSoft,
  marginTop: 12,
};

const approveItemsScrollStyle = {
  maxHeight: 240,
  overflowX: "auto",
  overflowY: "auto",
  paddingRight: 4,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  WebkitOverflowScrolling: "touch",
};

const smallQtyInputStyle = {
  width: 90,
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  color: theme.text,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const tableOuterWrapStyle = {
  position: "relative",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "visible",
};

const mobileCardListStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const mobileCardStyle = {
  ...cardBaseStyle,
  padding: 14,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
};

const mobileCardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
  minWidth: 0,
};

const mobileHeaderRightStyle = {
  position: "relative",
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

const mobileCardLabelStyle = {
  margin: "0 0 4px",
  color: theme.muted,
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const mobileCardTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 16,
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const mobileInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
  marginTop: 12,
  width: "100%",
  minWidth: 0,
};

const mobileInfoItemStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  minWidth: 0,
};

const mobileInfoLabelStyle = {
  display: "block",
  marginBottom: 4,
  color: theme.muted,
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const mobileInfoValueStyle = {
  display: "block",
  color: theme.text,
  fontSize: 13,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const mobileActionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
  marginTop: 12,
};

const mobileActionButtonStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "10px 8px",
  background: theme.surfaceSoft,
  color: theme.text,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minWidth: 0,
};

const mobileEmptyCardStyle = {
  ...cardBaseStyle,
  padding: 18,
  textAlign: "center",
  color: theme.muted,
  fontSize: 13,
};

const approveMobileListStyle = {
  display: "grid",
  gap: 10,
  width: "100%",
  minWidth: 0,
};

const approveMobileItemStyle = {
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 10,
  minWidth: 0,
};

const approveMobileTitleStyle = {
  display: "block",
  color: theme.text,
  fontSize: 14,
  fontWeight: 900,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const approveMobileCodeStyle = {
  display: "block",
  marginTop: 4,
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const approveMobileInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
  width: "100%",
  minWidth: 0,
};

const createMRFormGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const materialFieldWrapStyle = {
  position: "relative",
  display: "block",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

function getPageHeaderStyle(isMobile) {
  return {
    ...pageHeaderStyle,
    alignItems: isMobile ? "stretch" : "flex-start",
    flexDirection: isMobile ? "column" : "row",
  };
}

function getPageTitleStyle(isMobile) {
  return {
    ...pageTitleStyle,
    fontSize: isMobile ? 26 : 34,
    lineHeight: 1.15,
    whiteSpace: isMobile ? "normal" : "nowrap",
    minWidth: 0,
  };
}

function getKpiGridStyle(isMobile, isTablet) {
  return {
    ...kpiGridStyle,
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : isTablet
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

function getFilterGridStyle(isMobile) {
  return {
    ...filterGridStyle,
    gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr auto",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

function getFilterButtonGroupStyle(isMobile) {
  return {
    ...filterButtonGroupStyle,
    alignItems: isMobile ? "stretch" : "end",
    justifyContent: isMobile ? "stretch" : "flex-start",
  };
}

function getPaginationButtonGroupStyle(isMobile) {
  return {
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: isMobile ? "space-between" : "flex-start",
    gap: 12,
    width: isMobile ? "100%" : "auto",
    flexWrap: "wrap",
  };
}

function getFormGridStyle(isMobile) {
  return {
    ...formGridStyle,
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  };
}

function getAddItemRowStyle(isMobile) {
  return {
    ...addItemRowStyle,
    alignItems: isMobile ? "stretch" : "center",
    flexDirection: isMobile ? "column" : "row",
    width: "100%",
    minWidth: 0,
  };
}

function getFormFooterStyle(isMobile) {
  return {
    ...formFooterStyle,
    alignItems: isMobile ? "stretch" : "center",
    flexDirection: isMobile ? "column-reverse" : "row",
  };
}

function getPrimaryButtonStyle(isMobile) {
  return {
    ...createButtonStyle,
    width: isMobile ? "100%" : "auto",
  };
}

function getSecondaryButtonStyle(isMobile) {
  return {
    ...secondaryButtonStyle,
    width: isMobile ? "100%" : "auto",
  };
}

function getAddItemButtonStyle(isMobile) {
  return {
    ...addItemButtonStyle,
    width: isMobile ? "100%" : "auto",
    justifyContent: "center",
  };
}

function getDownloadInfoGridStyle(isMobile) {
  return {
    ...downloadInfoGridStyle,
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
    width: "100%",
    minWidth: 0,
  };
}

function getModalCardStyle(isMobile) {
  return {
    ...modalCardStyle,
    maxWidth: isMobile ? "100%" : 820,
    maxHeight: isMobile ? "92vh" : "88vh",
    borderRadius: isMobile ? 16 : 22,
    padding: isMobile ? 16 : 22,
    boxSizing: "border-box",
  };
}

function getModalHeaderStyle(isMobile) {
  return {
    ...modalHeaderStyle,
    alignItems: isMobile ? "flex-start" : "center",
    width: "100%",
    minWidth: 0,
  };
}

function getStatusBadgeStyle(status) {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid",
    whiteSpace: "nowrap",
  };

  if (status === "APPROVED") {
    return {
      ...base,
      background: theme.successSoft,
      color: theme.success,
      borderColor: theme.border,
    };
  }

  if (status === "PENDING") {
    return {
      ...base,
      background: theme.warningSoft,
      color: theme.warning,
      borderColor: theme.border,
    };
  }

  if (status === "REJECTED") {
    return {
      ...base,
      background: theme.dangerSoft,
      color: theme.danger,
      borderColor: theme.border,
    };
  }

  return {
    ...base,
    background: theme.surfaceSoft,
    color: theme.textSoft,
    borderColor: theme.border,
  };
}