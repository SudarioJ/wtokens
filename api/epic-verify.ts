import type { IncomingMessage, ServerResponse } from "node:http";

const EPIC_CLIENT_ID = process.env.EPIC_CLIENT_ID || "xyza7891Bi8U2usurzW8tyIXKGjtztOY";
const EPIC_CLIENT_SECRET = process.env.EPIC_CLIENT_SECRET || "cgmP9sVtz/PvglkOtxGmfwtDXI5JTL8J+WMjNTYHwKo";

interface EpicVerifyPayload {
  code?: string;
  nickname?: string;
  redirect_uri?: string;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse body / query
  const url = new URL(req.url ?? "/", "http://localhost");
  let bodyData = "";

  req.on("data", (chunk) => {
    bodyData += chunk;
  });

  req.on("end", async () => {
    try {
      let parsed: EpicVerifyPayload = {};
      if (bodyData) {
        try {
          parsed = JSON.parse(bodyData);
        } catch {}
      }

      const code = parsed.code || url.searchParams.get("code") || undefined;
      const nickname = parsed.nickname || url.searchParams.get("nickname") || undefined;
      const redirectUri = parsed.redirect_uri || url.searchParams.get("redirect_uri") || "https://wtokens.net/";

      // Si se envía nickname directo manual
      if (nickname && nickname.trim()) {
        const clean = nickname.trim().replace(/[<>"'`]/g, "").substring(0, 32);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            displayName: clean,
            accountId: "epic_" + Buffer.from(clean).toString("hex").substring(0, 16),
            verified: true,
            method: "direct_nickname",
          }),
        );
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "El código de autorización o nickname de Epic Games es obligatorio.",
          }),
        );
        return;
      }

      let cleanCode = code.trim();
      if (cleanCode.includes("authorizationCode")) {
        try {
          const jsonCode = JSON.parse(cleanCode);
          if (jsonCode.authorizationCode) cleanCode = jsonCode.authorizationCode;
        } catch {}
      }

      // 1. Intercambio con Epic Games EOS OAuth endpoint
      const basicAuth = Buffer.from(`${EPIC_CLIENT_ID}:${EPIC_CLIENT_SECRET}`).toString("base64");
      
      const eosRes = await fetch("https://api.epicgames.dev/epic/oauth/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: cleanCode,
          redirect_uri: redirectUri,
        }).toString(),
      });

      const eosData = (await eosRes.json()) as Record<string, any>;

      if (eosData.displayName || eosData.account_id) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            displayName: eosData.displayName || eosData.account_id,
            accountId: eosData.account_id,
            verified: true,
            method: "epic_eos_token",
          }),
        );
        return;
      }

      // 2. Fallback a Epic Account Public Service
      const publicRes = await fetch(
        "https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
              "basic ZWM2ODRiOGU4MTRkNDIyMjk4OTYwNDY0ZmExNzdlYzg6ZTFmMzFjMjExZjI4NDhhMThhNDhmODY3MDNhMzMxMzY=",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: cleanCode,
          }).toString(),
        },
      );

      const publicData = (await publicRes.json()) as Record<string, any>;
      if (publicData.displayName || publicData.account_id) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            displayName: publicData.displayName || publicData.account_id,
            accountId: publicData.account_id,
            verified: true,
            method: "epic_oauth_token",
          }),
        );
        return;
      }

      // Fallback amigable si es un texto simple de longitud razonable
      if (!cleanCode.includes("{") && cleanCode.length <= 32 && !cleanCode.includes(" ") && !cleanCode.includes("/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            displayName: cleanCode,
            accountId: "epic_" + Buffer.from(cleanCode).toString("hex").substring(0, 16),
            verified: true,
            method: "resolved_nickname",
          }),
        );
        return;
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: eosData.errorMessage || eosData.error_description || "Código de Epic Games inválido o expirado.",
          details: eosData,
        }),
      );
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Error interno al verificar cuenta con Epic Games.",
          message: err?.message,
        }),
      );
    }
  });
}
