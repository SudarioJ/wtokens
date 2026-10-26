import dotenv from "dotenv";
dotenv.config();

export interface BotConfig {
  token: string;
  clientId: string;
  guildId: string;
  staffRoleId: string;
  verifiedRoleId: string;
  inDuelRoleId: string;
  creatorRoleId: string;
  creatorPlusRoleId: string;
  duelCategoryId: string;
  duelResultsChannelId: string;
  staffAlertsChannelId: string;
  affiliatesChannelId: string;
}

export const botConfig: BotConfig = {
  token: process.env.DISCORD_BOT_TOKEN || "",
  clientId: process.env.DISCORD_CLIENT_ID || "",
  guildId: process.env.DISCORD_GUILD_ID || "",
  staffRoleId: process.env.DISCORD_STAFF_ROLE_ID || "",
  verifiedRoleId: process.env.DISCORD_VERIFIED_ROLE_ID || "",
  inDuelRoleId: process.env.DISCORD_IN_DUEL_ROLE_ID || "",
  creatorRoleId: process.env.DISCORD_CREATOR_ROLE_ID || "",
  creatorPlusRoleId: process.env.DISCORD_CREATOR_PLUS_ROLE_ID || "",
  duelCategoryId: process.env.DISCORD_DUEL_CATEGORY_ID || "",
  duelResultsChannelId: process.env.DISCORD_RESULTS_CHANNEL_ID || "",
  staffAlertsChannelId: process.env.DISCORD_STAFF_ALERTS_CHANNEL_ID || "",
  affiliatesChannelId: process.env.DISCORD_AFFILIATES_CHANNEL_ID || "",
};

export const FORTNITE_MAPS: Record<string, { name: string; code: string }> = {
  BOX_FIGHT: {
    name: "Box Fight 1v1 Clásico",
    code: "7620-0771-9529",
  },
  BUILD_FIGHT: {
    name: "Build Fight 1v1 (Reset de Altura)",
    code: "8064-7152-2934",
  },
  REALISTICS: {
    name: "Realistics 1v1 Competitivo",
    code: "7950-6300-4857",
  },
  ZONE_WARS: {
    name: "Zone Wars 1v1 Endgame",
    code: "4059-2791-0171",
  },
};
