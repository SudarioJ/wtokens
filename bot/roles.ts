import { Client, GuildMember } from "discord.js";
import { botConfig } from "./config";

export async function getGuildMember(
  client: Client,
  discordUserId: string,
): Promise<GuildMember | null> {
  try {
    if (!botConfig.guildId) return null;
    const guild = await client.guilds.fetch(botConfig.guildId);
    if (!guild) return null;
    return await guild.members.fetch(discordUserId);
  } catch {
    return null;
  }
}

/**
 * Checks whether a Discord user is a Staff/Moderator in the server.
 * Returns true if the user has the staff role or Administrator permissions.
 */
export async function isStaffMember(
  client: Client,
  discordUserId: string,
): Promise<boolean> {
  const member = await getGuildMember(client, discordUserId);
  if (!member) return false;

  if (member.permissions.has("Administrator")) return true;
  if (botConfig.staffRoleId && member.roles.cache.has(botConfig.staffRoleId)) {
    return true;
  }
  return false;
}

/**
 * Assigns a specific role to a guild member.
 */
export async function assignGuildRole(
  client: Client,
  discordUserId: string,
  roleId: string,
): Promise<boolean> {
  if (!roleId) return false;
  const member = await getGuildMember(client, discordUserId);
  if (!member) return false;

  try {
    await member.roles.add(roleId);
    return true;
  } catch (err) {
    console.error(`[Bot Roles] Error assigning role ${roleId} to ${discordUserId}:`, err);
    return false;
  }
}

/**
 * Removes a specific role from a guild member.
 */
export async function removeGuildRole(
  client: Client,
  discordUserId: string,
  roleId: string,
): Promise<boolean> {
  if (!roleId) return false;
  const member = await getGuildMember(client, discordUserId);
  if (!member) return false;

  try {
    await member.roles.remove(roleId);
    return true;
  } catch (err) {
    console.error(`[Bot Roles] Error removing role ${roleId} from ${discordUserId}:`, err);
    return false;
  }
}

/**
 * Gives the "En Duelo" role to both players while playing.
 */
export async function setPlayersInDuelRole(
  client: Client,
  player1DiscordId: string,
  player2DiscordId: string,
  inDuel: boolean,
): Promise<void> {
  if (!botConfig.inDuelRoleId) return;
  const action = inDuel ? assignGuildRole : removeGuildRole;
  await Promise.allSettled([
    action(client, player1DiscordId, botConfig.inDuelRoleId),
    action(client, player2DiscordId, botConfig.inDuelRoleId),
  ]);
}
