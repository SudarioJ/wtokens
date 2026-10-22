import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { resolve } from "node:path";
import { backendOrigin, isBackendPath, securityHeaders } from "./security";

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
      res.redirect(303, "/");
      return;
    }
    next();
  });
  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: false,
      pathFilter: isBackendPath,
      proxyTimeout: 8000,
      timeout: 10000,
      on: {
        proxyReq(proxyReq) {
          for (const header of [
            "forwarded",
            "x-forwarded-host",
            "x-forwarded-proto",
            "x-forwarded-for",
          ])
            proxyReq.removeHeader(header);
        },
        proxyRes(proxyRes) {
          proxyRes.headers["cache-control"] = "no-store";
        },
        error(_err, _req, res) {
          if ("writeHead" in res && !res.headersSent) {
            res.writeHead(503, {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            });
            res.end(
              JSON.stringify({
                code: "BACKEND_UNAVAILABLE",
                message: "El backend no está disponible.",
              }),
            );
          }
        },
      },
    }),
  );
  app.use(
    express.static(resolve(options.distDir ?? "dist"), {
      dotfiles: "deny",
      index: "index.html",
      fallthrough: true,
    }),
  );
  app.use((_req, res) => {
    res.status(404).json({ code: "NOT_FOUND" });
  });
  return app;
}
