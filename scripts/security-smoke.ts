import assert from "node:assert/strict";
const target = new URL(
  process.env.SECURITY_BASE_URL ?? "http://127.0.0.1:3000",
);
if (!["127.0.0.1", "localhost", "[::1]"].includes(target.hostname))
  throw new Error("This smoke suite only targets a local test environment.");
let count = 0;
async function check(
  path: string,
  expected: number | number[],
  init?: RequestInit,
) {
  const response = await fetch(new URL(path, target), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(
    (Array.isArray(expected) ? expected : [expected]).includes(response.status),
    `${path}: expected ${expected}, received ${response.status}`,
  );
  console.log(`PASS ${init?.method ?? "GET"} ${path}: ${response.status}`);
  count++;
  return response;
}
const root = await check("/", 200);
assert.ok(
  root.headers
    .get("content-security-policy")
    ?.includes("frame-ancestors 'none'"),
);
assert.ok(!root.headers.get("content-security-policy")?.includes("unsafe-"));
await check("/actuator/health", 200);
await check("/v1/platform", 200);
await check("/v1/me", 401);
await check("/v1/wallets", 401);
await check("/v1/wallets", 401, {
  headers: { Authorization: "Bearer invalid-security-fixture" },
});
await check("/v1/wallets", 401, {
  headers: { Cookie: "JSESSIONID=forged-security-fixture" },
});
await check("/v1/matches", 403, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mode: "BOX_FIGHT", asset: "USD", stakeMinor: "100" }),
});
await check("/.env", 404);
await check("/legacy/frontend/app.js", 404);
await check("/api/epic-verify", 404);
console.log(
  `${count} local checks passed against ${target.origin}. No money was moved.`,
);
