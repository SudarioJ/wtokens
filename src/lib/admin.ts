// WTokens Administrator & Token Management Engine
// Manages isolated user accounts, WToken credit/debit operations,
// user roles, account suspensions, withdrawal approvals, and live audit logs.

export interface ManagedUser {
  id: string;
  display_name: string;
  epic_nickname: string;
  epic_verified?: boolean;
  epic_account_id?: string;
  discord_tag: string;
  avatar_url?: string | undefined;
  role: "owner" | "admin" | "user";
  eligible: boolean;
  suspended: boolean;
  country: string;
  country_name: string;
  preferred_currency: string;
  referrer_code?: string | undefined;
  custom_affiliate_code?: string | undefined;
  affiliate_tier?: "standard" | "verified" | "partner" | undefined;
  affiliate_rate?: number | undefined;
  balance_wt: number;
  balance_reserved_wt: number;
  balance_disputed_wt: number;
  created_at: string;
  last_active: string;
}

export const OWNER_USERNAMES = new Set([
  "gustavo13137",
  "gustavo",
  "sudario",
  "sudarioj",
]);

export const OWNER_IDS = new Set([
  "746124644553064568", // Discord Server Owner ID
]);

export function isOwnerUser(user?: {
  id?: string | undefined;
  display_name?: string | undefined;
  discord_tag?: string | undefined;
  role?: string | undefined;
} | null): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  if (user.id && OWNER_IDS.has(user.id)) return true;
  const name = (user.display_name || "").toLowerCase().trim();
  const discord = (user.discord_tag || "").toLowerCase().trim();
  for (const ownerName of OWNER_USERNAMES) {
    if (name === ownerName || discord === ownerName || discord.startsWith(ownerName + "#")) return true;
  }
  return false;
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

const DEMO_USER_IDS = new Set([
  "a1a1a1a1-1111-4111-8111-111111111111",
  "b2b2b2b2-2222-4222-8222-222222222222",
  "c3c3c3c3-3333-4333-8333-333333333333",
  "d4d4d4d4-4444-4444-8444-444444444444",
  "e5e5e5e5-5555-4555-8555-555555555555",
  "f6f6f6f6-6666-4666-8666-666666666666",
]);

const DEFAULT_USERS: ManagedUser[] = [];
const DEFAULT_AUDIT: TokenCreditRecord[] = [];
const DEFAULT_WITHDRAWALS: WithdrawalRequest[] = [];

function notifyStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wtokens-admin-sync"));
  }
}

export interface EsportsPartnerPreset {
  id: string;
  name: string;
  code: string;
  rate: number;
}

export const DEFAULT_ESPORTS_PARTNERS: EsportsPartnerPreset[] = [
  { id: "partner_7rx", name: "7rx Team", code: "7RX", rate: 0.20 },
  { id: "partner_lexcorp", name: "Lexcorp", code: "LEXCORP", rate: 0.20 },
  { id: "partner_bld", name: "Bld Team", code: "BLD", rate: 0.20 },
];

export function ensureDefaultEsportsPartners(users: ManagedUser[]): boolean {
  let changed = false;
  for (const preset of DEFAULT_ESPORTS_PARTNERS) {
    const exists = users.find(
      (u) =>
        (u.custom_affiliate_code && u.custom_affiliate_code.toUpperCase() === preset.code) ||
        u.display_name.toUpperCase() === preset.name.toUpperCase(),
    );
    if (!exists) {
      users.push({
        id: preset.id,
        display_name: preset.name,
        epic_nickname: "",
        epic_verified: false,
        discord_tag: `${preset.name}#0000`,
        role: "user",
        eligible: true,
        suspended: false,
        country: "PE",
        country_name: "Perú",
        preferred_currency: "PEN",
        balance_wt: 0,
        balance_reserved_wt: 0,
        balance_disputed_wt: 0,
        affiliate_tier: "partner",
        affiliate_rate: preset.rate,
        custom_affiliate_code: preset.code,
        created_at: new Date().toISOString(),
        last_active: "Partner Oficial Esports",
      });
      changed = true;
    } else {
      if (!exists.custom_affiliate_code) {
        exists.custom_affiliate_code = preset.code;
        changed = true;
      }
      if (exists.affiliate_tier !== "partner") {
        exists.affiliate_tier = "partner";
        exists.affiliate_rate = preset.rate;
        changed = true;
      }
    }
  }
  return changed;
}

export function getManagedUsers(): ManagedUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (raw) {
      const parsed: ManagedUser[] = JSON.parse(raw);
      const cleaned = parsed
        .filter((u) => !DEMO_USER_IDS.has(u.id))
        .map((u) => {
          const isFakeEpic = Boolean(u.epic_nickname && u.epic_nickname === u.display_name);
          const isOwner = isOwnerUser(u);
          return {
            ...u,
            role: isOwner ? ("owner" as const) : u.role || "user",
            epic_nickname: isFakeEpic ? "" : (u.epic_nickname || ""),
            epic_verified: isFakeEpic ? false : Boolean(u.epic_verified && u.epic_nickname),
            balance_reserved_wt: u.balance_reserved_wt || 0,
            balance_disputed_wt: u.balance_disputed_wt || 0,
            affiliate_tier: u.affiliate_tier || "standard",
            affiliate_rate: u.affiliate_rate || (u.affiliate_tier === "partner" ? 0.20 : u.affiliate_tier === "verified" ? 0.15 : 0.10),
          };
        });
      const esportsAdded = ensureDefaultEsportsPartners(cleaned);
      if (cleaned.length !== parsed.length || esportsAdded) {
        saveManagedUsers(cleaned);
      }
      return cleaned;
    }
  } catch {
    /* fallback to defaults */
  }
  const defaults = [...DEFAULT_USERS];
  ensureDefaultEsportsPartners(defaults);
  return defaults;
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
    if (raw) {
      const parsed: TokenCreditRecord[] = JSON.parse(raw);
      const cleaned = parsed.filter(
        (a) => !DEMO_USER_IDS.has(a.target_user_id) && !a.id.startsWith("aud-0"),
      );
      if (cleaned.length !== parsed.length) {
        saveAuditLog(cleaned);
      }
      return cleaned;
    }
  } catch {
    /* fallback to defaults */
  }
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
    if (raw) {
      const parsed: WithdrawalRequest[] = JSON.parse(raw);
      const cleaned = parsed.filter(
        (w) => !DEMO_USER_IDS.has(w.user_id) && !w.id.startsWith("wth-10"),
      );
      if (cleaned.length !== parsed.length) {
        saveWithdrawalRequests(cleaned);
      }
      return cleaned;
    }
  } catch {
    /* fallback to defaults */
  }
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
    if (active && !DEMO_USER_IDS.has(active)) return active;
  } catch {
    /* fallback */
  }
  return "";
}

export function setActiveUserId(userId: string): void {
  try {
    localStorage.setItem(STORAGE_ACTIVE_USER_ID, userId);
  } catch {
    /* ignore */
  }
}

export function registerNewUser(
  name: string,
  discordTag = "",
  epicNick = "",
  country = "PE",
  initialBalance = 0,
): ManagedUser {
  const users = getManagedUsers();
  const cleanName = name.trim();
  const cleanDiscord = discordTag.trim();
  const cleanEpic = epicNick.trim() || cleanName;

  // Check if user already exists
  let existing = users.find(
    (u) =>
      u.display_name.toLowerCase() === cleanName.toLowerCase() ||
      (cleanDiscord && u.discord_tag.toLowerCase() === cleanDiscord.toLowerCase()) ||
      (cleanEpic && u.epic_nickname.toLowerCase() === cleanEpic.toLowerCase()),
  );

  if (existing) {
    if (initialBalance > 0) {
      existing.balance_wt = Number((existing.balance_wt + initialBalance).toFixed(2));
    }
    saveManagedUsers(users);
    return existing;
  }

  const countryNames: Record<string, string> = {
    PE: "Perú",
    AR: "Argentina",
    BR: "Brasil",
    CL: "Chile",
    UY: "Uruguay",
    PY: "Paraguay",
    BO: "Bolivia",
    CO: "Colombia",
    MX: "México",
    US: "Estados Unidos",
  };

  const newUser: ManagedUser = {
    id: "usr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    display_name: cleanName,
    epic_nickname: cleanEpic,
    epic_verified: Boolean(cleanEpic),
    discord_tag: cleanDiscord || `${cleanName}#0000`,
    avatar_url: `https://cdn.discordapp.com/embed/avatars/${Math.floor(Math.random() * 5)}.png`,
    role: isOwnerUser({ display_name: cleanName, discord_tag: cleanDiscord }) ? "owner" : "user",
    eligible: true,
    suspended: false,
    country,
    country_name: countryNames[country] || "Internacional",
    preferred_currency:
      country === "AR"
        ? "ARS"
        : country === "BR"
          ? "BRL"
          : country === "CL"
            ? "CLP"
            : country === "PE"
              ? "PEN"
              : "USD",
    balance_wt: initialBalance > 0 ? Number(initialBalance.toFixed(2)) : 0,
    balance_reserved_wt: 0,
    balance_disputed_wt: 0,
    created_at: new Date().toISOString(),
    last_active: "Ahora",
  };

  users.unshift(newUser);
  saveManagedUsers(users);

  // Sync to API in background
  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_user",
        user: newUser,
      }),
    }).catch(() => {});
  }

  return newUser;
}

export function upsertManagedUserFromSession(sessionUser: any): ManagedUser | null {
  if (!sessionUser || !sessionUser.id) return null;
  const users = getManagedUsers();
  const existingIndex = users.findIndex((u) => u.id === sessionUser.id);

  if (existingIndex >= 0) {
    const existing = users[existingIndex]!;
    let changed = false;
    const hasValidEpic = Boolean(
      sessionUser.epic_nickname &&
      sessionUser.epic_nickname !== sessionUser.display_name &&
      sessionUser.epic_nickname !== existing.display_name,
    );
    if (hasValidEpic && existing.epic_nickname !== sessionUser.epic_nickname) {
      existing.epic_nickname = sessionUser.epic_nickname;
      existing.epic_verified = true;
      changed = true;
    }
    if (sessionUser.display_name && existing.display_name !== sessionUser.display_name) {
      existing.display_name = sessionUser.display_name;
      changed = true;
    }
    if (
      sessionUser.balance_wt !== undefined &&
      sessionUser.balance_wt > 0 &&
      sessionUser.balance_wt !== existing.balance_wt
    ) {
      existing.balance_wt = sessionUser.balance_wt;
      changed = true;
    }
    if (sessionUser.referrer_code && !existing.referrer_code) {
      existing.referrer_code = sessionUser.referrer_code;
      changed = true;
    }
    if (sessionUser.custom_affiliate_code && !existing.custom_affiliate_code) {
      existing.custom_affiliate_code = sessionUser.custom_affiliate_code;
      changed = true;
    }
    const isOwner = isOwnerUser(sessionUser) || isOwnerUser(existing);
    if (isOwner) {
      if (existing.role !== "owner") {
        existing.role = "owner";
        changed = true;
      }
      sessionUser.role = "owner";
      sessionUser.moderator = true;
    } else {
      if (sessionUser.role === "admin" && existing.role !== "admin") {
        existing.role = "admin";
        changed = true;
      }
      if (existing.role === "admin" && sessionUser.role !== "admin") {
        sessionUser.role = "admin";
        sessionUser.moderator = true;
      }
    }
    if (changed) {
      users[existingIndex] = existing;
      saveManagedUsers(users);
    }
    if (typeof fetch !== "undefined") {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register_user",
          user: existing,
        }),
      }).catch(() => {});
    }
    return existing;
  }

  const hasValidEpic = Boolean(
    sessionUser.epic_nickname &&
    sessionUser.epic_nickname !== sessionUser.display_name,
  );
  const newUser: ManagedUser = {
    id: sessionUser.id,
    display_name: sessionUser.display_name || sessionUser.discord_tag || "Jugador",
    epic_nickname: hasValidEpic ? sessionUser.epic_nickname : "",
    epic_verified: hasValidEpic && Boolean(sessionUser.epic_verified),
    epic_account_id: sessionUser.epic_account_id,
    discord_tag: sessionUser.discord_tag || `${sessionUser.display_name || "User"}#0000`,
    avatar_url: sessionUser.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png",
    role: isOwnerUser(sessionUser)
      ? "owner"
      : sessionUser.role === "admin"
        ? "admin"
        : "user",
    eligible: true,
    suspended: Boolean(sessionUser.suspended),
    country: sessionUser.country || "PE",
    country_name: sessionUser.country_name || "Perú",
    preferred_currency:
      sessionUser.country === "AR"
        ? "ARS"
        : sessionUser.country === "BR"
          ? "BRL"
          : "PEN",
    balance_wt: sessionUser.balance_wt ?? 0,
    balance_reserved_wt: sessionUser.balance_reserved_wt ?? 0,
    balance_disputed_wt: sessionUser.balance_disputed_wt ?? 0,
    referrer_code: sessionUser.referrer_code,
    custom_affiliate_code: sessionUser.custom_affiliate_code,
    affiliate_tier: sessionUser.affiliate_tier || "standard",
    affiliate_rate: sessionUser.affiliate_rate || 0.10,
    created_at: new Date().toISOString(),
    last_active: "Ahora",
  };

  users.unshift(newUser);
  saveManagedUsers(users);

  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_user",
        user: newUser,
      }),
    }).catch(() => {});
  }

  return newUser;
}

export async function syncWithServerRegistry(): Promise<ManagedUser[]> {
  try {
    if (typeof fetch === "undefined") return getManagedUsers();
    const res = await fetch("/api/sync");
    if (!res.ok) return getManagedUsers();
    const data = await res.json();
    if (data.success && Array.isArray(data.users)) {
      const currentUsers = getManagedUsers();
      const currentMap = new Map<string, ManagedUser>(currentUsers.map((u) => [u.id, u]));

      for (const remote of data.users) {
        const hasValidRemoteEpic = Boolean(
          remote.epic_nickname && remote.epic_nickname !== remote.display_name,
        );
        const remoteEpicNick = hasValidRemoteEpic ? remote.epic_nickname : "";
        if (!currentMap.has(remote.id)) {
          currentMap.set(remote.id, {
            id: remote.id,
            display_name: remote.display_name,
            epic_nickname: remoteEpicNick,
            epic_verified: hasValidRemoteEpic,
            discord_tag: remote.discord_tag || `${remote.display_name}#0000`,
            avatar_url: remote.avatar_url,
            role: isOwnerUser(remote) ? "owner" : (remote.role || "user"),
            eligible: true,
            suspended: false,
            country: remote.country || "PE",
            country_name: remote.country_name || "Perú",
            preferred_currency: "PEN",
            balance_wt: remote.balance_wt || 0,
            balance_reserved_wt: 0,
            balance_disputed_wt: 0,
            referrer_code: remote.referrer_code,
            custom_affiliate_code: remote.custom_affiliate_code,
            affiliate_tier: remote.affiliate_tier || "standard",
            affiliate_rate: remote.affiliate_rate || (remote.affiliate_tier === "partner" ? 0.20 : remote.affiliate_tier === "verified" ? 0.15 : 0.10),
            created_at: remote.created_at || new Date().toISOString(),
            last_active: remote.last_active || "Reciente",
          });
        } else {
          const local = currentMap.get(remote.id)!;
          if (isOwnerUser(local) || isOwnerUser(remote)) {
            local.role = "owner";
          } else if (remote.role) {
            local.role = remote.role;
          }
          if (local.epic_nickname === local.display_name) {
            local.epic_nickname = "";
            local.epic_verified = false;
          }
          if (hasValidRemoteEpic) {
            local.epic_nickname = remote.epic_nickname;
            local.epic_verified = true;
          }
          if (remote.discord_tag) local.discord_tag = remote.discord_tag;
          if (remote.display_name) local.display_name = remote.display_name;
          if (remote.balance_wt !== undefined && remote.balance_wt !== local.balance_wt) {
            local.balance_wt = remote.balance_wt;
          }
          if (remote.custom_affiliate_code) local.custom_affiliate_code = remote.custom_affiliate_code;
          if (remote.affiliate_tier) local.affiliate_tier = remote.affiliate_tier;
          if (remote.affiliate_rate !== undefined) local.affiliate_rate = remote.affiliate_rate;
          if (remote.referrer_code) local.referrer_code = remote.referrer_code;
        }
      }

      const merged = Array.from(currentMap.values());
      saveManagedUsers(merged);
      return merged;
    }
  } catch {}
  return getManagedUsers();
}

export function getActiveManagedUser(): ManagedUser | null {
  const users = getManagedUsers();
  const activeId = getActiveUserId();
  return users.find((u) => u.id === activeId) ?? users[0] ?? null;
}

export function unlinkUserEpic(userId: string): void {
  const users = getManagedUsers();
  const u = users.find((user) => user.id === userId);
  if (u) {
    u.epic_nickname = "";
    u.epic_verified = false;
    saveManagedUsers(users);
  }
  try {
    localStorage.removeItem("wtokens_epic_nick");
    localStorage.removeItem("wtokens_epic_verified");
    localStorage.removeItem("wtokens_epic_account_id");
  } catch {}
  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlink_epic", userId }),
    }).catch(() => {});
  }
}

export function deleteManagedUser(userId: string): { success: boolean; message?: string } {
  const users = getManagedUsers();
  const target = users.find((u) => u.id === userId);
  if (target && (isOwnerUser(target) || target.role === "owner")) {
    return { success: false, message: "No se puede eliminar la cuenta del Owner." };
  }
  const filtered = users.filter((u) => u.id !== userId);
  saveManagedUsers(filtered);
  try {
    localStorage.removeItem("wtokens_epic_nick");
    localStorage.removeItem("wtokens_epic_verified");
    localStorage.removeItem("wtokens_epic_account_id");
  } catch {}
  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_user", userId }),
    }).catch(() => {});
  }
  return { success: true };
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

  // Sync balance update to server registry
  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "credit_user",
        userId: targetUserId,
        userName: user.display_name,
        discordTag: user.discord_tag,
        epicNickname: user.epic_nickname,
        country: user.country,
        countryName: user.country_name,
        amount,
        finalBalance: user.balance_wt,
      }),
    }).catch(() => {});
  }

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
): { success: boolean; newRole: "owner" | "admin" | "user"; message?: string } {
  const users = getManagedUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false, newRole: "user", message: "Usuario no encontrado." };

  if (isOwnerUser(user) || user.role === "owner") {
    return {
      success: false,
      newRole: "owner",
      message: "Operación rechazada: El rol de Owner es supremo e inmutable.",
    };
  }

  const callerIsOwner = isOwnerUser({ display_name: adminName });
  if (user.role === "admin" && !callerIsOwner) {
    return {
      success: false,
      newRole: "admin",
      message: "Permiso denegado: Solo el Owner puede degradar a un Administrador.",
    };
  }

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

  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_user",
        user: {
          id: user.id,
          display_name: user.display_name,
          discord_tag: user.discord_tag,
          avatar_url: user.avatar_url,
          role: user.role,
        },
      }),
    }).catch(() => {});
  }

  return { success: true, newRole: user.role };
}

// User Management: Toggle Suspension
export function toggleUserSuspension(
  adminName: string,
  userId: string,
  reason?: string,
): { success: boolean; suspended: boolean; message?: string } {
  const users = getManagedUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false, suspended: false, message: "Usuario no encontrado." };

  if (isOwnerUser(user) || user.role === "owner") {
    return {
      success: false,
      suspended: false,
      message: "Operación rechazada: La cuenta del Owner no puede ser suspendida.",
    };
  }

  user.suspended = !user.suspended;
  if (user.suspended) {
    user.eligible = false;
  }
  saveManagedUsers(users);

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

// User Management: Set Affiliate Tier (Standard / Verified / Partner Grande) & Custom Code
export function setUserAffiliateTier(
  adminName: string,
  userId: string,
  tier: "standard" | "verified" | "partner",
  customRate?: number,
  customCode?: string,
): {
  success: boolean;
  tier: "standard" | "verified" | "partner";
  rate: number;
  customCode?: string | undefined;
  message: string;
} {
  const users = getManagedUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, tier: "standard", rate: 0.1, message: "Usuario no encontrado." };
  }

  const rate =
    customRate !== undefined && !isNaN(customRate) && customRate > 0
      ? customRate
      : tier === "partner"
        ? 0.20
        : tier === "verified"
          ? 0.15
          : 0.10;

  user.affiliate_tier = tier;
  user.affiliate_rate = rate;
  if (customCode !== undefined) {
    user.custom_affiliate_code = customCode.trim().toUpperCase() || undefined;
  }
  saveManagedUsers(users);

  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set_affiliate_tier",
        userId,
        tier,
        rate,
        customCode: user.custom_affiliate_code,
      }),
    }).catch(() => {});
  }

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: adminName,
    target_user_id: user.id,
    target_user_name: user.display_name,
    amount: 0,
    reason: `Nivel de Afiliado asignado: ${tier.toUpperCase()} (${Math.round(rate * 100)}%)`,
    note: `Nivel: ${tier === "partner" ? "Partner Grande (20%)" : tier === "verified" ? "Creador Verificado (15%)" : "Estándar (10%)"}${user.custom_affiliate_code ? ` | Código Vanity: ${user.custom_affiliate_code}` : ""}`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    tier,
    rate,
    customCode: user.custom_affiliate_code,
    message: `Nivel de afiliado de ${user.display_name} actualizado a ${tier === "partner" ? "Partner Grande" : tier === "verified" ? "Creador Verificado" : "Estándar"} (${Math.round(rate * 100)}%)${user.custom_affiliate_code ? ` con código '${user.custom_affiliate_code}'` : ""}.`,
  };
}

// User Management: Create or Update Esports Partner Team with Custom Vanity Code
export function createOrUpdateEsportsPartner(
  adminName: string,
  teamName: string,
  customCode: string,
  rate = 0.20,
): { success: boolean; partner: ManagedUser; message: string } {
  const users = getManagedUsers();
  const cleanCode = customCode.trim().toUpperCase();
  const cleanName = teamName.trim();

  let partner = users.find(
    (u) =>
      (u.custom_affiliate_code && u.custom_affiliate_code.toUpperCase() === cleanCode) ||
      u.display_name.toUpperCase() === cleanName.toUpperCase(),
  );

  if (partner) {
    partner.display_name = cleanName;
    partner.custom_affiliate_code = cleanCode;
    partner.affiliate_tier = "partner";
    partner.affiliate_rate = rate;
  } else {
    partner = {
      id: `partner_${cleanCode.toLowerCase()}_${Date.now()}`,
      display_name: cleanName,
      epic_nickname: "",
      epic_verified: false,
      discord_tag: `${cleanName}#0000`,
      role: "user",
      eligible: true,
      suspended: false,
      country: "PE",
      country_name: "Perú",
      preferred_currency: "PEN",
      balance_wt: 0,
      balance_reserved_wt: 0,
      balance_disputed_wt: 0,
      affiliate_tier: "partner",
      affiliate_rate: rate,
      custom_affiliate_code: cleanCode,
      created_at: new Date().toISOString(),
      last_active: "Partner Oficial Esports",
    };
    users.unshift(partner);
  }

  saveManagedUsers(users);

  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_user",
        user: partner,
      }),
    }).catch(() => {});
  }

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: adminName,
    target_user_id: partner.id,
    target_user_name: partner.display_name,
    amount: 0,
    reason: `Configuración Partner Esports: ${cleanName}`,
    note: `Código Vanity: ${cleanCode} | Comisión: ${Math.round(rate * 100)}% (Partner Grande)`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    partner,
    message: `Partner de Esports '${cleanName}' con código '${cleanCode}' configurado con éxito al ${Math.round(rate * 100)}% de comisión.`,
  };
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

  // Sync resolution to server registry
  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve_withdrawal",
        id: requestId,
        status: "approved",
        note: req.admin_note,
      }),
    }).catch(() => {});
  }

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

  // Sync resolution to server registry
  if (typeof fetch !== "undefined") {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve_withdrawal",
        id: requestId,
        status: "rejected",
        note: req.admin_note,
      }),
    }).catch(() => {});
  }

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

// Duel Escrow Engine: Retain tokens during match
export function escrowDuelStake(
  userId: string,
  stakeWt: number,
): { success: boolean; message: string; balance_wt: number; balance_reserved_wt: number } {
  if (stakeWt <= 0 || isNaN(stakeWt)) {
    return { success: false, message: "El monto a retener debe ser mayor a 0.", balance_wt: 0, balance_reserved_wt: 0 };
  }

  const users = getManagedUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { success: false, message: "Usuario no encontrado.", balance_wt: 0, balance_reserved_wt: 0 };
  }
  if (user.suspended) {
    return { success: false, message: "La cuenta está suspendida.", balance_wt: user.balance_wt, balance_reserved_wt: user.balance_reserved_wt };
  }
  if (user.balance_wt < stakeWt) {
    return {
      success: false,
      message: `Saldo insuficiente (${user.balance_wt.toFixed(2)} WT disponibles, requeridos ${stakeWt.toFixed(2)} WT).`,
      balance_wt: user.balance_wt,
      balance_reserved_wt: user.balance_reserved_wt,
    };
  }

  user.balance_wt = Number((user.balance_wt - stakeWt).toFixed(2));
  user.balance_reserved_wt = Number(((user.balance_reserved_wt || 0) + stakeWt).toFixed(2));
  saveManagedUsers(users);

  return {
    success: true,
    message: `Retenidos ${stakeWt.toFixed(2)} WT en escrow para duelo.`,
    balance_wt: user.balance_wt,
    balance_reserved_wt: user.balance_reserved_wt,
  };
}

// Duel Settlement: Release escrow, take 10% WTokens fee, award pot to winner
export function settleDuelPayout(
  winnerId: string,
  loserId: string,
  stakeWt: number,
  feeBps = 1000, // 10% default
): {
  success: boolean;
  message: string;
  pot: number;
  fee: number;
  prize: number;
  winnerNewBalance: number;
  loserNewBalance: number;
} {
  const users = getManagedUsers();
  const winner = users.find((u) => u.id === winnerId);
  const loser = users.find((u) => u.id === loserId);

  if (!winner || !loser) {
    return {
      success: false,
      message: "No se encontraron los participantes del duelo.",
      pot: 0,
      fee: 0,
      prize: 0,
      winnerNewBalance: 0,
      loserNewBalance: 0,
    };
  }

  const pot = Number((stakeWt * 2).toFixed(2));
  const fee = Number(((pot * feeBps) / 10000).toFixed(2));
  const prize = Number((pot - fee).toFixed(2));

  // Release reserved balances
  winner.balance_reserved_wt = Math.max(0, Number(((winner.balance_reserved_wt || 0) - stakeWt).toFixed(2)));
  loser.balance_reserved_wt = Math.max(0, Number(((loser.balance_reserved_wt || 0) - stakeWt).toFixed(2)));

  // Winner receives prize (pot minus fee)
  winner.balance_wt = Number((winner.balance_wt + prize).toFixed(2));

  // Affiliate commission distribution if any player had a referrer
  const feePerPlayer = fee / 2;
  [winner, loser].forEach((player) => {
    if (player.referrer_code) {
      // Find creator by code or display_name
      const creator = users.find(
        (c) =>
          (c.custom_affiliate_code && c.custom_affiliate_code.toUpperCase() === player.referrer_code?.toUpperCase()) ||
          c.referrer_code === player.referrer_code ||
          c.display_name.toUpperCase() === player.referrer_code?.toUpperCase(),
      );
      if (creator && creator.id !== player.id) {
        // Normal affiliate: 10% of player fee part. Verified: 15%. Partner Grande: 20%.
        const commRate =
          creator.affiliate_rate ||
          (creator.affiliate_tier === "partner"
            ? 0.20
            : creator.affiliate_tier === "verified" || creator.role === "admin" || creator.role === "owner"
              ? 0.15
              : 0.10);
        const comm = Number((feePerPlayer * commRate).toFixed(4));
        if (comm > 0) {
          creator.balance_wt = Number((creator.balance_wt + comm).toFixed(2));
        }
      }
    }
  });

  saveManagedUsers(users);

  // Audit entry for match resolution
  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: "MatchEngine",
    target_user_id: winner.id,
    target_user_name: winner.display_name,
    amount: prize,
    reason: `Premio Duelo 1v1 Box Fight (Pozo: ${pot} WT, Fee: ${fee} WT)`,
    note: `Rival: ${loser.display_name} (-${stakeWt} WT). Ganador recibió ${prize} WT netos.`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    message: `Duelo liquidado: ${winner.display_name} ganó ${prize.toFixed(2)} WT. Fee WTokens: ${fee.toFixed(2)} WT.`,
    pot,
    fee,
    prize,
    winnerNewBalance: winner.balance_wt,
    loserNewBalance: loser.balance_wt,
  };
}

// Duel Cancellation: Refund retained escrow tokens back to players
export function cancelDuelEscrow(
  user1Id: string,
  user2Id: string,
  stakeWt: number,
  reason = "Duelo cancelado o tiempo expirado",
): { success: boolean; message: string } {
  const users = getManagedUsers();
  const u1 = users.find((u) => u.id === user1Id);
  const u2 = users.find((u) => u.id === user2Id);

  if (u1) {
    u1.balance_reserved_wt = Math.max(0, Number(((u1.balance_reserved_wt || 0) - stakeWt).toFixed(2)));
    u1.balance_wt = Number((u1.balance_wt + stakeWt).toFixed(2));
  }
  if (u2) {
    u2.balance_reserved_wt = Math.max(0, Number(((u2.balance_reserved_wt || 0) - stakeWt).toFixed(2)));
    u2.balance_wt = Number((u2.balance_wt + stakeWt).toFixed(2));
  }

  saveManagedUsers(users);

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: "MatchEngine",
    target_user_id: u1?.id || "unknown",
    target_user_name: u1?.display_name || "Jugador",
    amount: stakeWt,
    reason: `Reembolso por cancelación de duelo (${reason})`,
    note: `Tokens retenidos devueltos a saldo disponible`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    message: `Tokens retenidos de duelo reembolsados exitosamente (${stakeWt.toFixed(2)} WT por jugador).`,
  };
}

// Duel Dispute Lock: Move stake from active duel (reserved) to dispute lock
export function markDuelDisputed(
  user1Id: string,
  user2Id: string,
  stakeWt: number,
  reason = "Conflicto en reporte de resultado / llamado de árbitro",
): { success: boolean; message: string } {
  const users = getManagedUsers();
  const u1 = users.find((u) => u.id === user1Id);
  const u2 = users.find((u) => u.id === user2Id);

  if (u1) {
    u1.balance_reserved_wt = Math.max(0, Number(((u1.balance_reserved_wt || 0) - stakeWt).toFixed(2)));
    u1.balance_disputed_wt = Number(((u1.balance_disputed_wt || 0) + stakeWt).toFixed(2));
  }
  if (u2) {
    u2.balance_reserved_wt = Math.max(0, Number(((u2.balance_reserved_wt || 0) - stakeWt).toFixed(2)));
    u2.balance_disputed_wt = Number(((u2.balance_disputed_wt || 0) + stakeWt).toFixed(2));
  }

  saveManagedUsers(users);

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: "DisputeEscrow",
    target_user_id: u1?.id || user1Id,
    target_user_name: u1?.display_name || "Jugador",
    amount: stakeWt,
    reason: `Duelo en disputa: ${stakeWt.toFixed(2)} WT bloqueados en arbitraje (${reason})`,
    note: `Saldo restante disponible para nuevos duelos. Fondos en disputa protegidos.`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    message: `Duelo marcado en disputa. Fondos bloqueados en arbitraje (${stakeWt.toFixed(2)} WT por jugador). Los jugadores pueden seguir usando su saldo restante.`,
  };
}

// Dispute Resolution: Award pot to validated winner from disputed escrow
export function resolveDisputePayout(
  winnerId: string,
  loserId: string,
  stakeWt: number,
  feeBps = 1000,
): {
  success: boolean;
  message: string;
  pot: number;
  fee: number;
  prize: number;
  winnerNewBalance: number;
  loserNewBalance: number;
} {
  const users = getManagedUsers();
  const winner = users.find((u) => u.id === winnerId);
  const loser = users.find((u) => u.id === loserId);

  if (!winner || !loser) {
    return {
      success: false,
      message: "No se encontraron los participantes de la disputa.",
      pot: 0,
      fee: 0,
      prize: 0,
      winnerNewBalance: 0,
      loserNewBalance: 0,
    };
  }

  const pot = Number((stakeWt * 2).toFixed(2));
  const fee = Number(((pot * feeBps) / 10000).toFixed(2));
  const prize = Number((pot - fee).toFixed(2));

  // Clear disputed escrow
  winner.balance_disputed_wt = Math.max(0, Number(((winner.balance_disputed_wt || 0) - stakeWt).toFixed(2)));
  loser.balance_disputed_wt = Math.max(0, Number(((loser.balance_disputed_wt || 0) - stakeWt).toFixed(2)));

  // Winner receives net prize into available balance
  winner.balance_wt = Number((winner.balance_wt + prize).toFixed(2));

  // Affiliate commission distribution
  const feePerPlayer = fee / 2;
  [winner, loser].forEach((player) => {
    if (player.referrer_code) {
      const creator = users.find(
        (c) =>
          (c.custom_affiliate_code && c.custom_affiliate_code.toUpperCase() === player.referrer_code?.toUpperCase()) ||
          c.referrer_code === player.referrer_code ||
          c.display_name.toUpperCase() === player.referrer_code?.toUpperCase(),
      );
      if (creator && creator.id !== player.id) {
        const commRate =
          creator.affiliate_rate ||
          (creator.affiliate_tier === "partner"
            ? 0.20
            : creator.affiliate_tier === "verified" || creator.role === "admin" || creator.role === "owner"
              ? 0.15
              : 0.10);
        const comm = Number((feePerPlayer * commRate).toFixed(4));
        if (comm > 0) {
          creator.balance_wt = Number((creator.balance_wt + comm).toFixed(2));
        }
      }
    }
  });

  saveManagedUsers(users);

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: "DisputeEscrow",
    target_user_id: winner.id,
    target_user_name: winner.display_name,
    amount: prize,
    reason: `Disputa resuelta a favor de ${winner.display_name} (Pozo: ${pot} WT, Premio: ${prize} WT)`,
    note: `Fondos de arbitraje liberados exitosamente.`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    message: `Disputa resuelta: ${winner.display_name} recibió ${prize.toFixed(2)} WT.`,
    pot,
    fee,
    prize,
    winnerNewBalance: winner.balance_wt,
    loserNewBalance: loser.balance_wt,
  };
}

// Dispute Cancellation: Refund disputed escrow tokens back to players' available balance
export function cancelDisputedDuel(
  user1Id: string,
  user2Id: string,
  stakeWt: number,
  reason = "Disputa cancelada / reembolso por árbitro",
): { success: boolean; message: string } {
  const users = getManagedUsers();
  const u1 = users.find((u) => u.id === user1Id);
  const u2 = users.find((u) => u.id === user2Id);

  if (u1) {
    u1.balance_disputed_wt = Math.max(0, Number(((u1.balance_disputed_wt || 0) - stakeWt).toFixed(2)));
    u1.balance_wt = Number((u1.balance_wt + stakeWt).toFixed(2));
  }
  if (u2) {
    u2.balance_disputed_wt = Math.max(0, Number(((u2.balance_disputed_wt || 0) - stakeWt).toFixed(2)));
    u2.balance_wt = Number((u2.balance_wt + stakeWt).toFixed(2));
  }

  saveManagedUsers(users);

  const audit = getAuditLog();
  audit.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    admin_id: "system",
    admin_name: "DisputeEscrow",
    target_user_id: u1?.id || "unknown",
    target_user_name: u1?.display_name || "Jugador",
    amount: stakeWt,
    reason: `Reembolso de disputa cancelada (${reason})`,
    note: `Fondos devueltos a saldo disponible`,
    created_at: new Date().toISOString(),
  });
  saveAuditLog(audit);

  return {
    success: true,
    message: `Fondos en disputa reembolsados exitosamente (${stakeWt.toFixed(2)} WT por jugador).`,
  };
}
