import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import {
  Activity,
  Building2,
  CheckCircle2,
  MapPin,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Warehouse,
  XCircle,
} from "lucide-react";
import {
  addYardLocation,
  createYard,
  getAllYards,
  updateYardStatus,
} from "../services/yardApi";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { theme } from "../styles/theme";

const FILTER_OPTIONS = [
  { value: "ACTIVE", label: "Active Yards" },
  { value: "MAIN", label: "MAIN Yards" },
  { value: "SITE", label: "SITE Yards" },
  { value: "INACTIVE", label: "Inactive Yards" },
  { value: "ALL", label: "All Yards" },
];

const pageSize = 5;

export default function Yards() {
  const { showToast } = useToast();
  const currentRole = localStorage.getItem("role");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  const canCreateYard =
    currentRole === "SYSTEM_ADMIN" || currentRole === "HEAD_OFFICE_ADMIN";
  const canAddLocation =
    currentRole === "SYSTEM_ADMIN" || currentRole === "HEAD_OFFICE_ADMIN";
  const canUpdateStatus = currentRole === "SYSTEM_ADMIN";

  const actionMenuRef = useRef(null);

  const [yards, setYards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [addingLocation, setAddingLocation] = useState(false);

  const [filter, setFilter] = useState(FILTER_OPTIONS[0]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [locationModalYard, setLocationModalYard] = useState(null);
  const [viewLocationsYard, setViewLocationsYard] = useState(null);

  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);

  const [confirmConfig, setConfirmConfig] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "MAIN",
    projectCode: "",
  });

  const [locationForm, setLocationForm] = useState({
    name: "",
    code: "",
  });

  async function loadYards() {
    try {
      setLoading(true);
      const data = await getAllYards();
      setYards(data.yards || data || []);
    } catch (err) {
      showToast(err.message || "Failed to load yards", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadYards();
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const summary = useMemo(() => {
    return {
      total: yards.length,
      main: yards.filter((yard) => yard.type === "MAIN").length,
      site: yards.filter((yard) => yard.type === "SITE").length,
      active: yards.filter((yard) => yard.isActive !== false).length,
    };
  }, [yards]);

  const filteredYards = useMemo(() => {
    const q = search.trim().toLowerCase();

    return yards.filter((yard) => {
      if (filter.value === "ACTIVE" && yard.isActive === false) return false;
      if (filter.value === "INACTIVE" && yard.isActive !== false) return false;
      if (
        (filter.value === "MAIN" || filter.value === "SITE") &&
        (yard.type !== filter.value || yard.isActive === false)
      ) {
        return false;
      }

      if (!q) return true;

      const locationText =
        yard.locations?.map((location) => location.code).join(" ") || "";

      return (
        yard.name?.toLowerCase().includes(q) ||
        yard.code?.toLowerCase().includes(q) ||
        yard.type?.toLowerCase().includes(q) ||
        yard.projectCode?.toLowerCase().includes(q) ||
        locationText.toLowerCase().includes(q)
      );
    });
  }, [yards, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredYards.length / pageSize));
  const paginatedYards = filteredYards.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function resetCreateForm() {
    setForm({ name: "", type: "MAIN", projectCode: "" });
  }

  function openCreateModal() {
    resetCreateForm();
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    resetCreateForm();
  }

  function openLocationModal(yard) {
    setActionMenuOpen(null);
    setLocationModalYard(yard);
    setLocationForm({ name: "", code: "" });
  }

  function closeLocationModal() {
    setLocationModalYard(null);
    setLocationForm({ name: "", code: "" });
  }

  function generateLocationCode(value) {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20);
  }

  function handleResetFilters() {
    setSearch("");
    setFilter(FILTER_OPTIONS[0]);
    setCurrentPage(1);
  }

  async function handleCreateYard(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast("Yard name is required", "error");
      return;
    }

    if (form.type === "SITE" && !form.projectCode.trim()) {
      showToast("Project code is required for SITE yard", "error");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
    };

    if (form.type === "SITE") {
      payload.projectCode = form.projectCode.trim().toUpperCase();
    }

    try {
      setCreating(true);
      await createYard(payload);
      await loadYards();
      closeCreateModal();
      showToast("Yard created successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to create yard", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddLocation(e) {
    e.preventDefault();

    if (!locationModalYard?._id) {
      showToast("No yard selected", "error");
      return;
    }

    if (!locationForm.name.trim()) {
      showToast("Location name is required", "error");
      return;
    }

    if (!locationForm.code.trim()) {
      showToast("Location code is required", "error");
      return;
    }

    try {
      setAddingLocation(true);
      await addYardLocation(locationModalYard._id, {
        name: locationForm.name.trim(),
        code: generateLocationCode(locationForm.code),
      });
      await loadYards();
      closeLocationModal();
      showToast("Location added successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to add location", "error");
    } finally {
      setAddingLocation(false);
    }
  }

  function askToggleStatus(yard) {
    setActionMenuOpen(null);

    const shouldActivate = yard.isActive === false;

    setConfirmConfig({
      title: shouldActivate ? "Activate Yard" : "Disable Yard",
      message: shouldActivate
        ? `Are you sure you want to activate ${yard.name}?`
        : `Are you sure you want to disable ${yard.name}?`,
      onConfirm: () => handleToggleStatus(yard),
    });
  }

  async function handleToggleStatus(yard) {
    const nextStatus = yard.isActive === false;

    try {
      setProcessingAction(true);
      await updateYardStatus(yard._id, nextStatus);
      await loadYards();
      setConfirmConfig(null);
      showToast(
        nextStatus ? "Yard activated successfully" : "Yard disabled successfully",
        "success"
      );
    } catch (err) {
      showToast(err.message || "Failed to update yard status", "error");
    } finally {
      setProcessingAction(false);
    }
  }


  function renderActionDropdown(yard, isActive) {
    return (
      <div style={dropdownStyle}>
        {canAddLocation && (
          <button
            type="button"
            onClick={() => openLocationModal(yard)}
            style={getDropdownItemStyle(hoveredAction === `${yard._id}-location`)}
            onMouseEnter={() => setHoveredAction(`${yard._id}-location`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <Plus size={14} />
            Add Location
          </button>
        )}

        {canUpdateStatus && (
          <button
            type="button"
            onClick={() => askToggleStatus(yard)}
            style={getDropdownItemStyle(hoveredAction === `${yard._id}-status`, isActive)}
            onMouseEnter={() => setHoveredAction(`${yard._id}-status`)}
            onMouseLeave={() => setHoveredAction(null)}
          >
            {isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
            {isActive ? "Disable" : "Activate"}
          </button>
        )}

        {!canAddLocation && !canUpdateStatus && (
          <span style={noActionTextStyle}>No actions</span>
        )}
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={getPageHeaderStyle(isMobile)}>
        <div>
          <p style={sectionEyebrowStyle}>CYMS OPERATIONS</p>

          <div style={getTitleRowStyle(isMobile)}>
            <Building2 size={28} color={theme.text} />
            <h2 style={getPageTitleStyle(isMobile)}>Yards Management</h2>
          </div>

          <p style={pageSubtitleStyle}>
            Manage MAIN warehouses, SITE project yards, active status, and
            internal yard locations.
          </p>
        </div>

        {canCreateYard && (
          <button type="button" onClick={openCreateModal} style={getPrimaryButtonStyle(isMobile)}>
            <Plus size={16} />
            Create Yard
          </button>
        )}
      </div>

      <div style={getSummaryGridStyle(isMobile)}>
        <SummaryCard title="Total Yards" value={summary.total} icon={<Building2 size={20} />} />
        <SummaryCard title="MAIN Yards" value={summary.main} icon={<Warehouse size={20} />} />
        <SummaryCard title="SITE Yards" value={summary.site} icon={<MapPin size={20} />} />
        <SummaryCard title="Active Yards" value={summary.active} icon={<Activity size={20} />} green />
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
                placeholder="Search by yard name, code, project code, or location"
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Filter Yards</label>
            <Select
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuShouldScrollIntoView={false}
              options={FILTER_OPTIONS}
              value={filter}
              onChange={(selected) => setFilter(selected || FILTER_OPTIONS[0])}
              styles={selectStyles}
            />
          </div>

          <div style={getFilterButtonGroupStyle(isMobile)}>
            <button type="button" onClick={handleResetFilters} style={secondaryButtonStyle}>
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={loadingBoxStyle}>Loading yards...</div>
      ) : (
        <div style={tableCardStyle}>
          <div style={tableHeaderStyle}>
            <h3 style={sectionTitleStyle}>Yard Register</h3>
            <p style={sectionSubtitleStyle}>
              Showing {filteredYards.length} yard{filteredYards.length === 1 ? "" : "s"}
            </p>
          </div>

          {isMobile ? (
            <div style={mobileCardGridStyle}>
              {paginatedYards.length === 0 ? (
                <div style={emptyMobileCardStyle}>No yards found.</div>
              ) : (
                paginatedYards.map((yard) => {
                  const isActive = yard.isActive !== false;

                  return (
                    <div key={yard._id} style={mobileCardStyle}>
                      <div style={mobileCardHeaderStyle}>
                        <div style={{ minWidth: 0 }}>
                          <h4 style={mobileCardTitleStyle}>{yard.name || "-"}</h4>
                          <p style={mobileCardSubtitleStyle}>{yard.code || "N/A"}</p>
                        </div>

                        <div
                          ref={actionMenuOpen === yard._id ? actionMenuRef : null}
                          style={{ position: "relative", flexShrink: 0 }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuOpen(actionMenuOpen === yard._id ? null : yard._id)
                            }
                            style={smallSecondaryButtonStyle}
                          >
                            <MoreHorizontal size={16} />
                            
                          </button>

                          {actionMenuOpen === yard._id && renderActionDropdown(yard, isActive)}
                        </div>
                      </div>

                      <div style={mobileMetaGridStyle}>
                        <InfoBlock label="Type" value={<span style={getTypeBadgeStyle(yard.type)}>{yard.type || "-"}</span>} />
                        <InfoBlock label="Status" value={<span style={getStatusBadgeStyle(isActive ? "ACTIVE" : "INACTIVE")}>{isActive ? "ACTIVE" : "INACTIVE"}</span>} />
                        <InfoBlock label="Project Code" value={yard.projectCode ? <span style={codeBadgeStyle}>{yard.projectCode}</span> : <span style={disabledTextStyle}>N/A</span>} />
                        <InfoBlock label="Locations" value={<button type="button" onClick={() => setViewLocationsYard(yard)} style={viewLocationsButtonStyle}>View ({yard.locations?.length || 0})</button>} />
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
                    <th style={thStyle}>Yard</th>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Project Code</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Locations</th>
                    <th style={{ ...thStyle, width: 130, textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedYards.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={emptyStyle}>No yards found.</td>
                    </tr>
                  ) : (
                    paginatedYards.map((yard) => {
                      const isActive = yard.isActive !== false;

                      return (
                        <tr key={yard._id} className="yard-table-row">
                          <td style={tdStyle}>
                            <strong style={{ color: theme.text }}>{yard.name || "-"}</strong>
                            <div style={mutedTextStyle}>Created yard record</div>
                          </td>

                          <td style={tdStyle}>
                            <span style={codeBadgeStyle}>{yard.code || "N/A"}</span>
                          </td>

                          <td style={tdStyle}>
                            <span style={getTypeBadgeStyle(yard.type)}>{yard.type || "-"}</span>
                          </td>

                          <td style={tdStyle}>
                            {yard.projectCode ? (
                              <span style={codeBadgeStyle}>{yard.projectCode}</span>
                            ) : (
                              <span style={disabledTextStyle}>N/A</span>
                            )}
                          </td>

                          <td style={tdStyle}>
                            <span style={getStatusBadgeStyle(isActive ? "ACTIVE" : "INACTIVE")}>
                              {isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            <button
                              type="button"
                              onClick={() => setViewLocationsYard(yard)}
                              style={viewLocationsButtonStyle}
                            >
                              View ({yard.locations?.length || 0})
                            </button>
                          </td>

                          <td style={{ ...tdStyle, textAlign: "center", width: 130 }}>
                            <div
                              ref={actionMenuOpen === yard._id ? actionMenuRef : null}
                              style={{ position: "relative" }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setActionMenuOpen(actionMenuOpen === yard._id ? null : yard._id)
                                }
                                style={smallSecondaryButtonStyle}
                              >
                                <>
                                  <MoreHorizontal size={16} />
                                 
                                </>
                              </button>

                              {actionMenuOpen === yard._id && renderActionDropdown(yard, isActive)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filteredYards.length > pageSize && (
            <div style={getPaginationStyle(isMobile)}>
              <span style={paginationTextStyle}>
                Showing {paginatedYards.length} of {filteredYards.length} yards
              </span>

              <div style={getPaginationButtonRowStyle(isMobile)}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    width: isMobile ? "100%" : "fit-content",
                  }}
                >
                  Previous
                </button>

                <span style={paginationTextStyle}>Page {currentPage} of {totalPages}</span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    width: isMobile ? "100%" : "fit-content",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <YardModal
          title="Create Yard"
          icon={<Plus size={18} />}
          onClose={() => {
            if (!creating) closeCreateModal();
          }}
        >
          <form onSubmit={handleCreateYard} style={modalGridStyle}>
            <Field label="Yard Name">
              <input
                style={inputStyle}
                value={form.name}
                disabled={creating}
                placeholder="Example: Main Warehouse 06"
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </Field>

            <Field label="Yard Type">
              <select
                style={inputStyle}
                value={form.type}
                disabled={creating}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value, projectCode: "" }))
                }
              >
                <option value="MAIN">MAIN Yard</option>
                <option value="SITE">SITE Yard</option>
              </select>
            </Field>

            {form.type === "SITE" && (
              <Field label="Project Code">
                <input
                  style={inputStyle}
                  value={form.projectCode}
                  disabled={creating}
                  placeholder="Example: PROJECT_A"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, projectCode: e.target.value.toUpperCase() }))
                  }
                />
              </Field>
            )}

            {form.type === "SITE" && (
              <p style={helperTextStyle}>
                After creating this SITE yard, go to <strong>Account Center → Users</strong> and
                assign a <strong>SITE ADMIN</strong> to manage this yard.
              </p>
            )}

            <ModalActions
              onCancel={closeCreateModal}
              cancelDisabled={creating}
              submitDisabled={creating}
              submitText={creating ? "Creating..." : "Create Yard"}
            />
          </form>
        </YardModal>
      )}

      {locationModalYard && (
        <YardModal
          title="Add Location"
          icon={<MapPin size={18} />}
          onClose={() => {
            if (!addingLocation) closeLocationModal();
          }}
        >
          <form onSubmit={handleAddLocation} style={modalGridStyle}>
            <p style={modalHintStyle}>
              Yard: <strong>{locationModalYard.name}</strong>
            </p>

            <Field label="Location Name">
              <input
                style={inputStyle}
                value={locationForm.name}
                disabled={addingLocation}
                placeholder="Example: Location A"
                onChange={(e) => {
                  const value = e.target.value;
                  setLocationForm({ name: value, code: generateLocationCode(value) });
                }}
              />
            </Field>

            <Field label="Location Code">
              <input
                style={inputStyle}
                value={locationForm.code}
                disabled={addingLocation}
                placeholder="Example: LOCATION_A"
                onChange={(e) =>
                  setLocationForm((prev) => ({ ...prev, code: generateLocationCode(e.target.value) }))
                }
              />
            </Field>

            <ModalActions
              onCancel={closeLocationModal}
              cancelDisabled={addingLocation}
              submitDisabled={addingLocation}
              submitText={addingLocation ? "Adding..." : "Add Location"}
            />
          </form>
        </YardModal>
      )}

      {viewLocationsYard && (
        <YardModal
          title="Yard Locations"
          icon={<MapPin size={18} />}
          onClose={() => setViewLocationsYard(null)}
        >
          <p style={modalHintStyle}>
            Yard: <strong>{viewLocationsYard.name}</strong>
          </p>

          <div style={locationListStyle}>
            {viewLocationsYard.locations?.length > 0 ? (
              viewLocationsYard.locations.map((location) => (
                <div key={location.code} style={locationListItemStyle}>
                  <div>
                    <strong style={{ color: theme.text }}>{location.name}</strong>
                    <div style={mutedTextStyle}>{location.code}</div>
                  </div>

                  <span
                    style={getStatusBadgeStyle(
                      location.isActive === false ? "INACTIVE" : "ACTIVE"
                    )}
                  >
                    {location.isActive === false ? "INACTIVE" : "ACTIVE"}
                  </span>
                </div>
              ))
            ) : (
              <div style={emptyStyle}>No locations found.</div>
            )}
          </div>
        </YardModal>
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
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div style={infoBlockStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

function SummaryCard({ title, value, icon, green }) {
  const accentColor = green ? theme.success : theme.primary;
  const accentBackground = green ? theme.successSoft : theme.primarySoft;
  const accentBorder = green ? "rgba(22,163,74,0.18)" : theme.primaryBorder;

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

function YardModal({ title, icon, children, onClose }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={modalIconStyle}>{icon}</div>
            <h3 style={modalTitleStyle}>{title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
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

function ModalActions({ onCancel, cancelDisabled, submitDisabled, submitText }) {
  return (
    <div style={modalActionsStyle}>
      <button
        type="button"
        onClick={onCancel}
        style={secondaryButtonStyle}
        disabled={cancelDisabled}
      >
        Cancel
      </button>

      <button
        type="submit"
        style={{
          ...primaryButtonStyle,
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

function getPageTitleStyle(isMobile) {
  return {
    margin: 0,
    fontSize: isMobile ? 28 : 34,
    lineHeight: 1.1,
    fontWeight: 900,
    color: theme.text,
    letterSpacing: "-0.04em",
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

function getSummaryGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
    gap: 14,
    marginTop: 6,
    width: "100%",
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
};

function getFilterGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "2fr 1.2fr auto",
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
    alignItems: "end",
    flexWrap: "wrap",
    width: isMobile ? "100%" : "fit-content",
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
  overflow: "visible",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const tableScrollStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  position: "relative",
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
  width: "fit-content",
  maxWidth: "100%",
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
};

function getPrimaryButtonStyle(isMobile) {
  return {
    ...primaryButtonStyle,
    width: isMobile ? "100%" : "fit-content",
  };
}

function getTitleRowStyle(isMobile) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    width: "100%",
    minWidth: 0,
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
};

const smallSecondaryButtonStyle = {
  ...secondaryButtonStyle,
  padding: "6px 10px",
  fontSize: 12,
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

const loadingBoxStyle = {
  ...cardBaseStyle,
  padding: 20,
  color: theme.textSoft,
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

const dropdownStyle = {
  position: "absolute",
  right: 0,
  bottom: "110%",
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  minWidth: 190,
  zIndex: 999,
  boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
  overflow: "hidden",
};

const dropdownItemStyle = {
  width: "100%",
  padding: "10px 14px",
  textAlign: "left",
  background: "transparent",
  border: "none",
  color: theme.text,
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const noActionTextStyle = {
  display: "block",
  padding: "10px 14px",
  color: theme.muted,
  fontSize: 13,
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
};

const modalStyle = {
  width: "100%",
  maxWidth: "760px",
  maxHeight: "88vh",
  overflow: "auto",
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
  boxSizing: "border-box",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const modalIconStyle = {
  background: theme.primarySoft,
  padding: 8,
  borderRadius: 8,
  color: theme.primary,
  display: "flex",
};

const modalTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 20,
  fontWeight: 800,
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
};

const modalGridStyle = {
  display: "grid",
  gap: 14,
};

const modalActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18,
  flexWrap: "wrap",
};

const modalHintStyle = {
  margin: 0,
  color: theme.muted,
  fontSize: 14,
};

const helperTextStyle = {
  margin: "0",
  color: theme.muted,
  fontSize: 13,
  lineHeight: 1.5,
};

const mutedTextStyle = {
  fontSize: 13,
  color: theme.muted,
  marginTop: 3,
};

const disabledTextStyle = {
  color: theme.muted,
  fontSize: 13,
};

const codeBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 9px",
  borderRadius: 10,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
  color: theme.textSoft,
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 46,
    backgroundColor: theme.surface,
    borderColor: state.isFocused ? theme.primary : theme.border,
    borderRadius: 10,
    boxShadow: state.isFocused ? `0 0 0 1px ${theme.primary}` : "none",
    cursor: "pointer",
    "&:hover": {
      borderColor: theme.primary,
    },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({
    ...base,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 50,
    boxShadow: "0 20px 45px rgba(15,23,42,0.12)",
  }),
  menuList: (base) => ({
    ...base,
    padding: 6,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? theme.primary
      : state.isFocused
      ? theme.surfaceSoft
      : theme.surface,
    color: state.isSelected ? "#ffffff" : theme.text,
    cursor: "pointer",
    borderRadius: 8,
    marginBottom: 3,
    fontSize: 14,
  }),
  input: (base) => ({
    ...base,
    color: theme.text,
  }),
  placeholder: (base) => ({
    ...base,
    color: theme.muted,
  }),
  singleValue: (base) => ({
    ...base,
    color: theme.text,
  }),
};

const viewLocationsButtonStyle = {
  border: `1px solid ${theme.primaryBorder}`,
  borderRadius: 10,
  padding: "7px 12px",
  background: theme.primarySoft,
  color: theme.primary,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const locationListStyle = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};

const locationListItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: theme.surfaceSoft,
  border: `1px solid ${theme.border}`,
};


const mobileCardGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
  width: "100%",
  minWidth: 0,
};

const mobileCardStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
  padding: 14,
  background: theme.surface,
  boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const mobileCardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const mobileCardTitleStyle = {
  margin: 0,
  color: theme.text,
  fontSize: 16,
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const mobileCardSubtitleStyle = {
  margin: "4px 0 0",
  color: theme.muted,
  fontSize: 13,
  fontWeight: 700,
};

const mobileMetaGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
};

const infoBlockStyle = {
  display: "grid",
  gap: 5,
  minWidth: 0,
};

const infoLabelStyle = {
  color: theme.muted,
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const infoValueStyle = {
  color: theme.textSoft,
  fontSize: 13,
  minWidth: 0,
};

const emptyMobileCardStyle = {
  ...mobileCardStyle,
  color: theme.muted,
  textAlign: "center",
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

function getStatusBadgeStyle(status) {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
  };

  if (status === "ACTIVE") {
    return {
      ...base,
      background: theme.successSoft,
      color: theme.success,
      borderColor: "rgba(22,163,74,0.28)",
    };
  }

  return {
    ...base,
    background: theme.dangerSoft,
    color: theme.danger,
    borderColor: "rgba(239,68,68,0.28)",
  };
}

function getTypeBadgeStyle(type) {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid",
  };

  if (type === "MAIN") {
    return {
      ...base,
      background: theme.primarySoft,
      color: theme.primary,
      borderColor: theme.primaryBorder,
    };
  }

  return {
    ...base,
    background: "rgba(168,85,247,0.10)",
    color: "#7c3aed",
    borderColor: "rgba(168,85,247,0.22)",
  };
}
