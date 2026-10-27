import type { IncomingMessage, ServerResponse } from "node:http";

const DEFAULT_B64 = "TVRVMk1qRTROak16TURnME1URTJNVGd6T0EuRy1QeTJQLlhPREpIcDBtMVN5amdrVXRnTnB4d3lHTm9ZWEc2RFJ0VkdnTEdN";
const DISCORD_BOT_TOKEN =
  process.env.DISCORD_BOT_TOKEN ||
  Buffer.from(DEFAULT_B64, "base64").toString("utf-8");
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1562177277821718539";
const STAFF_ROLE_ID = process.env.DISCORD_STAFF_ROLE_ID || "1562188681383776461";

const KNOWN_ADMIN_ROLE_IDS = new Set([
  "1562177371837046964", // Owner
  "1562188678313414688", // Founder
  "1562188681383776461", // Administrator
]);

const KNOWN_ADMIN_IDS = new Set([
  "746124644553064568", // Server Owner
]);

let cachedRoles: { id: string; name: string; permissions: string }[] | null = null;
let lastRolesFetch = 0;

async function getGuildRoles(): Promise<{ id: string; name: string; permissions: string }[]> {
  const now = Date.now();
  if (cachedRoles && now - lastRolesFetch < 600_000) {
    return cachedRoles;
  }
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (res.ok) {
      cachedRoles = await res.json();
      lastRolesFetch = now;
      return cachedRoles || [];
    }
  } catch (err) {
    console.error("[discord-admin-check] Error fetching roles:", err);
  }
  return cachedRoles || [];
}

function hasAdminPermission(roles: { id: string; name: string; permissions: string }[], userRoleIds: string[]): boolean {
  const userRoleSet = new Set(userRoleIds);
  for (const role of roles) {
    if (userRoleSet.has(role.id)) {
      if (KNOWN_ADMIN_ROLE_IDS.has(role.id) || role.id === STAFF_ROLE_ID) return true;
      try {
        const perm = BigInt(role.permissions);
        if ((perm & 8n) === 8n) return true; // Administrator permission bit
      } catch {}
      const lower = role.name.toLowerCase();
      if (
        lower.includes("admin") ||
        lower.includes("administrador") ||
        lower.includes("owner") ||
        lower.includes("founder") ||
        lower.includes("fundador") ||
        lower.includes("staff")
      ) {
        return true;
      }
    }
  }
  return false;
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

  try {
    const parsedUrl = new URL(req.url ?? "/", "http://localhost");
    const userId = parsedUrl.searchParams.get("userId") || "";
    const username = parsedUrl.searchParams.get("username") || "";
    const discordTag = parsedUrl.searchParams.get("discordTag") || "";
    const avatarUrl = parsedUrl.searchParams.get("avatarUrl") || "";

    // 1. Try to extract numeric Discord ID
    let discordId = "";
    if (/^\d{16,21}$/.test(userId)) {
      discordId = userId;
    } else {
      const match = avatarUrl.match(/\/avatars\/(\d{16,21})\//);
      if (match && match[1]) {
        discordId = match[1];
      }
    }

    if (discordId && KNOWN_ADMIN_IDS.has(discordId)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, isAdmin: true, reason: "owner_id" }));
      return;
    }

    let member: any = null;

    // 2. Fetch member by ID if available
    if (discordId) {
      try {
        const memRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        });
        if (memRes.ok) {
          member = await memRes.json();
        }
      } catch {}
    }

    // 3. If not found by ID, search by username or tag
    if (!member) {
      const query = (discordTag || username).split("#")[0]?.trim();
      if (query && query.length >= 2) {
        try {
          const searchRes = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(query)}&limit=5`,
            {
              headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
            },
          );
          if (searchRes.ok) {
            const list: any[] = await searchRes.json();
            const lowerQuery = query.toLowerCase();
            member = list.find((m) => {
              const u = m.user;
              return (
                u?.username?.toLowerCase() === lowerQuery ||
                u?.global_name?.toLowerCase() === lowerQuery
              );
            }) || list[0];
          }
        } catch {}
      }
    }

    if (!member) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, isAdmin: false, reason: "member_not_found" }));
      return;
    }

    const memberId = member.user?.id;
    if (memberId && KNOWN_ADMIN_IDS.has(memberId)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, isAdmin: true, reason: "owner" }));
      return;
    }

    const userRoles: string[] = Array.isArray(member.roles) ? member.roles : [];
    const allRoles = await getGuildRoles();
    const isAdmin = hasAdminPermission(allRoles, userRoles);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        isAdmin,
        discordId: member.user?.id,
        username: member.user?.username,
        roles: userRoles,
      }),
    );
  } catch (err: any) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err?.message || "Internal error" }));
  }
}
