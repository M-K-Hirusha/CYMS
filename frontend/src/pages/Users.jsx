import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import {
  Building2,
  CheckCircle2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  UserCog,
  Users as UsersIcon,
  XCircle,
} from "lucide-react";
import {
  getUsers,
  createUser,
  updateUserStatus,
  assignUserToYard,
} from "../services/userApi";
import { getSiteYards, getMainYards } from "../services/yardApi";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { theme } from "../styles/theme";
import { clearMultipleCache } from "../utils/apiCache";

const ROLES = [
  "SYSTEM_ADMIN",
  "HEAD_OFFICE_ADMIN",
  "SITE_ADMIN",
  "SITE_STAFF",
];

const pageSize = 5;

export default function Users() {
  const currentRole = localStorage.getItem("role");
  const { showToast } = useToast();
  const actionMenuRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  const [users, setUsers] = useState([]);
  const [siteYards, setSiteYards] = useState([]);
  const [mainYards, setMainYards] = useState([]);

  const [loading, setLoading] = useState(true);
  const [yardsLoading, setYardsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [assignModal, setAssignModal] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assignedYard: "",
    managedMainYardIds: [],
  });

  const [confirmConfig, setConfirmConfig] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: currentRole === "HEAD_OFFICE_ADMIN" ? "SITE_STAFF" : "SITE_ADMIN",
    assignedYard: "",
    managedMainYardIds: [],
  });

  const canCreateUsers =
    currentRole === "SYSTEM_ADMIN" || currentRole === "HEAD_OFFICE_ADMIN";

  const canManageStatus = currentRole === "SYSTEM_ADMIN";

  function clearUserRelatedCache() {
    clearMultipleCache(["dashboard", "users", "yards", "reports"]);
  }

  const visibleRoles = useMemo(() => {
    if (currentRole === "HEAD_OFFICE_ADMIN") return ["SITE_STAFF"];
    return ROLES;
  }, [currentRole]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.isActive !== false).length,
      inactive: users.filter((user) => user.isActive === false).length,
      siteUsers: users.filter(
        (user) => user.role === "SITE_ADMIN" || user.role === "SITE_STAFF"
      ).length,
    };
  }, [users]);

  const mainYardOptions = useMemo(() => {
    return mainYards.map((yard) => ({
      value: yard._id,
      label: yard.name,
    }));
  }, [mainYards]);

  const siteYardOptions = useMemo(() => {
    // ONLY restrict yards for SITE_ADMIN
    if (assignModal?.role === "SITE_ADMIN") {
      const assignedSiteAdminYardIds = users
        .filter(
          (user) =>
            user.role === "SITE_ADMIN" &&
            user._id !== assignModal?._id &&
            user.assignedYard
        )
        .map((user) =>
          typeof user.assignedYard === "object"
            ? String(user.assignedYard._id)
            : String(user.assignedYard)
        );

      return siteYards
        .filter(
          (yard) =>
            !assignedSiteAdminYardIds.includes(String(yard._id))
        )
        .map((yard) => ({
          value: yard._id,
          label: `${yard.name}${
            yard.projectCode ? ` - ${yard.projectCode}` : ""
          }`,
        }));
    }

    // SITE_STAFF can access ANY active SITE yard
    return siteYards.map((yard) => ({
      value: yard._id,
      label: `${yard.name}${
        yard.projectCode ? ` - ${yard.projectCode}` : ""
      }`,
    }));
  }, [siteYards, users, assignModal]);

  const selectedCreateMainYards = useMemo(() => {
    return mainYardOptions.filter((option) =>
      form.managedMainYardIds.includes(option.value)
    );
  }, [mainYardOptions, form.managedMainYardIds]);

  const selectedAssignMainYards = useMemo(() => {
    return mainYardOptions.filter((option) =>
      assignForm.managedMainYardIds.includes(option.value)
    );
  }, [mainYardOptions, assignForm.managedMainYardIds]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const data = await getUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || "Failed to load users");
      showToast(err.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadYards() {
    try {
      setYardsLoading(true);

      const [siteData, mainData] = await Promise.all([
        getSiteYards(),
        getMainYards(),
      ]);

      setSiteYards((siteData.yards || []).filter((yard) => yard.isActive !== false));
      setMainYards((mainData.yards || []).filter((yard) => yard.isActive !== false));
    } catch (err) {
      showToast(err.message || "Failed to load yards", "error");
    } finally {
      setYardsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadYards();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function getAssignedYard(user) {
    if (!user.assignedYard) return null;
    if (typeof user.assignedYard === "object") return user.assignedYard;
    return siteYards.find((yard) => yard._id === user.assignedYard) || null;
  }

  function getManagedMainYards(user) {
    if (!Array.isArray(user.managedMainYards)) return [];
    return user.managedMainYards;
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = search.trim().toLowerCase();
      const assignedYard = getAssignedYard(user);

      const managedMainText = Array.isArray(user.managedMainYards)
        ? user.managedMainYards.map((yard) => yard?.name || "").join(" ")
        : "";

      if (
        q &&
        !user.fullName?.toLowerCase().includes(q) &&
        !user.email?.toLowerCase().includes(q) &&
        !user.role?.toLowerCase().includes(q) &&
        !assignedYard?.name?.toLowerCase().includes(q) &&
        !assignedYard?.projectCode?.toLowerCase().includes(q) &&
        !managedMainText.toLowerCase().includes(q)
      ) {
        return false;
      }

      if (roleFilter && user.role !== roleFilter) return false;
      if (statusFilter === "ACTIVE" && user.isActive === false) return false;
      if (statusFilter === "INACTIVE" && user.isActive !== false) return false;

      return true;
    });
  }, [users, search, roleFilter, statusFilter, siteYards]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function resetForm() {
    setForm({
      fullName: "",
      email: "",
      password: "",
      role: currentRole === "HEAD_OFFICE_ADMIN" ? "SITE_STAFF" : "SITE_ADMIN",
      assignedYard: "",
      managedMainYardIds: [],
    });
  }

  function openCreateModal() {
    resetForm();
    setShowCreate(true);
  }

  function closeCreateModal() {
    setShowCreate(false);
    resetForm();
  }

  function handleResetFilters() {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  }

  async function handleCreateUser(e) {
    e.preventDefault();

    try {
      if (!form.fullName.trim()) {
        showToast("Full name is required", "error");
        return;
      }

      if (!form.email.trim()) {
        showToast("Email is required", "error");
        return;
      }

      if (!form.password.trim()) {
        showToast("Password is required", "error");
        return;
      }

      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (form.role === "SITE_ADMIN" || form.role === "SITE_STAFF") {
        if (!form.assignedYard) {
          showToast("Please assign a SITE yard", "error");
          return;
        }

        payload.assignedYard = form.assignedYard;
      }

      if (form.role === "HEAD_OFFICE_ADMIN") {
        if (form.managedMainYardIds.length === 0) {
          showToast("Please assign at least one MAIN yard", "error");
          return;
        }

        payload.managedMainYardIds = form.managedMainYardIds;
      }

      setCreating(true);

      await createUser(payload);
      clearUserRelatedCache();

      closeCreateModal();
      setCurrentPage(1);
      await loadData();

      showToast("User created successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to create user", "error");
    } finally {
      setCreating(false);
    }
  }

  function openAssignModal(user) {
    setActionMenuOpen(null);

    const assignedYard = getAssignedYard(user);
    const managedMainYardIds = getManagedMainYards(user).map((yard) => yard._id || yard);

    setAssignForm({
      assignedYard: assignedYard?._id || "",
      managedMainYardIds,
    });

    setAssignModal(user);
  }

  function closeAssignModal() {
    setAssignModal(null);
    setAssignForm({ assignedYard: "", managedMainYardIds: [] });
  }

  async function handleSaveAssignment(e) {
    e.preventDefault();
    if (!assignModal?._id) return;

    try {
      if (assignModal.role === "SITE_STAFF") {
        if (!assignForm.assignedYard) {
          showToast("Please assign a SITE yard", "error");
          return;
        }
      }

      if (assignModal.role === "HEAD_OFFICE_ADMIN") {
        if (assignForm.managedMainYardIds.length === 0) {
          showToast("Please assign at least one MAIN yard", "error");
          return;
        }
      }

      setAssigning(true);

      if (assignModal.role === "HEAD_OFFICE_ADMIN") {
        await assignUserToYard(assignModal._id, {
          managedMainYardIds: assignForm.managedMainYardIds,
        });
      } else {
        await assignUserToYard(assignModal._id, {
          yardId: assignForm.assignedYard || null,
        });
      }

      clearUserRelatedCache();
      closeAssignModal();
      await loadData();

      showToast("User assignment updated successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to update user assignment", "error");
    } finally {
      setAssigning(false);
    }
  }

  function askToggleStatus(user) {
    setActionMenuOpen(null);

    const shouldActivate = user.isActive === false;

    setConfirmConfig({
      title: shouldActivate ? "Activate User" : "Deactivate User",
      message: shouldActivate
        ? `Are you sure you want to activate ${user.fullName}?`
        : `Are you sure you want to deactivate ${user.fullName}?`,
      onConfirm: () => handleToggleStatus(user),
    });
  }

  async function handleToggleStatus(user) {
    try {
      setProcessingAction(true);

      await updateUserStatus(user._id, user.isActive === false);
      clearUserRelatedCache();

      setConfirmConfig(null);
      await loadData();

      showToast(
        user.isActive === false
          ? "User activated successfully"
          : "User deactivated successfully",
        "success"
      );
    } catch (err) {
      showToast(err.message || "Failed to update user status", "error");
    } finally {
      setProcessingAction(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={getPageHeaderStyle(isMobile)}>
        <div>
          <p style={sectionEyebrowStyle}>CYMS ADMINISTRATION</p>

          <div style={getTitleRowStyle(isMobile)}>
            <UsersIcon size={isMobile ? 24 : 28} color={theme.text} />
            <h2 style={getPageTitleStyle(isMobile)}>Account Center</h2>
          </div>

          <p style={pageSubtitleStyle}>
            Manage system users, role access, SITE yard assignment, and MAIN yard permissions.
          </p>
        </div>

        {canCreateUsers && (
          <button
            type="button"
            onClick={openCreateModal}
            style={getPrimaryButtonStyle(isMobile)}
          >
            <Plus size={16} />
            Create User
          </button>
        )}
      </div>

      <div style={getSummaryGridStyle(isMobile)}>
        <SummaryCard
          title="Total Users"
          value={summary.total}
          icon={<UsersIcon size={20} />}
        />
        <SummaryCard
          title="Active Users"
          value={summary.active}
          icon={<CheckCircle2 size={20} />}
          green
        />
        <SummaryCard
          title="Inactive Users"
          value={summary.inactive}
          icon={<XCircle size={20} />}
          red
        />
        <SummaryCard
          title="SITE Users"
          value={summary.siteUsers}
          icon={<Building2 size={20} />}
        />
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
                placeholder="Search by name, email, role, yard, or project code"
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div style={getFilterButtonGroupStyle(isMobile)}>
            <button type="button" onClick={handleResetFilters} style={secondaryButtonStyle}>
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading && <div style={loadingBoxStyle}>Loading users...</div>}
      {error && <div style={errorBoxStyle}>{error}</div>}

      {!loading && !error && (
        <div style={tableCardStyle}>
          <div style={tableHeaderStyle}>
            <h3 style={sectionTitleStyle}>User Register</h3>
            <p style={sectionSubtitleStyle}>
              Showing {filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"}
            </p>
          </div>

          {isMobile ? (
            <div style={mobileCardGridStyle}>
              {paginatedUsers.length === 0 ? (
                <div style={emptyMobileCardStyle}>No users found.</div>
              ) : (
                paginatedUsers.map((user) => {
                  const assignedYard = getAssignedYard(user);
                  const managedMainYards = getManagedMainYards(user);
                  const canAssignUser =
                    currentRole === "SYSTEM_ADMIN" ||
                    (currentRole === "HEAD_OFFICE_ADMIN" && user.role === "SITE_STAFF");

                  return (
                    <div key={user._id} style={mobileCardStyle}>
                      <div style={mobileCardHeaderStyle}>
                        <div style={{ minWidth: 0 }}>
                          <strong style={mobileCardTitleStyle}>{user.fullName || "-"}</strong>
                          <span style={mobileCardSubtitleStyle}>{user.email || "-"}</span>
                        </div>

                        <span
                          style={getStatusBadgeStyle(
                            user.isActive === false ? "INACTIVE" : "ACTIVE"
                          )}
                        >
                          {user.isActive === false ? "INACTIVE" : "ACTIVE"}
                        </span>
                      </div>

                      <div
                        ref={actionMenuOpen === user._id ? actionMenuRef : null}
                        style={mobileActionWrapStyle}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === user._id ? null : user._id
                            )
                          }
                          style={smallSecondaryButtonStyle}
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {actionMenuOpen === user._id && (
                          <div style={dropdownStyle}>
                            {canAssignUser &&
                              (user.role === "SITE_ADMIN" ||
                                user.role === "SITE_STAFF" ||
                                user.role === "HEAD_OFFICE_ADMIN") && (
                                <button
                                  type="button"
                                  onClick={() => openAssignModal(user)}
                                  style={getDropdownItemStyle(
                                    hoveredAction === `${user._id}-assign`
                                  )}
                                  onMouseEnter={() =>
                                    setHoveredAction(`${user._id}-assign`)
                                  }
                                  onMouseLeave={() => setHoveredAction(null)}
                                >
                                  <Building2 size={14} />
                                  Assign Yard
                                </button>
                              )}

                            {canManageStatus && (
                              <button
                                type="button"
                                onClick={() => askToggleStatus(user)}
                                style={getDropdownItemStyle(
                                  hoveredAction === `${user._id}-status`,
                                  user.isActive !== false
                                )}
                                onMouseEnter={() =>
                                  setHoveredAction(`${user._id}-status`)
                                }
                                onMouseLeave={() => setHoveredAction(null)}
                              >
                                {user.isActive === false ? (
                                  <CheckCircle2 size={14} />
                                ) : (
                                  <XCircle size={14} />
                                )}
                                {user.isActive === false ? "Activate" : "Deactivate"}
                              </button>
                            )}

                            {!canAssignUser && !canManageStatus && (
                              <div style={dropdownEmptyStyle}>No actions available</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={mobileInfoGridStyle}>
                        <InfoBlock label="Role">
                          <span style={getRoleBadgeStyle(user.role)}>
                            {formatRole(user.role)}
                          </span>
                        </InfoBlock>

                        <InfoBlock label="Assigned Yard">
                          {assignedYard ? (
                            <div style={yardBoxStyle}>
                              <strong style={yardNameStyle}>{assignedYard.name}</strong>
                              <span style={yardMetaStyle}>
                                {assignedYard.type || "SITE"}
                                {assignedYard.projectCode
                                  ? ` • ${assignedYard.projectCode}`
                                  : ""}
                              </span>
                            </div>
                          ) : (
                            <span style={disabledTextStyle}>Not assigned</span>
                          )}
                        </InfoBlock>

                        <InfoBlock label="MAIN Yard Access">
                          {user.role === "HEAD_OFFICE_ADMIN" ? (
                            managedMainYards.length > 0 ? (
                              <span style={mainYardBadgeStyle}>
                                {managedMainYards.length} MAIN yard
                                {managedMainYards.length > 1 ? "s" : ""} assigned
                              </span>
                            ) : (
                              <span style={disabledTextStyle}>No MAIN yards</span>
                            )
                          ) : (
                            <span style={disabledTextStyle}>N/A</span>
                          )}
                        </InfoBlock>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={{ width: "100%", overflowX: "auto", position: "relative" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Assigned Yard</th>
                    <th style={thStyle}>MAIN Yard Access</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={emptyStyle}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const assignedYard = getAssignedYard(user);
                      const managedMainYards = getManagedMainYards(user);
                      const canAssignUser =
                        currentRole === "SYSTEM_ADMIN" ||
                        (currentRole === "HEAD_OFFICE_ADMIN" && user.role === "SITE_STAFF");

                      return (
                        <tr key={user._id} className="material-table-row">
                          <td style={tdStyle}>
                            <strong style={{ color: theme.text, display: "block" }}>
                              {user.fullName || "-"}
                            </strong>
                            <span style={mutedTextStyle}>{user.email || "-"}</span>
                          </td>

                          <td style={tdStyle}>
                            <span style={getRoleBadgeStyle(user.role)}>
                              {formatRole(user.role)}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            {assignedYard ? (
                              <div style={yardBoxStyle}>
                                <strong style={yardNameStyle}>{assignedYard.name}</strong>
                                <span style={yardMetaStyle}>
                                  {assignedYard.type || "SITE"}
                                  {assignedYard.projectCode ? ` • ${assignedYard.projectCode}` : ""}
                                </span>
                              </div>
                            ) : (
                              <span style={disabledTextStyle}>Not assigned</span>
                            )}
                          </td>

                          <td style={tdStyle}>
                            {user.role === "HEAD_OFFICE_ADMIN" ? (
                              managedMainYards.length > 0 ? (
                                <span style={mainYardBadgeStyle}>
                                  {managedMainYards.length} MAIN yard
                                  {managedMainYards.length > 1 ? "s" : ""} assigned
                                </span>
                              ) : (
                                <span style={disabledTextStyle}>No MAIN yards</span>
                              )
                            ) : (
                              <span style={disabledTextStyle}>N/A</span>
                            )}
                          </td>

                          <td style={tdStyle}>
                            <span
                              style={getStatusBadgeStyle(
                                user.isActive === false ? "INACTIVE" : "ACTIVE"
                              )}
                            >
                              {user.isActive === false ? "INACTIVE" : "ACTIVE"}
                            </span>
                          </td>

                          <td style={tdStyle}>
                            <div
                              ref={actionMenuOpen === user._id ? actionMenuRef : null}
                              style={{ position: "relative" }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setActionMenuOpen(
                                    actionMenuOpen === user._id ? null : user._id
                                  )
                                }
                                style={smallSecondaryButtonStyle}
                              >
                                <MoreHorizontal size={16} />
                                
                              </button>

                              {actionMenuOpen === user._id && (
                                <div style={dropdownStyle}>
                                  {canAssignUser &&
                                    (user.role === "SITE_ADMIN" ||
                                      user.role === "SITE_STAFF" ||
                                      user.role === "HEAD_OFFICE_ADMIN") && (
                                      <button
                                        type="button"
                                        onClick={() => openAssignModal(user)}
                                        style={getDropdownItemStyle(
                                          hoveredAction === `${user._id}-assign`
                                        )}
                                        onMouseEnter={() =>
                                          setHoveredAction(`${user._id}-assign`)
                                        }
                                        onMouseLeave={() => setHoveredAction(null)}
                                      >
                                        <Building2 size={14} />
                                        Assign Yard
                                      </button>
                                    )}

                                  {canManageStatus && (
                                    <button
                                      type="button"
                                      onClick={() => askToggleStatus(user)}
                                      style={getDropdownItemStyle(
                                        hoveredAction === `${user._id}-status`,
                                        user.isActive !== false
                                      )}
                                      onMouseEnter={() =>
                                        setHoveredAction(`${user._id}-status`)
                                      }
                                      onMouseLeave={() => setHoveredAction(null)}
                                    >
                                      {user.isActive === false ? (
                                        <CheckCircle2 size={14} />
                                      ) : (
                                        <XCircle size={14} />
                                      )}
                                      {user.isActive === false ? "Activate" : "Deactivate"}
                                    </button>
                                  )}

                                  {!canAssignUser && !canManageStatus && (
                                    <div style={dropdownEmptyStyle}>No actions available</div>
                                  )}
                                </div>
                              )}
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

            {filteredUsers.length > pageSize && (
              <div style={paginationStyle}>
                <span style={paginationTextStyle}>
                  Showing {paginatedUsers.length} of {filteredUsers.length} users
                </span>

                <div style={getPaginationControlsStyle(isMobile)}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      ...secondaryButtonStyle,
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
                      setCurrentPage((page) => Math.min(page + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    style={{
                      ...secondaryButtonStyle,
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
      )}

      {showCreate && (
        <UserModal
          title="Create User"
          icon={<Plus size={18} />}
          onClose={() => {
            if (!creating) closeCreateModal();
          }}
        >
          <form onSubmit={handleCreateUser} style={modalGridStyle}>
            <Field label="Full Name">
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Enter full name"
                style={inputStyle}
                disabled={creating}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Enter email address"
                style={inputStyle}
                disabled={creating}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password"
                style={inputStyle}
                disabled={creating}
              />
            </Field>

            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                    assignedYard: "",
                    managedMainYardIds: [],
                  })
                }
                style={inputStyle}
                disabled={creating}
              >
                {visibleRoles.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </Field>

            {(form.role === "SITE_ADMIN" || form.role === "SITE_STAFF") && (
              <Field label="Assigned SITE Yard">
                <Select
                  isSearchable
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuShouldScrollIntoView={false}
                  isDisabled={creating || yardsLoading}
                  options={siteYardOptions}
                  value={siteYardOptions.find(
                    (option) => option.value === form.assignedYard
                  ) || null}
                  onChange={(selected) =>
                    setForm({ ...form, assignedYard: selected?.value || "" })
                  }
                  placeholder={yardsLoading ? "Loading SITE yards..." : "Select SITE yard"}
                  noOptionsMessage={() => "No active SITE yards found"}
                  styles={selectStyles}
                />
              </Field>
            )}

            {form.role === "HEAD_OFFICE_ADMIN" && (
              <Field label="Managed MAIN Yards">
                <Select
                  isMulti
                  isSearchable
                  isClearable
                  closeMenuOnSelect={false}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuShouldScrollIntoView={false}
                  isDisabled={creating || yardsLoading}
                  options={mainYardOptions}
                  value={selectedCreateMainYards}
                  onChange={(selected) =>
                    setForm({
                      ...form,
                      managedMainYardIds: selected
                        ? selected.map((item) => item.value)
                        : [],
                    })
                  }
                  placeholder={yardsLoading ? "Loading MAIN yards..." : "Select MAIN yards"}
                  noOptionsMessage={() => "No active MAIN yards found"}
                  styles={selectStyles}
                />
              </Field>
            )}

            <ModalActions
              onCancel={closeCreateModal}
              cancelDisabled={creating}
              submitDisabled={creating}
              submitText={creating ? "Creating..." : "Create User"}
            />
          </form>
        </UserModal>
      )}

      {assignModal && (
        <UserModal
          title={
            assignModal.role === "HEAD_OFFICE_ADMIN"
              ? "Assign MAIN Yards"
              : "Assign SITE Yard"
          }
          icon={<UserCog size={18} />}
          onClose={() => {
            if (!assigning) closeAssignModal();
          }}
        >
          <form onSubmit={handleSaveAssignment} style={modalGridStyle}>
            <div style={userPreviewStyle}>
              <strong style={{ color: theme.text }}>{assignModal.fullName}</strong>
              <span style={mutedTextStyle}>{assignModal.email}</span>
              <span style={{ marginTop: 8, ...getRoleBadgeStyle(assignModal.role) }}>
                {formatRole(assignModal.role)}
              </span>
            </div>

            {assignModal.role === "HEAD_OFFICE_ADMIN" ? (
              <Field label="Managed MAIN Yards">
                <Select
                  isMulti
                  isSearchable
                  isClearable
                  closeMenuOnSelect={false}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuShouldScrollIntoView={false}
                  isDisabled={assigning || yardsLoading}
                  options={mainYardOptions}
                  value={selectedAssignMainYards}
                  onChange={(selected) =>
                    setAssignForm({
                      ...assignForm,
                      managedMainYardIds: selected
                        ? selected.map((item) => item.value)
                        : [],
                    })
                  }
                  placeholder={yardsLoading ? "Loading MAIN yards..." : "Select MAIN yards"}
                  noOptionsMessage={() => "No active MAIN yards found"}
                  styles={selectStyles}
                />
              </Field>
            ) : (
              <Field label="Assigned SITE Yard">
                <Select
                  isSearchable
                  isClearable
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuShouldScrollIntoView={false}
                  isDisabled={assigning || yardsLoading}
                  options={siteYardOptions}
                  value={siteYardOptions.find(
                    (option) => option.value === assignForm.assignedYard
                  ) || null}
                  onChange={(selected) =>
                    setAssignForm({
                      ...assignForm,
                      assignedYard: selected?.value || "",
                    })
                  }
                  placeholder={yardsLoading ? "Loading SITE yards..." : "Select SITE yard"}
                  noOptionsMessage={() => "No active SITE yards found"}
                  styles={selectStyles}
                />
              </Field>
            )}

            <ModalActions
              onCancel={closeAssignModal}
              cancelDisabled={assigning}
              submitDisabled={assigning}
              submitText={assigning ? "Saving..." : "Save Assignment"}
            />
          </form>
        </UserModal>
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

function InfoBlock({ label, children }) {
  return (
    <div style={infoBlockStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <div style={infoValueStyle}>{children}</div>
    </div>
  );
}

function SummaryCard({ title, value, icon, green, red }) {
  const accentColor = green ? theme.success : red ? theme.danger : theme.primary;
  const accentBackground = green
    ? theme.successSoft
    : red
    ? theme.dangerSoft
    : theme.primarySoft;
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
        <h3
          style={{
            ...summaryValueStyle,
            color: accentColor,
          }}
        >
          {value}
        </h3>
      </div>
    </div>
  );
}

function UserModal({ title, icon, children, onClose }) {
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

function formatRole(role = "") {
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getRoleBadgeStyle(role) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid",
    whiteSpace: "nowrap",
  };

  if (role === "SYSTEM_ADMIN") {
    return {
      ...base,
      background: "rgba(249,115,22,0.10)",
      color: "#ea580c",
      borderColor: "rgba(249,115,22,0.22)",
    };
  }

  if (role === "HEAD_OFFICE_ADMIN") {
    return {
      ...base,
      background: theme.primarySoft,
      color: theme.primary,
      borderColor: theme.primaryBorder,
    };
  }

  if (role === "SITE_ADMIN") {
    return {
      ...base,
      background: "rgba(168,85,247,0.10)",
      color: "#7e22ce",
      borderColor: "rgba(168,85,247,0.22)",
    };
  }

  return {
    ...base,
    background: "rgba(6,182,212,0.10)",
    color: "#0891b2",
    borderColor: "rgba(6,182,212,0.22)",
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
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
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
  maxWidth: 760,
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
};

function getFilterGridStyle(isMobile) {
  return {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "2fr 1.1fr 1.1fr auto",
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
    width: isMobile ? "100%" : "auto",
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
  minWidth: 980,
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

const mutedTextStyle = {
  display: "block",
  marginTop: 4,
  color: theme.muted,
  fontSize: 13,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const disabledTextStyle = {
  color: theme.muted,
  fontSize: 13,
};

const emptyStyle = {
  padding: "24px 16px",
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

const yardBoxStyle = {
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  borderRadius: 12,
  padding: "8px 10px",
  maxWidth: 240,
};

const yardNameStyle = {
  display: "block",
  color: theme.text,
  fontSize: 13,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const yardMetaStyle = {
  display: "block",
  color: theme.muted,
  fontSize: 12,
  marginTop: 4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mainYardBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  background: theme.primarySoft,
  color: theme.primary,
  border: `1px solid ${theme.primaryBorder}`,
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

function getPaginationControlsStyle(isMobile) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "space-between" : "flex-end",
    gap: 12,
    width: isMobile ? "100%" : "auto",
    flexWrap: "wrap",
  };
}

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
  borderRadius: 10,
  minWidth: 180,
  zIndex: 999,
  boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
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
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const dropdownEmptyStyle = {
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
  width: "min(96vw, 760px)",
  maxWidth: 760,
  maxHeight: "88vh",
  overflowY: "auto",
  background: theme.surface,
  border: `1px solid ${theme.border}`,
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 20px 40px rgba(15,23,42,0.18)",
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
  fontWeight: 700,
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

const userPreviewStyle = {
  border: `1px solid ${theme.border}`,
  background: theme.surfaceSoft,
  borderRadius: 14,
  padding: 14,
  display: "grid",
  gap: 2,
};


const mobileCardGridStyle = {
  display: "grid",
  gap: 12,
  width: "100%",
};

const mobileCardStyle = {
  border: `1px solid ${theme.border}`,
  background: theme.surface,
  borderRadius: 16,
  padding: 14,
  boxShadow: "0 10px 25px rgba(15,23,42,0.06)",
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
  minWidth: 0,
};

const mobileCardTitleStyle = {
  display: "block",
  color: theme.text,
  fontSize: 15,
  fontWeight: 900,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mobileCardSubtitleStyle = {
  display: "block",
  color: theme.muted,
  fontSize: 13,
  marginTop: 4,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mobileInfoGridStyle = {
  display: "grid",
  gap: 10,
};

const mobileActionWrapStyle = {
  position: "relative",
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  marginTop: 8,
  marginBottom: 12,
  paddingTop: 8,
  borderTop: `1px solid ${theme.border}`,
};

const emptyMobileCardStyle = {
  ...cardBaseStyle,
  padding: 18,
  textAlign: "center",
  color: theme.muted,
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

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 46,
    backgroundColor: theme.surface,
    borderColor: state.isFocused ? theme.primary : theme.border,
    borderRadius: 10,
    boxShadow: state.isFocused ? `0 0 0 1px ${theme.primary}` : "none",
    cursor: "pointer",
    "&:hover": { borderColor: theme.primary },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({
    ...base,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 20px 45px rgba(15,23,42,0.12)",
  }),
  menuList: (base) => ({ ...base, padding: 6 }),
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
  multiValue: (base) => ({
    ...base,
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
  }),
  multiValueLabel: (base) => ({ ...base, color: theme.primary, fontWeight: 700 }),
  multiValueRemove: (base) => ({
    ...base,
    color: theme.primary,
    ":hover": { backgroundColor: theme.dangerSoft, color: theme.danger },
  }),
  input: (base) => ({ ...base, color: theme.text }),
  placeholder: (base) => ({ ...base, color: theme.muted }),
  singleValue: (base) => ({ ...base, color: theme.text }),
  valueContainer: (base) => ({ ...base, padding: "2px 10px" }),
  indicatorsContainer: (base) => ({ ...base, height: 46 }),
};
