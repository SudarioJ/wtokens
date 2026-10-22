import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../../src/lib/api";
const match = {
  id: "e93a0ee5-4d21-47c5-807b-b01f33539943",
  creatorId: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
  opponentId: null,
  mode: "BOX_FIGHT",
  asset: "USD",
  stakeMinor: "1000",
  feeBps: 500,
  rulesVersion: "draft-v1",
  state: "OPEN",
  winnerId: null,
  expiresAt: "2026-10-22T10:00:00Z",
};
afterEach(() => vi.unstubAllGlobals());
describe("API trust boundary", () => {
  it("passes backend CSRF and a stable idempotency key with same-origin credentials", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ headerName: "X-XSRF-TOKEN", token: "test-csrf" }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(match)));
    vi.stubGlobal("fetch", fetcher);
    await api.create(
      { mode: "BOX_FIGHT", asset: "USD", stakeMinor: "1000" },
      "stable-key",
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe("/v1/matches");
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      credentials: "same-origin",
      method: "POST",
      headers: { "X-XSRF-TOKEN": "test-csrf", "Idempotency-Key": "stable-key" },
    });
  });
  it("rejects malformed balances instead of trusting server data blindly", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify([
              {
                asset: "USD",
                kind: "AVAILABLE",
                amount_minor: "<img onerror=alert(1)>",
              },
            ]),
          ),
        ),
    );
    await expect(api.balances()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
  it("preserves unauthorized status; does not fabricate a session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  });
  it("validates identifiers before building an API route", () => {
    expect(() => api.match("../../admin")).toThrow();
  });
});
