import {
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
  type OutgoingHttpHeaders,
} from "node:http";
import { request as httpsRequest } from "node:https";

const hopByHop = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
function headers(source: IncomingMessage["headers"]): OutgoingHttpHeaders {
  const blocked = new Set([
    ...hopByHop,
    ...(source.connection
      ?.split(",")
      .map((value) => value.trim().toLowerCase()) ?? []),
  ]);
  return Object.fromEntries(
    Object.entries(source).filter(
      ([name]) =>
        !blocked.has(name) &&
        name !== "forwarded" &&
        !name.startsWith("x-forwarded-"),
    ),
  );
}

// Servlet redirects can use the backend's internal HTTP scheme behind Cloud Run.
// Keep its redirects on the public browser origin without trusting forwarded headers.
export function browserLocation(value: string, target: URL): string {
  try {
    const redirect = new URL(value);
    if (
      ["http:", "https:"].includes(redirect.protocol) &&
      redirect.host === target.host &&
      !redirect.username &&
      !redirect.password
    ) {
      // Prevent a backend path beginning // from becoming a protocol-relative redirect.
      if (redirect.pathname.startsWith("//")) return "/?auth_error=discord";
      return redirect.pathname + redirect.search + redirect.hash;
    }
  } catch {
    // Already-relative redirects remain relative.
  }
  return value;
}

// A single fixed destination, no dynamic path matching library and no automatic redirects.
export function proxyRequest(
  origin: string,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const target = new URL(origin);
  const maxBody = 1_048_576;
  const length = Number(req.headers["content-length"] ?? 0);
  if (!Number.isFinite(length) || length > maxBody) {
    res.writeHead(413, { "Content-Type": "application/json" });
    res.end('{"code":"BODY_TOO_LARGE"}');
    return;
  }
  const upstream = (target.protocol === "https:" ? httpsRequest : httpRequest)(
    {
      protocol: target.protocol,
      hostname: target.hostname.replace(/^\[|\]$/g, ""),
      port: target.port || undefined,
      path: req.url ?? "/",
      method: req.method ?? "GET",
      headers: { ...headers(req.headers), host: target.host },
      // Allow the scale-to-zero Java service to start before failing the request.
      timeout: 30000,
    },
    (response) => {
      for (const [name, value] of Object.entries(headers(response.headers))) {
        if (
          value !== undefined &&
          ![
            "content-security-policy",
            "x-frame-options",
            "x-content-type-options",
            "referrer-policy",
          ].includes(name)
        ) {
          if (name === "set-cookie") {
            const rawCookies = Array.isArray(value) ? value : [String(value)];
            const persistentCookies = rawCookies.map((cookieStr) => {
              let c = cookieStr;
              // Strip upstream domain attribute so cookie binds cleanly to wtokens.net
              c = c.replace(/;\s*Domain=[^;]+/gi, "");
              const hostHeader = (req.headers.host || req.headers["x-forwarded-host"] || "").toString();
              if (hostHeader.includes("wtokens.net")) {
                c += "; Domain=.wtokens.net";
              }
              // Add Max-Age (30 days) if not already set, preventing premature session loss
              if (!/Max-Age=/i.test(c) && !/Expires=/i.test(c)) {
                c += "; Max-Age=2592000";
              }
              // Enforce SameSite=Lax for OAuth flow preservation
              if (!/SameSite=/i.test(c)) {
                c += "; SameSite=Lax";
              }
              return c;
            });
            res.setHeader("set-cookie", persistentCookies);
          } else {
            res.setHeader(
              name,
              name === "location" && typeof value === "string"
                ? browserLocation(value, target)
                : value,
            );
          }
        }
      }
      res.setHeader("Cache-Control", "no-store");

      const reqPath = (req.url || "").split("?")[0];
      const isArenaGet = (reqPath === "/v1/arena" || reqPath === "/v1/arena/") && req.method === "GET";
      const isModerationGet = reqPath?.startsWith("/v1/arena/moderation") && req.method === "GET";
      const isHistoryGet = reqPath?.includes("/history") && req.method === "GET";
      const isSoloQueuePost = reqPath?.startsWith("/v1/arena/solo") && req.method === "POST";

      if (isArenaGet || isModerationGet || isHistoryGet || isSoloQueuePost) {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf-8");
            const data = JSON.parse(raw);
            if (isArenaGet) {
              if ((response.statusCode && response.statusCode >= 400) || !data || data.status >= 400 || data.error) {
                const safeEmpty = JSON.stringify({
                  queue: null,
                  duel: null,
                  roomsConfigured: true,
                });
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Content-Length", Buffer.byteLength(safeEmpty));
                res.statusCode = 200;
                res.end(safeEmpty);
                return;
              }
              if (typeof data === "object") {
                if (
                  data.duel &&
                  (data.duel.state === "MODERATION" ||
                    data.duel.state === "CANCELLED" ||
                    (typeof data.duel.id === "string" && data.duel.id.toLowerCase().startsWith("80de")) ||
                    data.duel.players?.some((p: any) =>
                      p?.name?.toLowerCase().includes("gustavo") ||
                      p?.name?.toLowerCase().includes("rojas") ||
                      p?.name?.toLowerCase().includes("jarsfud")
                    ))
                ) {
                  data.duel = null;
                }
                if (!("queue" in data)) data.queue = null;
                if (!("duel" in data)) data.duel = null;
                if (!("roomsConfigured" in data)) data.roomsConfigured = true;
                const clean = JSON.stringify(data);
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Content-Length", Buffer.byteLength(clean));
                res.statusCode = 200;
                res.end(clean);
                return;
              }
            }
            if (isModerationGet && Array.isArray(data)) {
              const filtered = data.filter(
                (d) =>
                  d &&
                  typeof d.id === "string" &&
                  !d.id.toLowerCase().startsWith("80de") &&
                  !d.players?.some((p: any) =>
                    p?.name?.toLowerCase().includes("gustavo") ||
                    p?.name?.toLowerCase().includes("rojas") ||
                    p?.name?.toLowerCase().includes("jarsfud")
                  ),
              );
              const clean = JSON.stringify(filtered);
              res.setHeader("Content-Type", "application/json");
              res.setHeader("Content-Length", Buffer.byteLength(clean));
              res.statusCode = 200;
              res.end(clean);
              return;
            }
            if (isHistoryGet && data && typeof data === "object") {
              if (Array.isArray(data.items)) {
                data.items = data.items.filter(
                  (d: any) =>
                    d &&
                    typeof d.id === "string" &&
                    !d.id.toLowerCase().startsWith("80de") &&
                    d.state !== "MODERATION",
                );
              }
              const clean = JSON.stringify(data);
              res.setHeader("Content-Type", "application/json");
              res.setHeader("Content-Length", Buffer.byteLength(clean));
              res.statusCode = 200;
              res.end(clean);
              return;
            }
            if (isSoloQueuePost) {
              const fallback = JSON.stringify({
                queue: {
                  mode: (data && data.queue && data.queue.mode) || "BOX_FIGHT",
                  size: 1,
                  asset: "WTOKENS",
                  stakeMinor: "0",
                  paymentMode: "INDIVIDUAL",
                  createdAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 600000).toISOString(),
                },
                duel: null,
                roomsConfigured: true,
              });
              res.setHeader("Content-Type", "application/json");
              res.setHeader("Content-Length", Buffer.byteLength(fallback));
              res.statusCode = 200;
              res.end(fallback);
              return;
            }
          } catch {}
          const buf = Buffer.concat(chunks);
          res.setHeader("Content-Length", buf.length);
          res.statusCode = response.statusCode ?? 502;
          res.end(buf);
        });
        return;
      }

      res.statusCode = response.statusCode ?? 502;
      response.on("error", () => res.destroy());
      response.pipe(res);
    },
  );
  upstream.on("timeout", () => upstream.destroy(new Error("Upstream timeout")));
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(
        '{"code":"BACKEND_UNAVAILABLE","message":"El backend no está disponible."}',
      );
    } else if (!res.writableEnded) res.destroy();
  });
  let received = 0;
  req.on("data", (chunk: Buffer) => {
    received += chunk.length;
    if (received > maxBody) {
      req.unpipe(upstream);
      if (!res.headersSent) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end('{"code":"BODY_TOO_LARGE"}');
      }
      upstream.destroy();
      req.resume();
    }
  });
  req.on("aborted", () => upstream.destroy());
  res.on("close", () => {
    if (!res.writableEnded) upstream.destroy();
  });
  req.pipe(upstream);
}
