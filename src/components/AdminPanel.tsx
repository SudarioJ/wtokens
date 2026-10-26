import { useState, useMemo, useRef, useEffect, type FormEvent } from "react";
import {
  ShieldCheck,
  Coins,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  X,
  Search,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  UserCheck,
  UserX,
  Sparkles,
  History,
  CreditCard,
  Crown,
} from "lucide-react";
import {
  type ManagedUser,
  type TokenCreditRecord,
  type WithdrawalRequest,
  getManagedUsers,
  getAuditLog,
  getWithdrawalRequests,
  creditUserTokens,
  toggleUserRole,
  toggleUserSuspension,
  approveWithdrawal,
  rejectWithdrawal,
  setActiveUserId,
} from "../lib/admin";
import "./admin.css";

interface AdminPanelProps {
  currentAdmin: {
    id: string;
    display_name: string;
    role?: "admin" | "user" | undefined;
  };
  onUserSwitched?: (user: ManagedUser) => void;
  onBalanceUpdated?: () => void;
}

type AdminTab = "tokens" | "users" | "withdrawals" | "audit";

const TOKEN_PRESETS = [5, 10, 25, 50, 100, 250, 500];

const COMMON_REASONS = [
  "Depósito aprobado (Mercado Pago / Yape / Transferencia)",
  "Premio de torneo oficial Box Fight 1v1",
  "Premio de torneo Build Fight / Realistics",
  "Resolución de disputa a favor del jugador",
  "Bono de bienvenida / Promoción de recarga",
  "Ajuste manual de administrador",
  "Corrección por error de partida o reporte",
  "Penalización por conducta antideportiva",
];

export function AdminPanel({
  currentAdmin,
  onUserSwitched,
  onBalanceUpdated,
}: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>("tokens");
  const [users, setUsers] = useState<ManagedUser[]>(() => getManagedUsers());
  const [audit, setAudit] = useState<TokenCreditRecord[]>(() => getAuditLog());
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() =>
    getWithdrawalRequests(),
  );

  // Token Credit Form State
  const [selectedUserId, setSelectedUserId] = useState<string>(
    () => users.find((u) => u.id !== currentAdmin.id)?.id ?? users[0]?.id ?? "",
  );
  const [userSearchText, setUserSearchText] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [amountInput, setAmountInput] = useState<string>("25");
  const [creditType, setCreditType] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState<string>(
    COMMON_REASONS[0] ?? "Ajuste manual de administrador",
  );
  const [customReason, setCustomReason] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  // User Directory Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended"
  >("all");

  // Rejection modal state
  const [rejectModalReq, setRejectModalReq] =
    useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(
    "Datos de cuenta inválidos o no coincidentes con el titular",
  );

  function reloadAll() {
    setUsers(getManagedUsers());
    setAudit(getAuditLog());
    setWithdrawals(getWithdrawalRequests());
    onBalanceUpdated?.();
  }

  // Selected Target User for Token Manager
  const targetUser = useMemo(
    () => users.find((u) => u.id === selectedUserId),
    [users, selectedUserId],
  );

  const searchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const searchMatches = useMemo(() => {
    const q = userSearchText.trim().toLowerCase();
    if (!q) {
      return users.slice(0, 8);
    }
    return users
      .filter(
        (u) =>
          u.display_name.toLowerCase().includes(q) ||
          u.discord_tag.toLowerCase().includes(q) ||
          u.epic_nickname.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [users, userSearchText]);

  const numericAmount = parseFloat(amountInput) || 0;
  const finalDelta = creditType === "credit" ? numericAmount : -numericAmount;
  const previewBalance = targetUser
    ? Math.max(0, Number((targetUser.balance_wt + finalDelta).toFixed(2)))
    : 0;

  // KPIs
  const totalCirculatingWt = useMemo(
    () => users.reduce((acc, u) => acc + (u.balance_wt || 0), 0).toFixed(2),
    [users],
  );
  const pendingWithdrawalsCount = useMemo(
    () => withdrawals.filter((w) => w.status === "pending").length,
    [withdrawals],
  );
  const totalAdminsCount = useMemo(
    () => users.filter((u) => u.role === "admin").length,
    [users],
  );

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.display_name.toLowerCase().includes(q) ||
        u.epic_nickname.toLowerCase().includes(q) ||
        u.discord_tag.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !u.suspended) ||
        (statusFilter === "suspended" && u.suspended);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  function handleCreditTokens(e: FormEvent) {
    e.preventDefault();
    if (!targetUser) {
      setFeedback({ text: "Selecciona un usuario válido.", error: true });
      return;
    }
    if (numericAmount <= 0) {
      setFeedback({
        text: "Ingresa un monto en WTokens mayor a 0.",
        error: true,
      });
      return;
    }

    const effectiveReason =
      reason === "OTRO"
        ? customReason.trim() || "Ajuste manual personalizado"
        : reason;

    const res = creditUserTokens(
      currentAdmin.id,
      currentAdmin.display_name,
      targetUser.id,
      finalDelta,
      effectiveReason,
      note,
    );

    if (res.success) {
      setFeedback({ text: res.message, error: false });
      setNote("");
      reloadAll();
    } else {
      setFeedback({ text: res.message, error: true });
    }
  }

  function handleToggleRole(userId: string) {
    const res = toggleUserRole(currentAdmin.display_name, userId);
    if (res.success) {
      reloadAll();
      setFeedback({
        text: `Rol de usuario actualizado a: ${res.newRole.toUpperCase()}`,
        error: false,
      });
    }
  }

  function handleToggleSuspension(userId: string) {
    const res = toggleUserSuspension(currentAdmin.display_name, userId);
    if (res.success) {
      reloadAll();
      setFeedback({
        text: res.suspended
          ? "La cuenta ha sido suspendida exitosamente."
          : "La cuenta ha sido reactivada.",
        error: false,
      });
    }
  }

  function handleSwitchUser(user: ManagedUser) {
    setActiveUserId(user.id);
    reloadAll();
    onUserSwitched?.(user);
    setFeedback({
      text: `Sesión activa cambiada a: ${user.display_name} (${user.role.toUpperCase()})`,
      error: false,
    });
  }

  function handleApproveWithdrawal(reqId: string) {
    const res = approveWithdrawal(currentAdmin.display_name, reqId);
    if (res.success) {
      reloadAll();
      setFeedback({ text: res.message, error: false });
    }
  }

  function handleRejectWithdrawalConfirm() {
    if (!rejectModalReq) return;
    const res = rejectWithdrawal(
      currentAdmin.display_name,
      rejectModalReq.id,
      rejectReason,
    );
    if (res.success) {
      reloadAll();
      setRejectModalReq(null);
      setFeedback({ text: res.message, error: false });
    }
  }

  return (
    <div className="admin-dashboard">
      {/* Top Banner & KPI Stat Cards */}
      <div className="admin-header">
        <div className="admin-title-area">
          <div className="admin-badge">
            <Crown size={14} />
            <span>PANEL DE ADMINISTRACIÓN</span>
          </div>
          <h2>Manejador de WTokens & Gestión de Cuentas</h2>
          <p>
            Control central de emisión de WTokens, balances aislados por
            jugador, moderación de usuarios y resolución de solicitudes
            financieras.
          </p>
        </div>
        <div className="admin-user-pill">
          <ShieldCheck size={16} className="text-gold" />
          <span>
            Admin activo: <strong>{currentAdmin.display_name}</strong>
          </span>
          <button
            className="icon-refresh-btn"
            onClick={reloadAll}
            title="Sincronizar datos"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`admin-alert ${feedback.error ? "alert-error" : "alert-success"}`}
        >
          {feedback.error ? <AlertTriangle size={18} /> : <Check size={18} />}
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="admin-kpis">
        <div className="kpi-card gold-accent">
          <div className="kpi-icon">
            <Coins size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">WTOKENS EN CIRCULACIÓN</span>
            <strong className="kpi-value">{totalCirculatingWt} WT</strong>
            <span className="kpi-sub">
              Suma de balances aislados (1 WT = 1 USD)
            </span>
          </div>
        </div>

        <div className="kpi-card cyan-accent">
          <div className="kpi-icon">
            <Users size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">TOTAL JUGADORES REGISTRADOS</span>
            <strong className="kpi-value">{users.length} cuentas</strong>
            <span className="kpi-sub">
              {totalAdminsCount} Administradores ·{" "}
              {users.length - totalAdminsCount} Jugadores
            </span>
          </div>
        </div>

        <div
          className={`kpi-card ${pendingWithdrawalsCount > 0 ? "orange-accent" : "purple-accent"}`}
        >
          <div className="kpi-icon">
            <CreditCard size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">COLA DE RETIROS PENDIENTES</span>
            <strong className="kpi-value">
              {pendingWithdrawalsCount} solicitud
              {pendingWithdrawalsCount === 1 ? "" : "es"}
            </strong>
            <span className="kpi-sub">
              {pendingWithdrawalsCount > 0
                ? "Requiere aprobación de tesorería"
                : "Al día. Sin solicitudes pendientes"}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${tab === "tokens" ? "active" : ""}`}
          onClick={() => setTab("tokens")}
        >
          <Coins size={17} />
          <span>Manejador de WTokens</span>
        </button>
        <button
          className={`tab-btn ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          <Users size={17} />
          <span>Directorio de Usuarios ({users.length})</span>
        </button>
        <button
          className={`tab-btn ${tab === "withdrawals" ? "active" : ""}`}
          onClick={() => setTab("withdrawals")}
        >
          <CreditCard size={17} />
          <span>Cola de Retiros</span>
          {pendingWithdrawalsCount > 0 && (
            <span className="tab-counter">{pendingWithdrawalsCount}</span>
          )}
        </button>
        <button
          className={`tab-btn ${tab === "audit" ? "active" : ""}`}
          onClick={() => setTab("audit")}
        >
          <History size={17} />
          <span>Registro de Auditoría ({audit.length})</span>
        </button>
      </div>

      {/* TAB 1: WTokens Token Manager */}
      {tab === "tokens" && (
        <div className="admin-tab-content tokens-tab">
          <div className="token-manager-layout">
            {/* Form */}
            <form onSubmit={handleCreditTokens} className="token-form-card">
              <div className="card-header">
                <Sparkles size={20} className="text-gold" />
                <div>
                  <h3>Acreditar o Ajustar WTokens</h3>
                  <p>
                    Selecciona un usuario para agregar saldo inmediatamente.
                    Cada cuenta mantiene su balance aislado e intransferible.
                  </p>
                </div>
              </div>

              {/* Target User Search & Selector */}
              <div className="form-group user-search-group" ref={searchDropdownRef}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ margin: 0, fontWeight: 700, color: "#f8fafc" }}>
                    1. Buscar Jugador Destinatario
                  </label>
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    Escribe nombre, Discord o Epic Games
                  </small>
                </div>
                
                {/* Search input with quick-clear and dropdown toggle */}
                <div style={{ position: "relative" }}>
                  <div className="admin-user-search-box">
                    <Search size={16} style={{ color: "#38bdf8", flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, @discord o epic ID..."
                      value={userSearchText}
                      onChange={(e) => {
                        setUserSearchText(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />
                    {userSearchText && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearchText("");
                        }}
                        style={{ color: "#94a3b8", background: "none", border: "none", fontSize: "14px", padding: "0 6px", cursor: "pointer" }}
                        title="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results */}
                  {isDropdownOpen && (
                    <div className="admin-user-search-dropdown">
                      <div className="dropdown-hint">
                        {userSearchText.trim()
                          ? `Coincidencias (${searchMatches.length})`
                          : "Selecciona un jugador o escribe para filtrar:"}
                      </div>
                      {searchMatches.length === 0 ? (
                        <div className="search-empty-state">
                          No se encontró ningún jugador con "{userSearchText}"
                        </div>
                      ) : (
                        searchMatches.map((u) => (
                          <div
                            key={u.id}
                            className={`user-search-item ${u.id === selectedUserId ? "selected" : ""}`}
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setUserSearchText("");
                              setIsDropdownOpen(false);
                            }}
                          >
                            <img
                              src={u.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png"}
                              alt={u.display_name}
                              className="user-search-avatar"
                            />
                            <div className="user-search-info">
                              <div className="user-search-name">
                                <strong>{u.display_name}</strong>
                                <span className="user-search-tag">{u.discord_tag}</span>
                                {u.role === "admin" && <span className="badge-admin-tag">ADMIN</span>}
                                {u.suspended && <span className="badge-suspended-tag">SUSPENDIDO</span>}
                              </div>
                              <div className="user-search-meta">
                                Epic: <strong>{u.epic_nickname}</strong> · Saldo actual: <span className="user-search-bal">{u.balance_wt.toFixed(2)} WT</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected User Summary Banner */}
                {targetUser && (
                  <div className="selected-player-summary">
                    <img
                      src={targetUser.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt={targetUser.display_name}
                      className="selected-player-avatar"
                    />
                    <div className="selected-player-details">
                      <div className="selected-player-title">
                        <h4>{targetUser.display_name}</h4>
                        <span className="player-tag">{targetUser.discord_tag}</span>
                        {targetUser.role === "admin" && <span className="badge-admin-tag">ADMIN</span>}
                        {targetUser.suspended && <span className="badge-suspended-tag">SUSPENDIDO</span>}
                      </div>
                      <div className="selected-player-stats">
                        <span>Epic: <strong>{targetUser.epic_nickname}</strong></span>
                        <span className="dot-divider">·</span>
                        <span>Saldo actual: <strong className="player-current-wt">{targetUser.balance_wt.toFixed(2)} WT</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="change-player-btn"
                      onClick={() => {
                        setIsDropdownOpen(true);
                        setUserSearchText("");
                      }}
                    >
                      Buscar otro
                    </button>
                  </div>
                )}
              </div>

              {/* Type Switcher: Credit (+) vs Debit (-) */}
              <div className="form-group">
                <label style={{ fontWeight: 700, color: "#f8fafc" }}>
                  2. Tipo de Operación y Monto
                </label>
                <div className="type-toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${creditType === "credit" ? "active credit" : ""}`}
                    onClick={() => setCreditType("credit")}
                  >
                    <ArrowDownLeft size={16} />
                    <span>Acreditar (+ WTokens)</span>
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${creditType === "debit" ? "active debit" : ""}`}
                    onClick={() => setCreditType("debit")}
                  >
                    <ArrowUpRight size={16} />
                    <span>Descontar / Ajuste (- WTokens)</span>
                  </button>
                </div>
              </div>

              {/* Amount & Presets */}
              <div className="form-group">
                <label>
                  Monto de WTokens ({creditType === "credit" ? "+" : "-"} WT)
                </label>
                <div className="amount-input-wrap">
                  <span className="token-prefix">WT</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="Monto en WTokens..."
                    required
                  />
                </div>
                <div className="presets-list">
                  {TOKEN_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`preset-chip ${amountInput === String(amt) ? "selected" : ""}`}
                      onClick={() => setAmountInput(String(amt))}
                    >
                      +{amt} WT
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Selector */}
              <div className="form-group">
                <label style={{ fontWeight: 700, color: "#f8fafc" }}>3. Motivo Oficial y Referencia</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {COMMON_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="OTRO">Otro motivo personalizado...</option>
                </select>
              </div>

              {reason === "OTRO" && (
                <div className="form-group">
                  <label>Especifica el motivo</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Ej. Reembolso por caída de servidor de Epic Games..."
                    required
                  />
                </div>
              )}

              {/* Internal Admin Note */}
              <div className="form-group">
                <label>Nota interna o referencia (Opcional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ID de comprobante, ticket de soporte o discord ID..."
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className={`button primary full ${creditType === "debit" ? "debit-btn" : ""}`}
              >
                {creditType === "credit" ? (
                  <>
                    <Coins size={18} />
                    <span>
                      Acreditar +{numericAmount.toFixed(2)} WT a{" "}
                      {targetUser?.display_name}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} />
                    <span>
                      Descontar -{numericAmount.toFixed(2)} WT de{" "}
                      {targetUser?.display_name}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Target Account Preview Card */}
            {targetUser && (
              <div className="target-preview-card">
                <h4>Ficha de la Cuenta Seleccionada</h4>
                <div className="target-profile-header">
                  <img
                    src={
                      targetUser.avatar_url ||
                      "https://cdn.discordapp.com/embed/avatars/0.png"
                    }
                    alt={targetUser.display_name}
                    className="target-avatar"
                  />
                  <div>
                    <div className="target-name-line">
                      <strong>{targetUser.display_name}</strong>
                      <span className={`role-tag ${targetUser.role}`}>
                        {targetUser.role === "admin" ? "ADMIN" : "JUGADOR"}
                      </span>
                      {targetUser.suspended && (
                        <span className="status-tag suspended">SUSPENDIDO</span>
                      )}
                    </div>
                    <span className="target-discord">
                      Discord: {targetUser.discord_tag}
                    </span>
                    <span className="target-epic">
                      Epic Games: <strong>{targetUser.epic_nickname}</strong>
                    </span>
                  </div>
                </div>

                <div className="preview-balance-box">
                  <div className="balance-row">
                    <span>Saldo actual:</span>
                    <strong>{targetUser.balance_wt.toFixed(2)} WT</strong>
                  </div>
                  <div className="balance-row operation-row">
                    <span>
                      {creditType === "credit"
                        ? "Operación (+):"
                        : "Operación (-):"}
                    </span>
                    <strong
                      className={
                        creditType === "credit" ? "text-green" : "text-red"
                      }
                    >
                      {creditType === "credit" ? "+" : "-"}
                      {numericAmount.toFixed(2)} WT
                    </strong>
                  </div>
                  <div className="balance-row result-row">
                    <span>Saldo final proyectado:</span>
                    <strong className="text-gold">
                      {previewBalance.toFixed(2)} WT
                    </strong>
                  </div>
                </div>

                <div className="account-meta-list">
                  <div>
                    <span>País / Moneda:</span>
                    <strong>
                      {targetUser.country_name} ({targetUser.preferred_currency}
                      )
                    </strong>
                  </div>
                  <div>
                    <span>Última actividad:</span>
                    <strong>{targetUser.last_active}</strong>
                  </div>
                  <div>
                    <span>Saldo en partidas (reservado):</span>
                    <strong>
                      {targetUser.balance_reserved_wt.toFixed(2)} WT
                    </strong>
                  </div>
                </div>

                <div className="quick-account-actions">
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => handleSwitchUser(targetUser)}
                  >
                    <SlidersHorizontal size={14} />
                    <span>Iniciar sesión como este usuario</span>
                  </button>
                  <button
                    type="button"
                    className={`button secondary small ${targetUser.suspended ? "text-green" : "text-red"}`}
                    onClick={() => handleToggleSuspension(targetUser.id)}
                  >
                    {targetUser.suspended ? (
                      <>
                        <UserCheck size={14} />
                        <span>Reactivar cuenta</span>
                      </>
                    ) : (
                      <>
                        <UserX size={14} />
                        <span>Suspender cuenta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: User Directory & Management */}
      {tab === "users" && (
        <div className="admin-tab-content users-tab">
          {/* Filters Bar */}
          <div className="directory-filters">
            <div className="search-input-wrap">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por Discord, Epic nick o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="filter-selects">
              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value as "all" | "admin" | "user")
                }
              >
                <option value="all">Todos los roles</option>
                <option value="admin">Solo Administradores</option>
                <option value="user">Solo Jugadores</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | "active" | "suspended",
                  )
                }
              >
                <option value="all">Todos los estados</option>
                <option value="active">Solo Activos</option>
                <option value="suspended">Solo Suspendidos</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario / Identidad</th>
                  <th>Epic Games</th>
                  <th>Rol</th>
                  <th>País</th>
                  <th>Saldo WTokens</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones de Gestión</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={u.suspended ? "row-suspended" : ""}>
                    <td>
                      <div className="user-cell">
                        <img
                          src={
                            u.avatar_url ||
                            "https://cdn.discordapp.com/embed/avatars/0.png"
                          }
                          alt=""
                          className="user-avatar-mini"
                        />
                        <div>
                          <strong>{u.display_name}</strong>
                          <small>{u.discord_tag}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="epic-tag">{u.epic_nickname}</span>
                    </td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === "admin" ? (
                          <>
                            <Crown size={12} />
                            ADMIN
                          </>
                        ) : (
                          "JUGADOR"
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="country-cell">
                        {u.country_name} ({u.preferred_currency})
                      </span>
                    </td>
                    <td>
                      <div className="balance-cell">
                        <strong className="text-gold">
                          {u.balance_wt.toFixed(2)} WT
                        </strong>
                        {u.balance_reserved_wt > 0 && (
                          <small>
                            +{u.balance_reserved_wt.toFixed(2)} en duelo
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${u.suspended ? "suspended" : "active"}`}
                      >
                        {u.suspended ? "Suspendido" : "Activo"}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn credit"
                          title="Acreditar WTokens a este usuario"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setUserSearchText("");
                            setTab("tokens");
                          }}
                        >
                          <Coins size={14} />
                          <span>Acreditar WT</span>
                        </button>
                        <button
                          className="action-btn role"
                          title={
                            u.role === "admin"
                              ? "Degradar a Jugador"
                              : "Promover a Administrador"
                          }
                          onClick={() => handleToggleRole(u.id)}
                        >
                          <ShieldCheck size={14} />
                          <span>
                            {u.role === "admin" ? "Hacer User" : "Hacer Admin"}
                          </span>
                        </button>
                        <button
                          className={`action-btn ${u.suspended ? "unban" : "ban"}`}
                          title={
                            u.suspended
                              ? "Reactivar cuenta"
                              : "Suspender cuenta"
                          }
                          onClick={() => handleToggleSuspension(u.id)}
                        >
                          {u.suspended ? (
                            <UserCheck size={14} />
                          ) : (
                            <UserX size={14} />
                          )}
                        </button>
                        <button
                          className="action-btn switch"
                          title="Probar sesión como este usuario"
                          onClick={() => handleSwitchUser(u)}
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Treasury / Withdrawals Queue */}
      {tab === "withdrawals" && (
        <div className="admin-tab-content withdrawals-tab">
          <div className="section-intro-bar">
            <div>
              <h3>Solicitudes de Retiro de WTokens</h3>
              <p>
                Los usuarios solicitan transferencias hacia métodos locales
                (Mercado Pago, Yape, CuentaRUT, etc.). Al aprobar, se confirma
                la liquidación. Al rechazar, los WTokens se reembolsan
                automáticamente a la billetera del usuario.
              </p>
            </div>
            <button className="button secondary small" onClick={reloadAll}>
              <RefreshCw size={14} />
              Actualizar cola
            </button>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID Solicitud</th>
                  <th>Jugador</th>
                  <th>Monto WTokens</th>
                  <th>Equivalente Local</th>
                  <th>Método y Destino</th>
                  <th>Estado</th>
                  <th className="text-right">Resolución</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <span className="code-badge">{w.id}</span>
                    </td>
                    <td>
                      <strong>{w.user_name}</strong>
                    </td>
                    <td>
                      <strong className="text-gold">
                        {w.amount_wt.toFixed(2)} WT
                      </strong>
                    </td>
                    <td>
                      <span className="local-curr">
                        {w.local_amount.toLocaleString()} {w.local_currency}
                      </span>
                    </td>
                    <td>
                      <div className="destination-info">
                        <strong>{w.method}</strong>
                        <small>{w.destination}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${w.status}`}>
                        {w.status === "pending"
                          ? "Pendiente"
                          : w.status === "approved"
                            ? "Aprobado"
                            : "Rechazado"}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        {w.status === "pending" ? (
                          <>
                            <button
                              className="action-btn approve"
                              onClick={() => handleApproveWithdrawal(w.id)}
                            >
                              <Check size={14} />
                              <span>Aprobar</span>
                            </button>
                            <button
                              className="action-btn reject"
                              onClick={() => setRejectModalReq(w)}
                            >
                              <X size={14} />
                              <span>Rechazar</span>
                            </button>
                          </>
                        ) : (
                          <small className="resolved-note">
                            {w.resolved_by} · {w.admin_note || "Completado"}
                          </small>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Audit Log */}
      {tab === "audit" && (
        <div className="admin-tab-content audit-tab">
          <div className="section-intro-bar">
            <div>
              <h3>Registro de Auditoría de Operaciones</h3>
              <p>
                Historial inmutable de créditos, débitos, cambios de rol,
                suspensiones y resoluciones de tesorería realizados por
                administradores.
              </p>
            </div>
            <button className="button secondary small" onClick={reloadAll}>
              <RefreshCw size={14} />
              Actualizar log
            </button>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Administrador</th>
                  <th>Usuario Afectado</th>
                  <th>Operación</th>
                  <th>Motivo</th>
                  <th>Detalle / Nota</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <small className="date-cell">
                        {new Date(entry.created_at).toLocaleString("es", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </small>
                    </td>
                    <td>
                      <span className="admin-badge-mini">
                        <ShieldCheck size={13} />
                        {entry.admin_name}
                      </span>
                    </td>
                    <td>
                      <strong>{entry.target_user_name}</strong>
                    </td>
                    <td>
                      {entry.amount !== 0 ? (
                        <span
                          className={`delta-badge ${entry.amount > 0 ? "positive" : "negative"}`}
                        >
                          {entry.amount > 0 ? "+" : ""}
                          {entry.amount.toFixed(2)} WT
                        </span>
                      ) : (
                        <span className="delta-badge neutral">SISTEMA</span>
                      )}
                    </td>
                    <td>
                      <span className="reason-text">{entry.reason}</span>
                    </td>
                    <td>
                      <small className="note-text">{entry.note || "—"}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReq && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <AlertTriangle size={20} className="text-red" />
              <h4>Rechazar Solicitud de Retiro</h4>
              <button
                className="close-btn"
                onClick={() => setRejectModalReq(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="modal-copy">
              Al rechazar el retiro de{" "}
              <strong>{rejectModalReq.amount_wt} WT</strong> a{" "}
              <strong>{rejectModalReq.user_name}</strong>, los fondos serán
              reembolsados automáticamente a su saldo disponible.
            </p>
            <div className="form-group">
              <label>Motivo del rechazo (visible para el jugador):</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej. CVU inválido, titular de cuenta no coincide..."
                required
              />
            </div>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setRejectModalReq(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary reject-confirm-btn"
                onClick={handleRejectWithdrawalConfirm}
              >
                Rechazar y Reembolsar WT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
