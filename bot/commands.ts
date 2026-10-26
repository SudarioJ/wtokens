import {
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { botConfig, FORTNITE_MAPS } from "./config";
import { getManagedUsers } from "../src/lib/admin";

export const slashCommands = [
  new SlashCommandBuilder()
    .setName("saldo")
    .setDescription("Consulta tu saldo disponible de WTokens y equivalente local (Privado)"),

  new SlashCommandBuilder()
    .setName("vincular")
    .setDescription("Vincula o actualiza tu Nickname de Epic Games (Fortnite)")
    .addStringOption((opt) =>
      opt
        .setName("epic_nickname")
        .setDescription("Tu nombre exacto de jugador en Fortnite / Epic Games")
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Muestra tus estadísticas de partidas, victorias y ratio en WTokens"),

  new SlashCommandBuilder()
    .setName("reglas")
    .setDescription("Consulta las reglas oficiales de partida y códigos de mapas de Fortnite"),

  new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Solicita asistencia de un moderador de WTokens")
    .addStringOption((opt) =>
      opt
        .setName("motivo")
        .setDescription("Describe brevemente tu problema o duda")
        .setRequired(true),
    ),
];

/**
 * Registers all slash commands with the Discord Guild REST API.
 */
export async function registerCommands(): Promise<void> {
  if (!botConfig.token || !botConfig.clientId || !botConfig.guildId) {
    console.warn("[Bot Commands] Faltan variables DISCORD_BOT_TOKEN, CLIENT_ID o GUILD_ID para registrar comandos.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(botConfig.token);

  try {
    console.log("[Bot Commands] Registrando comandos Slash en el servidor...");
    await rest.put(
      Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId),
      { body: slashCommands.map((c) => c.toJSON()) },
    );
    console.log("✅ [Bot Commands] Comandos Slash registrados exitosamente.");
  } catch (err) {
    console.error("[Bot Commands] Error registrando comandos:", err);
  }
}

/**
 * Handles incoming Slash Command interactions.
 */
export async function handleSlashCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const { commandName } = interaction;
  const users = getManagedUsers();
  // Find linked user by discord tag or id
  const user = users.find(
    (u) =>
      u.discord_tag.toLowerCase() === interaction.user.username.toLowerCase() ||
      u.discord_tag.toLowerCase() === `${interaction.user.username}#${interaction.user.discriminator}`.toLowerCase(),
  );

  if (commandName === "saldo") {
    if (!user) {
      await interaction.reply({
        content: `❌ No encontramos una cuenta vinculada a **@${interaction.user.username}**.\nInicia sesión en **[wtokens.net](https://wtokens.net)** con tu cuenta de Discord para sincronizar tu saldo.`,
        ephemeral: true,
      });
      return;
    }

    const rates: Record<string, { rate: number; symbol: string }> = {
      ARS: { rate: 1150, symbol: "ARS $" },
      PEN: { rate: 3.8, symbol: "S/" },
      CLP: { rate: 980, symbol: "CLP $" },
      BOB: { rate: 6.9, symbol: "Bs." },
      PYG: { rate: 7800, symbol: "Gs." },
      UYU: { rate: 42, symbol: "$U" },
      BRL: { rate: 5.6, symbol: "R$" },
    };

    const currencyData = rates[user.preferred_currency] || { rate: 1, symbol: "$" };
    const localEstimated = (user.balance_wt * currencyData.rate).toLocaleString("es", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const embed = new EmbedBuilder()
      .setTitle(`💳 Saldo de ${user.display_name}`)
      .setDescription(
        `**WTokens Disponibles:** \`${user.balance_wt.toFixed(2)} WT\`\n` +
          `**Equivalente Local:** \`${currencyData.symbol} ${localEstimated}\`\n` +
          (user.balance_reserved_wt > 0
            ? `**En Duelo Activo (Retenido):** \`${user.balance_reserved_wt.toFixed(2)} WT\`\n`
            : "") +
          `\n*Puedes recargar saldo o solicitar retiro en cualquier momento desde la web.*`,
      )
      .setColor(0x38bdf8)
      .setFooter({ text: "WTokens Wallet · 1 WT = 1 USD" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (commandName === "vincular") {
    const epicNick = interaction.options.getString("epic_nickname", true);
    if (!user) {
      await interaction.reply({
        content: `❌ Inicia sesión primero en **[wtokens.net](https://wtokens.net)** para crear tu cuenta, y luego podrás actualizar tu Epic Games aquí.`,
        ephemeral: true,
      });
      return;
    }

    user.epic_nickname = epicNick.trim();
    // In production, sync with persistent storage
    await interaction.reply({
      content: `✅ ¡Tu cuenta ha sido vinculada con éxito!\n**Epic Games Nick:** \`${epicNick.trim()}\``,
      ephemeral: true,
    });
    return;
  }

  if (commandName === "stats") {
    const embed = new EmbedBuilder()
      .setTitle("📊 Estadísticas Competitivas")
      .setDescription(
        `**Jugador:** ${user ? user.display_name : interaction.user.username}\n` +
          `**Epic Games:** ${user?.epic_nickname || "No vinculado"}\n` +
          `**Rango:** ${user?.role === "admin" ? "Administrador" : "Competidor"}\n` +
          `**País:** ${user?.country_name || "Latinoamérica"}\n\n` +
          `Para ver el historial detallado de partidas, visita **[wtokens.net](https://wtokens.net)**.`,
      )
      .setColor(0x10b981);

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (commandName === "reglas") {
    const mapsList = Object.values(FORTNITE_MAPS)
      .map((m) => `• **${m.name}:** Código \`${m.code}\``)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📜 Reglas Oficiales de Duelos WTokens")
      .setDescription(
        `**Reglas de Conducta y Juego:**\n` +
          `1. **Sin trampas ni exploits:** Prohibido macros, scripts o bugs de textura.\n` +
          `2. **Tiempo de espera:** Máximo 5 minutos para entrar a la sala tras confirmarse el duelo.\n` +
          `3. **Grabación obligatoria:** Guarda repetición o video (GeForce / OBS) para resolver disputas.\n\n` +
          `**Mapas Oficiales Competitivos:**\n${mapsList}`,
      )
      .setColor(0xf59e0b)
      .setFooter({ text: "WTokens Fair Play" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (commandName === "staff") {
    const motivo = interaction.options.getString("motivo", true);
    await interaction.reply({
      content: `🔔 Hemos recibido tu reporte: *"${motivo}"*.\nUn árbitro o moderador revisará tu caso a la brevedad.`,
      ephemeral: true,
    });

    if (botConfig.staffAlertsChannelId) {
      try {
        const alertChannel = (await interaction.client.channels.fetch(
          botConfig.staffAlertsChannelId,
        )) as any;
        if (alertChannel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle("🔔 Llamado de Jugador a Staff")
            .setDescription(
              `**Usuario:** <@${interaction.user.id}> (${interaction.user.username})\n` +
                `**Canal:** <#${interaction.channelId}>\n` +
                `**Mensaje:** ${motivo}`,
            )
            .setColor(0xf59e0b)
            .setTimestamp();

          await alertChannel.send({
            content: botConfig.staffRoleId ? `<@&${botConfig.staffRoleId}>` : undefined,
            embeds: [embed],
          });
        }
      } catch (err) {
        console.error("Error sending staff alert:", err);
      }
    }
  }
}
