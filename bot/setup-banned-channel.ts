import { botConfig } from "./config";

async function setupBannedChannel() {
  const token = botConfig.token;
  const guildId = botConfig.guildId;

  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Create or find role: 🚫・Suspendido
  console.log("Comprobando roles existentes...");
  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers,
  });
  const existingRoles = await rolesRes.json();
  let bannedRole = existingRoles.find((r: any) => r.name === "🚫・Suspendido");

  if (!bannedRole) {
    console.log("Creando rol 🚫・Suspendido...");
    const roleRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "🚫・Suspendido",
        color: 0xef4444, // Red
        hoist: true,
        mentionable: false,
      }),
    });
    bannedRole = await roleRes.json();
    console.log("Rol creado:", bannedRole.name, bannedRole.id);
  } else {
    console.log("Rol 🚫・Suspendido ya existe:", bannedRole.id);
  }

  // 2. Staff roles IDs
  const adminRoleId = botConfig.staffRoleId || "1562188681383776461";
  const mediadorRoleId = "1562188684466323589";
  const soporteRoleId = "1562188687746277418";
  const everyoneRoleId = guildId;

  // ViewChannel: 1024 (0x400)
  // SendMessages: 2048 (0x800)
  // ReadMessageHistory: 65536 (0x10000)
  // AttachFiles: 32768 (0x8000)
  const allowPerms = (BigInt(1024) | BigInt(2048) | BigInt(65536) | BigInt(32768)).toString();
  const denyPerms = BigInt(1024).toString();

  // 3. Create channel: ⛔・zona-suspendidos
  console.log("Creando canal ⛔・zona-suspendidos...");
  const chanRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "⛔・zona-suspendidos",
      type: 0, // GuildText
      topic: "Área de apelación y reactivación de cuentas sancionadas en WTokens",
      permission_overwrites: [
        {
          id: everyoneRoleId,
          type: 0, // Role
          deny: denyPerms, // Deny ViewChannel
          allow: "0",
        },
        {
          id: bannedRole.id,
          type: 0,
          allow: allowPerms,
          deny: "0",
        },
        {
          id: adminRoleId,
          type: 0,
          allow: allowPerms,
          deny: "0",
        },
        {
          id: mediadorRoleId,
          type: 0,
          allow: allowPerms,
          deny: "0",
        },
        {
          id: soporteRoleId,
          type: 0,
          allow: allowPerms,
          deny: "0",
        },
      ],
    }),
  });
  const channel = await chanRes.json();
  console.log("Canal creado:", channel.name, channel.id);

  // 4. Send the embed message
  const embed = {
    title: "⛔ ZONA DE CUENTAS SUSPENDIDAS · WTOKENS",
    description:
      "Si puedes ver este canal, tu cuenta de **WTokens** y tu acceso a la arena se encuentran actualmente **SUSPENDIDOS** debido a una infracción de las normativas de juego limpio.\n\n" +
      "📌 **Motivos comunes de sanción:**\n" +
      "• Abandono injustificado de duelo en curso o desconexión intencional (W.O.).\n" +
      "• Reporte falso de resultado para intentar alterar el pozo.\n" +
      "• Conducta antideportiva, ofensas graves o toxicidad en salas privadas.\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "### ⚖️ POLÍTICA DE REACTIVACIÓN Y DESBAN\n" +
      "Para retirar la sanción y recuperar el acceso inmediato a la arena de duelos, la penalización administrativa fijada es el **equivalente a $3.00 USD en tu moneda local**:\n\n" +
      "• 🇦🇷 **Argentina:** `$3,450 ARS`\n" +
      "• 🇵🇪 **Perú:** `S/ 11.40 PEN`\n" +
      "• 🇨🇱 **Chile:** `$2,940 CLP`\n" +
      "• 🇺🇾 **Uruguay:** `$126 UYU`\n" +
      "• 🇧🇴 **Bolivia:** `21 BOB`\n" +
      "• 🇵🇾 **Paraguay:** `23,400 PYG`\n" +
      "• 🇧🇷 **Brasil:** `R$ 16.80 BRL`\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "⚠️ **AVISO IMPORTANTE:**\n" +
      "*El desban monetario NO aplica para jugadores sancionados por software no autorizado (hacks, aimbot, macros de construcción o colusión fraudulenta). En caso de reincidencia, la cuenta quedará permanentemente inhabilitada sin derecho a apelación.*",
    color: 0xef4444,
    footer: {
      text: "WTokens Fair Play & Moderación",
    },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1, // ActionRow
      components: [
        {
          type: 2, // Button
          style: 1, // Primary (Blurple)
          label: "🎫 Solicitar Desban / Métodos de Pago ($3 USD)",
          custom_id: "request_unban_ticket",
        },
      ],
    },
  ];

  const msgRes = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      embeds: [embed],
      components,
    }),
  });
  const msg = await msgRes.json();
  console.log("Mensaje publicado con éxito! ID:", msg.id);
  console.log("Canal ID final:", channel.id);
}

setupBannedChannel().catch(console.error);
