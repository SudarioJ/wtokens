import {
  Client,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { botConfig } from "./config";

/**
 * Publicly announces finished duels in the results channel to create community activity & FOMO.
 */
export async function announceDuelResult(
  client: Client,
  winnerName: string,
  loserName: string,
  mode: string,
  prizeWt: number,
): Promise<void> {
  if (!botConfig.duelResultsChannelId) return;

  try {
    const channel = (await client.channels.fetch(
      botConfig.duelResultsChannelId,
    )) as TextChannel;
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle("🔥 ¡DUELO FINALIZADO EN WTOKENS!")
      .setDescription(
        `🏆 **${winnerName}** se llevó la victoria frente a **${loserName}**.\n\n` +
          `🎮 **Modalidad:** ${mode.replace("_", " ")}\n` +
          `💰 **Premio Ganado:** **${prizeWt.toFixed(2)} WT** ($${prizeWt.toFixed(2)} USD)\n\n` +
          `¿Quieres desafiar a alguien? Entra ahora a [wtokens.net](https://wtokens.net) y demuestra tu nivel.`,
      )
      .setColor(0x38bdf8)
      .setThumbnail("https://wtokens.net/assets/logo.png")
      .setFooter({ text: "WTokens Competitivo · Pagos Inmediatos" })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[Bot Announcements] Error anunciando resultado:", err);
  }
}

/**
 * Notifies staff when a user applies for Creator status in the affiliates channel.
 */
export async function notifyCreatorApplication(
  client: Client,
  creatorName: string,
  discordTag: string,
  platform: string,
  communityFollowers: string,
  codeRequested: string,
): Promise<void> {
  if (!botConfig.affiliatesChannelId) return;

  try {
    const channel = (await client.channels.fetch(
      botConfig.affiliatesChannelId,
    )) as TextChannel;
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setTitle("🌟 Nueva Solicitud de Creador de Contenido")
      .setDescription(
        `Un usuario ha solicitado ser promovido a **Creador Verificado (15% Comisión Recurrente)**.\n\n` +
          `👤 **Usuario:** **${creatorName}** (${discordTag})\n` +
          `📺 **Plataforma:** ${platform}\n` +
          `👥 **Audiencia / Seguidores:** ${communityFollowers}\n` +
          `🏷️ **Código Solicitado:** \`${codeRequested.toUpperCase()}\``,
      )
      .setColor(0xf59e0b)
      .setFooter({ text: "WTokens Programa de Afiliados" })
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_creator_${codeRequested}`)
        .setLabel("✅ Aprobar Creador (15%)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`reject_creator_${codeRequested}`)
        .setLabel("❌ Rechazar Solicitud")
        .setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ embeds: [embed], components: [buttons] });
  } catch (err) {
    console.error("[Bot Announcements] Error notificando solicitud de creador:", err);
  }
}
