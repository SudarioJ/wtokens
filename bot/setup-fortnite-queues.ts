import { botConfig, FORTNITE_MAPS } from "./config";

const COLAS_CATEGORY_ID = "1562188777286279242"; // 「 04 」COLAS FORTNITE

const DESIRED_MODES = [
  {
    name: "🥊・box-fight",
    modeKey: "BOX_FIGHT",
    title: "🥊 Box Fight (Fortnite 1v1 / 2v2 / 3v3 / 4v4)",
    code: "7620-0771-9529",
    desc: "Combate cerrado a corta distancia en cajas 1x1. Gana quien domine el control de piezas, escopetazos y reseteos.",
  },
  {
    name: "⚔️・build-fight",
    modeKey: "BUILD_FIGHT",
    title: "⚔️ Build Fight (Fortnite 1v1 / 2v2 / 3v3 / 4v4)",
    code: "8064-7152-2934",
    desc: "Batalla clásica por la altura con reseteos continuos. Ideal para jugadores mecánicos y veloces.",
  },
  {
    name: "🌋・zone-wars",
    modeKey: "ZONE_WARS",
    title: "🌋 Zone Wars (Endgame 1v1 / 2v2 / 3v3 / 4v4)",
    code: "4059-2791-0171",
    desc: "Simulación de tormenta en movimiento constante. Prueba tu rotación, tarping y puntería bajo presión.",
  },
  {
    name: "🎯・realistic",
    modeKey: "REALISTICS",
    title: "🎯 Realistics / Mid Game (1v1 / 2v2 / 3v3 / 4v4)",
    code: "7950-6300-4857",
    desc: "Escenarios idénticos a partidas competitivas reales con loot y vida aleatorios.",
  },
  {
    name: "🛡️・cero-construccion",
    modeKey: "ZERO_BUILD",
    title: "🛡️ Cero Construcción (Fortnite 1v1 / 2v2)",
    code: "9914-1234-5678",
    desc: "Puntería pura, uso de coberturas y posicionamiento estratégico sin edificaciones.",
  },
  {
    name: "🧩・piece-control",
    modeKey: "PIECE_CONTROL",
    title: "🧩 Piece Control (1v1 / 2v2)",
    code: "3120-9845-1102",
    desc: "Dominio absoluto de paredes, conos y escaleras para encerrar al rival y castigar.",
  },
];

async function setupFortniteQueues() {
  const token = botConfig.token;
  const guildId = botConfig.guildId;
  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  console.log("Obteniendo canales de la categoría COLAS FORTNITE...");
  const chansRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers });
  const allChannels = await chansRes.json();
  const existingColas = allChannels.filter((c: any) => c.parent_id === COLAS_CATEGORY_ID);

  console.log(`Encontrados ${existingColas.length} canales en COLAS FORTNITE.`);

  // 1. Delete redundant sub-channels (keeping or creating 1 single channel per mode)
  for (const c of existingColas) {
    const isTarget = DESIRED_MODES.some((m) => m.name === c.name);
    if (!isTarget) {
      console.log(`Eliminando canal redundante: #${c.name} (${c.id})...`);
      await fetch(`https://discord.com/api/v10/channels/${c.id}`, {
        method: "DELETE",
        headers,
      });
      // Small delay to prevent rate limit
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // 2. Ensure each desired mode channel exists and has the interactive panel
  for (const mode of DESIRED_MODES) {
    let chan = existingColas.find((c: any) => c.name === mode.name);

    if (!chan) {
      console.log(`Creando canal para modalidad: #${mode.name}...`);
      const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: mode.name,
          type: 0, // GuildText
          parent_id: COLAS_CATEGORY_ID,
          topic: `Cola oficial de ${mode.title} · Elige 1v1, 2v2, 3v3 o 4v4 para buscar rival`,
        }),
      });
      chan = await createRes.json();
      console.log(`Canal #${mode.name} creado: ${chan.id}`);
    } else {
      console.log(`Canal #${mode.name} ya existe: ${chan.id}`);
    }

    // 3. Post interactive format panel in this mode channel
    const embed = {
      title: mode.title,
      description:
        `${mode.desc}\n\n` +
        `📍 **Código Oficial de Isla:** \`${mode.code}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `### 🎮 ¿CÓMO JUGAR O DESAFIAR?\n` +
        `1. **Escribe en este canal** si buscas rival para jugar amistoso o apostando tokens.\n` +
        `2. **Usa el comando:** \`/duelo @oponente\` para desafiar a alguien directamente.\n` +
        `3. O haz clic en los botones de abajo para entrar a la sala oficial en la web:`,
      color: 0x38bdf8,
      footer: {
        text: "WTokens · Duelos Automatizados con Bóveda Escrow",
      },
    };

    const buttons = {
      type: 1,
      components: [
        {
          type: 2,
          style: 1, // Primary
          label: "⚔️ 1v1 (Tokens)",
          custom_id: `queue_${mode.modeKey}_1v1`,
        },
        {
          type: 2,
          style: 2, // Secondary
          label: "👥 2v2",
          custom_id: `queue_${mode.modeKey}_2v2`,
        },
        {
          type: 2,
          style: 2, // Secondary
          label: "🔥 3v3 / 4v4",
          custom_id: `queue_${mode.modeKey}_squad`,
        },
        {
          type: 2,
          style: 5, // Link button
          label: "🌐 Buscar en la Web",
          url: `https://wtokens.net/?mode=${mode.modeKey}`,
        },
      ],
    };

    await fetch(`https://discord.com/api/v10/channels/${chan.id}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        embeds: [embed],
        components: [buttons],
      }),
    });

    console.log(`✅ Panel interactivo publicado en #${mode.name}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("🎉 Categoría COLAS FORTNITE configurada y simplificada al 100%!");
}

setupFortniteQueues().catch(console.error);
