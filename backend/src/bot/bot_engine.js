/**
 * WTOKENS Discord Bot Engine (Matchmaking & Bóveda Escrow en Vivo)
 */

const { db } = require('../db');
const config = require('../config');

async function discordApi(endpoint, method = 'GET', body = null) {
  const url = `https://discord.com/api/v10${endpoint}`;
  const options = {
    method,
    headers: {
      Authorization: `Bot ${config.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API [${res.status}]: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// 1. Registrar Comandos Slash Oficiales en el Servidor
async function registerSlashCommands() {
  console.log('🤖 Registrando comandos Slash de WTOKENS en Discord...');

  const commands = [
    {
      name: 'balance',
      description: 'Consulta tu saldo actual en tokens USD y en tu moneda local.',
      type: 1
    },
    {
      name: 'vincular',
      description: 'Vincula tu cuenta de Epic Games (Fortnite) con WTOKENS.',
      type: 1,
      options: [
        {
          name: 'epic_nickname',
          description: 'Tu nombre exacto en Epic Games',
          type: 3, // STRING
          required: true
        }
      ]
    },
    {
      name: 'duelo',
      description: 'Desafía a otro jugador a un duelo valiendo tokens con Bóveda retenida.',
      type: 1,
      options: [
        {
          name: 'oponente',
          description: 'El usuario al que deseas desafiar',
          type: 6, // USER
          required: true
        },
        {
          name: 'modo',
          description: 'Modalidad competitiva de Fortnite',
          type: 3, // STRING
          required: true,
          choices: [
            { name: '🥊 Box Fight 1v1', value: 'boxfight' },
            { name: '🌋 Zone Wars 1v1', value: 'zonewars' },
            { name: '⚔️ Build Fight 1v1', value: 'buildfight' },
            { name: '🎯 Realistic / Mid 1v1', value: 'realistic' },
            { name: '🛡️ Zero Build 1v1', value: 'zerobuild' }
          ]
        },
        {
          name: 'apuesta',
          description: 'Monto de entrada en USD (de $0.50 a $20.00)',
          type: 10, // NUMBER
          required: true,
          min_value: 0.5,
          max_value: 20.0
        }
      ]
    },
    {
      name: 'billetera',
      description: 'Muestra los métodos de recarga y retiro disponibles para tu país.',
      type: 1
    }
  ];

  try {
    await discordApi(`/applications/${config.DISCORD_CLIENT_ID}/guilds/${config.DISCORD_GUILD_ID}/commands`, 'PUT', commands);
    console.log('✅ Comandos Slash registrados exitosamente en Discord.');
  } catch (e) {
    console.warn('⚠️ No se pudieron registrar comandos slash automáticos:', e.message);
  }
}

// 2. Crear Sala Privada de Partida con Bóveda Retenida
async function createMatchDiscordRoom(matchId, player1Id, player2Id, mode, stakeUSD) {
  try {
    // Buscar canal general de soporte o reportes para crear hilo privado
    const channels = await discordApi(`/guilds/${config.DISCORD_GUILD_ID}/channels`);
    const colasCat = channels.find(c => c.name && c.name.includes('COLAS FORTNITE'));
    const targetChannel = channels.find(c => c.name && c.name.includes(mode)) || channels.find(c => c.name && c.name.includes('1v1-boxfight'));

    if (!targetChannel) return;

    // Publicar anuncio de partida en el canal
    const pot = stakeUSD * 2;
    const prize = pot * 0.90;

    const message = await discordApi(`/channels/${targetChannel.id}/messages`, 'POST', {
      content: `<@${player1Id}> VS <@${player2Id}>`,
      embeds: [{
        title: `⚡ PARTIDA CREADA [${matchId}] · BÓVEDA RETENIDA`,
        description: 
          `**Modalidad:** ${mode.toUpperCase()} 1v1\n` +
          `**Entrada:** $${stakeUSD.toFixed(2)} USD cada uno (Retenido en Bóveda)\n` +
          `**Premio al Ganador:** **$${prize.toFixed(2)} USD** (90% del Pozo)\n\n` +
          `⏰ **Regla de Tiempo:** Tienen 5 minutos para ingresar a la isla creativa. Quien no entre pierde por W.O.\n` +
          `📹 **Obligatorio:** Grabar clips con GeForce Experience / OBS para reclamos.`,
        color: 0x10B981,
        footer: { text: 'WTOKENS Escrow Engine' }
      }],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3, // SUCCESS
              label: '🏆 Confirmar Victoria',
              custom_id: `claim_win_${matchId}`
            },
            {
              type: 2,
              style: 4, // DANGER
              label: '🚨 Disputa / Llamar Mediador',
              custom_id: `dispute_${matchId}`
            }
          ]
        }
      ]
    });

    console.log(`✅ Partida ${matchId} anunciada en Discord canal #${targetChannel.name}`);
    return message;
  } catch (e) {
    console.error('Error creando sala en Discord:', e.message);
  }
}

module.exports = {
  registerSlashCommands,
  createMatchDiscordRoom
};
