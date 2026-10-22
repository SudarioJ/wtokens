const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
let token = process.env.DISCORD_BOT_TOKEN;
let guildId = process.env.DISCORD_GUILD_ID || '1562177277821718539';

if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DISCORD_BOT_TOKEN=(.*)/);
  if (match) token = match[1].trim();
}

const REGLAS_CHANNEL_ID = '1562188743710998659'; // ⚖️・reglas-de-partidas

async function api(endpoint, method = 'GET', body = null) {
  const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Discord API Error [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  console.log(`⚖️ Publicando Reglas Oficiales en canal ${REGLAS_CHANNEL_ID}...`);

  // 1. Limpiar mensajes anteriores si existen
  try {
    const existing = await api(`/channels/${REGLAS_CHANNEL_ID}/messages?limit=10`);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`Borrando ${existing.length} mensaje(s) antiguo(s)...`);
      for (const m of existing) {
        await api(`/channels/${REGLAS_CHANNEL_ID}/messages/${m.id}`, 'DELETE');
        await new Promise(r => setTimeout(r, 400));
      }
    }
  } catch (err) {
    console.warn('Nota de borrado:', err.message);
  }

  // 2. Construir Embed oficial de alta calidad
  const payload = {
    embeds: [
      {
        title: '🎮 REGLAS OFICIALES DE PARTIDA — W TOKENS',
        description: 
          'Para garantizar partidas justas, todos los jugadores deben respetar las siguientes reglas oficiales en cada duelo y cola de Fortnite.\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        color: 0x3B82F6, // Blue theme
        fields: [
          {
            name: '📶 1. PROBLEMAS DE CONEXIÓN',
            value: 
              '• Si a un jugador se le corta el Wi-Fi o pierde la conexión al inicio de la ronda **no contará**.\n' +
              '• Durante o al final de la ronda, la ronda **seguirá contando normalmente**.\n' +
              '• ❌ No se reiniciará la ronda por problemas de internet individuales.\n' +
              '• 🏆 La victoria se le otorgará al equipo ganador dentro de la partida, independientemente de que un rival se haya desconectado.\n' +
              '• ⚠️ Cada jugador es responsable de contar con una conexión estable antes de comenzar.'
          },
          {
            name: '🏆 2. RESULTADO DE LA RONDA',
            value: 
              '• El resultado válido será estrictamente el que se obtenga dentro de la partida.\n' +
              '• ❌ No se permite exigir una repetición únicamente por haber perdido.\n' +
              '• 📸 Se recomienda guardar capturas o clips como prueba del resultado.\n' +
              '• 🛡️ Si existe una sospecha de trampa o un error grave, el staff podrá revisar el caso.'
          },
          {
            name: '🚫 3. ABANDONAR LA PARTIDA',
            value: 
              '• Si un jugador abandona voluntariamente una ronda, esta continuará siempre que sea posible.\n' +
              '• ❌ No se podrá abandonar una partida para evitar una derrota y exigir que se repita.\n' +
              '• 🏆 Se respetará el resultado obtenido por el equipo ganador.'
          },
          {
            name: '⚠️ 4. BUGS Y PROBLEMAS DEL JUEGO',
            value: 
              '• Si ocurre un error menor que no impide continuar, la ronda seguirá normalmente.\n' +
              '• Si existe un fallo general del servidor de Epic Games o una caída que afecte a ambos equipos, el staff podrá decidir si corresponde repetir la ronda.\n' +
              '• ❌ Prohibido aprovechar bugs o exploits para obtener ventajas injustas.'
          },
          {
            name: '🤝 5. JUEGO LIMPIO',
            value: 
              '• ❌ Prohibido usar cheats, hacks, macros o herramientas que otorguen ventajas ilegales.\n' +
              '• ❌ Prohibido colaborar con el equipo rival para manipular el resultado.\n' +
              '• ❌ Prohibido insultar, provocar o acosar a otros jugadores durante las partidas.\n' +
              '• ✅ Todos deben respetar las decisiones del staff y mantener una conducta deportiva.'
          },
          {
            name: '📩 6. RECLAMOS Y PRUEBAS',
            value: 
              '• Cualquier reclamo deberá presentarse mediante el canal oficial <#1562188846915915903> (・abrir-ticket).\n' +
              '• 🎥 Los reclamos deben incluir pruebas claras (clips grabados con GeForce / OBS / Radeon) cuando sea posible.\n' +
              '• ❌ No se aceptarán reclamos sin fundamento ni solicitudes de repetición por disconformidad con el resultado.\n' +
              '• 🛡️ El staff tendrá la última palabra en los casos excepcionales que no estén contemplados en estas reglas.'
          }
        ],
        footer: {
          text: '💙 W TOKENS — Juego limpio, reglas claras y competencia justa. | wtokens.net',
          icon_url: 'https://wtokens.net/assets/logo.png'
        }
      }
    ],
    components: [
      {
        type: 1, // ActionRow
        components: [
          {
            type: 2,
            style: 5,
            label: 'Web Oficial (wtokens.net)',
            url: 'https://wtokens.net/',
            emoji: { name: '🌐' }
          },
          {
            type: 2,
            style: 5,
            label: 'Abrir Ticket de Soporte',
            url: 'https://discord.com/channels/1562177277821718539/1562188846915915903',
            emoji: { name: '🎫' }
          }
        ]
      }
    ]
  };

  const msg = await api(`/channels/${REGLAS_CHANNEL_ID}/messages`, 'POST', payload);
  console.log('✅ Reglas publicadas exitosamente. Mensaje ID:', msg.id);
}

run().catch(err => {
  console.error('❌ Error al publicar reglas:', err);
  process.exit(1);
});
