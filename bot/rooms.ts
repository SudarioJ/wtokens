import {
  Client,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { botConfig, FORTNITE_MAPS } from "./config";
import { setPlayersInDuelRole } from "./roles";

export interface DuelRoomDetails {
  matchId: string;
  player1DiscordId: string;
  player2DiscordId: string;
  player1Name: string;
  player2Name: string;
  epic1: string;
  epic2: string;
  mode: string;
  stakeWt: number;
}

/**
 * Creates a private match room in Discord for the two players and the Staff.
 */
export async function createDuelRoom(
  client: Client,
  details: DuelRoomDetails,
): Promise<TextChannel | null> {
  try {
    if (!botConfig.guildId) return null;
    const guild = await client.guilds.fetch(botConfig.guildId);
    if (!guild) return null;

    const shortId = details.matchId.slice(0, 8);
    const channelName = `⚔️-duelo-${shortId}`;

    // Permissions: deny @everyone, allow only player1, player2 and staff
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: details.player1DiscordId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: details.player2DiscordId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    if (botConfig.staffRoleId) {
      permissionOverwrites.push({
        id: botConfig.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: botConfig.duelCategoryId || undefined,
      permissionOverwrites,
      topic: `Duelo Oficial WTokens [${details.matchId}] · ${details.player1Name} vs ${details.player2Name}`,
    });

    // Mark players with the @En Duelo role
    await setPlayersInDuelRole(client, details.player1DiscordId, details.player2DiscordId, true);

    const mapInfo = FORTNITE_MAPS[details.mode] || FORTNITE_MAPS.BOX_FIGHT!;
    const pot = details.stakeWt * 2;
    const prize = pot * 0.9; // 90% prize after 10% WTokens fee

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ DUELO CONFIRMADO · WTokens 1v1 [${shortId}]`)
      .setDescription(
        `¡Bienvenidos a su sala privada de duelo! Ambos aportes han sido retenidos en **Bóveda Escrow**.\n\n` +
          `**Modalidad:** ${mapInfo.name}\n` +
          `**Código de Isla Fortnite:** \`${mapInfo.code}\`\n\n` +
          `**Jugador 1:** <@${details.player1DiscordId}> (Epic: **${details.epic1}**)\n` +
          `**Jugador 2:** <@${details.player2DiscordId}> (Epic: **${details.epic2}**)\n\n` +
          `💰 **Pozo Total:** \`${pot.toFixed(2)} WT\`\n` +
          `🏆 **Premio al Ganador:** \`${prize.toFixed(2)} WT\` (Neto tras fee 10%)\n\n` +
          `⚠️ **Reglas de Partida:**\n` +
          `• Tienen **5 minutos** para agregarse en Epic Games e ingresar a la isla.\n` +
          `• Se juega a **3 rondas** (o según el acuerdo de la modalidad).\n` +
          `• **Obligatorio:** Tener activo NVIDIA ShadowPlay / OBS / Replay de Fortnite para reclamos.`,
      )
      .setColor(0x38bdf8)
      .setFooter({ text: "WTokens Match Engine · Sistema de Arbitraje en Vivo" })
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`claim_win_${details.matchId}`)
        .setLabel("🏆 Reclamar Victoria")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`call_staff_${details.matchId}`)
        .setLabel("🚨 Llamar Árbitro / Disputa")
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({
      content: `<@${details.player1DiscordId}> <@${details.player2DiscordId}> ¡Su duelo ha comenzado!`,
      embeds: [embed],
      components: [buttons],
    });

    console.log(`[Bot Rooms] Sala creada: ${channel.name} (${channel.id})`);
    return channel;
  } catch (err) {
    console.error("[Bot Rooms] Error creando sala de duelo:", err);
    return null;
  }
}

/**
 * Converts a duel channel into a dispute ticket and summons the staff.
 */
export async function convertRoomToDispute(
  client: Client,
  channel: TextChannel,
  matchId: string,
  summonerDiscordId?: string,
  reason = "Reporte de conflicto o llamado de árbitro por los jugadores",
): Promise<void> {
  try {
    const shortId = matchId.slice(0, 8);
    await channel.setName(`🚨-disputa-${shortId}`);

    const disputeEmbed = new EmbedBuilder()
      .setTitle(`🚨 DISPUTA EN CURSO · Duelo #${shortId}`)
      .setDescription(
        `**Atención:** ${summonerDiscordId ? `<@${summonerDiscordId}> ha solicitado la intervención de un moderador.` : "Se ha reportado una discrepancia en los resultados."}\n\n` +
          `**Motivo:** ${reason}\n\n` +
          `**Instrucciones para los jugadores:**\n` +
          `1. No borren ningún mensaje de este canal.\n` +
          `2. Suban capturas de pantalla de la victoria o el enlace del clip de video aquí.\n` +
          `3. El staff revisará las pruebas y determinará al ganador de forma inapelable.`,
      )
      .setColor(0xef4444)
      .setTimestamp();

    const staffPing = botConfig.staffRoleId ? `<@&${botConfig.staffRoleId}>` : "@Staff";
    await channel.send({
      content: `🚨 **ALERTA DE ARBITRAJE** ${staffPing}`,
      embeds: [disputeEmbed],
    });

    // Also send an alert to the staff alerts channel if configured
    if (botConfig.staffAlertsChannelId) {
      const alertChannel = (await client.channels.fetch(
        botConfig.staffAlertsChannelId,
      )) as TextChannel;
      if (alertChannel?.isTextBased()) {
        const staffEmbed = new EmbedBuilder()
          .setTitle("🚨 Nueva Disputa Requiere Árbitro")
          .setDescription(
            `**Canal:** <#${channel.id}>\n` +
              `**Duelo:** \`${matchId}\`\n` +
              `**Solicitado por:** ${summonerDiscordId ? `<@${summonerDiscordId}>` : "Sistema"}\n` +
              `**Motivo:** ${reason}`,
          )
          .setColor(0xf59e0b)
          .setTimestamp();

        await alertChannel.send({ embeds: [staffEmbed] });
      }
    }
  } catch (err) {
    console.error("[Bot Rooms] Error convirtiendo sala a disputa:", err);
  }
}

/**
 * Closes the duel room, clears @En Duelo roles, and schedules channel deletion.
 */
export async function closeDuelRoom(
  client: Client,
  channel: TextChannel,
  player1DiscordId: string,
  player2DiscordId: string,
  winnerName: string,
  prizeWt: number,
  deleteDelayMinutes = 5,
): Promise<void> {
  try {
    // Remove in-duel role
    await setPlayersInDuelRole(client, player1DiscordId, player2DiscordId, false);

    const closeEmbed = new EmbedBuilder()
      .setTitle("🏁 Duelo Finalizado")
      .setDescription(
        `El duelo ha concluido.\n\n` +
          `🏆 **Ganador:** **${winnerName}**\n` +
          `💰 **Premio Acreditado:** **${prizeWt.toFixed(2)} WT**\n\n` +
          `ℹ️ Esta sala se cerrará y eliminará automáticamente en **${deleteDelayMinutes} minutos**. ¡Gracias por jugar en WTokens!`,
      )
      .setColor(0x10b981)
      .setTimestamp();

    await channel.send({ embeds: [closeEmbed] });

    // Schedule deletion
    setTimeout(
      async () => {
        try {
          await channel.delete("Duelo completado y archivado.");
        } catch {
          /* channel already deleted */
        }
      },
      deleteDelayMinutes * 60 * 1000,
    );
  } catch (err) {
    console.error("[Bot Rooms] Error cerrando sala de duelo:", err);
  }
}
