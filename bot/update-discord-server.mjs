import { REST, Routes, PermissionFlagsBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
const guildId = process.env.DISCORD_GUILD_ID;
const memberRoleId = process.env.DISCORD_MEMBER_ROLE_ID || "1562188702703427595";
const everyoneRoleId = guildId;

async function hideChannel(channelId, channelName) {
  try {
    // Deny VIEW_CHANNEL (1024) to @everyone and members role
    await rest.put(Routes.channelPermission(channelId, everyoneRoleId), {
      body: {
        id: everyoneRoleId,
        type: 0, // role
        deny: String(PermissionFlagsBits.ViewChannel),
      },
    });
    await rest.put(Routes.channelPermission(channelId, memberRoleId), {
      body: {
        id: memberRoleId,
        type: 0, // role
        deny: String(PermissionFlagsBits.ViewChannel),
      },
    });
    console.log(`[OK] Ocultado canal: ${channelName} (${channelId})`);
  } catch (err) {
    console.error(`[ERR] Error ocultando ${channelName}:`, err.message);
  }
}

async function run() {
  console.log("Iniciando actualización del servidor de Discord...");

  // 1. Limpiar reglas en ⚖️・reglas-de-partidas (1562188743710998659)
  console.log("\n1. Actualizando reglas en ⚖️・reglas-de-partidas...");
  const cleanRulesEmbed = {
    title: "REGLAS OFICIALES DE PARTIDA — WTOKENS",
    description: "Normas de competencia obligatorias para todas las partidas, duelos y colas en WTOKENS.\nEl desconocimiento de estas reglas no exime de su cumplimiento.",
    color: 0x3b82f6,
    fields: [
      {
        name: "1. Conexión e Internet",
        value: "• Si un jugador pierde conexión antes del inicio de la primera ronda, la ronda no se contabiliza.\n• Si la desconexión ocurre durante o al final de la ronda, la partida continúa normalmente.\n• No se reinician rondas por problemas individuales de conexión. Cada jugador es responsable de su estabilidad de red.",
        inline: false,
      },
      {
        name: "2. Resultados Válidos",
        value: "• El resultado oficial es el dictado por el juego dentro de Fortnite.\n• No se aceptan solicitudes de repetición por disconformidad con una derrota.\n• Se recomienda conservar clips o capturas como respaldo ante cualquier desacuerdo.",
        inline: false,
      },
      {
        name: "3. Abandono de Partida",
        value: "• Abandonar una partida deliberadamente para evitar la derrota resultará en la pérdida inmediata de la misma y posibles sanciones al usuario.",
        inline: false,
      },
      {
        name: "4. Fallos del Servidor y Exploits",
        value: "• Errores menores que no interrumpan la partida no anulan la ronda.\n• En caso de caída general de los servidores de Epic Games comprobable, el Staff podrá determinar la anulación.\n• Queda estrictamente prohibido el uso intencional de bugs o exploits.",
        inline: false,
      },
      {
        name: "5. Juego Limpio (Fair Play)",
        value: "• Prohibido el uso de cheats, macros, hardware no autorizado o cualquier herramienta externa que otorgue ventajas indebidas.\n• Prohibida la confabulación (teaming) entre rivales para alterar resultados.\n• Se exige respeto y trato deportivo en todo momento.",
        inline: false,
      },
      {
        name: "6. Reclamos y Soporte",
        value: "• Los reclamos deben presentarse únicamente a través del canal oficial <#1562188846915915903> adjuntando evidencia en video (GeForce / OBS / Radeon / consola).\n• La resolución del Staff es inapelable y definitiva.",
        inline: false,
      },
    ],
    footer: {
      text: "WTOKENS | Competencia Justa y Transparente • wtokens.net",
      icon_url: "https://wtokens.net/assets/logo.png",
    },
  };

  // Buscar mensajes existentes en reglas para editar o mandar nuevo
  const oldMsgs = await rest.get(Routes.channelMessages("1562188743710998659"), {
    query: new URLSearchParams({ limit: "5" }),
  });

  if (oldMsgs.length > 0) {
    await rest.patch(Routes.channelMessage("1562188743710998659", oldMsgs[0].id), {
      body: { embeds: [cleanRulesEmbed] },
    });
    console.log("[OK] Mensaje de reglas actualizado con diseño limpio sin emojis excesivos.");
  } else {
    await rest.post(Routes.channelMessages("1562188743710998659"), {
      body: { embeds: [cleanRulesEmbed] },
    });
    console.log("[OK] Mensaje de reglas publicado.");
  }

  // 2. Ocultar canales en BENEFICIOS (dejar solo programa de afiliados y ventajas de booster)
  console.log("\n2. Ajustando categoría BENEFICIOS...");
  await hideChannel("1562188751457886330", "🎁・sorteos");
  await hideChannel("1562188754519588974", "🏆・pruebas-sorteos");
  await hideChannel("1562188761733800026", "🏷️・tag-wtokens");

  // 3. Ocultar categoría COMPETITIVO por ahora
  console.log("\n3. Ocultando categoría COMPETITIVO...");
  await hideChannel("1562188767329124494", "「 03 」COMPETITIVO");
  await hideChannel("1562188771091546142", "👑・ranking-semanal");
  await hideChannel("1562188774056927355", "🌟・w-days-torneos");

  // 4. Publicar guía en 🔔・primeros-pasos (1562188716708069502)
  console.log("\n4. Publicando guía en 🔔・primeros-pasos...");
  const primerosPasosEmbed = {
    title: "GUÍA DE INICIO — WTOKENS",
    description: "Bienvenido a WTOKENS, la plataforma de duelos y competencia de Fortnite en Latinoamérica.\nSigue estos pasos básicos para comenzar:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    color: 0x5eeaff,
    fields: [
      {
        name: "Paso 1: Elige tu país",
        value: "Dirígete a <#1562191780345155677> y presiona la bandera de tu país. Esto desbloqueará todos los canales del servidor y te otorgará el rol de Miembro.",
        inline: false,
      },
      {
        name: "Paso 2: Vincula tu cuenta de Fortnite",
        value: "Ingresa en **[wtokens.net](https://wtokens.net)** y conecta tu cuenta oficial de Epic Games. Esto certifica tu Nickname real de Fortnite y te otorga la insignia de verificado.",
        inline: false,
      },
      {
        name: "Paso 3: Billetera y WTokens (1 WT = $1 USD)",
        value: "En la sección Billetera de **[wtokens.net](https://wtokens.net)** puedes cargar saldo fácilmente con Mercado Pago, Lemon Cash, Belo (Pix Brasil), Binance Pay o PayPal.\nPuedes consultar tu saldo disponible en cualquier momento con el comando `/saldo`.",
        inline: false,
      },
      {
        name: "Paso 4: Juega partidas y duelos",
        value: "• **En Discord:** Usa `/duelo @usuario [modo] [apuesta]` para retar directamente a cualquier rival.\n• **En las colas:** Entra a la categoría de Fortnite y elige el formato (1v1, 2v2, etc.).\n• **En la web:** Crea salas abiertas o únete a las creadas por otros jugadores.",
        inline: false,
      },
      {
        name: "Paso 5: Reporte y cobro de ganancias",
        value: "Al terminar el enfrentamiento, ambos jugadores confirman el resultado en la web. El pozo se acredita al ganador y los fondos se pueden retirar a tu cuenta en cualquier momento (mínimo de retiro: 10 WT).",
        inline: false,
      },
    ],
    footer: {
      text: "WTOKENS | Soporte en #abrir-ticket • wtokens.net",
      icon_url: "https://wtokens.net/assets/logo.png",
    },
  };

  // Limpiar mensajes previos si hubiera
  const existingSteps = await rest.get(Routes.channelMessages("1562188716708069502"), {
    query: new URLSearchParams({ limit: "5" }),
  });

  if (existingSteps.length > 0) {
    await rest.patch(Routes.channelMessage("1562188716708069502", existingSteps[0].id), {
      body: { embeds: [primerosPasosEmbed] },
    });
  } else {
    await rest.post(Routes.channelMessages("1562188716708069502"), {
      body: { embeds: [primerosPasosEmbed] },
    });
  }
  console.log("[OK] Guía de Primeros Pasos publicada exitosamente.");

  console.log("\n¡Todas las modificaciones del servidor de Discord fueron aplicadas con éxito!");
}

run().catch(console.error);
