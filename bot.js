var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// bot/config.ts
import dotenv from "dotenv";
var botConfig, FORTNITE_MAPS;
var init_config = __esm({
  "bot/config.ts"() {
    "use strict";
    dotenv.config();
    botConfig = {
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
      affiliatesChannelId: process.env.DISCORD_AFFILIATES_CHANNEL_ID || ""
    };
    FORTNITE_MAPS = {
      BOX_FIGHT: {
        name: "Box Fight 1v1 Cl\xE1sico",
        code: "7620-0771-9529"
      },
      BUILD_FIGHT: {
        name: "Build Fight 1v1 (Reset de Altura)",
        code: "8064-7152-2934"
      },
      REALISTICS: {
        name: "Realistics 1v1 Competitivo",
        code: "7950-6300-4857"
      },
      ZONE_WARS: {
        name: "Zone Wars 1v1 Endgame",
        code: "4059-2791-0171"
      }
    };
  }
});

// bot/announcements.ts
var announcements_exports = {};
__export(announcements_exports, {
  announceDuelResult: () => announceDuelResult,
  notifyCreatorApplication: () => notifyCreatorApplication
});
import {
  EmbedBuilder as EmbedBuilder2,
  ActionRowBuilder as ActionRowBuilder2,
  ButtonBuilder as ButtonBuilder2,
  ButtonStyle as ButtonStyle2
} from "discord.js";
async function announceDuelResult(client, winnerOrParams, loserNameArg = "", modeArg = "Box Fight", prizeWtArg = 0) {
  if (!botConfig.duelResultsChannelId) return;
  try {
    const channel = await client.channels.fetch(
      botConfig.duelResultsChannelId
    );
    if (!channel?.isTextBased()) return;
    let playerA = "";
    let playerB = "";
    let winner = "";
    let mode = "";
    let entry = "\u2014";
    let matchId = "";
    let dateStr = (/* @__PURE__ */ new Date()).toLocaleString("es-PE", { timeZone: "UTC" }) + " UTC";
    if (typeof winnerOrParams === "object") {
      playerA = winnerOrParams.playerA || winnerOrParams.winnerName;
      playerB = winnerOrParams.playerB || winnerOrParams.loserName;
      winner = winnerOrParams.winnerName;
      mode = winnerOrParams.mode.replace(/_/g, " ");
      entry = winnerOrParams.stakeWt !== void 0 ? `${winnerOrParams.stakeWt.toFixed(2)} WTokens` : `${((winnerOrParams.prizeWt || 0) / 1.8).toFixed(2)} WTokens`;
      matchId = winnerOrParams.matchId ? winnerOrParams.matchId.slice(0, 8) : `m_${Date.now().toString(36).slice(-6)}`;
      if (winnerOrParams.date) dateStr = winnerOrParams.date;
    } else {
      winner = winnerOrParams;
      playerA = winnerOrParams;
      playerB = loserNameArg;
      mode = modeArg.replace(/_/g, " ");
      entry = prizeWtArg > 0 ? `${(prizeWtArg / 1.8).toFixed(2)} WTokens` : "5.00 WTokens";
      matchId = `m_${Date.now().toString(36).slice(-6)}`;
    }
    const embed = new EmbedBuilder2().setTitle("\u{1F3C6} DUELO FINALIZADO").setDescription(
      `**Jugador A:** \`${playerA}\`
**Jugador B:** \`${playerB}\`

\u{1F3AE} **Modo:** ${mode}
\u{1F4B0} **Entrada:** ${entry}
\u{1F451} **Ganador:** **\`${winner}\`**

\u{1F4C5} **Fecha/hora:** ${dateStr}
\u{1F194} **Match ID:** \`${matchId}\``
    ).setColor(1096065).setFooter({ text: "WTokens Competitivo \u2022 Historial de Partidas" }).setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[Bot Announcements] Error anunciando resultado:", err);
  }
}
async function notifyCreatorApplication(client, creatorName, discordTag, platform, communityFollowers, codeRequested) {
  if (!botConfig.affiliatesChannelId) return;
  try {
    const channel = await client.channels.fetch(
      botConfig.affiliatesChannelId
    );
    if (!channel?.isTextBased()) return;
    const embed = new EmbedBuilder2().setTitle("\u{1F31F} Nueva Solicitud de Creador de Contenido").setDescription(
      `Un usuario ha solicitado ser promovido a **Creador Verificado (15% Comisi\xF3n Recurrente)**.

\u{1F464} **Usuario:** **${creatorName}** (${discordTag})
\u{1F4FA} **Plataforma:** ${platform}
\u{1F465} **Audiencia / Seguidores:** ${communityFollowers}
\u{1F3F7}\uFE0F **C\xF3digo Solicitado:** \`${codeRequested.toUpperCase()}\``
    ).setColor(16096779).setFooter({ text: "WTokens Programa de Afiliados" }).setTimestamp();
    const buttons = new ActionRowBuilder2().addComponents(
      new ButtonBuilder2().setCustomId(`approve_creator_${codeRequested}`).setLabel("\u2705 Aprobar Creador (15%)").setStyle(ButtonStyle2.Success),
      new ButtonBuilder2().setCustomId(`reject_creator_${codeRequested}`).setLabel("\u274C Rechazar Solicitud").setStyle(ButtonStyle2.Secondary)
    );
    await channel.send({ embeds: [embed], components: [buttons] });
  } catch (err) {
    console.error("[Bot Announcements] Error notificando solicitud de creador:", err);
  }
}
var init_announcements = __esm({
  "bot/announcements.ts"() {
    "use strict";
    init_config();
  }
});

// bot/client.ts
init_config();
import {
  Client as Client3,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder as ActionRowBuilder4,
  ButtonBuilder as ButtonBuilder4,
  ButtonStyle as ButtonStyle4,
  EmbedBuilder as EmbedBuilder4,
  ChannelType as ChannelType2,
  PermissionFlagsBits as PermissionFlagsBits2
} from "discord.js";

// bot/commands.ts
init_config();
import {
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

// src/lib/admin.ts
var STORAGE_USERS = "wtokens_managed_users_v2";
var DEMO_USER_IDS = /* @__PURE__ */ new Set([
  "a1a1a1a1-1111-4111-8111-111111111111",
  "b2b2b2b2-2222-4222-8222-222222222222",
  "c3c3c3c3-3333-4333-8333-333333333333",
  "d4d4d4d4-4444-4444-8444-444444444444",
  "e5e5e5e5-5555-4555-8555-555555555555",
  "f6f6f6f6-6666-4666-8666-666666666666"
]);
var DEFAULT_USERS = [];
function notifyStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wtokens-admin-sync"));
  }
}
function getManagedUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cleaned = parsed.filter((u) => !DEMO_USER_IDS.has(u.id)).map((u) => {
        const isFakeEpic = Boolean(u.epic_nickname && u.epic_nickname === u.display_name);
        return {
          ...u,
          epic_nickname: isFakeEpic ? "" : u.epic_nickname || "",
          epic_verified: isFakeEpic ? false : Boolean(u.epic_verified && u.epic_nickname),
          balance_reserved_wt: u.balance_reserved_wt || 0,
          balance_disputed_wt: u.balance_disputed_wt || 0
        };
      });
      if (cleaned.length !== parsed.length) {
        saveManagedUsers(cleaned);
      }
      return cleaned;
    }
  } catch {
  }
  return DEFAULT_USERS;
}
function saveManagedUsers(users) {
  try {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    notifyStorageChange();
  } catch {
  }
}

// bot/commands.ts
var slashCommands = [
  new SlashCommandBuilder().setName("saldo").setDescription("Consulta tu saldo disponible de WTokens y equivalente local (Privado)"),
  new SlashCommandBuilder().setName("vincular").setDescription("Vincula o actualiza tu Nickname de Epic Games (Fortnite)").addStringOption(
    (opt) => opt.setName("epic_nickname").setDescription("Tu nombre exacto de jugador en Fortnite / Epic Games").setRequired(true)
  ),
  new SlashCommandBuilder().setName("stats").setDescription("Muestra tus estad\xEDsticas de partidas, victorias y ratio en WTokens"),
  new SlashCommandBuilder().setName("reglas").setDescription("Consulta las reglas oficiales de partida y c\xF3digos de mapas de Fortnite"),
  new SlashCommandBuilder().setName("staff").setDescription("Solicita asistencia de un moderador de WTokens").addStringOption(
    (opt) => opt.setName("motivo").setDescription("Describe brevemente tu problema o duda").setRequired(true)
  ),
  new SlashCommandBuilder().setName("duelo").setDescription("Desaf\xEDa a un jugador a un 1v1 oficial con WTokens y salas privadas").addUserOption(
    (opt) => opt.setName("oponente").setDescription("El jugador al que deseas desafiar").setRequired(true)
  ).addStringOption(
    (opt) => opt.setName("modo").setDescription("Modalidad competitiva de Fortnite").setRequired(true).addChoices(
      { name: "\u{1F94A} Box Fight 1v1", value: "BOX_FIGHT" },
      { name: "\u2694\uFE0F Build Fight 1v1", value: "BUILD_FIGHT" },
      { name: "\u{1F30B} Zone Wars 1v1", value: "ZONE_WARS" },
      { name: "\u{1F3AF} Realistic 1v1", value: "REALISTICS" },
      { name: "\u{1F6E1}\uFE0F Cero Construcci\xF3n 1v1", value: "ZERO_BUILD" },
      { name: "\u{1F9E9} Piece Control 1v1", value: "PIECE_CONTROL" }
    )
  ).addNumberOption(
    (opt) => opt.setName("apuesta").setDescription("Monto en WTokens por jugador (ej: 1, 2, 5, 10, 20 WT)").setRequired(true).setMinValue(0.5).setMaxValue(100)
  )
];
async function registerCommands() {
  if (!botConfig.token || !botConfig.clientId || !botConfig.guildId) {
    console.warn("[Bot Commands] Faltan variables DISCORD_BOT_TOKEN, CLIENT_ID o GUILD_ID para registrar comandos.");
    return;
  }
  const rest = new REST({ version: "10" }).setToken(botConfig.token);
  try {
    console.log("[Bot Commands] Registrando comandos Slash en el servidor...");
    await rest.put(
      Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId),
      { body: slashCommands.map((c) => c.toJSON()) }
    );
    console.log("\u2705 [Bot Commands] Comandos Slash registrados exitosamente.");
  } catch (err) {
    console.error("[Bot Commands] Error registrando comandos:", err);
  }
}
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;
  const users = getManagedUsers();
  const user = users.find(
    (u) => u.discord_tag.toLowerCase() === interaction.user.username.toLowerCase() || u.discord_tag.toLowerCase() === `${interaction.user.username}#${interaction.user.discriminator}`.toLowerCase()
  );
  if (commandName === "saldo") {
    if (!user) {
      await interaction.reply({
        content: `\u274C No encontramos una cuenta vinculada a **@${interaction.user.username}**.
Inicia sesi\xF3n en **[wtokens.net](https://wtokens.net)** con tu cuenta de Discord para sincronizar tu saldo.`,
        ephemeral: true
      });
      return;
    }
    const rates = {
      ARS: { rate: 1150, symbol: "ARS $" },
      PEN: { rate: 3.8, symbol: "S/" },
      CLP: { rate: 980, symbol: "CLP $" },
      BOB: { rate: 6.9, symbol: "Bs." },
      PYG: { rate: 7800, symbol: "Gs." },
      UYU: { rate: 42, symbol: "$U" },
      BRL: { rate: 5.6, symbol: "R$" }
    };
    const currencyData = rates[user.preferred_currency] || { rate: 1, symbol: "$" };
    const localEstimated = (user.balance_wt * currencyData.rate).toLocaleString("es", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const embed = new EmbedBuilder().setTitle(`\u{1F4B3} Saldo de ${user.display_name}`).setDescription(
      `**WTokens Disponibles:** \`${user.balance_wt.toFixed(2)} WT\`
**Equivalente Local:** \`${currencyData.symbol} ${localEstimated}\`
` + (user.balance_reserved_wt > 0 ? `**En Duelo Activo (Retenido):** \`${user.balance_reserved_wt.toFixed(2)} WT\`
` : "") + `
*Puedes recargar saldo o solicitar retiro en cualquier momento desde la web.*`
    ).setColor(3718648).setFooter({ text: "WTokens Wallet \xB7 1 WT = 1 USD" });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
  if (commandName === "vincular") {
    const epicNick = interaction.options.getString("epic_nickname", true);
    if (!user) {
      await interaction.reply({
        content: `\u274C Inicia sesi\xF3n primero en **[wtokens.net](https://wtokens.net)** para crear tu cuenta, y luego podr\xE1s actualizar tu Epic Games aqu\xED.`,
        ephemeral: true
      });
      return;
    }
    user.epic_nickname = epicNick.trim();
    await interaction.reply({
      content: `\u2705 \xA1Tu cuenta ha sido vinculada con \xE9xito!
**Epic Games Nick:** \`${epicNick.trim()}\``,
      ephemeral: true
    });
    return;
  }
  if (commandName === "stats") {
    const embed = new EmbedBuilder().setTitle("\u{1F4CA} Estad\xEDsticas Competitivas").setDescription(
      `**Jugador:** ${user ? user.display_name : interaction.user.username}
**Epic Games:** ${user?.epic_nickname || "No vinculado"}
**Rango:** ${user?.role === "admin" ? "Administrador" : "Competidor"}
**Pa\xEDs:** ${user?.country_name || "Latinoam\xE9rica"}

Para ver el historial detallado de partidas, visita **[wtokens.net](https://wtokens.net)**.`
    ).setColor(1096065);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
  if (commandName === "reglas") {
    const mapsList = Object.values(FORTNITE_MAPS).map((m) => `\u2022 **${m.name}:** C\xF3digo \`${m.code}\``).join("\n");
    const embed = new EmbedBuilder().setTitle("\u{1F4DC} Reglas Oficiales de Duelos WTokens").setDescription(
      `**Reglas de Conducta y Juego:**
1. **Sin trampas ni exploits:** Prohibido macros, scripts o bugs de textura.
2. **Tiempo de espera:** M\xE1ximo 5 minutos para entrar a la sala tras confirmarse el duelo.
3. **Grabaci\xF3n obligatoria:** Guarda repetici\xF3n o video (GeForce / OBS) para resolver disputas.

**Mapas Oficiales Competitivos:**
${mapsList}`
    ).setColor(16096779).setFooter({ text: "WTokens Fair Play" });
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }
  if (commandName === "staff") {
    const motivo = interaction.options.getString("motivo", true);
    await interaction.reply({
      content: `\u{1F514} Hemos recibido tu reporte: *"${motivo}"*.
Un \xE1rbitro o moderador revisar\xE1 tu caso a la brevedad.`,
      ephemeral: true
    });
    if (botConfig.staffAlertsChannelId) {
      try {
        const alertChannel = await interaction.client.channels.fetch(
          botConfig.staffAlertsChannelId
        );
        if (alertChannel?.isTextBased()) {
          const embed = new EmbedBuilder().setTitle("\u{1F514} Llamado de Jugador a Staff").setDescription(
            `**Usuario:** <@${interaction.user.id}> (${interaction.user.username})
**Canal:** <#${interaction.channelId}>
**Mensaje:** ${motivo}`
          ).setColor(16096779).setTimestamp();
          await alertChannel.send({
            content: botConfig.staffRoleId ? `<@&${botConfig.staffRoleId}>` : void 0,
            embeds: [embed]
          });
        }
      } catch (err) {
        console.error("Error sending staff alert:", err);
      }
    }
    return;
  }
  if (commandName === "duelo") {
    const oponente = interaction.options.getUser("oponente", true);
    const modo = interaction.options.getString("modo", true);
    const apuesta = interaction.options.getNumber("apuesta", true);
    if (oponente.bot) {
      await interaction.reply({
        content: "\u274C No puedes desafiar a un bot.",
        ephemeral: true
      });
      return;
    }
    if (oponente.id === interaction.user.id) {
      await interaction.reply({
        content: "\u274C No puedes desafiarte a ti mismo.",
        ephemeral: true
      });
      return;
    }
    const pot = Number((apuesta * 2).toFixed(2));
    const prize = Number((pot * 0.9).toFixed(2));
    const challengeId = `ch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const map = FORTNITE_MAPS[modo] || FORTNITE_MAPS.BOX_FIGHT;
    const embed = new EmbedBuilder().setTitle("\u2694\uFE0F \xA1DESAF\xCDO DIRECTO 1v1 EN WTOKENS!").setDescription(
      `\xA1Atenci\xF3n <@${oponente.id}>! Has recibido un desaf\xEDo directo de parte de <@${interaction.user.id}>.

\u{1F3AE} **Modalidad:** ${map.name}
\u{1F4B0} **Entrada:** \`$${apuesta.toFixed(2)} WT\` por jugador (B\xF3veda Escrow)
\u{1F3C6} **Premio al Ganador:** \`$${prize.toFixed(2)} WT\` (90% del Pozo)
\u{1F4CD} **C\xF3digo Oficial de Isla:** \`${map.code}\`

*Haz clic en el bot\xF3n de abajo para entrar a la plataforma web y confirmar tu partida con tus WTokens:*`
    ).setColor(16096779).setFooter({ text: "WTokens Competitivo \xB7 Salas y Arbitraje en Vivo" }).setTimestamp();
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("\u2694\uFE0F Aceptar Desaf\xEDo y Jugar en la Web").setURL(
        `https://wtokens.net/?challenge=${challengeId}&mode=${modo}&stake=${apuesta}&opponent=${interaction.user.id}`
      ),
      new ButtonBuilder().setCustomId(`decline_duel_${challengeId}`).setStyle(ButtonStyle.Danger).setLabel("\u274C Rechazar Desaf\xEDo")
    );
    await interaction.reply({
      content: `<@${oponente.id}> \xA1Te han desafiado a un duelo!`,
      embeds: [embed],
      components: [buttons]
    });
    return;
  }
}

// bot/rooms.ts
init_config();
import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder as ActionRowBuilder3,
  ButtonBuilder as ButtonBuilder3,
  ButtonStyle as ButtonStyle3,
  EmbedBuilder as EmbedBuilder3
} from "discord.js";

// bot/roles.ts
init_config();
async function getGuildMember(client, discordUserId) {
  try {
    if (!botConfig.guildId) return null;
    const guild = await client.guilds.fetch(botConfig.guildId);
    if (!guild) return null;
    return await guild.members.fetch(discordUserId);
  } catch {
    return null;
  }
}
async function isStaffMember(client, discordUserId) {
  const member = await getGuildMember(client, discordUserId);
  if (!member) return false;
  if (member.permissions.has("Administrator")) return true;
  if (botConfig.staffRoleId && member.roles.cache.has(botConfig.staffRoleId)) {
    return true;
  }
  return false;
}
async function assignGuildRole(client, discordUserId, roleId) {
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
async function removeGuildRole(client, discordUserId, roleId) {
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
async function setPlayersInDuelRole(client, player1DiscordId, player2DiscordId, inDuel) {
  if (!botConfig.inDuelRoleId) return;
  const action = inDuel ? assignGuildRole : removeGuildRole;
  await Promise.allSettled([
    action(client, player1DiscordId, botConfig.inDuelRoleId),
    action(client, player2DiscordId, botConfig.inDuelRoleId)
  ]);
}

// bot/rooms.ts
async function createDuelRoom(client, details) {
  try {
    if (!botConfig.guildId) return null;
    const guild = await client.guilds.fetch(botConfig.guildId);
    if (!guild) return null;
    const shortId = details.matchId.slice(0, 8);
    const channelName = `\u2694\uFE0F-duelo-${shortId}`;
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: details.player1DiscordId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: details.player2DiscordId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];
    if (botConfig.staffRoleId) {
      permissionOverwrites.push({
        id: botConfig.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: botConfig.duelCategoryId || void 0,
      permissionOverwrites,
      topic: `Duelo Oficial WTokens [${details.matchId}] \xB7 ${details.player1Name} vs ${details.player2Name}`
    });
    await setPlayersInDuelRole(client, details.player1DiscordId, details.player2DiscordId, true);
    const mapInfo = FORTNITE_MAPS[details.mode] || FORTNITE_MAPS.BOX_FIGHT;
    const pot = details.stakeWt * 2;
    const prize = pot * 0.9;
    const embed = new EmbedBuilder3().setTitle(`\u2694\uFE0F DUELO CONFIRMADO \xB7 WTokens 1v1 [${shortId}]`).setDescription(
      `\xA1Bienvenidos a su sala privada de duelo! Ambos aportes han sido retenidos en **B\xF3veda Escrow**.

**Modalidad:** ${mapInfo.name}
**C\xF3digo de Isla Fortnite:** \`${mapInfo.code}\`

**Jugador 1:** <@${details.player1DiscordId}> (Epic: **${details.epic1}**)
**Jugador 2:** <@${details.player2DiscordId}> (Epic: **${details.epic2}**)

\u{1F4B0} **Pozo Total:** \`${pot.toFixed(2)} WT\`
\u{1F3C6} **Premio al Ganador:** \`${prize.toFixed(2)} WT\` (Neto tras fee 10%)

\u26A0\uFE0F **Reglas de Partida:**
\u2022 Tienen **5 minutos** para agregarse en Epic Games e ingresar a la isla.
\u2022 Se juega a **3 rondas** (o seg\xFAn el acuerdo de la modalidad).
\u2022 **Obligatorio:** Tener activo NVIDIA ShadowPlay / OBS / Replay de Fortnite para reclamos.`
    ).setColor(3718648).setFooter({ text: "WTokens Match Engine \xB7 Sistema de Arbitraje en Vivo" }).setTimestamp();
    const buttons = new ActionRowBuilder3().addComponents(
      new ButtonBuilder3().setCustomId(`claim_win_${details.matchId}`).setLabel("\u{1F3C6} Reclamar Victoria").setStyle(ButtonStyle3.Success),
      new ButtonBuilder3().setCustomId(`call_staff_${details.matchId}`).setLabel("\u{1F6A8} Llamar \xC1rbitro / Disputa").setStyle(ButtonStyle3.Danger)
    );
    await channel.send({
      content: `<@${details.player1DiscordId}> <@${details.player2DiscordId}> \xA1Su duelo ha comenzado!`,
      embeds: [embed],
      components: [buttons]
    });
    console.log(`[Bot Rooms] Sala creada: ${channel.name} (${channel.id})`);
    return channel;
  } catch (err) {
    console.error("[Bot Rooms] Error creando sala de duelo:", err);
    return null;
  }
}
async function convertRoomToDispute(client, channel, matchId, summonerDiscordId, reason = "Reporte de conflicto o llamado de \xE1rbitro por los jugadores") {
  try {
    const shortId = matchId.slice(0, 8);
    await channel.setName(`\u{1F6A8}-disputa-${shortId}`);
    const disputeEmbed = new EmbedBuilder3().setTitle(`\u{1F6A8} DISPUTA EN CURSO \xB7 Duelo #${shortId}`).setDescription(
      `**Atenci\xF3n:** ${summonerDiscordId ? `<@${summonerDiscordId}> ha solicitado la intervenci\xF3n de un moderador.` : "Se ha reportado una discrepancia en los resultados."}

**Motivo:** ${reason}

**Instrucciones para los jugadores:**
1. No borren ning\xFAn mensaje de este canal.
2. Suban capturas de pantalla de la victoria o el enlace del clip de video aqu\xED.
3. El staff revisar\xE1 las pruebas y determinar\xE1 al ganador de forma inapelable.`
    ).setColor(15680580).setTimestamp();
    const staffPing = botConfig.staffRoleId ? `<@&${botConfig.staffRoleId}>` : "@Staff";
    await channel.send({
      content: `\u{1F6A8} **ALERTA DE ARBITRAJE** ${staffPing}`,
      embeds: [disputeEmbed]
    });
    if (botConfig.staffAlertsChannelId) {
      const alertChannel = await client.channels.fetch(
        botConfig.staffAlertsChannelId
      );
      if (alertChannel?.isTextBased()) {
        const staffEmbed = new EmbedBuilder3().setTitle("\u{1F6A8} Nueva Disputa Requiere \xC1rbitro").setDescription(
          `**Canal:** <#${channel.id}>
**Duelo:** \`${matchId}\`
**Solicitado por:** ${summonerDiscordId ? `<@${summonerDiscordId}>` : "Sistema"}
**Motivo:** ${reason}`
        ).setColor(16096779).setTimestamp();
        await alertChannel.send({ embeds: [staffEmbed] });
      }
    }
  } catch (err) {
    console.error("[Bot Rooms] Error convirtiendo sala a disputa:", err);
  }
}
async function closeDuelRoom(client, channel, player1DiscordId, player2DiscordId, winnerName, prizeWt, deleteDelayMinutes = 5) {
  try {
    await setPlayersInDuelRole(client, player1DiscordId, player2DiscordId, false);
    const closeEmbed = new EmbedBuilder3().setTitle("\u{1F3C1} Duelo Finalizado").setDescription(
      `El duelo ha concluido.

\u{1F3C6} **Ganador:** **${winnerName}**
\u{1F4B0} **Premio Acreditado:** **${prizeWt.toFixed(2)} WT**

\u2139\uFE0F Esta sala se cerrar\xE1 y eliminar\xE1 autom\xE1ticamente en **${deleteDelayMinutes} minutos**. \xA1Gracias por jugar en WTokens!`
    ).setColor(1096065).setTimestamp();
    await channel.send({ embeds: [closeEmbed] });
    try {
      const { announceDuelResult: announceDuelResult2 } = await Promise.resolve().then(() => (init_announcements(), announcements_exports));
      const matchIdMatch = channel.name.match(/[a-f0-9]{8}/i);
      await announceDuelResult2(client, {
        playerA: winnerName,
        playerB: "Rival",
        winnerName,
        loserName: "Rival",
        mode: "Box Fight 1v1",
        prizeWt,
        matchId: matchIdMatch ? matchIdMatch[0] : channel.id.slice(0, 8)
      });
    } catch (err) {
      console.error("[Bot Rooms] Error enviando anuncio p\xFAblico de resultado:", err);
    }
    setTimeout(
      async () => {
        try {
          await channel.delete("Duelo completado y archivado.");
        } catch {
        }
      },
      deleteDelayMinutes * 60 * 1e3
    );
  } catch (err) {
    console.error("[Bot Rooms] Error cerrando sala de duelo:", err);
  }
}

// bot/protection.ts
init_config();
var userMessageTimestamps = /* @__PURE__ */ new Map();
var recentJoins = [];
var raidLockdownActive = false;
async function handleSecurityMessage(message) {
  if (message.author.bot || !message.guild) return false;
  const staff = await isStaffMember(message.client, message.author.id);
  if (staff) return false;
  const content = message.content.toLowerCase();
  const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[a-zA-Z0-9]+/i;
  if (inviteRegex.test(content)) {
    try {
      await message.delete();
      const warning = await message.channel.send({
        content: `\u26A0\uFE0F <@${message.author.id}>, est\xE1 prohibido compartir invitaciones a otros servidores de Discord.`
      });
      setTimeout(() => warning.delete().catch(() => {
      }), 5e3);
      console.log(`[Anti-Invite] Mensaje de ${message.author.tag} eliminado por contener link de Discord.`);
      return true;
    } catch (err) {
      console.error("[Anti-Invite] Error eliminando mensaje:", err);
    }
  }
  const mentionsCount = message.mentions.users.size;
  if (mentionsCount >= 4 || content.includes("@everyone") || content.includes("@here")) {
    try {
      await message.delete();
      if (message.member?.moderatable) {
        await message.member.timeout(5 * 60 * 1e3, "Spam de menciones masivas detectado por Bot");
      }
      const warning = await message.channel.send({
        content: `\u{1F6A8} <@${message.author.id}> ha sido silenciado temporalmente por intento de menci\xF3n masiva.`
      });
      setTimeout(() => warning.delete().catch(() => {
      }), 6e3);
      return true;
    } catch (err) {
      console.error("[Anti-Mass-Mention] Error aplicando sanci\xF3n:", err);
    }
  }
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(message.author.id) || [];
  const recent = timestamps.filter((t) => now - t < 3e3);
  recent.push(now);
  userMessageTimestamps.set(message.author.id, recent);
  if (recent.length > 5) {
    try {
      await message.delete();
      if (message.member?.moderatable) {
        await message.member.timeout(60 * 1e3, "Spam r\xE1pido detectado");
      }
      const warning = await message.channel.send({
        content: `\u23F3 <@${message.author.id}>, por favor no env\xEDes mensajes tan r\xE1pido.`
      });
      setTimeout(() => warning.delete().catch(() => {
      }), 4e3);
      return true;
    } catch {
    }
  }
  return false;
}
async function handleSecurityJoin(client, member) {
  const now = Date.now();
  recentJoins.push(now);
  const windowMs = 10 * 1e3;
  const recent = recentJoins.filter((t) => now - t < windowMs);
  if (recent.length >= 5 && !raidLockdownActive) {
    raidLockdownActive = true;
    console.warn(`\u{1F6A8} [Anti-Raid] \xA1ALERTA DE RAID! ${recent.length} usuarios se unieron en ${windowMs / 1e3}s.`);
    if (botConfig.staffAlertsChannelId) {
      try {
        const alertChannel = await client.channels.fetch(botConfig.staffAlertsChannelId);
        if (alertChannel?.isTextBased()) {
          await alertChannel.send({
            content: `\u{1F6A8}\u{1F6A8} **ALERTA DE SEGURIDAD - POSIBLE RAID DETECTADO** <@&${botConfig.staffRoleId || ""}>

Se han detectado **${recent.length} usuarios entrando simult\xE1neamente en menos de 10 segundos**.
El bot ha bloqueado autom\xE1ticamente la verificaci\xF3n express. Los moderadores deben verificar las cuentas sospechosas.`
          });
        }
      } catch (err) {
        console.error("[Anti-Raid] Error enviando alerta:", err);
      }
    }
    setTimeout(() => {
      raidLockdownActive = false;
    }, 30 * 1e3);
  }
}

// bot/setup-onboarding-panel.ts
init_config();
var COUNTRY_ROLES = {
  ar: {
    name: "Argentina",
    emoji: "\u{1F1E6}\u{1F1F7}",
    roleId: "1562191759088418896",
    currency: "ARS"
  },
  pe: {
    name: "Per\xFA",
    emoji: "\u{1F1F5}\u{1F1EA}",
    roleId: "1562191767858847899",
    currency: "PEN"
  },
  br: {
    name: "Brasil",
    emoji: "\u{1F1E7}\u{1F1F7}",
    roleId: "1564334966433906788",
    currency: "BRL"
  },
  cl: {
    name: "Chile",
    emoji: "\u{1F1E8}\u{1F1F1}",
    roleId: "1562191762313711686",
    currency: "CLP"
  },
  uy: {
    name: "Uruguay",
    emoji: "\u{1F1FA}\u{1F1FE}",
    roleId: "1562191765333741668",
    currency: "UYU"
  },
  py: {
    name: "Paraguay",
    emoji: "\u{1F1F5}\u{1F1FE}",
    roleId: "1562191771776196739",
    currency: "PYG"
  },
  bo: {
    name: "Bolivia",
    emoji: "\u{1F1E7}\u{1F1F4}",
    roleId: "1562191774791766146",
    currency: "BOB"
  }
};
var MEMBER_ROLE_ID = "1562188702703427595";
var UNVERIFIED_ROLE_ID = "1562188705928712202";
var COUNTRY_CHANNEL_ID = "1562191780345155677";
async function postOnboardingPanel() {
  const token = botConfig.token;
  const guildId = botConfig.guildId;
  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json"
  };
  console.log("Comprobando si el rol \u{1F1E7}\u{1F1F7}\u30FBBrasil existe...");
  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers });
  const roles = await rolesRes.json();
  let brRole = roles.find(
    (r) => r.name.toLowerCase().includes("brasil") || r.name.toLowerCase().includes("brazil")
  );
  if (!brRole) {
    console.log("Creando rol \u{1F1E7}\u{1F1F7}\u30FBBrasil...");
    const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "\u{1F1E7}\u{1F1F7}\u30FBBrasil",
        color: 39995,
        // Verde Brasil
        hoist: false,
        mentionable: true
      })
    });
    brRole = await r.json();
    console.log("Rol creado:", brRole.name, brRole.id);
  } else {
    console.log("Rol Brasil existente:", brRole.name, brRole.id);
  }
  COUNTRY_ROLES.br.roleId = brRole.id;
  console.log("Publicando panel actualizado de pa\xEDses en \u{1F30E}\u30FBelige-tu-pa\xEDs...");
  const embed = {
    title: "\u{1F30E} SELECCIONA TU PA\xCDS \xB7 WTOKENS COMPETITIVO",
    description: "\xA1Te damos la bienvenida a la comunidad oficial de **WTOKENS**!\n\nPara desbloquear todos los canales del servidor, acceder a las colas de partidas de Fortnite y configurar tu moneda de juego, **selecciona tu pa\xEDs en los botones de abajo**:\n\n\u2022 \u{1F1E6}\u{1F1F7} **Argentina** (ARS)\n\u2022 \u{1F1F5}\u{1F1EA} **Per\xFA** (PEN)\n\u2022 \u{1F1E7}\u{1F1F7} **Brasil** (BRL)\n\u2022 \u{1F1E8}\u{1F1F1} **Chile** (CLP)\n\u2022 \u{1F1FA}\u{1F1FE} **Uruguay** (UYU)\n\u2022 \u{1F1F5}\u{1F1FE} **Paraguay** (PYG)\n\u2022 \u{1F1E7}\u{1F1F4} **Bolivia** (BOB)\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\u{1F6E1}\uFE0F **Protecci\xF3n de la Comunidad:** Al seleccionar tu pa\xEDs obtendr\xE1s el rol de **Miembro** y recibir\xE1s el enlace para ingresar a la plataforma y vincular tu cuenta de Epic Games.",
    color: 3718648,
    image: {
      url: "https://wtokens.net/assets/logo.png"
    },
    footer: {
      text: "WTokens \xB7 Sistema de Verificaci\xF3n Autom\xE1tica"
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const row1 = {
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        // Secondary
        label: "Argentina",
        emoji: { name: "\u{1F1E6}\u{1F1F7}" },
        custom_id: "select_country_ar"
      },
      {
        type: 2,
        style: 2,
        label: "Per\xFA",
        emoji: { name: "\u{1F1F5}\u{1F1EA}" },
        custom_id: "select_country_pe"
      },
      {
        type: 2,
        style: 2,
        label: "Brasil",
        emoji: { name: "\u{1F1E7}\u{1F1F7}" },
        custom_id: "select_country_br"
      }
    ]
  };
  const row2 = {
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: "Chile",
        emoji: { name: "\u{1F1E8}\u{1F1F1}" },
        custom_id: "select_country_cl"
      },
      {
        type: 2,
        style: 2,
        label: "Uruguay",
        emoji: { name: "\u{1F1FA}\u{1F1FE}" },
        custom_id: "select_country_uy"
      }
    ]
  };
  const row3 = {
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: "Paraguay",
        emoji: { name: "\u{1F1F5}\u{1F1FE}" },
        custom_id: "select_country_py"
      },
      {
        type: 2,
        style: 2,
        label: "Bolivia",
        emoji: { name: "\u{1F1E7}\u{1F1F4}" },
        custom_id: "select_country_bo"
      }
    ]
  };
  const res = await fetch(`https://discord.com/api/v10/channels/${COUNTRY_CHANNEL_ID}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      embeds: [embed],
      components: [row1, row2, row3]
    })
  });
  const data = await res.json();
  if (res.ok) {
    console.log("\u2705 Panel con Brasil publicado exitosamente en Discord! ID:", data.id);
  } else {
    console.error("\u274C Error al publicar panel:", data);
  }
}
postOnboardingPanel().catch(console.error);

// bot/client.ts
function createBotClient() {
  const client = new Client3({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.Channel, Partials.Message]
  });
  client.once("clientReady", async () => {
    console.log(`\u{1F916} [Discord Bot] Conectado exitosamente como: ${client.user?.tag}`);
    await registerCommands();
  });
  client.on("messageCreate", async (message) => {
    await handleSecurityMessage(message);
  });
  client.on("guildMemberAdd", async (member) => {
    try {
      await assignGuildRole(client, member.id, UNVERIFIED_ROLE_ID);
    } catch (err) {
      console.error("Error auto-asignando rol unverified:", err);
    }
    await handleSecurityJoin(client, member);
  });
  client.on("interactionCreate", async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
        return;
      }
      if (interaction.isButton()) {
        await handleButtonInteraction(client, interaction);
      }
    } catch (err) {
      console.error("[Discord Bot] Error en interacci\xF3n:", err);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({
          content: "\u274C Ocurri\xF3 un error procesando esta acci\xF3n.",
          ephemeral: true
        });
      }
    }
  });
  return client;
}
async function handleButtonInteraction(client, interaction) {
  const { customId } = interaction;
  if (customId.startsWith("call_staff_")) {
    const matchId = customId.replace("call_staff_", "");
    if (interaction.channel?.isTextBased()) {
      await interaction.reply({
        content: "\u{1F6A8} Has solicitado la intervenci\xF3n de un \xE1rbitro. La sala ha sido marcada en disputa.",
        ephemeral: true
      });
      await convertRoomToDispute(
        client,
        interaction.channel,
        matchId,
        interaction.user.id,
        "Llamado manual de \xE1rbitro mediante bot\xF3n en Discord"
      );
    }
    return;
  }
  if (customId.startsWith("claim_win_")) {
    const matchId = customId.replace("claim_win_", "");
    await interaction.reply({
      content: `\u{1F3C6} Has reportado tu victoria en el Duelo \`${matchId.slice(0, 8)}\`.
Tu rival tiene **3 minutos** para confirmarlo o reportar su resultado en **[wtokens.net](https://wtokens.net)**.
Si tu rival confirma, el pozo se acreditar\xE1 autom\xE1ticamente a tu cuenta.`,
      ephemeral: true
    });
    return;
  }
  if (customId.startsWith("approve_creator_")) {
    const isStaff = await isStaffMember(client, interaction.user.id);
    if (!isStaff) {
      await interaction.reply({
        content: "\u26D4 Esta acci\xF3n solo puede ser ejecutada por el Staff de WTokens.",
        ephemeral: true
      });
      return;
    }
    const code = customId.replace("approve_creator_", "");
    await interaction.update({
      content: `\u2705 Solicitud del c\xF3digo \`${code}\` **APROBADA** por <@${interaction.user.id}>. El creador recibe el 15% de comisi\xF3n recurrente.`,
      components: []
    });
    return;
  }
  if (customId.startsWith("reject_creator_")) {
    const isStaff = await isStaffMember(client, interaction.user.id);
    if (!isStaff) {
      await interaction.reply({
        content: "\u26D4 Esta acci\xF3n solo puede ser ejecutada por el Staff de WTokens.",
        ephemeral: true
      });
      return;
    }
    const code = customId.replace("reject_creator_", "");
    await interaction.update({
      content: `\u274C Solicitud del c\xF3digo \`${code}\` **RECHAZADA** por <@${interaction.user.id}>.`,
      components: []
    });
    return;
  }
  if (customId === "request_unban_ticket") {
    await interaction.reply({
      content: `\u2696\uFE0F **Solicitud de Reactivaci\xF3n / Desban Recibida**

Has solicitado pagar la penalizaci\xF3n de **$3.00 USD** para retirar la suspensi\xF3n de tu cuenta.

\u{1F4CC} **Instrucciones:**
1. Un moderador de <@&1562188681383776461> te responder\xE1 en breve para darte el alias/CVU (Mercado Pago / Yape / Transferencia).
2. Env\xEDa el comprobante de pago en este canal.
3. Al confirmarse el pago, el bot te retirar\xE1 el rol de suspendido y reactivar\xE1 tu cuenta en la web inmediatamente.`,
      ephemeral: true
    });
    if (botConfig.staffAlertsChannelId) {
      try {
        const alertChannel = await client.channels.fetch(
          botConfig.staffAlertsChannelId
        );
        if (alertChannel?.isTextBased()) {
          await alertChannel.send({
            content: `\u{1F6A8} **SOLICITUD DE DESBAN ($3 USD)**: El usuario suspendido <@${interaction.user.id}> (${interaction.user.username}) ha solicitado pagar su penalizaci\xF3n para reactivar su cuenta. Por favor atender en <#1564317591843901500>.`
          });
        }
      } catch (err) {
        console.error("Error sending unban staff alert:", err);
      }
    }
    return;
  }
  if (customId.startsWith("select_country_")) {
    const countryKey = customId.replace("select_country_", "");
    const country = COUNTRY_ROLES[countryKey];
    if (!country) return;
    await assignGuildRole(client, interaction.user.id, country.roleId);
    await assignGuildRole(client, interaction.user.id, MEMBER_ROLE_ID);
    await removeGuildRole(client, interaction.user.id, UNVERIFIED_ROLE_ID);
    const embed = new EmbedBuilder4().setTitle(`\u2705 \xA1Bienvenido a WTOKENS!`).setDescription(
      `Se te ha asignado el rol de **${country.emoji} ${country.name}** y el rol de **Miembro**.
Tu acceso al servidor de Discord ha sido **desbloqueado con \xE9xito**.

\u{1F680} **Siguiente paso obligatorio:**
Ingresa ahora a la plataforma web oficial para vincular tu cuenta de **Epic Games** y participar en las colas de Fortnite:`
    ).setColor(1096065).setFooter({ text: "WTokens Competitivo" });
    const linkButton = new ActionRowBuilder4().addComponents(
      new ButtonBuilder4().setLabel("\u{1F310} Entrar a WTOKENS (wtokens.net)").setStyle(ButtonStyle4.Link).setURL("https://wtokens.net")
    );
    await interaction.reply({
      embeds: [embed],
      components: [linkButton],
      ephemeral: true
    });
    return;
  }
  if (customId.startsWith("decline_duel_")) {
    await interaction.update({
      content: `\u274C El desaf\xEDo ha sido **rechazado** por <@${interaction.user.id}>.`,
      components: []
    });
    return;
  }
  if (customId === "verify_member_btn") {
    try {
      await assignGuildRole(client, interaction.user.id, MEMBER_ROLE_ID);
      await removeGuildRole(client, interaction.user.id, UNVERIFIED_ROLE_ID);
      const embed = new EmbedBuilder4().setTitle("\u2705 \xA1Verificaci\xF3n Exitosa!").setDescription(
        `\xA1Hola, <@${interaction.user.id}>!

Se te ha otorgado el rol de **<@&${MEMBER_ROLE_ID}>** y ahora tienes acceso completo a todos los canales de **WTOKENS**.

\u{1F3AE} **Vincular tu Fortnite:**
Para participar en salas y partidas por tokens, ingresa a la plataforma y registra tu Epic Nickname:
\u{1F449} **[https://wtokens.net](https://wtokens.net)**`
      ).setColor(1096065).setFooter({ text: "WTokens Competitivo \u2022 Fortnite Wagers" });
      const linkBtn = new ActionRowBuilder4().addComponents(
        new ButtonBuilder4().setLabel("\u{1F310} Abrir WTOKENS.NET").setStyle(ButtonStyle4.Link).setURL("https://wtokens.net")
      );
      await interaction.reply({
        embeds: [embed],
        components: [linkBtn],
        ephemeral: true
      });
    } catch (err) {
      console.error("Error en verify_member_btn:", err);
      await interaction.reply({
        content: "\u274C Hubo un error al asignar el rol. Por favor contacta al Staff.",
        ephemeral: true
      });
    }
    return;
  }
  if (customId.startsWith("ticket_open_")) {
    const categoryType = customId.replace("ticket_open_", "");
    const guild = interaction.guild;
    if (!guild) return;
    const safeUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
    const channelName = `ticket-${safeUsername}`;
    const existing = guild.channels.cache.find(
      (c) => c.name === channelName && c.parentId === "1562188843745022105"
    );
    if (existing) {
      await interaction.reply({
        content: `\u26A0\uFE0F Ya tienes un ticket abierto en <#${existing.id}>. Por favor contin\xFAa tu consulta all\xED.`,
        ephemeral: true
      });
      return;
    }
    const titles = {
      general: "\u2753 Soporte General",
      billing: "\u{1F4B3} Recargas, Retiros y Pagos",
      dispute: "\u{1F6A8} Reportar Partida o Disputa",
      creator: "\u{1F91D} Postulaci\xF3n a Creador de Contenido"
    };
    const typeTitle = titles[categoryType] || "\u{1F3AB} Ticket de Soporte";
    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType2.GuildText,
        parent: "1562188843745022105",
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits2.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits2.ViewChannel,
              PermissionFlagsBits2.SendMessages,
              PermissionFlagsBits2.AttachFiles,
              PermissionFlagsBits2.ReadMessageHistory
            ]
          },
          {
            id: botConfig.staffRoleId || "1562188681383776461",
            allow: [
              PermissionFlagsBits2.ViewChannel,
              PermissionFlagsBits2.SendMessages,
              PermissionFlagsBits2.AttachFiles,
              PermissionFlagsBits2.ReadMessageHistory
            ]
          }
        ]
      });
      const ticketEmbed = new EmbedBuilder4().setTitle(`${typeTitle} \u2022 WTOKENS`).setDescription(
        `\xA1Hola <@${interaction.user.id}>! Bienvenido a tu canal privado de atenci\xF3n.

\u{1F4CC} **Instrucciones:**
\u2022 Describe detalladamente tu consulta, reporte o solicitud.
\u2022 Si es sobre una partida o retiro, adjunta capturas de pantalla, ID de partida o comprobante.
\u2022 Un miembro del equipo de <@&1562188681383776461> te responder\xE1 en breve.

Para finalizar y cerrar este ticket cuando termine la atenci\xF3n, pulsa el bot\xF3n abajo.`
      ).setColor(165063).setFooter({ text: "WTokens Support System" }).setTimestamp();
      const closeRow = new ActionRowBuilder4().addComponents(
        new ButtonBuilder4().setCustomId("ticket_close").setLabel("\u{1F512} Cerrar Ticket").setStyle(ButtonStyle4.Danger)
      );
      await ticketChannel.send({
        content: `<@${interaction.user.id}> | <@&1562188681383776461>`,
        embeds: [ticketEmbed],
        components: [closeRow]
      });
      await interaction.reply({
        content: `\u2705 Tu ticket ha sido creado exitosamente: <#${ticketChannel.id}>. Dir\xEDgete all\xED para recibir ayuda.`,
        ephemeral: true
      });
    } catch (err) {
      console.error("Error creando ticket:", err);
      await interaction.reply({
        content: "\u274C Error creando el canal de ticket. Verifica los permisos del bot.",
        ephemeral: true
      });
    }
    return;
  }
  if (customId === "ticket_close") {
    if (!interaction.channel?.isTextBased()) return;
    await interaction.reply({
      content: "\u{1F512} **Cerrando ticket...** Este canal se eliminar\xE1 en 5 segundos."
    });
    setTimeout(async () => {
      try {
        if ("delete" in interaction.channel) {
          await interaction.channel.delete("Ticket cerrado por el usuario o staff");
        }
      } catch (err) {
        console.error("Error eliminando canal de ticket:", err);
      }
    }, 5e3);
    return;
  }
}

// bot/index.ts
init_config();
init_announcements();
var discordBot = createBotClient();
function startBot() {
  if (!botConfig.token) {
    console.warn(
      "\u26A0\uFE0F [Discord Bot] DISCORD_BOT_TOKEN no configurado en el archivo .env. El bot permanecer\xE1 en espera."
    );
    return;
  }
  discordBot.login(botConfig.token).catch((err) => {
    console.error("\u274C [Discord Bot] Fallo al iniciar sesi\xF3n con Discord:", err.message);
  });
}
var botBridge = {
  createDuelRoom: (details) => createDuelRoom(discordBot, details),
  closeDuelRoom: (channel, p1, p2, winner, prize) => closeDuelRoom(discordBot, channel, p1, p2, winner, prize),
  convertRoomToDispute: (channel, matchId, summonerId, reason) => convertRoomToDispute(discordBot, channel, matchId, summonerId, reason),
  announceResult: (winner, loser, mode, prize) => announceDuelResult(discordBot, winner, loser, mode, prize),
  notifyCreator: (creator, tag, platform, followers, code) => notifyCreatorApplication(discordBot, creator, tag, platform, followers, code),
  assignRole: (userId, roleId) => assignGuildRole(discordBot, userId, roleId),
  removeRole: (userId, roleId) => removeGuildRole(discordBot, userId, roleId),
  isStaff: (userId) => isStaffMember(discordBot, userId)
};
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.includes("bot")) {
  startBot();
}
export {
  botBridge,
  discordBot,
  startBot
};
