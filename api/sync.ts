import type { IncomingMessage, ServerResponse } from "node:http";

// In-memory global store for cross-device synchronization on Vercel
// Persists active players, incoming deposits, and admin credit operations.

interface SyncedUser {
  id: string;
  display_name: string;
  epic_nickname: string;
  discord_tag: string;
  avatar_url?: string;
  role: "admin" | "user";
  country: string;
  country_name: string;
  balance_wt: number;
  last_active: string;
  created_at: string;
}

interface SyncedDeposit {
  id: string;
  userId: string;
  userName: string;
  userDiscord?: string;
  amountWt: number;
  method: string;
  receiptCode: string;
  createdAt: string;
  status: "pending" | "approved" | "dismissed";
}

interface SyncedPixRequest {
  id: string;
  userId: string;
  userName: string;
  amountWt: number;
  amountBrl: number;
  checkoutUrl?: string;
  createdAt: string;
  status: "pending" | "approved" | "dismissed";
}

// Global state across warm lambdas
const globalState: {
  users: Map<string, SyncedUser>;
  deposits: SyncedDeposit[];
  pixRequests: SyncedPixRequest[];
} = (globalThis as any).__wtokens_sync_state || {
  users: new Map<string, SyncedUser>(),
  deposits: [],
  pixRequests: [],
};

(globalThis as any).__wtokens_sync_state = globalState;

// Seed default users if empty
if (globalState.users.size === 0) {
  const seedUsers: SyncedUser[] = [
    {
      id: "a1a1a1a1-1111-4111-8111-111111111111",
      display_name: "Admin_WTokens",
      epic_nickname: "WTokens_Admin",
      discord_tag: "Admin#0001",
      avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
      role: "admin",
      country: "PE",
      country_name: "Perú",
      balance_wt: 2500.0,
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
      country: "AR",
      country_name: "Argentina",
      balance_wt: 750.0,
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
      country: "AR",
      country_name: "Argentina",
      balance_wt: 120.0,
      created_at: "2026-09-15T18:20:00Z",
      last_active: "Hace 5 min",
    },
  ];
  for (const u of seedUsers) {
    globalState.users.set(u.id, u);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "GET") {
    const usersArr = Array.from(globalState.users.values());
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        users: usersArr,
        deposits: globalState.deposits.filter((d) => d.status === "pending"),
        pixRequests: globalState.pixRequests.filter((p) => p.status === "pending"),
      }),
    );
    return;
  }

  if (req.method === "POST") {
    let bodyData = "";
    req.on("data", (chunk) => {
      bodyData += chunk;
    });

    req.on("end", () => {
      try {
        const payload = bodyData ? JSON.parse(bodyData) : {};
        const action = payload.action;

        // 1. Register / Heartbeat User
        if (action === "register_user" && payload.user) {
          const u = payload.user;
          const existing = globalState.users.get(u.id);
          const updated: SyncedUser = {
            id: u.id || "u_" + Date.now(),
            display_name: u.display_name || u.discord_tag || "Jugador",
            epic_nickname: u.epic_nickname || existing?.epic_nickname || u.display_name || "",
            discord_tag: u.discord_tag || existing?.discord_tag || "",
            avatar_url: u.avatar_url || existing?.avatar_url,
            role: existing?.role || u.role || "user",
            country: u.country || existing?.country || "PE",
            country_name: u.country_name || existing?.country_name || "Perú",
            balance_wt: existing ? existing.balance_wt : (u.balance_wt ?? 0),
            created_at: existing?.created_at || new Date().toISOString(),
            last_active: "Ahora",
          };
          globalState.users.set(updated.id, updated);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, user: updated }));
          return;
        }

        // 2. Submit Deposit Notification
        if (action === "add_deposit" && payload.deposit) {
          const dep: SyncedDeposit = {
            id: payload.deposit.id || "dep_" + Date.now(),
            userId: payload.deposit.userId,
            userName: payload.deposit.userName || payload.deposit.userDiscord || "Jugador",
            userDiscord: payload.deposit.userDiscord,
            amountWt: Number(payload.deposit.amountWt) || 0,
            method: payload.deposit.method || "Transferencia",
            receiptCode: payload.deposit.receiptCode || "",
            createdAt: new Date().toISOString(),
            status: "pending",
          };
          globalState.deposits.unshift(dep);

          // If user exists in registry, ensure they're known
          if (dep.userId && !globalState.users.has(dep.userId)) {
            globalState.users.set(dep.userId, {
              id: dep.userId,
              display_name: dep.userName,
              epic_nickname: "",
              discord_tag: dep.userDiscord || "",
              role: "user",
              country: "PE",
              country_name: "Perú",
              balance_wt: 0,
              created_at: new Date().toISOString(),
              last_active: "Ahora",
            });
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, deposit: dep }));
          return;
        }

        // 3. Submit Pix Request
        if (action === "add_pix" && payload.pix) {
          const pix: SyncedPixRequest = {
            id: payload.pix.id || "pix_" + Date.now(),
            userId: payload.pix.userId,
            userName: payload.pix.userName || "Jugador BR",
            amountWt: Number(payload.pix.amountWt) || 0,
            amountBrl: Number(payload.pix.amountBrl) || 0,
            checkoutUrl: payload.pix.checkoutUrl,
            createdAt: new Date().toISOString(),
            status: "pending",
          };
          globalState.pixRequests.unshift(pix);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, pix }));
          return;
        }

        // 4. Resolve Deposit / Pix (Acreditar o Descartar)
        if (action === "resolve_deposit" && payload.id) {
          const dep = globalState.deposits.find((d) => d.id === payload.id);
          if (dep) {
            dep.status = payload.status || "approved";
            // If approved, update user balance in registry
            if (dep.status === "approved" && dep.userId) {
              const u = globalState.users.get(dep.userId);
              if (u) {
                u.balance_wt = Number((u.balance_wt + dep.amountWt).toFixed(2));
              }
            }
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // 5. Credit or Adjust User Tokens Directly
        if (action === "credit_user" && payload.userId) {
          let u = globalState.users.get(payload.userId);
          if (!u) {
            // Find by name or discord tag
            u = Array.from(globalState.users.values()).find(
              (usr) =>
                usr.display_name.toLowerCase() === payload.userId.toLowerCase() ||
                usr.discord_tag.toLowerCase() === payload.userId.toLowerCase() ||
                usr.epic_nickname.toLowerCase() === payload.userId.toLowerCase(),
            );
          }

          if (!u && payload.userName) {
            // Create user dynamically if registering brand new player
            u = {
              id: "u_" + Date.now(),
              display_name: payload.userName,
              epic_nickname: payload.epicNickname || payload.userName,
              discord_tag: payload.discordTag || "",
              role: "user",
              country: payload.country || "PE",
              country_name: payload.countryName || "Perú",
              balance_wt: 0,
              created_at: new Date().toISOString(),
              last_active: "Ahora",
            };
            globalState.users.set(u.id, u);
          }

          if (u) {
            const amount = Number(payload.amount) || 0;
            u.balance_wt = Math.max(0, Number((u.balance_wt + amount).toFixed(2)));
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, user: u }));
            return;
          }

          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Usuario no encontrado" }));
          return;
        }

        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Acción no reconocida" }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error en sincronización", message: err?.message }));
      }
    });
  }
}
