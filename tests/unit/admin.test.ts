import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  getManagedUsers,
  saveManagedUsers,
  registerNewUser,
  creditUserTokens,
  toggleUserRole,
  toggleUserSuspension,
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawalRequests,
  saveWithdrawalRequests,
  getAuditLog,
  escrowDuelStake,
  settleDuelPayout,
  cancelDuelEscrow,
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
    const admin = registerNewUser("Admin_WTokens", "Admin#0001", "WTokens_Admin", "PE", 2500);
    admin.role = "admin";
    saveManagedUsers([
      admin,
      registerNewUser("K1ng_Fortnite", "K1ng#7777", "K1ng_FN", "AR", 120),
      registerNewUser("Vortex_BR", "Vortex#9999", "Vortex_BR", "CL", 45),
      registerNewUser("Savage_Aim", "Savage#4321", "Savage_Aim", "PE", 35),
    ]);
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
    const player = getManagedUsers().find((u) => u.role === "user")!;
    saveWithdrawalRequests([
      {
        id: "test-wth-1",
        user_id: player.id,
        user_name: player.display_name,
        amount_wt: 50.0,
        local_currency: "ARS",
        local_amount: 58500,
        method: "Mercado Pago",
        destination: "CVU: 0000003100049281729482",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
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

  it("debits WTokens from a player successfully when balance is sufficient", () => {
    const users = getManagedUsers();
    const player = users.find((u) => u.role === "user")!;
    const initialBalance = player.balance_wt;

    const res = creditUserTokens(
      "admin-id-1",
      "Admin_WTokens",
      player.id,
      -10,
      "Ajuste manual de administrador",
      "Cobro por penalización menor",
    );

    expect(res.success).toBe(true);
    expect(res.newBalance).toBe(Number((initialBalance - 10).toFixed(2)));

    const audit = getAuditLog();
    expect(audit[0]?.amount).toBe(-10);
    expect(audit[0]?.reason).toContain("Ajuste manual");
  });

  it("retains (escrows) tokens in duel and verifies tokens are moved from available to reserved", () => {
    const users = getManagedUsers();
    const player = users.find((u) => u.role === "user")!;
    const initialAvailable = player.balance_wt;
    const initialReserved = player.balance_reserved_wt || 0;

    // Retain 15 WT for a duel
    const stake = 15;
    const res = escrowDuelStake(player.id, stake);

    expect(res.success).toBe(true);
    expect(res.balance_wt).toBe(Number((initialAvailable - stake).toFixed(2)));
    expect(res.balance_reserved_wt).toBe(Number((initialReserved + stake).toFixed(2)));

    // Verify storage reflects changes
    const refreshed = getManagedUsers().find((u) => u.id === player.id)!;
    expect(refreshed.balance_wt).toBe(Number((initialAvailable - stake).toFixed(2)));
    expect(refreshed.balance_reserved_wt).toBe(Number((initialReserved + stake).toFixed(2)));

    // Fail when user attempts to stake more than available
    const failRes = escrowDuelStake(player.id, refreshed.balance_wt + 100);
    expect(failRes.success).toBe(false);
    expect(failRes.message).toContain("Saldo insuficiente");
  });

  it("settles duel payout: takes 10% fee and awards 90% prize to winner while clearing escrow", () => {
    const users = getManagedUsers();
    const p1 = users.find((u) => u.role === "user")!;
    const p2 = users.find((u) => u.id !== p1.id && u.role === "user")!;
    const p1InitReserved = p1.balance_reserved_wt || 0;
    const p2InitReserved = p2.balance_reserved_wt || 0;

    // Both players stake 10 WT
    const stake = 10;
    escrowDuelStake(p1.id, stake);
    escrowDuelStake(p2.id, stake);

    const p1Before = getManagedUsers().find((u) => u.id === p1.id)!;
    const p2Before = getManagedUsers().find((u) => u.id === p2.id)!;

    // p1 wins the match
    const settlement = settleDuelPayout(p1.id, p2.id, stake, 1000); // 1000 bps = 10%
    expect(settlement.success).toBe(true);
    expect(settlement.pot).toBe(20); // 10 * 2 = 20 WT
    expect(settlement.fee).toBe(2);  // 10% of 20 = 2 WT for WTokens
    expect(settlement.prize).toBe(18); // 90% = 18 WT for winner

    const p1After = getManagedUsers().find((u) => u.id === p1.id)!;
    const p2After = getManagedUsers().find((u) => u.id === p2.id)!;

    // Escrows cleared back to pre-stake reserved levels
    expect(p1After.balance_reserved_wt).toBe(p1InitReserved);
    expect(p2After.balance_reserved_wt).toBe(p2InitReserved);

    // Winner balance increased by 18 WT net prize
    expect(p1After.balance_wt).toBe(Number((p1Before.balance_wt + 18).toFixed(2)));
    // Loser balance stays reduced (their stake is not returned)
    expect(p2After.balance_wt).toBe(p2Before.balance_wt);
  });

  it("refunds retained escrow tokens back to both players when a duel is cancelled", () => {
    const users = getManagedUsers();
    const p1 = users.find((u) => u.role === "user")!;
    const p2 = users.find((u) => u.id !== p1.id && u.role === "user")!;

    const initialP1Avail = p1.balance_wt;
    const initialP2Avail = p2.balance_wt;
    const initialP1Reserved = p1.balance_reserved_wt || 0;
    const initialP2Reserved = p2.balance_reserved_wt || 0;

    const stake = 20;
    escrowDuelStake(p1.id, stake);
    escrowDuelStake(p2.id, stake);

    // Cancel match
    const cancelRes = cancelDuelEscrow(p1.id, p2.id, stake, "Rival desconectado en fase de carga");
    expect(cancelRes.success).toBe(true);

    const refreshedP1 = getManagedUsers().find((u) => u.id === p1.id)!;
    const refreshedP2 = getManagedUsers().find((u) => u.id === p2.id)!;

    // Both players should have their tokens returned 100%
    expect(refreshedP1.balance_wt).toBe(initialP1Avail);
    expect(refreshedP2.balance_wt).toBe(initialP2Avail);
    expect(refreshedP1.balance_reserved_wt).toBe(initialP1Reserved);
    expect(refreshedP2.balance_reserved_wt).toBe(initialP2Reserved);
  });
});
