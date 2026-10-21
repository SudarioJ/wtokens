/**
 * WTOKENS Discord Server Deployer
 * Clona y estructura el servidor Discord de WTOKENS (Exclusivo Fortnite)
 * No requiere 'npm install': utiliza Node.js nativo con fetch.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Definición de Roles
const ROLES = [
  { name: '👑・Founder', color: 0xFF3366, hoist: true, mentionable: false },
  { name: '⚡・Administrator', color: 0x8B5CF6, hoist: true, mentionable: false },
  { name: '👮・Mediador Oficial', color: 0x3B82F6, hoist: true, mentionable: true },
  { name: '🎫・Soporte', color: 0x06B6D4, hoist: true, mentionable: true },
  { name: '🌟・Streamer W', color: 0xF59E0B, hoist: true, mentionable: false },
  { name: '💎・Server Booster', color: 0xEC4899, hoist: true, mentionable: false },
  { name: '⚡・Verificado Epic Games', color: 0x10B981, hoist: true, mentionable: false },
  { name: '🏆・Top Grinder', color: 0xEAB308, hoist: true, mentionable: false },
  { name: '🎮・Competidor Activo', color: 0x6366F1, hoist: false, mentionable: false },
  { name: '👤・Sin Verificar', color: 0x64748B, hoist: false, mentionable: false }
];

// Estructura de Categorías y Canales (Exclusivo Fortnite, diseño estilizado)
const STRUCTURE = [
  {
    category: '「 00 」VERIFICACIÓN',
    channels: [
      { name: '📌・verificación-epic', type: 0, topic: 'Vincula tu cuenta de Epic Games y Discord para jugar partidas.' },
      { name: '🔔・primeros-pasos', type: 0, topic: 'Guía rápida para empezar a jugar valiendo tokens.' }
    ]
  },
  {
    category: '「 01 」INFORMACIÓN & REGLAS',
    channels: [
      { name: '📢・anuncios', type: 0, topic: 'Novedades, eventos y actualizaciones oficiales de WTOKENS.' },
      { name: '📖・cómo-jugar', type: 0, topic: 'Tutorial paso a paso sobre cómo desafiar y reportar resultados.' },
      { name: '💰・tabla-de-apuestas', type: 0, topic: 'Valores oficiales de partidas y montos mínimos de retiro.' },
      { name: '🌐・redes-oficiales', type: 0, topic: 'Página web, TikTok, Twitter/X y canales oficiales.' },
      { name: '⚡・actualizaciones', type: 0, topic: 'Changelog de la plataforma y mejoras del bot.' },
      { name: '📜・términos-y-condiciones', type: 0, topic: 'Términos de servicio de WTOKENS.' },
      { name: '⚖️・reglas-de-partidas', type: 0, topic: 'Reglas competitivas anti-cheat, repeticiones y clips obligatorios.' }
    ]
  },
  {
    category: '「 02 」BENEFICIOS & RECOMPENSAS',
    channels: [
      { name: '🎁・sorteos', type: 0, topic: 'Sorteos semanales de tokens y pases de batalla.' },
      { name: '🏆・pruebas-sorteos', type: 0, topic: 'Capturas de entregas de premios y comprobantes.' },
      { name: '💎・ventajas-booster', type: 0, topic: 'Beneficios exclusivos por mejorar el servidor con Nitro.' },
      { name: '🏷️・tag-wtokens', type: 0, topic: 'Ponte wtokens.net en tu nick para recibir partidas sin comisión.' },
      { name: '🔗・programa-afiliados', type: 0, topic: 'Gana comisiones invitando a otros jugadores con tu código.' }
    ]
  },
  {
    category: '「 03 」COMPETITIVO & EVENTOS',
    channels: [
      { name: '👑・ranking-semanal', type: 0, topic: 'Tabla de líderes en vivo con los mejores jugadores.' },
      { name: '🌟・w-days-torneos', type: 0, topic: 'Torneos relámpago con pozo asegurado.' }
    ]
  },
  {
    category: '「 04 」COLAS FORTNITE',
    channels: [
      { name: '⚔️・1v1-buildfight', type: 0, topic: 'Cola Build Fight 1v1 estándar competitivo.' },
      { name: '🥊・1v1-boxfight', type: 0, topic: 'Cola Box Fight 1v1 clásico.' },
      { name: '🥊・2v2-boxfight', type: 0, topic: 'Cola Box Fight 2v2 por parejas.' },
      { name: '🥊・3v3-boxfight', type: 0, topic: 'Cola Box Fight 3v3.' },
      { name: '🥊・4v4-boxfight', type: 0, topic: 'Cola Box Fight 4v4 escuadras.' },
      { name: '🌋・1v1-zonewars', type: 0, topic: 'Cola Zone Wars 1v1 endgame.' },
      { name: '🌋・2v2-zonewars', type: 0, topic: 'Cola Zone Wars 2v2 endgame.' },
      { name: '🌋・3v3-zonewars', type: 0, topic: 'Cola Zone Wars 3v3.' },
      { name: '🌋・4v4-zonewars', type: 0, topic: 'Cola Zone Wars 4v4.' },
      { name: '🎯・1v1-mid-realistic', type: 0, topic: 'Cola Realistic / Mid Fight 1v1.' },
      { name: '🎯・2v2-mid-realistic', type: 0, topic: 'Cola Realistic / Mid Fight 2v2.' },
      { name: '🎯・3v3-mid-realistic', type: 0, topic: 'Cola Realistic / Mid Fight 3v3.' },
      { name: '🎯・4v4-mid-realistic', type: 0, topic: 'Cola Realistic / Mid Fight 4v4.' },
      { name: '🛡️・1v1-cero-construccion', type: 0, topic: 'Cola Zero Build 1v1.' },
      { name: '🛡️・2v2-cero-construccion', type: 0, topic: 'Cola Zero Build 2v2.' },
      { name: '🛡️・3v3-cero-construccion', type: 0, topic: 'Cola Zero Build 3v3.' },
      { name: '🛡️・4v4-cero-construccion', type: 0, topic: 'Cola Zero Build 4v4.' },
      { name: '🧩・1v1-piece-control', type: 0, topic: 'Cola Piece Control 1v1.' },
      { name: '🧩・2v2-piece-control', type: 0, topic: 'Cola Piece Control 2v2.' },
      { name: '🧩・3v3-piece-control', type: 0, topic: 'Cola Piece Control 3v3.' }
    ]
  },
  {
    category: '「 05 」SOPORTE & DISPUTAS',
    channels: [
      { name: '🎫・abrir-ticket', type: 0, topic: 'Abre un ticket con el equipo de mediación para dudas o soporte.' },
      { name: '🚨・reportes-y-disputas', type: 0, topic: 'Sube pruebas en caso de conflicto en una partida.' }
    ]
  },
  {
    category: '「 06 」COMUNIDAD',
    channels: [
      { name: '💬・chat-general', type: 0, topic: 'Conversación general de la comunidad de Fortnite.' },
      { name: '📸・clips-y-victorias', type: 0, topic: 'Comparte tus mejores jugadas y comprobantes de victorias.' },
      { name: '📺・directos-comunidad', type: 0, topic: 'Transmisiones en vivo de miembros jugando en WTOKENS.' }
    ]
  },
  {
    category: '「 07 」SALAS DE VOZ',
    channels: [
      { name: '🔊・Sala Chill 1', type: 2, user_limit: 0 },
      { name: '🔊・Sala Chill 2', type: 2, user_limit: 0 },
      { name: '🔊・Dúo 1', type: 2, user_limit: 2 },
      { name: '🔊・Dúo 2', type: 2, user_limit: 2 },
      { name: '🔊・Trío 1', type: 2, user_limit: 3 },
      { name: '🔊・Trío 2', type: 2, user_limit: 3 },
      { name: '🔊・Squad 1', type: 2, user_limit: 4 },
      { name: '🔊・Squad 2', type: 2, user_limit: 4 }
    ]
  }
];

async function apiRequest(endpoint, token, method = 'GET', body = null) {
  const url = `https://discord.com/api/v10${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `Bot ${token.trim()}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Discord API Error [${res.status}]: ${errorText}`);
  }
  return res.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('========================================================');
  console.log('       ⚡ WTOKENS DISCORD DEPLOYER (FORTNITE ONLY)      ');
  console.log('========================================================\n');

  const token = process.env.DISCORD_BOT_TOKEN || await question('Ingresa el TOKEN de tu Bot de Discord: ');
  const guildId = process.env.DISCORD_GUILD_ID || await question('Ingresa el ID de tu Servidor de Discord (Guild ID): ');

  if (!token || !guildId) {
    console.error('❌ Error: El Token y el Guild ID son requeridos.');
    process.exit(1);
  }

  try {
    console.log('\n🔍 Verificando conexión con el servidor...');
    const guild = await apiRequest(`/guilds/${guildId.trim()}`, token);
    console.log(`✅ Conectado exitosamente al servidor: "${guild.name}"`);

    // 1. Crear Roles
    console.log('\n👑 [1/3] Creando roles competitivos...');
    for (const role of ROLES) {
      try {
        await apiRequest(`/guilds/${guildId.trim()}/roles`, token, 'POST', role);
        console.log(`   + Rol creado: ${role.name}`);
        await sleep(350); // Rate-limiting friendly
      } catch (err) {
        console.warn(`   ⚠️ No se pudo crear el rol ${role.name}: ${err.message}`);
      }
    }

    // 2. Crear Categorías y Canales
    console.log('\n📁 [2/3] Creando categorías y canales (Exclusivo Fortnite)...');
    for (const catData of STRUCTURE) {
      console.log(`\n📂 Creando categoría: ${catData.category}`);
      let parentCategory = null;
      try {
        parentCategory = await apiRequest(`/guilds/${guildId.trim()}/channels`, token, 'POST', {
          name: catData.category,
          type: 4 // GUILD_CATEGORY
        });
        await sleep(400);
      } catch (err) {
        console.error(`   ❌ Error creando categoría ${catData.category}: ${err.message}`);
        continue;
      }

      for (const ch of catData.channels) {
        try {
          const payload = {
            name: ch.name,
            type: ch.type, // 0 = text, 2 = voice
            parent_id: parentCategory.id
          };
          if (ch.topic) payload.topic = ch.topic;
          if (ch.user_limit !== undefined) payload.user_limit = ch.user_limit;

          await apiRequest(`/guilds/${guildId.trim()}/channels`, token, 'POST', payload);
          console.log(`   ✓ Canal creado: ${ch.name}`);
          await sleep(350);
        } catch (err) {
          console.warn(`   ⚠️ No se pudo crear el canal ${ch.name}: ${err.message}`);
        }
      }
    }

    console.log('\n========================================================');
    console.log('🎉 ¡SERVIDOR WTOKENS CONFIGURADO CON ÉXITO!');
    console.log('Todos los roles, categorías y canales de Fortnite están listos.');
    console.log('========================================================\n');
  } catch (err) {
    console.error(`\n❌ Error crítico: ${err.message}`);
  } finally {
    rl.close();
  }
}

main();
