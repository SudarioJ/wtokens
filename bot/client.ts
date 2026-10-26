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
}
