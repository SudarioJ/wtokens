import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/app";
import { isBackendPath } from "../server/security";

// Vercel entry point. BACKEND_URL is read on the server and never shipped to browsers.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = url.searchParams.get("route");
  if (!route || route.includes("?") || !isBackendPath(route)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end('{"code":"NOT_FOUND"}');
    return;
  }
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    res.writeHead(503, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end('{"code":"BACKEND_UNAVAILABLE"}');
    return;
  }
  url.searchParams.delete("route");
  const query = url.searchParams.toString();
  req.url = route + (query ? `?${query}` : "");
  createApp({ backendUrl, production: true })(req, res);
}
