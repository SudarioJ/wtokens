import { createApp } from "./app.js";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
const port = Number(process.env.PORT ?? 3000);
const app = createApp({
  backendUrl: process.env.BACKEND_URL ?? "http://127.0.0.1:8080",
  production: process.env.NODE_ENV === "production",
});
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () => {
  console.log(`WTOKENS frontend: http://localhost:${port}`);
});
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => server.close());
