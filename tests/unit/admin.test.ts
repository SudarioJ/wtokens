import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  getManagedUsers,
  creditUserTokens,
  toggleUserRole,
  toggleUserSuspension,
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawalRequests,
  saveWithdrawalRequests,
  getAuditLog,
} from "../../src/lib/admin";

describe("WTokens Admin & Token Management Engine", () => {
  const store = new Map<string, string>();

  beforeAll(() => {
    // Provide localStorage mock for node test runner
    (globalThis as any).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };
  });

  beforeEach(() => {
    store.clear();
  });

  it("loads default users and seeds admin and player accounts", () => {
    const users = getManagedUsers();
    expect(users.length).toBeGreaterThanOrEqual(4);
    const admin = users.find((u) => u.role === "admin");
    expect(admin).toBeDefined();
    expect(admin?.display_name).toContain("Admin");

    const player = users.find((u) => u.role === "user");
    expect(player).toBeDefined();
    expect(player?.balance_wt).toBeGreaterThan(0);
  });

  it("credits WTokens to a player and updates balance and audit log", () => {
    const users = getManagedUsers();
    const player = users.find((u) => u.role === "user")!;
    const initialBalance = player.balance_wt;

    const res = creditUserTokens(
      "admin-id-1",
      "Admin_WTokens",
      player.id,
      50,
      "Premio de torneo oficial Box Fight",
      "Torneo fin de semana",
    );

    expect(res.success).toBe(true);
    expect(res.newBalance).toBe(Number((initialBalance + 50).toFixed(2)));

    const updatedUsers = getManagedUsers();
    const updatedPlayer = updatedUsers.find((u) => u.id === player.id)!;
    expect(updatedPlayer.balance_wt).toBe(
      Number((initialBalance + 50).toFixed(2)),
    );

    const audit = getAuditLog();
    expect(audit[0]?.amount).toBe(50);
    expect(audit[0]?.target_user_name).toBe(player.display_name);
    expect(audit[0]?.reason).toContain("Premio de torneo");
  });

  it("prevents debiting more WTokens than available balance", () => {
    const users = getManagedUsers();
    const player = users.find((u) => u.role === "user")!;
    const excessiveAmount = -(player.balance_wt + 100);

    const res = creditUserTokens(
      "admin-id-1",
      "Admin_WTokens",
      player.id,
      excessiveAmount,
      "Penalización excesiva",
    );

    expect(res.success).toBe(false);
    expect(res.message).toContain("saldo en negativo");
  });

  it("toggles user role between admin and user", () => {
    const users = getManagedUsers();
    const player = users.find((u) => u.role === "user")!;

    const promoted = toggleUserRole("Admin_WTokens", player.id);
    expect(promoted.success).toBe(true);
    expect(promoted.newRole).toBe("admin");

    const demoted = toggleUserRole("Admin_WTokens", player.id);
    expect(demoted.success).toBe(true);
    expect(demoted.newRole).toBe("user");
  });

  it("toggles suspension state of an account", () => {
    const users = getManagedUsers();
    const player = users.find((u) => u.role === "user" && !u.suspended)!;

    const suspended = toggleUserSuspension(
      "Admin_WTokens",
      player.id,
      "Investigación",
    );
    expect(suspended.success).toBe(true);
    expect(suspended.suspended).toBe(true);

    const reactivated = toggleUserSuspension("Admin_WTokens", player.id);
    expect(reactivated.success).toBe(true);
    expect(reactivated.suspended).toBe(false);
  });

  it("approves pending withdrawal request", () => {
    const requests = getWithdrawalRequests();
    const pending = requests.find((r) => r.status === "pending")!;

    const res = approveWithdrawal(
      "Admin_WTokens",
      pending.id,
      "Transferido por Mercado Pago",
    );
    expect(res.success).toBe(true);

    const updatedRequests = getWithdrawalRequests();
    const updated = updatedRequests.find((r) => r.id === pending.id)!;
    expect(updated.status).toBe("approved");
    expect(updated.resolved_by).toBe("Admin_WTokens");
  });

  it("rejects withdrawal request and automatically refunds WTokens to user", () => {
    const users = getManagedUsers();
    const player = users.find((u) => u.role === "user")!;
    const initialBalance = player.balance_wt;

    // Create a mock pending withdrawal for this player
    const requests = getWithdrawalRequests();
    const mockWithdrawalId = "test-wth-999";
    requests.push({
      id: mockWithdrawalId,
      user_id: player.id,
      user_name: player.display_name,
      amount_wt: 25,
      local_currency: "ARS",
      local_amount: 28000,
      method: "Mercado Pago",
      destination: "alias: test.mp",
      status: "pending",
      created_at: new Date().toISOString(),
    });
    saveWithdrawalRequests(requests);

    // Reject it
    const res = rejectWithdrawal(
      "Admin_WTokens",
      mockWithdrawalId,
      "CVU no válido",
    );
    expect(res.success).toBe(true);

    // Verify refund
    const refreshedUsers = getManagedUsers();
    const refreshedPlayer = refreshedUsers.find((u) => u.id === player.id)!;
    expect(refreshedPlayer.balance_wt).toBe(
      Number((initialBalance + 25).toFixed(2)),
    );
  });
});
