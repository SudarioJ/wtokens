import { botConfig } from "./config";

export const COUNTRY_ROLES: Record<string, { name: string; emoji: string; roleId: string; currency: string }> = {
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
  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  console.log("Publicando panel de países en 🌎・elige-tu-país...");

  const embed = {
    title: "🌎 SELECCIONA TU PAÍS · WTOKENS COMPETITIVO",
    description:
      "¡Te damos la bienvenida a la comunidad oficial de **WTOKENS**!\n\n" +
      "Para desbloquear todos los canales del servidor, acceder a las colas de partidas de Fortnite y configurar tu moneda de juego, **selecciona tu país en los botones de abajo**:\n\n" +
      "• 🇦🇷 **Argentina** (ARS)\n" +
      "• 🇵🇪 **Perú** (PEN)\n" +
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

  // Row 1: AR, PE, CL
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
        label: "Chile",
        emoji: { name: "🇨🇱" },
        custom_id: "select_country_cl",
      },
    ],
  };

  // Row 2: UY, PY, BO
  const row2 = {
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: "Uruguay",
        emoji: { name: "🇺🇾" },
        custom_id: "select_country_uy",
      },
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
      components: [row1, row2],
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log("✅ Panel publicado exitosamente en Discord! Mensaje ID:", data.id);
  } else {
    console.error("❌ Error al publicar panel:", data);
  }
}

postOnboardingPanel().catch(console.error);
