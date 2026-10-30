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
  saveWithdrawalRequests,
  creditUserTokens,
  toggleUserRole,
  toggleUserSuspension,
  approveWithdrawal,
  rejectWithdrawal,
  registerNewUser,
  syncWithServerRegistry,
  isOwnerUser,
  setUserAffiliateTier,
} from "../lib/admin";
import "./admin.css";

interface AdminPanelProps {
  currentAdmin: {
    id: string;
    display_name: string;
    role?: "owner" | "admin" | "user" | undefined;
  };
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
  onBalanceUpdated,
}: AdminPanelProps) {
  const isViewerOwner = isOwnerUser(currentAdmin);
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
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended"
  >("all");

  // Rejection modal state
  const [rejectModalReq, setRejectModalReq] =
    useState<WithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(
    "Datos de cuenta inválidos o no coincidentes con el titular",
  );

  // Incoming deposits and Pix requests
  const [pendingDeposits, setPendingDeposits] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("wtokens_pending_deposits") || "[]");
    } catch {
      return [];
    }
  });

  const [pendingPixRequests, setPendingPixRequests] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("wtokens_pix_requests") || "[]");
    } catch {
      return [];
    }
  });

  // Register user modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserDiscord, setNewUserDiscord] = useState("");
  const [newUserEpic, setNewUserEpic] = useState("");
  const [newUserCountry, setNewUserCountry] = useState("PE");
  const [newUserInitialBalance, setNewUserInitialBalance] = useState("10");

  // Affiliate tier modal state
  const [affiliateModalUser, setAffiliateModalUser] = useState<ManagedUser | null>(null);
  const [selectedTier, setSelectedTier] = useState<"standard" | "verified" | "partner">("partner");
  const [customTierRate, setCustomTierRate] = useState<string>("20");

  function handleOpenAffiliateModal(u: ManagedUser) {
    setAffiliateModalUser(u);
    const tier = u.affiliate_tier || "partner";
    setSelectedTier(tier);
    const rate = u.affiliate_rate
      ? Math.round(u.affiliate_rate * 100)
      : tier === "partner"
        ? 20
        : tier === "verified"
          ? 15
          : 10;
    setCustomTierRate(String(rate));
  }

  function handleSaveAffiliateTier() {
    if (!affiliateModalUser) return;
    const numRate = parseFloat(customTierRate) / 100;
    const res = setUserAffiliateTier(
      currentAdmin.display_name,
      affiliateModalUser.id,
      selectedTier,
      numRate,
    );
    if (res.success) {
      reloadAll();
      setFeedback({ text: res.message, error: false });
      setAffiliateModalUser(null);
    } else {
      setFeedback({ text: res.message, error: true });
    }
  }

  function handleCreateNewUser(e: FormEvent) {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const initialBal = parseFloat(newUserInitialBalance) || 0;
    const created = registerNewUser(
      newUserName.trim(),
      newUserDiscord.trim(),
      newUserEpic.trim(),
      newUserCountry,
      initialBal,
    );
    reloadAll();
    setSelectedUserId(created.id);
    setNewUserName("");
    setNewUserDiscord("");
    setNewUserEpic("");
    setNewUserInitialBalance("10");
    setIsRegisterModalOpen(false);
    setFeedback({
      text: `¡Jugador ${created.display_name} registrado exitosamente con ${created.balance_wt.toFixed(2)} WT!`,
      error: false,
    });
  }

  function handleApproveDeposit(dep: any) {
    if (!dep.userId) return;
    const res = creditUserTokens(
      currentAdmin.id,
      currentAdmin.display_name,
      dep.userId,
      dep.amountWt,
      `Recarga aprobada vía ${dep.method} (Titular: ${dep.receiptCode})`,
    );
    if (res.success) {
      setUsers(getManagedUsers());
      setAudit(getAuditLog());
      const updated = pendingDeposits.filter((d) => d.id !== dep.id);
      setPendingDeposits(updated);
      try {
        localStorage.setItem("wtokens_pending_deposits", JSON.stringify(updated));
      } catch {}

      if (typeof fetch !== "undefined") {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolve_deposit",
            id: dep.id,
            status: "approved",
          }),
        }).catch(() => {});
      }

      setFeedback({
        text: `✅ ¡Acreditados ${dep.amountWt} WT a ${dep.userName || dep.userDiscord || dep.userId}!`,
        error: false,
      });
      if (onBalanceUpdated) onBalanceUpdated();
    }
  }

  function handleDismissDeposit(id: string) {
    const updated = pendingDeposits.filter((d) => d.id !== id);
    setPendingDeposits(updated);
    try {
      localStorage.setItem("wtokens_pending_deposits", JSON.stringify(updated));
    } catch {}

    if (typeof fetch !== "undefined") {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_deposit",
          id,
          status: "dismissed",
        }),
      }).catch(() => {});
    }
  }

  function handleApprovePix(req: any) {
    if (!req.userId) return;
    const res = creditUserTokens(
      currentAdmin.id,
      currentAdmin.display_name,
      req.userId,
      req.amountWt,
      `Recarga Pix Belo aprobada (${req.amountBrl} BRL)`,
    );
    if (res.success) {
      setUsers(getManagedUsers());
      setAudit(getAuditLog());
      const updated = pendingPixRequests.filter((p) => p.id !== req.id);
      setPendingPixRequests(updated);
      try {
        localStorage.setItem("wtokens_pix_requests", JSON.stringify(updated));
      } catch {}

      if (typeof fetch !== "undefined") {
        fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolve_deposit",
            id: req.id,
            status: "approved",
          }),
        }).catch(() => {});
      }

      setFeedback({
        text: `✅ ¡Acreditados ${req.amountWt} WT a ${req.userName}!`,
        error: false,
      });
      if (onBalanceUpdated) onBalanceUpdated();
    }
  }

  function handleDismissPix(id: string) {
    const updated = pendingPixRequests.filter((p) => p.id !== id);
    setPendingPixRequests(updated);
    try {
      localStorage.setItem("wtokens_pix_requests", JSON.stringify(updated));
    } catch {}

    if (typeof fetch !== "undefined") {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_deposit",
          id,
          status: "dismissed",
        }),
      }).catch(() => {});
    }
  }

  async function reloadAll() {
    try {
      const synced = await syncWithServerRegistry();
      setUsers(synced);
    } catch {
      setUsers(getManagedUsers());
    }
    setAudit(getAuditLog());
    setWithdrawals(getWithdrawalRequests());

    if (typeof fetch !== "undefined") {
      fetch("/api/sync")
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success) {
            if (Array.isArray(data.deposits)) setPendingDeposits(data.deposits);
            if (Array.isArray(data.pixRequests)) setPendingPixRequests(data.pixRequests);
            if (Array.isArray(data.withdrawals)) {
              const localW = getWithdrawalRequests();
              const map = new Map<string, WithdrawalRequest>();
              for (const w of localW) map.set(w.id, w);
              for (const rw of data.withdrawals) {
                if (!map.has(rw.id)) {
                  map.set(rw.id, {
                    id: rw.id,
                    user_id: rw.user_id,
                    user_name: rw.user_name,
                    amount_wt: rw.amount_wt,
                    local_currency: rw.local_currency,
                    local_amount: rw.local_amount,
                    method: rw.method,
                    destination: rw.destination,
                    status: rw.status,
                    created_at: rw.created_at,
                    admin_note: rw.admin_note,
                  });
                } else {
                  const curr = map.get(rw.id)!;
                  if (rw.status !== curr.status) {
                    curr.status = rw.status;
                    if (rw.admin_note) curr.admin_note = rw.admin_note;
                  }
                }
              }
              const merged = Array.from(map.values());
              saveWithdrawalRequests(merged);
              setWithdrawals(merged);
            }
          }
        })
        .catch(() => {});
    }

    onBalanceUpdated?.();
  }

  useEffect(() => {
    void reloadAll();
    const interval = setInterval(() => {
      void reloadAll();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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
    () => users.filter((u) => u.role === "admin" || u.role === "owner").length,
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
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "owner" ? u.role === "owner" || isOwnerUser(u) : u.role === roleFilter);
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
    } else {
      setFeedback({
        text: res.message || "No tienes permisos para modificar este rol.",
        error: true,
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
    } else {
      setFeedback({
        text: res.message || "No tienes permisos para suspender esta cuenta.",
        error: true,
      });
    }
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

      {/* Solicitudes de Recarga y Pix Pendientes */}
      {(pendingPixRequests.length > 0 || pendingDeposits.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          {/* Banner Pix Brasil */}
          {pendingPixRequests.map((req) => (
            <div
              key={req.id}
              style={{
                background: "linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(6, 16, 32, 0.95) 100%)",
                border: "1px solid rgba(234, 179, 8, 0.4)",
                borderRadius: "10px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🇧🇷</span>
                  <strong style={{ color: "#fef08a", fontSize: "14px" }}>
                    Solicitud Pix Brasil de {req.userName}
                  </strong>
                  {req.userDiscord && (
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>@{req.userDiscord}</span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "3px" }}>
                  Genera en Belo: <strong style={{ color: "#5eeaff", fontSize: "14px" }}>{req.amountBrl} BRL</strong> para acreditar <strong>{req.amountWt} WT</strong>.
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => {
                    navigator.clipboard?.writeText(String(req.amountBrl));
                    alert(`Monto ${req.amountBrl} copiado para ingresar en Belo.`);
                  }}
                >
                  Copiar {req.amountBrl} BRL
                </button>
                <button
                  type="button"
                  className="button primary small"
                  onClick={() => handleApprovePix(req)}
                >
                  ✓ Acreditar {req.amountWt} WT
                </button>
                <button
                  type="button"
                  className="button secondary small"
                  style={{ color: "#94a3b8" }}
                  onClick={() => handleDismissPix(req.id)}
                >
                  Descartar
                </button>
              </div>
            </div>
          ))}

          {/* Banner Recargas Generales */}
          {pendingDeposits.map((dep) => (
            <div
              key={dep.id}
              style={{
                background: "linear-gradient(135deg, rgba(94, 234, 255, 0.1) 0%, rgba(6, 16, 32, 0.95) 100%)",
                border: "1px solid rgba(94, 234, 255, 0.35)",
                borderRadius: "10px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ color: "#5eeaff", fontSize: "14px" }}>
                    Recarga de {dep.amountWt} WT vía {dep.method}
                  </strong>
                  {dep.userDiscord && (
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>@{dep.userDiscord}</span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#f1f5f9", marginTop: "3px" }}>
                  Titular / Cuenta emisora informada: <strong style={{ color: "#fef08a" }}>{dep.receiptCode}</strong>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="button primary small"
                  onClick={() => handleApproveDeposit(dep)}
                >
                  ✓ Acreditar {dep.amountWt} WT
                </button>
                <button
                  type="button"
                  className="button secondary small"
                  style={{ color: "#94a3b8" }}
                  onClick={() => handleDismissDeposit(dep.id)}
                >
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <label style={{ margin: 0, fontWeight: 700, color: "#f8fafc", fontSize: "14px" }}>
                      1. Buscar Jugador Destinatario
                    </label>
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      Escribe el nombre de usuario, @discord o nick de Epic Games
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => setIsRegisterModalOpen(true)}
                    style={{ fontSize: "12px", padding: "5px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <UserCheck size={14} />
                    <span>+ Registrar Nuevo Jugador</span>
                  </button>
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
                      {users.length <= 1 && !userSearchText.trim() && (
                        <div style={{ padding: "12px 14px", background: "rgba(56, 189, 248, 0.08)", borderBottom: "1px solid #1e3a5f", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.4" }}>
                          💡 <strong style={{ color: "#38bdf8" }}>Solo apareces tú porque se eliminaron las cuentas demo de prueba.</strong>
                          <div style={{ marginTop: "4px", color: "#94a3b8" }}>
                            Los nuevos jugadores aparecerán aquí automáticamente al iniciar sesión en la web, o puedes dar de alta a cualquiera ahora mismo con el botón <strong>+ Registrar Nuevo Jugador</strong> de arriba.
                          </div>
                        </div>
                      )}
                      <div className="dropdown-hint">
                        {userSearchText.trim()
                          ? `Coincidencias (${searchMatches.length})`
                          : `Jugadores registrados (${users.length}):`}
                      </div>
                      {userSearchText.trim() && (
                        <div
                          style={{
                            padding: "10px 14px",
                            borderBottom: "1px solid #1e3a5f",
                            background: "rgba(94, 234, 255, 0.08)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                          onClick={() => {
                            const created = registerNewUser(userSearchText.trim());
                            reloadAll();
                            setSelectedUserId(created.id);
                            setUserSearchText("");
                            setIsDropdownOpen(false);
                            setFeedback({
                              text: `¡Jugador ${created.display_name} registrado y seleccionado! Ya puedes acreditarle WTokens.`,
                              error: false,
                            });
                          }}
                        >
                          <div>
                            <span style={{ color: "#5eeaff", fontWeight: 700, fontSize: "13px" }}>
                              + Registrar "{userSearchText.trim()}" como nuevo jugador
                            </span>
                            <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                              Crear cuenta en el sistema para poder acreditarle saldo inmediatamente
                            </div>
                          </div>
                          <span className="button primary small" style={{ fontSize: "11px", padding: "4px 8px" }}>
                            Registrar
                          </span>
                        </div>
                      )}
                      {searchMatches.length === 0 ? (
                        <div className="search-empty-state">
                          No se encontró ningún jugador registrado con "{userSearchText}". Haz clic arriba para registrarlo.
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
                                {u.role === "owner" ? (
                                  <span className="badge-owner-tag">👑 OWNER</span>
                                ) : u.role === "admin" ? (
                                  <span className="badge-admin-tag">ADMIN</span>
                                ) : null}
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
                        {targetUser.role === "owner" ? (
                          <span className="badge-owner-tag">👑 OWNER</span>
                        ) : targetUser.role === "admin" ? (
                          <span className="badge-admin-tag">ADMIN</span>
                        ) : null}
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
                        {targetUser.role === "owner" ? "👑 OWNER" : targetUser.role === "admin" ? "ADMIN" : "JUGADOR"}
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
                  <div>
                    <span>Saldo en arbitraje (disputa):</span>
                    <strong style={{ color: (targetUser.balance_disputed_wt || 0) > 0 ? "#fbbf24" : undefined }}>
                      {(targetUser.balance_disputed_wt || 0).toFixed(2)} WT
                    </strong>
                  </div>
                </div>

                <div className="quick-account-actions">
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
                  setRoleFilter(e.target.value as "all" | "owner" | "admin" | "user")
                }
              >
                <option value="all">Todos los roles</option>
                <option value="owner">Solo Owners 👑</option>
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

              <button
                type="button"
                className="button primary small"
                onClick={() => setIsRegisterModalOpen((prev) => !prev)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}
              >
                <UserCheck size={15} />
                <span>+ Registrar Nuevo Jugador</span>
              </button>
            </div>
          </div>

          {/* Modal / Formulario para registrar nuevo jugador */}
          {isRegisterModalOpen && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(14, 28, 48, 0.98) 0%, rgba(6, 16, 32, 0.98) 100%)",
                border: "1px solid #38bdf8",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserCheck size={18} className="text-gold" />
                  Registrar Nuevo Jugador en el Sistema
                </h4>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNewUser} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    Nombre / Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. K1ng_Fortnite"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "#0a1320", border: "1px solid #1e3a5f", color: "#f8fafc" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    Nickname de Epic Games / Fortnite
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. K1ng_FN"
                    value={newUserEpic}
                    onChange={(e) => setNewUserEpic(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "#0a1320", border: "1px solid #1e3a5f", color: "#f8fafc" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    Discord Tag (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. usuario#1234"
                    value={newUserDiscord}
                    onChange={(e) => setNewUserDiscord(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "#0a1320", border: "1px solid #1e3a5f", color: "#f8fafc" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    País
                  </label>
                  <select
                    value={newUserCountry}
                    onChange={(e) => setNewUserCountry(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "#0a1320", border: "1px solid #1e3a5f", color: "#f8fafc" }}
                  >
                    <option value="PE">🇵🇪 Perú (PEN)</option>
                    <option value="AR">🇦🇷 Argentina (ARS)</option>
                    <option value="BR">🇧🇷 Brasil (BRL)</option>
                    <option value="CL">🇨🇱 Chile (CLP)</option>
                    <option value="UY">🇺🇾 Uruguay (UYU)</option>
                    <option value="PY">🇵🇾 Paraguay (PYG)</option>
                    <option value="BO">🇧🇴 Bolivia (BOB)</option>
                    <option value="US">🇺🇸 Estados Unidos / Intl (USD)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#cbd5e1", display: "block", marginBottom: "4px" }}>
                    Saldo Inicial WTokens (WT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newUserInitialBalance}
                    onChange={(e) => setNewUserInitialBalance(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "#0a1320", border: "1px solid #1e3a5f", color: "#f8fafc" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end", gap: "10px" }}>
                  <button type="submit" className="button primary full" style={{ height: "38px" }}>
                    Guardar y Registrar
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setIsRegisterModalOpen(false)}
                    style={{ height: "38px" }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario / Identidad</th>
                  <th>Epic Games</th>
                  <th>Rol</th>
                  <th>Rango Afiliado</th>
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
                        {u.role === "owner" || isOwnerUser(u) ? (
                          <>
                            <Crown size={12} style={{ color: "#ffd700" }} />
                            OWNER
                          </>
                        ) : u.role === "admin" ? (
                          <>
                            <ShieldCheck size={12} />
                            ADMIN
                          </>
                        ) : (
                          "JUGADOR"
                        )}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`tier-pill ${u.affiliate_tier || "standard"}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          background:
                            u.affiliate_tier === "partner"
                              ? "rgba(94, 234, 255, 0.15)"
                              : u.affiliate_tier === "verified"
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(100, 116, 139, 0.15)",
                          border:
                            u.affiliate_tier === "partner"
                              ? "1px solid rgba(94, 234, 255, 0.4)"
                              : u.affiliate_tier === "verified"
                                ? "1px solid rgba(16, 185, 129, 0.4)"
                                : "1px solid rgba(100, 116, 139, 0.3)",
                          color:
                            u.affiliate_tier === "partner"
                              ? "#5eeaff"
                              : u.affiliate_tier === "verified"
                                ? "#34d399"
                                : "#94a3b8",
                        }}
                        onClick={() => handleOpenAffiliateModal(u)}
                        title="Haz clic para cambiar el nivel de afiliado de este usuario"
                      >
                        {u.affiliate_tier === "partner" ? (
                          <>👑 Partner ({Math.round((u.affiliate_rate || 0.2) * 100)}%)</>
                        ) : u.affiliate_tier === "verified" ? (
                          <>🥈 Verificado (15%)</>
                        ) : (
                          <>🥉 Estándar (10%)</>
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
                        {(u.balance_disputed_wt || 0) > 0 && (
                          <small style={{ color: "#fbbf24" }}>
                            +{(u.balance_disputed_wt || 0).toFixed(2)} en disputa
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
                          className="action-btn affiliate"
                          title="Gestionar Rango de Afiliado (Partner Grande 20% / Verificado 15% / Estándar 10%)"
                          onClick={() => handleOpenAffiliateModal(u)}
                          style={{
                            background: u.affiliate_tier === "partner" ? "rgba(94, 234, 255, 0.15)" : undefined,
                            borderColor: u.affiliate_tier === "partner" ? "#5eeaff" : undefined,
                            color: u.affiliate_tier === "partner" ? "#5eeaff" : undefined,
                          }}
                        >
                          <Sparkles size={14} />
                          <span>
                            {u.affiliate_tier === "partner"
                              ? "Partner (20%)"
                              : u.affiliate_tier === "verified"
                                ? "Verificado"
                                : "Rango Afiliado"}
                          </span>
                        </button>
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
                        {u.role === "owner" || isOwnerUser(u) ? (
                          <span
                            className="owner-locked-pill"
                            title="El Owner es la máxima autoridad del sistema y es inmune a degradaciones o sanciones"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: "rgba(234, 179, 8, 0.15)",
                              border: "1px solid rgba(234, 179, 8, 0.4)",
                              color: "#fde047",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "default",
                            }}
                          >
                            <Crown size={13} style={{ color: "#fde047" }} />
                            👑 Inmune
                          </span>
                        ) : (
                          <>
                            <button
                              className="action-btn role"
                              title={
                                !isViewerOwner && u.role === "admin"
                                  ? "Solo el Owner puede degradar a otro Administrador"
                                  : u.role === "admin"
                                    ? "Degradar a Jugador"
                                    : "Promover a Administrador"
                              }
                              disabled={!isViewerOwner && u.role === "admin"}
                              onClick={() => handleToggleRole(u.id)}
                              style={
                                !isViewerOwner && u.role === "admin"
                                  ? { opacity: 0.5, cursor: "not-allowed" }
                                  : undefined
                              }
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
                          </>
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

      {/* Modal para Asignar Tier de Afiliado (Partner Grande / Verificado / Estándar) */}
      {affiliateModalUser && (
        <div
          className="admin-modal-overlay"
          onClick={() => setAffiliateModalUser(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={20} color="#5eeaff" />
                <h3 style={{ margin: 0, fontSize: "18px", color: "#f8fafc" }}>
                  Asignar Rango de Afiliado
                </h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setAffiliateModalUser(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: "#1e293b",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <img
                src={
                  affiliateModalUser.avatar_url ||
                  "https://cdn.discordapp.com/embed/avatars/0.png"
                }
                alt=""
                style={{ width: "40px", height: "40px", borderRadius: "50%" }}
              />
              <div>
                <strong style={{ color: "#fff", display: "block" }}>
                  {affiliateModalUser.display_name}
                </strong>
                <small style={{ color: "#94a3b8" }}>
                  {affiliateModalUser.discord_tag}
                </small>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#cbd5e1", marginBottom: "14px" }}>
              Selecciona el nivel de comisiones que recibirá este usuario cuando
              sus referidos jueguen en WTokens:
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border:
                    selectedTier === "partner"
                      ? "2px solid #5eeaff"
                      : "1px solid #334155",
                  background:
                    selectedTier === "partner"
                      ? "rgba(94, 234, 255, 0.12)"
                      : "#131d2e",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedTier("partner");
                  setCustomTierRate("20");
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#5eeaff",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>👑</span> 3. Partner Grande
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Para organizaciones (como 7rx), clanes y creadores top
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{ fontSize: "16px", fontWeight: 800, color: "#5eeaff" }}
                  >
                    20%
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border:
                    selectedTier === "verified"
                      ? "2px solid #10b981"
                      : "1px solid #334155",
                  background:
                    selectedTier === "verified"
                      ? "rgba(16, 185, 129, 0.12)"
                      : "#131d2e",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedTier("verified");
                  setCustomTierRate("15");
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#34d399" }}>
                    🥈 2. Creador Verificado
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Para streamers y creadores de contenido
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{ fontSize: "16px", fontWeight: 800, color: "#34d399" }}
                  >
                    15%
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border:
                    selectedTier === "standard"
                      ? "2px solid #94a3b8"
                      : "1px solid #334155",
                  background:
                    selectedTier === "standard"
                      ? "rgba(148, 163, 184, 0.12)"
                      : "#131d2e",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setSelectedTier("standard");
                  setCustomTierRate("10");
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#cbd5e1" }}>
                    🥉 1. Afiliado Normal
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Nivel base para cualquier jugador
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{ fontSize: "16px", fontWeight: 800, color: "#cbd5e1" }}
                  >
                    10%
                  </span>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Porcentaje de comisión personalizado (%):
              </label>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={customTierRate}
                onChange={(e) => setCustomTierRate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: "#fff",
                  fontWeight: 700,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="button secondary"
                onClick={() => setAffiliateModalUser(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleSaveAffiliateTier}
                style={{
                  background: "linear-gradient(135deg, #0284c7, #06b6d4)",
                  fontWeight: 700,
                }}
              >
                ✅ Guardar Rango ({customTierRate}%)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
