import {
  Client,
  GatewayIntentBits,
  Partials,
  Interaction,
  ButtonInteraction,
  TextChannel,
} from "discord.js";
import { botConfig } from "./config";
import { registerCommands, handleSlashCommand } from "./commands";
import { convertRoomToDispute } from "./rooms";
import { isStaffMember } from "./roles";

import {
  Client,
  GatewayIntentBits,
  Partials,
  Interaction,
  ButtonInteraction,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { botConfig } from "./config";
import { registerCommands, handleSlashCommand } from "./commands";
import { convertRoomToDispute } from "./rooms";
import { isStaffMember, assignGuildRole, removeGuildRole } from "./roles";
import { handleSecurityMessage, handleSecurityJoin } from "./protection";
import {
  COUNTRY_ROLES,
  MEMBER_ROLE_ID,
  UNVERIFIED_ROLE_ID,
} from "./setup-onboarding-panel";

export function createBotClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once("clientReady", async () => {
    console.log(`🤖 [Discord Bot] Conectado exitosamente como: ${client.user?.tag}`);
    await registerCommands();
  });

  // Security: Anti-Invite, Anti-Mass-Mention, Anti-Spam
  client.on("messageCreate", async (message) => {
    await handleSecurityMessage(message);
  });

  // Security: Anti-Raid Join Tracker
  client.on("guildMemberAdd", async (member) => {
    await handleSecurityJoin(client, member as GuildMember);
  });

  client.on("interactionCreate", async (interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButtonInteraction(client, interaction);
      }
    } catch (err) {
      console.error("[Discord Bot] Error en interacción:", err);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({
          content: "❌ Ocurrió un error procesando esta acción.",
          ephemeral: true,
        });
      }
    }
  });

  return client;
}

async function handleButtonInteraction(
  client: Client,
  interaction: ButtonInteraction,
): Promise<void> {
  const { customId } = interaction;

  // 1. Botón: Llamar Árbitro / Disputa en el canal de duelo
  if (customId.startsWith("call_staff_")) {
    const matchId = customId.replace("call_staff_", "");
    if (interaction.channel?.isTextBased()) {
      await interaction.reply({
        content: "🚨 Has solicitado la intervención de un árbitro. La sala ha sido marcada en disputa.",
        ephemeral: true,
      });

      await convertRoomToDispute(
        client,
        interaction.channel as TextChannel,
        matchId,
        interaction.user.id,
        "Llamado manual de árbitro mediante botón en Discord",
      );
    }
    return;
  }

  // 2. Botón: Reclamar Victoria
  if (customId.startsWith("claim_win_")) {
    const matchId = customId.replace("claim_win_", "");
    await interaction.reply({
      content:
        `🏆 Has reportado tu victoria en el Duelo \`${matchId.slice(0, 8)}\`.\n` +
        `Tu rival tiene **3 minutos** para confirmarlo o reportar su resultado en **[wtokens.net](https://wtokens.net)**.\n` +
        `Si tu rival confirma, el pozo se acreditará automáticamente a tu cuenta.`,
      ephemeral: true,
    });
    return;
  }

  // 3. Botón: Aprobar Creador de Contenido (Staff Only)
  if (customId.startsWith("approve_creator_")) {
    const isStaff = await isStaffMember(client, interaction.user.id);
    if (!isStaff) {
      await interaction.reply({
        content: "⛔ Esta acción solo puede ser ejecutada por el Staff de WTokens.",
        ephemeral: true,
      });
      return;
    }

    const code = customId.replace("approve_creator_", "");
    await interaction.update({
      content: `✅ Solicitud del código \`${code}\` **APROBADA** por <@${interaction.user.id}>. El creador recibe el 15% de comisión recurrente.`,
      components: [],
    });
    return;
  }

  // 4. Botón: Rechazar Creador de Contenido (Staff Only)
  if (customId.startsWith("reject_creator_")) {
    const isStaff = await isStaffMember(client, interaction.user.id);
    if (!isStaff) {
      await interaction.reply({
        content: "⛔ Esta acción solo puede ser ejecutada por el Staff de WTokens.",
        ephemeral: true,
      });
      return;
    }

    const code = customId.replace("reject_creator_", "");
    await interaction.update({
      content: `❌ Solicitud del código \`${code}\` **RECHAZADA** por <@${interaction.user.id}>.`,
      components: [],
    });
    return;
  }

  // 5. Botón: Solicitar Desban / Métodos de Pago
  if (customId === "request_unban_ticket") {
    await interaction.reply({
      content:
        `⚖️ **Solicitud de Reactivación / Desban Recibida**\n\n` +
        `Has solicitado pagar la penalización de **$3.00 USD** para retirar la suspensión de tu cuenta.\n\n` +
        `📌 **Instrucciones:**\n` +
        `1. Un moderador de <@&1562188681383776461> te responderá en breve para darte el alias/CVU (Mercado Pago / Yape / Transferencia).\n` +
        `2. Envía el comprobante de pago en este canal.\n` +
        `3. Al confirmarse el pago, el bot te retirará el rol de suspendido y reactivará tu cuenta en la web inmediatamente.`,
      ephemeral: true,
    });

    if (botConfig.staffAlertsChannelId) {
      try {
        const alertChannel = (await client.channels.fetch(
          botConfig.staffAlertsChannelId,
        )) as any;
        if (alertChannel?.isTextBased()) {
          await alertChannel.send({
            content: `🚨 **SOLICITUD DE DESBAN ($3 USD)**: El usuario suspendido <@${interaction.user.id}> (${interaction.user.username}) ha solicitado pagar su penalización para reactivar su cuenta. Por favor atender en <#1564317591843901500>.`,
          });
        }
      } catch (err) {
        console.error("Error sending unban staff alert:", err);
      }
    }
    return;
  }

  // 6. Botones: Selección de País y Onboarding
  if (customId.startsWith("select_country_")) {
    const countryKey = customId.replace("select_country_", "");
    const country = COUNTRY_ROLES[countryKey];
    if (!country) return;

    // Assign country role and member role
    await assignGuildRole(client, interaction.user.id, country.roleId);
    await assignGuildRole(client, interaction.user.id, MEMBER_ROLE_ID);
    await removeGuildRole(client, interaction.user.id, UNVERIFIED_ROLE_ID);

    const embed = new EmbedBuilder()
      .setTitle(`✅ ¡Bienvenido a WTOKENS!`)
      .setDescription(
        `Se te ha asignado el rol de **${country.emoji} ${country.name}** y el rol de **Miembro**.\n` +
          `Tu acceso al servidor de Discord ha sido **desbloqueado con éxito**.\n\n` +
          `🚀 **Siguiente paso obligatorio:**\n` +
          `Ingresa ahora a la plataforma web oficial para vincular tu cuenta de **Epic Games** y participar en las colas de Fortnite:`,
      )
      .setColor(0x10b981)
      .setFooter({ text: "WTokens Competitivo" });

    const linkButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("🌐 Entrar a WTOKENS (wtokens.net)")
        .setStyle(ButtonStyle.Link)
        .setURL("https://wtokens.net"),
    );

    await interaction.reply({
      embeds: [embed],
      components: [linkButton],
      ephemeral: true,
    });
    return;
  }
}
