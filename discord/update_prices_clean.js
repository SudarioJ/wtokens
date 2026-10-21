/**
 * WTOKENS - Actualizador Limpio de Tabla de Apuestas
 * Elimina mensajes antiguos y publica la tabla con formato limpio, espacioso y sin recortes.
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
  if (!tablaCh) {
    console.error('No se encontró el canal tabla-de-apuestas');
    return;
  }

  // 1. Limpiar mensajes anteriores del canal para que quede impecable
  console.log('Limpiando mensajes anteriores...');
  const messages = await api(`/channels/${tablaCh.id}/messages?limit=10`);
  for (const m of messages) {
    try {
      await api(`/channels/${tablaCh.id}/messages/${m.id}`, 'DELETE');
      await sleep(300);
    } catch (e) {
      console.warn('No se pudo borrar mensaje:', e.message);
    }
  }

  // 2. Publicar la guía limpia y legible
  console.log('Publicando nueva tabla ordenada y espaciosa...');

  const embedPrincipal = {
    title: '💰 TABLA OFICIAL DE APUESTAS (WTOKENS)',
    description: 
      'Para garantizar duelos justos y transparentes, todas las partidas se pactan en **montos fijos en Dólares (USD)**, pero tú pagas y cobras directamente en la **moneda local de tu país**.',
    color: 0x8B5CF6,
    fields: [
      {
        name: '📌 1. TIER MICRO (Subiendo de $0.50 en $0.50)',
        value: 
          '```\n' +
          '• $0.50 USD    • $1.00 USD    • $1.50 USD\n' +
          '• $2.00 USD    • $2.50 USD    • $3.00 USD\n' +
          '• $3.50 USD    • $4.00 USD    • $4.50 USD\n' +
          '• $5.00 USD\n' +
          '```'
      },
      {
        name: '⚡ 2. TIER COMPETITIVO (Subiendo de $1.00 en $1.00)',
        value: 
          '```\n' +
          '• $6.00 USD    • $7.00 USD    • $8.00 USD\n' +
          '• $9.00 USD    • $10.00 USD   • $11.00 USD\n' +
          '• $12.00 USD   • $13.00 USD   • $14.00 USD\n' +
          '• $15.00 USD   • $16.00 USD   • $17.00 USD\n' +
          '• $18.00 USD   • $19.00 USD   • $20.00 USD\n' +
          '```'
      },
      {
        name: '⚖️ Regla de la Bóveda',
        value: 'Ambos jugadores pagan la misma entrada. El ganador se lleva el **90% del pozo acumulado**. (10% de comisión estándar por arbitraje y protección anti-scam).'
      }
    ],
    footer: { text: 'WTOKENS · Plataforma Competitiva Fortnite' }
  };

  const embedPaises = {
    title: '🌎 EQUIVALENCIAS EN TU MONEDA LOCAL',
    description: 'Referencias aproximadas para depósitos y retiros directos:',
    color: 0x06B6D4,
    fields: [
      {
        name: '🇦🇷 Argentina (Mercado Pago / Alias)',
        value: 
          '• **Mínimo ($0.50 USD):** ~$610 ARS\n' +
          '• **Duelo $2.00 USD:** ~$2.450 ARS\n' +
          '• **Duelo $5.00 USD:** ~$6.125 ARS\n' +
          '• **Máximo $20.00 USD:** ~$24.500 ARS',
        inline: true
      },
      {
        name: '🇨🇱 Chile (CuentaRUT / MACH)',
        value: 
          '• **Mínimo ($0.50 USD):** ~$480 CLP\n' +
          '• **Duelo $2.00 USD:** ~$1.920 CLP\n' +
          '• **Duelo $5.00 USD:** ~$4.800 CLP\n' +
          '• **Máximo $20.00 USD:** ~$19.200 CLP',
        inline: true
      },
      {
        name: '🇵🇪 Perú (Yape / Plin / BCP)',
        value: 
          '• **Mínimo ($0.50 USD):** ~S/ 1.90 PEN\n' +
          '• **Duelo $2.00 USD:** ~S/ 7.50 PEN\n' +
          '• **Duelo $5.00 USD:** ~S/ 18.75 PEN\n' +
          '• **Máximo $20.00 USD:** ~S/ 75.00 PEN',
        inline: true
      },
      {
        name: '🇺🇾 Uruguay (Prex / Midinero)',
        value: 
          '• **Mínimo ($0.50 USD):** ~$21 UYU\n' +
          '• **Duelo $5.00 USD:** ~$207 UYU\n' +
          '• **Máximo $20.00 USD:** ~$830 UYU',
        inline: true
      },
      {
        name: '🇵🇾 Paraguay (Giros Tigo / SIPAP)',
        value: 
          '• **Mínimo ($0.50 USD):** ~₲ 3.875 PYG\n' +
          '• **Duelo $5.00 USD:** ~₲ 38.750 PYG\n' +
          '• **Máximo $20.00 USD:** ~₲ 155.000 PYG',
        inline: true
      },
      {
        name: '🇧🇴 Bolivia (QR Simple / BCP)',
        value: 
          '• **Mínimo ($0.50 USD):** ~Bs 3.50 BOB\n' +
          '• **Duelo $5.00 USD:** ~Bs 35.00 BOB\n' +
          '• **Máximo $20.00 USD:** ~Bs 139.00 BOB',
        inline: true
      }
    ],
    footer: { text: '🌐 Binance Pay / USDT disponible para todos los países sin comisiones bancarias' }
  };

  await api(`/channels/${tablaCh.id}/messages`, 'POST', {
    embeds: [embedPrincipal, embedPaises]
  });

  console.log('✅ Mensajes actualizados e impecables en Discord.');
}

main().catch(err => console.error('Error:', err));
