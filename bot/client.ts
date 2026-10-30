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
  ChannelType,
  PermissionFlagsBits,
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

  // Security: Anti-Raid Join Tracker & Auto-Role
  client.on("guildMemberAdd", async (member) => {
    try {
      await assignGuildRole(client, member.id, UNVERIFIED_ROLE_ID);
    } catch (err) {
      console.error("Error auto-asignando rol unverified:", err);
    }
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

  // 7. Botón: Rechazar Duelo
  if (customId.startsWith("decline_duel_")) {
    await interaction.update({
      content: `❌ El desafío ha sido **rechazado** por <@${interaction.user.id}>.`,
      components: [],
    });
    return;
  }

  // 8. Botón: Verificación de Miembro Directa
  if (customId === "verify_member_btn") {
    try {
      await assignGuildRole(client, interaction.user.id, MEMBER_ROLE_ID);
      await removeGuildRole(client, interaction.user.id, UNVERIFIED_ROLE_ID);

      const embed = new EmbedBuilder()
        .setTitle("✅ ¡Verificación Exitosa!")
        .setDescription(
          `¡Hola, <@${interaction.user.id}>!\n\n` +
            `Se te ha otorgado el rol de **<@&${MEMBER_ROLE_ID}>** y ahora tienes acceso completo a todos los canales de **WTOKENS**.\n\n` +
            `🎮 **Vincular tu Fortnite:**\n` +
            `Para participar en salas y partidas por tokens, ingresa a la plataforma y registra tu Epic Nickname:\n` +
            `👉 **[https://wtokens.net](https://wtokens.net)**`,
        )
        .setColor(0x10b981)
        .setFooter({ text: "WTokens Competitivo • Fortnite Wagers" });

      const linkBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("🌐 Abrir WTOKENS.NET")
          .setStyle(ButtonStyle.Link)
          .setURL("https://wtokens.net"),
      );

      await interaction.reply({
        embeds: [embed],
        components: [linkBtn],
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error en verify_member_btn:", err);
      await interaction.reply({
        content: "❌ Hubo un error al asignar el rol. Por favor contacta al Staff.",
        ephemeral: true,
      });
    }
    return;
  }

  // 9. Botón: Abrir Ticket de Soporte
  if (customId.startsWith("ticket_open_")) {
    const categoryType = customId.replace("ticket_open_", "");
    const guild = interaction.guild;
    if (!guild) return;

    const safeUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
    const channelName = `ticket-${safeUsername}`;

    // Check if user already has an active ticket channel
    const existing = guild.channels.cache.find(
      (c) => c.name === channelName && c.parentId === "1562188843745022105",
    );
    if (existing) {
      await interaction.reply({
        content: `⚠️ Ya tienes un ticket abierto en <#${existing.id}>. Por favor continúa tu consulta allí.`,
        ephemeral: true,
      });
      return;
    }

    const titles: Record<string, string> = {
      general: "❓ Soporte General",
      billing: "💳 Recargas, Retiros y Pagos",
      dispute: "🚨 Reportar Partida o Disputa",
      creator: "🤝 Postulación a Creador de Contenido",
    };

    const typeTitle = titles[categoryType] || "🎫 Ticket de Soporte";

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: "1562188843745022105",
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: botConfig.staffRoleId || "1562188681383776461",
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`${typeTitle} • WTOKENS`)
        .setDescription(
          `¡Hola <@${interaction.user.id}>! Bienvenido a tu canal privado de atención.\n\n` +
            `📌 **Instrucciones:**\n` +
            `• Describe detalladamente tu consulta, reporte o solicitud.\n` +
            `• Si es sobre una partida o retiro, adjunta capturas de pantalla, ID de partida o comprobante.\n` +
            `• Un miembro del equipo de <@&1562188681383776461> te responderá en breve.\n\n` +
            `Para finalizar y cerrar este ticket cuando termine la atención, pulsa el botón abajo.`,
        )
        .setColor(0x0284c7)
        .setFooter({ text: "WTokens Support System" })
        .setTimestamp();

      const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("🔒 Cerrar Ticket")
          .setStyle(ButtonStyle.Danger),
      );

      await ticketChannel.send({
        content: `<@${interaction.user.id}> | <@&1562188681383776461>`,
        embeds: [ticketEmbed],
        components: [closeRow],
      });

      await interaction.reply({
        content: `✅ Tu ticket ha sido creado exitosamente: <#${ticketChannel.id}>. Dirígete allí para recibir ayuda.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error creando ticket:", err);
      await interaction.reply({
        content: "❌ Error creando el canal de ticket. Verifica los permisos del bot.",
        ephemeral: true,
      });
    }
    return;
  }

  // 10. Botón: Cerrar Ticket
  if (customId === "ticket_close") {
    if (!interaction.channel?.isTextBased()) return;
    await interaction.reply({
      content: "🔒 **Cerrando ticket...** Este canal se eliminará en 5 segundos.",
    });

    setTimeout(async () => {
      try {
        if ("delete" in interaction.channel!) {
          await (interaction.channel as TextChannel).delete("Ticket cerrado por el usuario o staff");
        }
      } catch (err) {
        console.error("Error eliminando canal de ticket:", err);
      }
    }, 5000);
    return;
  }
}
