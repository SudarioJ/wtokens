/**
 * WTOKENS Discord Master Deployer
 * Automatización completa: Limpieza de placeholders, roles, categorías, canales y mensajes embebidos.
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1562177277821718539';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(endpoint, method = 'GET', body = null) {
  const url = `https://discord.com/api/v10${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[${res.status}] ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const ROLES = [
  { name: '👑・Founder', color: 0xFF2A5F, hoist: true },
  { name: '⚡・Administrator', color: 0x8B5CF6, hoist: true },
  { name: '👮・Mediador Oficial', color: 0x3B82F6, hoist: true, mentionable: true },
  { name: '🎫・Soporte', color: 0x06B6D4, hoist: true, mentionable: true },
  { name: '🌟・Streamer W', color: 0xF59E0B, hoist: true },
  { name: '💎・Server Booster', color: 0xEC4899, hoist: true },
  { name: '⚡・Verificado Epic Games', color: 0x10B981, hoist: true },
  { name: '🏆・Top Grinder', color: 0xEAB308, hoist: true },
  { name: '🎮・Competidor Activo', color: 0x6366F1, hoist: false },
  { name: '👤・Sin Verificar', color: 0x64748B, hoist: false }
];

const CATEGORIES = [
  {
    name: '「 00 」VERIFICACIÓN',
    channels: [
      { name: '📌・verificación-epic', topic: 'Vincula tu cuenta de Discord y Epic Games para jugar partidas.', key: 'verif' },
      { name: '🔔・primeros-pasos', topic: 'Guía de inicio en WTOKENS.' }
    ]
  },
  {
    name: '「 01 」INFORMACIÓN & REGLAS',
    channels: [
      { name: '📢・anuncios', topic: 'Novedades oficiales de WTOKENS.', key: 'anuncios' },
      { name: '📖・cómo-jugar', topic: 'Instrucciones para apostar y reportar resultados.', key: 'comojugar' },
      { name: '💰・tabla-de-apuestas', topic: 'Montos de entrada oficiales y comisiones.', key: 'tarifas' },
      { name: '🌐・redes-oficiales', topic: 'Web oficial, Twitter/X y TikTok.', key: 'redes' },
      { name: '⚡・actualizaciones', topic: 'Novedades del bot y la plataforma.' },
      { name: '📜・términos-y-condiciones', topic: 'Términos de servicio de WTOKENS.' },
      { name: '⚖️・reglas-de-partidas', topic: 'Reglamento competitivo y anti-cheat.', key: 'reglas' }
    ]
  },
  {
    name: '「 02 」BENEFICIOS',
    channels: [
      { name: '🎁・sorteos', topic: 'Sorteos semanales de tokens y recompensas.' },
      { name: '🏆・pruebas-sorteos', topic: 'Comprobantes de entrega a los ganadores.' },
      { name: '💎・ventajas-booster', topic: 'Beneficios por boostear con Discord Nitro.' },
      { name: '🏷️・tag-wtokens', topic: 'Ponte wtokens.net en tu nombre para beneficios.' },
      { name: '🔗・programa-afiliados', topic: 'Gana comisiones invitando a tus amigos.' }
    ]
  },
  {
    name: '「 03 」COMPETITIVO',
    channels: [
      { name: '👑・ranking-semanal', topic: 'Tabla de líderes actualizada en tiempo real.' },
      { name: '🌟・w-days-torneos', topic: 'Torneos especiales con 0% de comisión.' }
    ]
  },
  {
    name: '「 04 」COLAS FORTNITE',
    channels: [
      { name: '⚔️・1v1-buildfight', topic: 'Cola Build Fight 1v1 estándar competitivo.' },
      { name: '🥊・1v1-boxfight', topic: 'Cola Box Fight 1v1 clásico.' },
      { name: '🥊・2v2-boxfight', topic: 'Cola Box Fight 2v2 por parejas.' },
      { name: '🥊・3v3-boxfight', topic: 'Cola Box Fight 3v3.' },
      { name: '🥊・4v4-boxfight', topic: 'Cola Box Fight 4v4 escuadras.' },
      { name: '🌋・1v1-zonewars', topic: 'Cola Zone Wars 1v1 endgame.' },
      { name: '🌋・2v2-zonewars', topic: 'Cola Zone Wars 2v2 endgame.' },
      { name: '🌋・3v3-zonewars', topic: 'Cola Zone Wars 3v3.' },
      { name: '🌋・4v4-zonewars', topic: 'Cola Zone Wars 4v4.' },
      { name: '🎯・1v1-mid-realistic', topic: 'Cola Realistic / Mid Fight 1v1.' },
      { name: '🎯・2v2-mid-realistic', topic: 'Cola Realistic / Mid Fight 2v2.' },
      { name: '🎯・3v3-mid-realistic', topic: 'Cola Realistic / Mid Fight 3v3.' },
      { name: '🎯・4v4-mid-realistic', topic: 'Cola Realistic / Mid Fight 4v4.' },
      { name: '🛡️・1v1-cero-construccion', topic: 'Cola Zero Build 1v1.' },
      { name: '🛡️・2v2-cero-construccion', topic: 'Cola Zero Build 2v2.' },
      { name: '🛡️・3v3-cero-construccion', topic: 'Cola Zero Build 3v3.' },
      { name: '🛡️・4v4-cero-construccion', topic: 'Cola Zero Build 4v4.' },
      { name: '🧩・1v1-piece-control', topic: 'Cola Piece Control 1v1.' },
      { name: '🧩・2v2-piece-control', topic: 'Cola Piece Control 2v2.' },
      { name: '🧩・3v3-piece-control', topic: 'Cola Piece Control 3v3.' }
    ]
  },
  {
    name: '「 05 」SOPORTE & DISPUTAS',
    channels: [
      { name: '🎫・abrir-ticket', topic: 'Crea un ticket para soporte o mediación de partidas.', key: 'ticket' },
      { name: '🚨・reportes-y-disputas', topic: 'Canal para subir pruebas y clips en conflicto.' }
    ]
  },
  {
    name: '「 06 」COMUNIDAD',
    channels: [
      { name: '💬・chat-general', topic: 'Chat principal de la comunidad.' },
      { name: '📸・clips-y-victorias', topic: 'Comparte tus mejores jugadas y victorias.' },
      { name: '📺・directos-comunidad', topic: 'Streams en vivo de miembros jugando en WTOKENS.' }
    ]
  },
  {
    name: '「 07 」SALAS DE VOZ',
    channels: [
      { name: '🔊・Sala Chill 1', type: 2, user_limit: 0 },
      { name: '🔊・Sala Chill 2', type: 2, user_limit: 0 },
      { name: '🔊・Dúo 1 [2P]', type: 2, user_limit: 2 },
      { name: '🔊・Dúo 2 [2P]', type: 2, user_limit: 2 },
      { name: '🔊・Trío 1 [3P]', type: 2, user_limit: 3 },
      { name: '🔊・Trío 2 [3P]', type: 2, user_limit: 3 },
      { name: '🔊・Squad 1 [4P]', type: 2, user_limit: 4 },
      { name: '🔊・Squad 2 [4P]', type: 2, user_limit: 4 }
    ]
  }
];

async function run() {
  console.log('⚡ Iniciando Despliegue de WTOKENS...');

  // 1. Renombrar el servidor
  try {
    await api(`/guilds/${GUILD_ID}`, 'PATCH', { name: '⚡ WTOKENS | Fortnite' });
    console.log('✅ Servidor renombrado a: ⚡ WTOKENS | Fortnite');
  } catch (e) {
    console.log('ℹ️ Nombre del servidor conservado o limitado:', e.message);
  }

  // 2. Limpiar canales antiguos placeholder
  console.log('🧹 Limpiando canales antiguos...');
  const oldChannels = await api(`/guilds/${GUILD_ID}/channels`);
  for (const ch of oldChannels) {
    try {
      await api(`/channels/${ch.id}`, 'DELETE');
      console.log(`   - Canal eliminado: ${ch.name}`);
      await sleep(250);
    } catch (e) {
      console.warn(`   ⚠️ No se pudo eliminar ${ch.name}: ${e.message}`);
    }
  }

  // 3. Crear Roles
  console.log('\n👑 Creando roles competitivos...');
  for (const r of ROLES) {
    try {
      await api(`/guilds/${GUILD_ID}/roles`, 'POST', r);
      console.log(`   + Rol creado: ${r.name}`);
      await sleep(300);
    } catch (e) {
      console.warn(`   ⚠️ Rol ${r.name}: ${e.message}`);
    }
  }

  // 4. Crear Categorías y Canales
  console.log('\n📁 Creando categorías y canales...');
  const createdChannels = {};

  for (const cat of CATEGORIES) {
    console.log(`\n📂 Categoría: ${cat.name}`);
    const parent = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
      name: cat.name,
      type: 4
    });
    await sleep(350);

    for (const ch of cat.channels) {
      const payload = {
        name: ch.name,
        type: ch.type || 0,
        parent_id: parent.id
      };
      if (ch.topic) payload.topic = ch.topic;
      if (ch.user_limit !== undefined) payload.user_limit = ch.user_limit;

      const created = await api(`/guilds/${GUILD_ID}/channels`, 'POST', payload);
      console.log(`   ✓ ${ch.name}`);
      if (ch.key) createdChannels[ch.key] = created.id;
      await sleep(300);
    }
  }

  // 5. Enviar mensajes embebidos profesionales
  console.log('\n💬 Publicando mensajes embebidos oficiales...');

  if (createdChannels.verif) {
    await api(`/channels/${createdChannels.verif}/messages`, 'POST', {
      embeds: [{
        title: '⚡ VERIFICACIÓN OFICIAL DE EPIC GAMES',
        description: '**¡Bienvenido a WTOKENS!**\n\nPara poder acceder a las colas de Fortnite y recibir pagos de partidas valiendo tokens, es obligatorio vincular tu cuenta de Discord con tu cuenta de Epic Games.',
        color: 0x8B5CF6,
        fields: [
          { name: '1. ¿Cómo funciona?', value: 'Haz clic en el botón de abajo o visita la web oficial para ingresar tu usuario de Epic Games.' },
          { name: '2. Seguridad Anti-Smurf', value: 'Solo cuentas verificadas pueden participar en las salas competitivas para garantizar un entorno 100% limpio y sin trampas.' }
        ],
        footer: { text: 'WTOKENS · Sistema de Bóveda y Mediación' }
      }],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: 'Abrir Verificación Web',
              url: 'http://localhost:3000'
            }
          ]
        }
      ]
    });
    console.log('   ✓ Embed de verificación enviado');
    await sleep(300);
  }

  if (createdChannels.comojugar) {
    await api(`/channels/${createdChannels.comojugar}/messages`, 'POST', {
      embeds: [{
        title: '📖 CÓMO JUGAR EN WTOKENS',
        description: 'Aprende en 4 pasos a desafiar oponentes y retirar tus ganancias:',
        color: 0x06B6D4,
        fields: [
          { name: '01 · Entra a una cola', value: 'Ve a la categoría **「 04 」COLAS FORTNITE** y selecciona tu modo (Box Fight, Zone Wars, Build, etc.).' },
          { name: '02 · Depósito en Bóveda', value: 'Ambos jugadores pagan la entrada acordada. El bot retiene el monto en la bóveda de forma segura.' },
          { name: '03 · Duelo en Fortnite', value: 'Jueguen el match en la isla creativa indicada. Es obligatorio grabar repetición o clips con GeForce / OBS.' },
          { name: '04 · Confirmación & Pago', value: 'El ganador sube la captura de victoria. El bot valida el resultado y deposita las ganancias de inmediato.' }
        ],
        footer: { text: 'WTOKENS · Partidas Seguras 24/7' }
      }]
    });
    console.log('   ✓ Embed de cómo jugar enviado');
    await sleep(300);
  }

  if (createdChannels.tarifas) {
    await api(`/channels/${createdChannels.tarifas}/messages`, 'POST', {
      embeds: [{
        title: '💰 TABLA DE APUESTAS & VALORES',
        description: 'Montos de entrada admitidos en WTOKENS:\n\n' +
          '• **Tier Starter:** $2.00 / $5.00 USD (Pozo: $4 - $10)\n' +
          '• **Tier Competitivo:** $10.00 / $20.00 USD (Pozo: $20 - $40)\n' +
          '• **Tier High Roller:** $50.00 / $100.00 USD (Pozo: $100 - $200)\n\n' +
          '🔹 **Comisión:** 10% estándar (0% si usas código de creador o eres Booster)\n' +
          '🔹 **Retiro mínimo:** $10.00 USD vía MercadoPago, PIX, PayPal, Binance o Cripto.',
        color: 0x10B981,
        footer: { text: 'WTOKENS Economics' }
      }]
    });
    console.log('   ✓ Embed de tarifas enviado');
    await sleep(300);
  }

  if (createdChannels.ticket) {
    await api(`/channels/${createdChannels.ticket}/messages`, 'POST', {
      embeds: [{
        title: '🎫 CENTRO DE ATENCIÓN & DISPUTAS',
        description: '¿Tuviste un problema en una partida, duda con un retiro o tu rival no reportó el resultado?\n\nNuestro equipo de mediadores oficiales está disponible 24/7 para resolver disputas revisando clips y repeticiones.',
        color: 0xEC4899,
        fields: [
          { name: '⚠️ Regla de Oro', value: 'Ten siempre listo el clip de tu victoria. Sin pruebas en video no se puede adjudicar una disputa en conflicto.' }
        ],
        footer: { text: 'WTOKENS Staff & Mediación' }
      }]
    });
    console.log('   ✓ Embed de tickets enviado');
  }

  console.log('\n========================================================');
  console.log('🎉 ¡SERVIDOR WTOKENS TOTALMENTE DESPLEGADO Y CONFIGURADO!');
  console.log('========================================================\n');
}

run().catch(err => console.error('❌ Error fatal:', err));
