/**
 * WTOKENS - Tabla Compacta de Un Solo Vistazo (Zero Scroll)
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

async function main() {
  console.log('Buscando canal tabla-de-apuestas...');
  const channels = await api(`/guilds/${GUILD_ID}/channels`);
  const tablaCh = channels.find(c => c.name && c.name.includes('tabla-de-apuestas'));
  if (!tablaCh) return console.error('No se encontró el canal');

  // Limpiar mensajes anteriores
  const messages = await api(`/channels/${tablaCh.id}/messages?limit=10`);
  for (const m of messages) {
    try {
      await api(`/channels/${tablaCh.id}/messages/${m.id}`, 'DELETE');
      await sleep(250);
    } catch (e) {}
  }

  // Un solo embed compacto, ultra legible y sin scroll
  const embedCompacto = {
    title: '💰 TABLA OFICIAL DE ENTRADAS (WTOKENS)',
    description: 
      'Duelos pactados en **Dólares (USD)** y cobrados en tu **moneda local**.\n\n' +
      '**🎯 Escalafón de Partidas Permitidas:**\n' +
      '`$0.50` · `$1.00` · `$1.50` · `$2.00` · `$2.50` · `$3.00` · `$3.50` · `$4.00` · `$4.50` · `$5.00`\n' +
      '`$6` · `$7` · `$8` · `$9` · `$10` · `$11` · `$12` · `$13` · `$14` · `$15` · `$16` · `$17` · `$18` · `$19` · `$20`',
    color: 0x8B5CF6,
    fields: [
      {
        name: '🇦🇷 Argentina (ARS)',
        value: '• Mín: **$610 ARS** ($0.50)\n• Duelo: **$2.450 ARS** ($2)\n• Máx: **$24.500 ARS** ($20)\n*(Mercado Pago / Alias)*',
        inline: true
      },
      {
        name: '🇨🇱 Chile (CLP)',
        value: '• Mín: **$480 CLP** ($0.50)\n• Duelo: **$1.920 CLP** ($2)\n• Máx: **$19.200 CLP** ($20)\n*(CuentaRUT / MACH)*',
        inline: true
      },
      {
        name: '🇵🇪 Perú (PEN)',
        value: '• Mín: **S/ 1.90 PEN** ($0.50)\n• Duelo: **S/ 7.50 PEN** ($2)\n• Máx: **S/ 75.00 PEN** ($20)\n*(Yape / Plin / BCP)*',
        inline: true
      },
      {
        name: '🇺🇾 Uruguay (UYU)',
        value: '• Mín: **$21 UYU** ($0.50)\n• Duelo: **$83 UYU** ($2)\n• Máx: **$830 UYU** ($20)\n*(Prex / Midinero)*',
        inline: true
      },
      {
        name: '🇵🇾 Paraguay (PYG)',
        value: '• Mín: **₲ 3.875 PYG** ($0.50)\n• Duelo: **₲ 15.500 PYG** ($2)\n• Máx: **₲ 155.000 PYG** ($20)\n*(Giros Tigo / SIPAP)*',
        inline: true
      },
      {
        name: '🇧🇴 Bolivia (BOB)',
        value: '• Mín: **Bs 3.50 BOB** ($0.50)\n• Duelo: **Bs 14.00 BOB** ($2)\n• Máx: **Bs 139 BOB** ($20)\n*(QR Simple / BCP)*',
        inline: true
      }
    ],
    footer: { 
      text: '🏆 Comisión: 10% (Ganador cobra el 90%) • 🌐 Binance Pay disponible en todos los países' 
    }
  };

  await api(`/channels/${tablaCh.id}/messages`, 'POST', {
    embeds: [embedCompacto]
  });

  console.log('✅ Tarjeta compacta publicada con éxito.');
}

main().catch(console.error);
