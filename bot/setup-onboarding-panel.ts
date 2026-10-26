import { botConfig } from "./config";

export const COUNTRY_ROLES: Record<
  string,
  { name: string; emoji: string; roleId: string; currency: string }
> = {
  ar: {
    name: "Argentina",
    emoji: "🇦🇷",
    roleId: "1562191759088418896",
    currency: "ARS",
  },
  pe: {
    name: "Perú",
    emoji: "🇵🇪",
    roleId: "1562191767858847899",
    currency: "PEN",
  },
  br: {
    name: "Brasil",
    emoji: "🇧🇷",
    roleId: "1564334966433906788",
    currency: "BRL",
  },
  cl: {
    name: "Chile",
    emoji: "🇨🇱",
    roleId: "1562191762313711686",
    currency: "CLP",
  },
  uy: {
    name: "Uruguay",
    emoji: "🇺🇾",
    roleId: "1562191765333741668",
    currency: "UYU",
  },
  py: {
    name: "Paraguay",
    emoji: "🇵🇾",
    roleId: "1562191771776196739",
    currency: "PYG",
  },
  bo: {
    name: "Bolivia",
    emoji: "🇧🇴",
    roleId: "1562191774791766146",
    currency: "BOB",
  },
};

export const MEMBER_ROLE_ID = "1562188702703427595"; // 🎮・Miembros
export const UNVERIFIED_ROLE_ID = "1562188705928712202"; // 👤・Sin Verificar
export const COUNTRY_CHANNEL_ID = "1562191780345155677"; // 🌎・elige-tu-país

async function postOnboardingPanel() {
  const token = botConfig.token;
  const guildId = botConfig.guildId;
  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Check or create Brasil role
  console.log("Comprobando si el rol 🇧🇷・Brasil existe...");
  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers });
  const roles = await rolesRes.json();
  let brRole = roles.find(
    (r: any) =>
      r.name.toLowerCase().includes("brasil") ||
      r.name.toLowerCase().includes("brazil"),
  );

  if (!brRole) {
    console.log("Creando rol 🇧🇷・Brasil...");
    const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "🇧🇷・Brasil",
        color: 0x009c3b, // Verde Brasil
        hoist: false,
        mentionable: true,
      }),
    });
    brRole = await r.json();
    console.log("Rol creado:", brRole.name, brRole.id);
  } else {
    console.log("Rol Brasil existente:", brRole.name, brRole.id);
  }

  COUNTRY_ROLES.br.roleId = brRole.id;

  // 2. Publish panel to 🌎・elige-tu-país
  console.log("Publicando panel actualizado de países en 🌎・elige-tu-país...");

  const embed = {
    title: "🌎 SELECCIONA TU PAÍS · WTOKENS COMPETITIVO",
    description:
      "¡Te damos la bienvenida a la comunidad oficial de **WTOKENS**!\n\n" +
      "Para desbloquear todos los canales del servidor, acceder a las colas de partidas de Fortnite y configurar tu moneda de juego, **selecciona tu país en los botones de abajo**:\n\n" +
      "• 🇦🇷 **Argentina** (ARS)\n" +
      "• 🇵🇪 **Perú** (PEN)\n" +
      "• 🇧🇷 **Brasil** (BRL)\n" +
      "• 🇨🇱 **Chile** (CLP)\n" +
      "• 🇺🇾 **Uruguay** (UYU)\n" +
      "• 🇵🇾 **Paraguay** (PYG)\n" +
      "• 🇧🇴 **Bolivia** (BOB)\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "🛡️ **Protección de la Comunidad:** Al seleccionar tu país obtendrás el rol de **Miembro** y recibirás el enlace para ingresar a la plataforma y vincular tu cuenta de Epic Games.",
    color: 0x38bdf8,
    image: {
      url: "https://wtokens.net/assets/logo.png",
    },
    footer: {
      text: "WTokens · Sistema de Verificación Automática",
    },
    timestamp: new Date().toISOString(),
  };

  // Row 1: AR, PE, BR
  const row1 = {
    type: 1,
    components: [
      {
        type: 2,
        style: 2, // Secondary
        label: "Argentina",
        emoji: { name: "🇦🇷" },
        custom_id: "select_country_ar",
      },
      {
        type: 2,
        style: 2,
        label: "Perú",
        emoji: { name: "🇵🇪" },
        custom_id: "select_country_pe",
      },
      {
        type: 2,
        style: 2,
        label: "Brasil",
        emoji: { name: "🇧🇷" },
        custom_id: "select_country_br",
      },
    ],
  };

  // Row 2: CL, UY
  const row2 = {
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: "Chile",
        emoji: { name: "🇨🇱" },
        custom_id: "select_country_cl",
      },
      {
        type: 2,
        style: 2,
        label: "Uruguay",
        emoji: { name: "🇺🇾" },
        custom_id: "select_country_uy",
      },
    ],
  };

  // Row 3: PY, BO
  const row3 = {
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: "Paraguay",
        emoji: { name: "🇵🇾" },
        custom_id: "select_country_py",
      },
      {
        type: 2,
        style: 2,
        label: "Bolivia",
        emoji: { name: "🇧🇴" },
        custom_id: "select_country_bo",
      },
    ],
  };

  const res = await fetch(`https://discord.com/api/v10/channels/${COUNTRY_CHANNEL_ID}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      embeds: [embed],
      components: [row1, row2, row3],
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log("✅ Panel con Brasil publicado exitosamente en Discord! ID:", data.id);
  } else {
    console.error("❌ Error al publicar panel:", data);
  }
}

postOnboardingPanel().catch(console.error);
