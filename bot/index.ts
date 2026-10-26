import { createBotClient } from "./client";
import { botConfig } from "./config";
import { createDuelRoom, closeDuelRoom, convertRoomToDispute } from "./rooms";
import { announceDuelResult, notifyCreatorApplication } from "./announcements";
import { assignGuildRole, removeGuildRole, isStaffMember } from "./roles";

export const discordBot = createBotClient();

export function startBot(): void {
  if (!botConfig.token) {
    console.warn(
      "⚠️ [Discord Bot] DISCORD_BOT_TOKEN no configurado en el archivo .env. El bot permanecerá en espera.",
    );
    return;
  }

  discordBot.login(botConfig.token).catch((err) => {
    console.error("❌ [Discord Bot] Fallo al iniciar sesión con Discord:", err.message);
  });
}

// Export API for backend server to call
export const botBridge = {
  createDuelRoom: (details: Parameters<typeof createDuelRoom>[1]) =>
    createDuelRoom(discordBot, details),
  closeDuelRoom: (
    channel: any,
    p1: string,
    p2: string,
    winner: string,
    prize: number,
  ) => closeDuelRoom(discordBot, channel, p1, p2, winner, prize),
  convertRoomToDispute: (channel: any, matchId: string, summonerId?: string, reason?: string) =>
    convertRoomToDispute(discordBot, channel, matchId, summonerId, reason),
  announceResult: (winner: string, loser: string, mode: string, prize: number) =>
    announceDuelResult(discordBot, winner, loser, mode, prize),
  notifyCreator: (
    creator: string,
    tag: string,
    platform: string,
    followers: string,
    code: string,
  ) => notifyCreatorApplication(discordBot, creator, tag, platform, followers, code),
  assignRole: (userId: string, roleId: string) =>
    assignGuildRole(discordBot, userId, roleId),
  removeRole: (userId: string, roleId: string) =>
    removeGuildRole(discordBot, userId, roleId),
  isStaff: (userId: string) => isStaffMember(discordBot, userId),
};

// If run directly: node/tsx bot/index.ts
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  startBot();
}
