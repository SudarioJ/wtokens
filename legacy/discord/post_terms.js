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

const TERMS_CHANNEL_ID = '1562188739306983604'; // 📜・términos-y-condiciones

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
  console.log(`📜 Publicando Términos y Condiciones en canal ${TERMS_CHANNEL_ID}...`);

  // 1. Limpiar mensajes anteriores si existen
  try {
    const existing = await api(`/channels/${TERMS_CHANNEL_ID}/messages?limit=10`);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`Borrando ${existing.length} mensaje(s) antiguo(s)...`);
      for (const m of existing) {
        await api(`/channels/${TERMS_CHANNEL_ID}/messages/${m.id}`, 'DELETE');
        await new Promise(r => setTimeout(r, 400));
      }
    }
  } catch (err) {
    console.warn('Nota de borrado:', err.message);
  }

  // 2. Construir Embed oficial de Términos y Condiciones
  const payload = {
    embeds: [
      {
        title: '📜 TÉRMINOS Y CONDICIONES — W TOKENS',
        description:
          'Al ingresar y utilizar nuestro servidor, aceptás cumplir las siguientes normas. Nuestro objetivo es mantener una comunidad segura, respetuosa y justa para todos los jugadores de Fortnite.\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        color: 0x3B82F6, // Blue theme oficial
        fields: [
          {
            name: '⚡ 1. RESPETO Y CONVIVENCIA',
            value:
              '• ❌ No se permite la toxicidad, insultos, acoso, amenazas ni provocaciones.\n' +
              '• ❌ Está prohibido discriminar a otros miembros por cualquier motivo.\n' +
              '• ❌ No se permite generar peleas, discusiones innecesarias ni conflictos dentro de la comunidad.\n' +
              '• ✅ Tratá a todos los miembros con respeto.'
          },
          {
            name: '🎮 2. TOKENS Y PARTIDAS',
            value:
              '• 💎 Los tokens deben utilizarse de acuerdo con las reglas y condiciones de W TOKENS.\n' +
              '• ⚠️ Está prohibido aprovecharse de bugs, exploits o errores del sistema para obtener beneficios injustos.\n' +
              '• ❌ No se permite hacer trampas, manipular resultados ni ponerse de acuerdo con otros jugadores para alterar partidas o pagos.\n' +
              '• ✅ Cada jugador es responsable de cumplir las reglas de las colas y partidas en las que participe.'
          },
          {
            name: '🚫 3. ESTAFAS Y ENGAÑOS',
            value:
              '• ❌ Está prohibido estafar, engañar o intentar perjudicar a otros miembros.\n' +
              '• ❌ No suplantes la identidad del staff, de otros usuarios ni de W TOKENS.\n' +
              '• ❌ No compartas comprobantes falsos ni información manipulada.\n' +
              '• ⚠️ Cualquier sospecha de fraude podrá ser revisada por el equipo de moderación.'
          },
          {
            name: '🔐 4. CUENTAS Y SEGURIDAD',
            value:
              '• ❌ No compartas contraseñas, códigos de verificación ni información privada.\n' +
              '• ❌ Nadie del staff debería pedirte tu contraseña de Epic Games o de Discord.\n' +
              '• ✅ Utilizá únicamente los enlaces y plataformas oficiales de W TOKENS.\n' +
              '• ⚠️ Cada usuario es responsable de proteger sus propias cuentas.'
          },
          {
            name: '📢 5. SPAM Y PUBLICIDAD',
            value:
              '• ❌ No se permite el spam, el flood ni el envío repetitivo de mensajes.\n' +
              '• ❌ No publiques publicidad, invitaciones a otros servidores o enlaces no autorizados sin permiso del staff.\n' +
              '• ❌ No uses los canales para promocionar servicios ajenos a W TOKENS sin autorización.'
          },
          {
            name: '🛡️ 6. STAFF Y MODERACIÓN',
            value:
              '• ✅ Respetá las indicaciones del equipo de moderación.\n' +
              '• ❌ No se permite hacerse pasar por un administrador o moderador.\n' +
              '• ⚠️ Si tenés un problema o una sanción que considerás injusta, contactá al staff mediante un ticket en <#1562188846915915903>.\n' +
              '• ❌ No se permite evadir sanciones utilizando cuentas alternativas.'
          },
          {
            name: '⚖️ 7. SANCIONES',
            value:
              'El incumplimiento de estas normas puede resultar en:\n' +
              '• ⚠️ **Advertencia.**\n' +
              '• 🔇 **Silencio temporal.**\n' +
              '• ⏳ **Suspensión temporal del acceso a las actividades.**\n' +
              '• 🔒 **Suspensión de colas o de beneficios relacionados con tokens.**\n' +
              '• 🚫 **Expulsión definitiva del servidor.**\n' +
              '*La gravedad y repetición de la infracción determinarán la sanción. El equipo de moderación revisará cada caso según las pruebas disponibles.*'
          },
          {
            name: '📌 8. ACEPTACIÓN DE LAS NORMAS',
            value:
              'Al participar en W TOKENS, confirmás que leíste y aceptás estas reglas. El desconocimiento de las normas no exime de su cumplimiento.\n\n' +
              'W TOKENS podrá actualizar estas condiciones y comunicar los cambios en los canales oficiales.'
          }
        ],
        footer: {
          text: 'W TOKENS — Comunidad Oficial | https://wtokens.net/',
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
            label: 'Términos Web Completos',
            url: 'https://wtokens.net/terms.html',
            emoji: { name: '📜' }
          },
          {
            type: 2,
            style: 5,
            label: 'Centro de Ayuda / Tickets',
            url: 'https://discord.com/channels/1562177277821718539/1562188846915915903',
            emoji: { name: '🎫' }
          }
        ]
      }
    ]
  };

  const msg = await api(`/channels/${TERMS_CHANNEL_ID}/messages`, 'POST', payload);
  console.log('✅ Términos y Condiciones publicados exitosamente. Mensaje ID:', msg.id);
}

run().catch(err => {
  console.error('❌ Error al publicar términos:', err);
  process.exit(1);
});
