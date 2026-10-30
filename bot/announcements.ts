import {
  Client,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { botConfig } from "./config";

export interface DuelAnnouncementParams {
  playerA?: string;
  playerB?: string;
  winnerName: string;
  loserName: string;
  mode: string;
  stakeWt?: number;
  prizeWt?: number;
  matchId?: string;
  date?: string;
}

/**
 * Publicly announces finished duels in the results channel to create community activity & transparency.
 */
export async function announceDuelResult(
  client: Client,
  winnerOrParams: string | DuelAnnouncementParams,
  loserNameArg = "",
  modeArg = "Box Fight",
  prizeWtArg = 0,
): Promise<void> {
  if (!botConfig.duelResultsChannelId) return;

  try {
    const channel = (await client.channels.fetch(
      botConfig.duelResultsChannelId,
    )) as TextChannel;
    if (!channel?.isTextBased()) return;

    let playerA = "";
    let playerB = "";
    let winner = "";
    let mode = "";
    let entry = "—";
    let matchId = "";
    let dateStr = new Date().toLocaleString("es-PE", { timeZone: "UTC" }) + " UTC";

    if (typeof winnerOrParams === "object") {
      playerA = winnerOrParams.playerA || winnerOrParams.winnerName;
      playerB = winnerOrParams.playerB || winnerOrParams.loserName;
      winner = winnerOrParams.winnerName;
      mode = winnerOrParams.mode.replace(/_/g, " ");
      entry =
        winnerOrParams.stakeWt !== undefined
          ? `${winnerOrParams.stakeWt.toFixed(2)} WTokens`
          : `${((winnerOrParams.prizeWt || 0) / 1.8).toFixed(2)} WTokens`;
      matchId = winnerOrParams.matchId
        ? winnerOrParams.matchId.slice(0, 8)
        : `m_${Date.now().toString(36).slice(-6)}`;
      if (winnerOrParams.date) dateStr = winnerOrParams.date;
    } else {
      winner = winnerOrParams;
      playerA = winnerOrParams;
      playerB = loserNameArg;
      mode = modeArg.replace(/_/g, " ");
      entry = prizeWtArg > 0 ? `${(prizeWtArg / 1.8).toFixed(2)} WTokens` : "5.00 WTokens";
      matchId = `m_${Date.now().toString(36).slice(-6)}`;
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 DUELO FINALIZADO")
      .setDescription(
        `**Jugador A:** \`${playerA}\`\n` +
          `**Jugador B:** \`${playerB}\`\n\n` +
          `🎮 **Modo:** ${mode}\n` +
          `💰 **Entrada:** ${entry}\n` +
          `👑 **Ganador:** **\`${winner}\`**\n\n` +
          `📅 **Fecha/hora:** ${dateStr}\n` +
          `🆔 **Match ID:** \`${matchId}\``,
      )
      .setColor(0x10b981)
      .setFooter({ text: "WTokens Competitivo • Historial de Partidas" })
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
