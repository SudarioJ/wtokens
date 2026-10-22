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
      timeout: 8000,
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
        )
          res.setHeader(name, value);
      }
      res.setHeader("Cache-Control", "no-store");
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
