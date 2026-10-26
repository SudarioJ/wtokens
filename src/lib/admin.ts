// WTokens Administrator & Token Management Engine
// Manages isolated user accounts, WToken credit/debit operations,
// user roles, account suspensions, withdrawal approvals, and live audit logs.

export interface ManagedUser {
  id: string;
  display_name: string;
  epic_nickname: string;
  discord_tag: string;
  avatar_url?: string | undefined;
  role: "admin" | "user";
  eligible: boolean;
  suspended: boolean;
  country: string;
  country_name: string;
  preferred_currency: string;
  referrer_code?: string | undefined;
  balance_wt: number;
  balance_reserved_wt: number;
  created_at: string;
  last_active: string;
}

export interface TokenCreditRecord {
  id: string;
  admin_id: string;
  admin_name: string;
  target_user_id: string;
  target_user_name: string;
  amount: number;
  reason: string;
  note?: string | undefined;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_name: string;
  amount_wt: number;
  local_currency: string;
  local_amount: number;
  method: string;
  destination: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at?: string | undefined;
  resolved_by?: string | undefined;
  admin_note?: string | undefined;
}

const STORAGE_USERS = "wtokens_managed_users_v2";
const STORAGE_AUDIT = "wtokens_admin_audit_log_v2";
const STORAGE_WITHDRAWALS = "wtokens_withdrawal_requests_v2";
const STORAGE_ACTIVE_USER_ID = "wtokens_active_user_id_v2";

const DEFAULT_USERS: ManagedUser[] = [
  {
    id: "a1a1a1a1-1111-4111-8111-111111111111",
    display_name: "Admin_WTokens",
    epic_nickname: "WTokens_Admin",
    discord_tag: "Admin#0001",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
    role: "admin",
    eligible: true,
    suspended: false,
    country: "PE",
    country_name: "Perú",
    preferred_currency: "PEN",
    balance_wt: 2500.0,
    balance_reserved_wt: 0.0,
    created_at: "2026-09-01T12:00:00Z",
    last_active: "Ahora",
  },
  {
    id: "b2b2b2b2-2222-4222-8222-222222222222",
    display_name: "Staff_Arbitro",
    epic_nickname: "Staff_Arbitro",
    discord_tag: "StaffArbitro#1234",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/1.png",
    role: "admin",
    eligible: true,
    suspended: false,
    country: "AR",
    country_name: "Argentina",
    preferred_currency: "ARS",
    balance_wt: 750.0,
    balance_reserved_wt: 0.0,
    created_at: "2026-09-10T15:30:00Z",
    last_active: "Hace 10 min",
  },
  {
    id: "c3c3c3c3-3333-4333-8333-333333333333",
    display_name: "K1ng_Fortnite",
    epic_nickname: "K1ng_FN",
    discord_tag: "K1ng#7777",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/2.png",
    role: "user",
    eligible: true,
    suspended: false,
    country: "AR",
    country_name: "Argentina",
    preferred_currency: "ARS",
    balance_wt: 120.0,
    balance_reserved_wt: 10.0,
    created_at: "2026-09-15T18:20:00Z",
    last_active: "Hace 5 min",
  },
  {
    id: "d4d4d4d4-4444-4444-8444-444444444444",
    display_name: "Vortex_BR",
    epic_nickname: "Vortex_BR",
    discord_tag: "Vortex#9999",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/3.png",
    role: "user",
    eligible: true,
    suspended: false,
    country: "CL",
    country_name: "Chile",
    preferred_currency: "CLP",
    balance_wt: 45.0,
    balance_reserved_wt: 0.0,
    created_at: "2026-09-20T21:00:00Z",
    last_active: "Hace 1 hora",
  },
  {
    id: "e5e5e5e5-5555-4555-8555-555555555555",
    display_name: "Savage_Aim",
    epic_nickname: "Savage_Aim",
    discord_tag: "Savage#4321",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/4.png",
    role: "user",
    eligible: true,
    suspended: false,
    country: "PE",
    country_name: "Perú",
    preferred_currency: "PEN",
    balance_wt: 35.0,
    balance_reserved_wt: 5.0,
    created_at: "2026-10-01T14:10:00Z",
    last_active: "Hace 2 horas",
  },
  {
    id: "f6f6f6f6-6666-4666-8666-666666666666",
    display_name: "Shadow_Sniper",
    epic_nickname: "Shadow_Sniper",
    discord_tag: "Shadow#5555",
    avatar_url: "https://cdn.discordapp.com/embed/avatars/5.png",
    role: "user",
    eligible: false,
    suspended: true,
    country: "UY",
    country_name: "Uruguay",
    preferred_currency: "UYU",
    balance_wt: 0.0,
    balance_reserved_wt: 0.0,
    created_at: "2026-10-05T09:45:00Z",
    last_active: "Hace 3 días (Suspendido)",
  },
];

const DEFAULT_AUDIT: TokenCreditRecord[] = [
  {
    id: "aud-001",
    admin_id: "a1a1a1a1-1111-4111-8111-111111111111",
    admin_name: "Admin_WTokens",
    target_user_id: "c3c3c3c3-3333-4333-8333-333333333333",
    target_user_name: "K1ng_Fortnite",
    amount: 100.0,
    reason: "Premio de torneo semanal Box Fight 1v1",
    note: "Final de temporada disputada el 20/10",
    created_at: "2026-10-21T19:30:00Z",
  },
  {
    id: "aud-002",
    admin_id: "b2b2b2b2-2222-4222-8222-222222222222",
    admin_name: "Staff_Arbitro",
    target_user_id: "d4d4d4d4-4444-4444-8444-444444444444",
    target_user_name: "Vortex_BR",
    amount: 25.0,
    reason: "Resolución de disputa #D-4091 a favor del jugador",
    note: "Evidencia de desconexión del oponente validada",
    created_at: "2026-10-22T14:15:00Z",
  },
  {
    id: "aud-003",
    admin_id: "a1a1a1a1-1111-4111-8111-111111111111",
    admin_name: "Admin_WTokens",
    target_user_id: "e5e5e5e5-5555-4555-8555-555555555555",
    target_user_name: "Savage_Aim",
    amount: 35.0,
    reason: "Depósito de WTokens verificado (Yape)",
    note: "Comprobante #YP-849204 validado",
    created_at: "2026-10-22T22:00:00Z",
  },
];

const DEFAULT_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: "wth-101",
    user_id: "c3c3c3c3-3333-4333-8333-333333333333",
    user_name: "K1ng_Fortnite",
    amount_wt: 50.0,
    local_currency: "ARS",
    local_amount: 58500,
    method: "Mercado Pago",
    destination: "CVU: 0000003100049281729482 (alias: king.mp)",
    status: "pending",
    created_at: "2026-10-23T14:20:00Z",
  },
  {
    id: "wth-102",
    user_id: "d4d4d4d4-4444-4444-8444-444444444444",
    user_name: "Vortex_BR",
    amount_wt: 20.0,
    local_currency: "CLP",
    local_amount: 19600,
    method: "CuentaRUT / BancoEstado",
    destination: "RUT: 19.823.441-2, Cta: 19823441",
    status: "pending",
    created_at: "2026-10-23T15:10:00Z",
  },
  {
    id: "wth-103",
    user_id: "e5e5e5e5-5555-4555-8555-555555555555",
    user_name: "Savage_Aim",
    amount_wt: 10.0,
    local_currency: "PEN",
    local_amount: 38.0,
    method: "Yape",
    destination: "Tel: +51 984 122 391",
    status: "approved",
    created_at: "2026-10-22T10:00:00Z",
    resolved_at: "2026-10-22T11:30:00Z",
    resolved_by: "Admin_WTokens",
    admin_note: "Transferido exitosamente vía Yape",
  },
];

function notifyStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wtokens-admin-sync"));
  }
}

export function getManagedUsers(): ManagedUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fallback to defaults */
  }
  saveManagedUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}

export function saveManagedUsers(users: ManagedUser[]): void {
  try {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    notifyStorageChange();
  } catch {
    /* ignore write errors */
  }
}

export function getAuditLog(): TokenCreditRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fallback to defaults */
  }
  saveAuditLog(DEFAULT_AUDIT);
  return DEFAULT_AUDIT;
}

export function saveAuditLog(logs: TokenCreditRecord[]): void {
  try {
    localStorage.setItem(STORAGE_AUDIT, JSON.stringify(logs));
    notifyStorageChange();
  } catch {
    /* ignore write errors */
  }
}

export function getWithdrawalRequests(): WithdrawalRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_WITHDRAWALS);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fallback to defaults */
  }
  saveWithdrawalRequests(DEFAULT_WITHDRAWALS);
  return DEFAULT_WITHDRAWALS;
}

export function saveWithdrawalRequests(requests: WithdrawalRequest[]): void {
  try {
    localStorage.setItem(STORAGE_WITHDRAWALS, JSON.stringify(requests));
    notifyStorageChange();
  } catch {
    /* ignore write errors */
  }
}

export function getActiveUserId(): string {
  try {
    const active = localStorage.getItem(STORAGE_ACTIVE_USER_ID);
    if (active) return active;
  } catch {
    /* fallback */
  }
  return DEFAULT_USERS[0]?.id ?? "a1a1a1a1-1111-4111-8111-111111111111";
}

export function setActiveUserId(userId: string): void {
  try {
    localStorage.setItem(STORAGE_ACTIVE_USER_ID, userId);
    notifyStorageChange();
  } catch {
    /* ignore */
  }
}

export function getActiveManagedUser(): ManagedUser {
  const users = getManagedUsers();
  const activeId = getActiveUserId();
  return users.find((u) => u.id === activeId) ?? users[0] ?? DEFAULT_USERS[0]!;
}

// Token Operation: Add or adjust WTokens for a user
export function creditUserTokens(
  adminId: string,
  adminName: string,
  targetUserId: string,
  amount: number,
  reason: string,
  note?: string,
): { success: boolean; newBalance: number; message: string } {
  if (amount === 0 || isNaN(amount)) {
    return {
      success: false,
      newBalance: 0,
      message: "El monto debe ser distinto de 0.",
    };
  }

  const users = getManagedUsers();
  const user = users.find((u) => u.id === targetUserId);
  if (!user) {
    return { success: false, newBalance: 0, message: "Usuario no encontrado." };
  }

  const calculated = Number((user.balance_wt + amount).toFixed(2));
  if (calculated < 0) {
    return {
      success: false,
      newBalance: user.balance_wt,
      message: `El ajuste dejaría el saldo en negativo (${calculated} WT). Operación denegada.`,
    };
  }

  user.balance_wt = calculated;
  saveManagedUsers(users);

  // Add to audit log
  const audit = getAuditLog();
  const record: TokenCreditRecord = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: adminId,
    admin_name: adminName,
    target_user_id: user.id,
    target_user_name: user.display_name,
    amount,
    reason: reason.trim() || "Ajuste manual de administrador",
    note: note?.trim(),
    created_at: new Date().toISOString(),
  };
  audit.unshift(record);
  saveAuditLog(audit);

  return {
    success: true,
    newBalance: user.balance_wt,
    message: `${amount > 0 ? "Acreditados" : "Descontados"} ${Math.abs(amount).toFixed(2)} WT a ${user.display_name}. Nuevo saldo: ${user.balance_wt.toFixed(2)} WT.`,
  };
}

// User Management: Toggle Admin / User role
export function toggleUserRole(
  adminName: string,
  userId: string,
): { success: boolean; newRole: "admin" | "user" } {
  const users = getManagedUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false, newRole: "user" };

  user.role = user.role === "admin" ? "user" : "admin";
  saveManagedUsers(users);

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: adminName,
    target_user_id: user.id,
    target_user_name: user.display_name,
    amount: 0,
    reason: `Cambio de rol a ${user.role.toUpperCase()}`,
    note: `Permisos de administrador ${user.role === "admin" ? "otorgados" : "revocados"}`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return { success: true, newRole: user.role };
}

// User Management: Toggle Suspension
export function toggleUserSuspension(
  adminName: string,
  userId: string,
  reason?: string,
): { success: boolean; suspended: boolean } {
  const users = getManagedUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false, suspended: false };

  user.suspended = !user.suspended;
  if (user.suspended) {
    user.eligible = false;
  }
  saveManagedUsers(users);

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: adminName,
    target_user_id: user.id,
    target_user_name: user.display_name,
    amount: 0,
    reason: user.suspended ? "Suspensión de cuenta" : "Reactivación de cuenta",
    note:
      reason ||
      (user.suspended
        ? "Violación de términos o investigación"
        : "Cuenta habilitada por moderación"),
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return { success: true, suspended: user.suspended };
}

// Treasury: Approve withdrawal request
export function approveWithdrawal(
  adminName: string,
  requestId: string,
  note?: string,
): { success: boolean; message: string } {
  const requests = getWithdrawalRequests();
  const req = requests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") {
    return {
      success: false,
      message: "Solicitud no encontrada o ya procesada.",
    };
  }

  req.status = "approved";
  req.resolved_at = new Date().toISOString();
  req.resolved_by = adminName;
  req.admin_note = note || "Aprobado y transferido al método solicitado";
  saveWithdrawalRequests(requests);

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: adminName,
    target_user_id: req.user_id,
    target_user_name: req.user_name,
    amount: -req.amount_wt,
    reason: `Retiro procesado (${req.method} - ${req.destination})`,
    note: req.admin_note,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    message: `Retiro de ${req.amount_wt.toFixed(2)} WT aprobado con éxito.`,
  };
}

// Treasury: Reject withdrawal request and refund tokens to user
export function rejectWithdrawal(
  adminName: string,
  requestId: string,
  reason: string,
): { success: boolean; message: string } {
  const requests = getWithdrawalRequests();
  const req = requests.find((r) => r.id === requestId);
  if (!req || req.status !== "pending") {
    return {
      success: false,
      message: "Solicitud no encontrada o ya procesada.",
    };
  }

  req.status = "rejected";
  req.resolved_at = new Date().toISOString();
  req.resolved_by = adminName;
  req.admin_note = reason || "Datos de pago inválidos o solicitud rechazada";
  saveWithdrawalRequests(requests);

  // Refund tokens back to user's available balance
  const users = getManagedUsers();
  const user = users.find((u) => u.id === req.user_id);
  if (user) {
    user.balance_wt = Number((user.balance_wt + req.amount_wt).toFixed(2));
    saveManagedUsers(users);
  }

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: adminName,
    target_user_id: req.user_id,
    target_user_name: req.user_name,
    amount: req.amount_wt,
    reason: `Reembolso por retiro rechazado (${reason})`,
    note: `Fondos reintegrados al saldo disponible del usuario`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    message: `Retiro rechazado. Se reembolsaron ${req.amount_wt.toFixed(2)} WT a la cuenta de ${req.user_name}.`,
  };
}
