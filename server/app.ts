import express from "express";
import { proxyRequest } from "./proxy.js";
import { resolve } from "node:path";
import { backendOrigin, isBackendPath, securityHeaders } from "./security.js";

export function createApp(options: {
  backendUrl: string;
  distDir?: string;
  production?: boolean;
}) {
  const target = backendOrigin(options.backendUrl);
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    for (const [name, value] of Object.entries(securityHeaders))
      res.setHeader(name, value);
    if (options.production)
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  });
  app.use((req, res, next) => {
    if (
      req.path === "/v1/me" &&
      req.method === "GET" &&
      req.headers.accept?.includes("text/html")
    ) {
      res.redirect(303, "/app");
      return;
    }
    next();
  });
  app.use((req, res, next) => {
    if (!isBackendPath(req.path)) {
      next();
      return;
    }
    proxyRequest(target, req, res);
  });
  const distPath = resolve(options.distDir ?? "dist");
  app.use(
    express.static(distPath, {
      dotfiles: "deny",
      index: "index.html",
      fallthrough: true,
    }),
  );
  app.get("/app", (_req, res) => {
    res.sendFile("index.html", { root: distPath });
  });
  app.use((_req, res) => {
    res.status(404).json({ code: "NOT_FOUND" });
  });
  return app;
}
