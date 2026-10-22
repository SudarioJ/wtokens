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

const CHANNEL_ID = '1562188733682290769'; // 🌐・redes-oficiales

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
  console.log(`🌐 Publicando Redes Sociales Oficiales en canal ${CHANNEL_ID}...`);

  // Limpiar mensajes antiguos
  try {
    const existing = await api(`/channels/${CHANNEL_ID}/messages?limit=10`);
    if (Array.isArray(existing) && existing.length > 0) {
      console.log(`Borrando ${existing.length} mensaje(s) antiguo(s)...`);
      for (const m of existing) {
        await api(`/channels/${CHANNEL_ID}/messages/${m.id}`, 'DELETE');
        await new Promise(r => setTimeout(r, 400));
      }
    }
  } catch (err) {
    console.warn('Nota sobre borrado:', err.message);
  }

  // Embed Oficial con Botones Interactivos
  const payload = {
    embeds: [
      {
        title: '🌐 REDES SOCIALES OFICIALES — W TOKENS',
        description:
          '¡Seguinos en todas nuestras plataformas y no te pierdas ninguna novedad de **W TOKENS**!\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '🌐 **PÁGINA WEB OFICIAL:**\n' +
          '👉 [https://wtokens.net/](https://wtokens.net/)\n\n' +
          '🎵 **TIKTOK:**\n' +
          '👉 [https://www.tiktok.com/@wtokens6](https://www.tiktok.com/@wtokens6)\n\n' +
          '📸 **INSTAGRAM:**\n' +
          '👉 [https://www.instagram.com/w.tokens/](https://www.instagram.com/w.tokens/)\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        color: 0x3B82F6, // Blue theme matching the latest design
        thumbnail: {
          url: 'https://wtokens.net/assets/logo.png'
        },
        footer: {
          text: 'WTOKENS · Comunidad Oficial de Fortnite Sudamérica',
          icon_url: 'https://wtokens.net/assets/logo.png'
        }
      }
    ],
    components: [
      {
        type: 1, // ActionRow
        components: [
          {
            type: 2, // Button
            style: 5, // Link
            label: 'Página Web Oficial',
            url: 'https://wtokens.net/',
            emoji: { name: '🌐' }
          },
          {
            type: 2, // Button
            style: 5, // Link
            label: 'TikTok',
            url: 'https://www.tiktok.com/@wtokens6',
            emoji: { name: '🎵' }
          },
          {
            type: 2, // Button
            style: 5, // Link
            label: 'Instagram',
            url: 'https://www.instagram.com/w.tokens/',
            emoji: { name: '📸' }
          }
        ]
      }
    ]
  };

  const sent = await api(`/channels/${CHANNEL_ID}/messages`, 'POST', payload);
  console.log('✅ Mensaje de Redes Sociales publicado con éxito. ID:', sent.id);
}

run().catch(err => {
  console.error('❌ Error al publicar redes:', err);
  process.exit(1);
});
