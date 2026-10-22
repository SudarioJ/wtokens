/**
 * WTOKENS - Rediseño Pro & Compacto de la Tabla de Apuestas
 * Elimina saltos de línea huérfanos, alinea todas las monedas y usa formato estilizado con quotes.
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

  // Embed Pro: sin líneas cortadas, tipografía impecable, quotes alineados
  const embedPro = {
    title: '⚡ WTOKENS · TABLA OFICIAL DE APUESTAS',
    description: 
      'Las partidas se pactan en **USD (Tokens)** y se pagan/cobran en tu **moneda local**.\n' +
      '*El ganador se lleva el 90% del pozo acumulado (10% comisión de mediación).*',
    color: 0x8B5CF6,
    fields: [
      {
        name: '🎯 ENTRADAS DISPONIBLES (USD)',
        value: 
          '```ansi\n' +
          '\u001b[1;36m[Micro +0.50]\u001b[0m  $0.50 • $1 • $1.50 • $2 • $2.50 • $3 • $3.50 • $4 • $4.50 • $5\n' +
          '\u001b[1;35m[Pro   +1.00]\u001b[0m  $6 • $7 • $8 • $9 • $10 • $11 • $12 • $13 • $14 • $15 • $16 • $17 • $18 • $19 • $20\n' +
          '```'
      },
      {
        name: '🌎 CONVERSIONES DIRECTAS POR PAÍS',
        value: 
          '🇦🇷 **Argentina** `(Mercado Pago / CBU)`\n' +
          '> **Mín ($0.50):** `$610 ARS`  |  **Duelo ($2):** `$2.450 ARS`  |  **Máx ($20):** `$24.500 ARS`\n\n' +
          '🇨🇱 **Chile** `(CuentaRUT / MACH)`\n' +
          '> **Mín ($0.50):** `$480 CLP`  |  **Duelo ($2):** `$1.920 CLP`  |  **Máx ($20):** `$19.200 CLP`\n\n' +
          '🇵🇪 **Perú** `(Yape / Plin / BCP)`\n' +
          '> **Mín ($0.50):** `S/ 1.90`   |  **Duelo ($2):** `S/ 7.50`     |  **Máx ($20):** `S/ 75.00 PEN`\n\n' +
          '🇺🇾 **Uruguay** `(Prex / Midinero)`\n' +
          '> **Mín ($0.50):** `$21 UYU`   |  **Duelo ($2):** `$83 UYU`     |  **Máx ($20):** `$830 UYU`\n\n' +
          '🇵🇾 **Paraguay** `(Giros Tigo / SIPAP)`\n' +
          '> **Mín ($0.50):** `₲ 3.875`   |  **Duelo ($2):** `₲ 15.500`    |  **Máx ($20):** `₲ 155.000 PYG`\n\n' +
          '🇧🇴 **Bolivia** `(QR Simple / BCP)`\n' +
          '> **Mín ($0.50):** `Bs 3.50`   |  **Duelo ($2):** `Bs 14.00`    |  **Máx ($20):** `Bs 139 BOB`'
      }
    ],
    footer: { 
      text: '🌐 Binance Pay / USDT disponible para toda Sudamérica sin comisiones bancarias' 
    }
  };

  await api(`/channels/${tablaCh.id}/messages`, 'POST', {
    embeds: [embedPro]
  });

  console.log('✅ Tarjeta Pro publicada con éxito en Discord.');
}

main().catch(console.error);
