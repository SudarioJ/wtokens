import { Message, GuildMember, TextChannel, Client } from "discord.js";
import { botConfig } from "./config";
import { isStaffMember } from "./roles";

// Anti-Spam Tracker: Map<userId, timestamp[]>
const userMessageTimestamps = new Map<string, number[]>();

// Anti-Raid Join Tracker: timestamp[]
const recentJoins: number[] = [];
let raidLockdownActive = false;

/**
 * Handles incoming messages to protect the server from invites, mass mentions, and spam.
 */
export async function handleSecurityMessage(message: Message): Promise<boolean> {
  // Ignore bots and webhooks
  if (message.author.bot || !message.guild) return false;

  // Bypass staff members
  const staff = await isStaffMember(message.client, message.author.id);
  if (staff) return false;

  const content = message.content.toLowerCase();

  // 1. Anti-Invite: Block unauthorized Discord server invite links
  const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[a-zA-Z0-9]+/i;
  if (inviteRegex.test(content)) {
    try {
      await message.delete();
      const warning = await message.channel.send({
        content: `⚠️ <@${message.author.id}>, está prohibido compartir invitaciones a otros servidores de Discord.`,
      });
      setTimeout(() => warning.delete().catch(() => {}), 5000);
      console.log(`[Anti-Invite] Mensaje de ${message.author.tag} eliminado por contener link de Discord.`);
      return true;
    } catch (err) {
      console.error("[Anti-Invite] Error eliminando mensaje:", err);
    }
  }

  // 2. Anti-Mass-Mention: Block ping raids (@everyone / > 4 user mentions)
  const mentionsCount = message.mentions.users.size;
  if (mentionsCount >= 4 || content.includes("@everyone") || content.includes("@here")) {
    try {
      await message.delete();
      // Timeout user for 5 minutes if bot has permissions
      if (message.member?.moderatable) {
        await message.member.timeout(5 * 60 * 1000, "Spam de menciones masivas detectado por Bot");
      }
      const warning = await message.channel.send({
        content: `🚨 <@${message.author.id}> ha sido silenciado temporalmente por intento de mención masiva.`,
      });
      setTimeout(() => warning.delete().catch(() => {}), 6000);
      return true;
    } catch (err) {
      console.error("[Anti-Mass-Mention] Error aplicando sanción:", err);
    }
  }

  // 3. Anti-Spam: Rate limit (max 5 messages in 3 seconds)
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(message.author.id) || [];
  const recent = timestamps.filter((t) => now - t < 3000);
  recent.push(now);
  userMessageTimestamps.set(message.author.id, recent);

  if (recent.length > 5) {
    try {
      await message.delete();
      if (message.member?.moderatable) {
        await message.member.timeout(60 * 1000, "Spam rápido detectado");
      }
      const warning = await message.channel.send({
        content: `⏳ <@${message.author.id}>, por favor no envíes mensajes tan rápido.`,
      });
      setTimeout(() => warning.delete().catch(() => {}), 4000);
      return true;
    } catch {
      /* ignore */
    }
  }

  return false;
}

/**
 * Tracks new member joins to detect and mitigate mass bot raids.
 */
export async function handleSecurityJoin(client: Client, member: GuildMember): Promise<void> {
  const now = Date.now();
  recentJoins.push(now);

  // Keep joins from the last 10 seconds
  const windowMs = 10 * 1000;
  const recent = recentJoins.filter((t) => now - t < windowMs);

  // If more than 5 users join in 10 seconds -> Raid trigger
  if (recent.length >= 5 && !raidLockdownActive) {
    raidLockdownActive = true;
    console.warn(`🚨 [Anti-Raid] ¡ALERTA DE RAID! ${recent.length} usuarios se unieron en ${windowMs / 1000}s.`);

    if (botConfig.staffAlertsChannelId) {
      try {
        const alertChannel = (await client.channels.fetch(botConfig.staffAlertsChannelId)) as TextChannel;
        if (alertChannel?.isTextBased()) {
          await alertChannel.send({
            content:
              `🚨🚨 **ALERTA DE SEGURIDAD - POSIBLE RAID DETECTADO** <@&${botConfig.staffRoleId || ""}>\n\n` +
              `Se han detectado **${recent.length} usuarios entrando simultáneamente en menos de 10 segundos**.\n` +
              `El bot ha bloqueado automáticamente la verificación express. Los moderadores deben verificar las cuentas sospechosas.`,
          });
        }
      } catch (err) {
        console.error("[Anti-Raid] Error enviando alerta:", err);
      }
    }

    // Reset lockdown status after 30 seconds
    setTimeout(() => {
      raidLockdownActive = false;
    }, 30 * 1000);
  }
}
