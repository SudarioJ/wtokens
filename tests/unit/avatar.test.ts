import { describe, expect, it } from "vitest";
import { userSchema } from "../../src/lib/contracts";

const user = {
  id: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
  display_name: "Jugador",
  eligible: false,
  suspended: false,
};
describe("Discord avatar URLs", () => {
  it.each([
    "https://cdn.discordapp.com/avatars/175928847299117063/0123456789abcdef0123456789abcdef.png?size=128",
    "https://cdn.discordapp.com/embed/avatars/2.png",
    null,
    undefined,
  ])("accepts a provider avatar or a missing avatar: %s", (avatar_url) => {
    expect(userSchema.safeParse({ ...user, avatar_url }).success).toBe(true);
  });
  it.each([
    "https://attacker.example/photo.png",
    "https://cdn.discordapp.com.attacker.example/photo.png",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "https://cdn.discordapp.com/attachments/private.png",
  ])("rejects an image outside the avatar allowlist: %s", (avatar_url) => {
    expect(userSchema.safeParse({ ...user, avatar_url }).success).toBe(false);
  });
});
