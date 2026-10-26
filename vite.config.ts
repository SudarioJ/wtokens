import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { backendOrigin } from "./server/security.ts";
import epicVerifyHandler from "./api/epic-verify.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = backendOrigin(
    process.env.BACKEND_URL ?? env.BACKEND_URL ?? "http://127.0.0.1:8080",
  );
  return {
    plugins: [
      react(),
      {
        name: "oauth-navigation",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (
              req.url === "/v1/me" &&
              req.method === "GET" &&
              req.headers.accept?.includes("text/html")
            ) {
              res.writeHead(303, { Location: "/app" });
              res.end();
              return;
            }
            if (req.url?.startsWith("/api/epic-verify")) {
              epicVerifyHandler(req, res);
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      port: 5173,
      strictPort: true,
      host: "127.0.0.1",
      proxy: Object.fromEntries(
        ["/v1", "/oauth2", "/login/oauth2", "/actuator/health"].map((path) => [
          path,
          { target, changeOrigin: true, timeout: 8000 },
        ]),
      ),
    },
    build: { sourcemap: false },
  };
});
