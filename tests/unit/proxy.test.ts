import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";
import request from "supertest";
import { createApp } from "../../server/app";
import { backendOrigin, isBackendPath } from "../../server/security";

describe("fixed backend origin", () => {
  it.each([
    "file:///etc/passwd",
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com/admin",
    "https://example.com/?target=x",
  ])("rejects %s", (value) => {
    expect(() => backendOrigin(value)).toThrow();
  });
  it("accepts HTTPS and local loopback", () => {
    expect(backendOrigin("https://api.example.com")).toBe(
      "https://api.example.com",
    );
    expect(backendOrigin("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080",
    );
  });
  it.each([
    "/v1/../admin",
    "/v1/%2e%2e/admin",
    "/v1evil",
    "//example.com/v1",
    "/api/epic-verify",
    "/.env",
    "/v1/..\\admin",
  ])("does not proxy %s", (path) => {
    expect(isBackendPath(path)).toBe(false);
  });
});
describe("production server", () => {
  let backend: Server;
  let target: string;
  beforeAll(async () => {
    backend = createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          path: req.url,
          cookie: req.headers.cookie ?? null,
          forwarded: req.headers["x-forwarded-host"] ?? null,
        }),
      );
    });
    await new Promise<void>((done) => backend.listen(0, "127.0.0.1", done));
    target = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise<void>((done, reject) =>
      backend.close((error) => (error ? reject(error) : done())),
    );
  });
  const app = () => createApp({ backendUrl: target });
  it("ships a restrictive CSP without unsafe-inline or unsafe-eval", async () => {
    const result = await request(app()).get("/");
    expect(result.status).toBe(200);
    expect(result.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(result.headers["content-security-policy"]).not.toContain("unsafe-");
    expect(result.headers["x-content-type-options"]).toBe("nosniff");
  });
  it("proxies session cookies while stripping forged forwarded headers", async () => {
    const result = await request(app())
      .get("/v1/me")
      .set("Accept", "application/json")
      .set("Cookie", "JSESSIONID=fixture")
      .set("X-Forwarded-Host", "attacker.example");
    expect(result.body).toMatchObject({
      path: "/v1/me",
      cookie: "JSESSIONID=fixture",
      forwarded: null,
    });
    expect(result.headers["cache-control"]).toBe("no-store");
  });
  it("returns browser OAuth success to the SPA without changing JSON API requests", async () => {
    const result = await request(app())
      .get("/v1/me")
      .set("Accept", "text/html");
    expect(result.status).toBe(303);
    expect(result.headers.location).toBe("/");
  });
  it("rejects oversized requests before sending a body to the backend", async () => {
    const result = await request(app())
      .post("/v1/matches")
      .set("Content-Length", "2000000");
    expect(result.status).toBe(413);
  });
  it.each([
    "/legacy/frontend/app.js",
    "/.env",
    "/api/epic-verify",
    "/src/App.tsx",
    "/server/index.ts",
  ])("does not serve archived or source files: %s", async (path) => {
    expect((await request(app()).get(path)).status).toBe(404);
  });
});
