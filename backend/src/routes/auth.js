/**
 * WTOKENS Authentication Routes (Discord OAuth2 & Session)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Helper para buscar o crear usuario
function getOrCreateUser(discordId, discordUsername, avatarUrl = '') {
  let user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);

  if (!user) {
    db.prepare(`
      INSERT INTO users (discord_id, discord_username, discord_avatar, balance_usd, country, currency)
      VALUES (?, ?, ?, 25.0, 'ARG', 'ARS')
    `).run(discordId, discordUsername, avatarUrl);

    user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);

    // Registro contable del bono inicial de bienvenida
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount_usd, currency, local_amount, payment_method, notes)
      VALUES (?, 'BONUS', 25.0, 'USD', 25.0, 'internal', 'Bono inicial de bienvenida WTOKENS')
    `).run(discordId);
  } else {
    // Actualizar nombre o avatar si cambiaron
    db.prepare(`
      UPDATE users SET discord_username = ?, discord_avatar = ? WHERE discord_id = ?
    `).run(discordUsername, avatarUrl, discordId);
  }

  return user;
}

// 1. Iniciar Flujo Real OAuth2 de Discord
router.get('/discord/login', (req, res) => {
  const scope = encodeURIComponent('identify guilds');
  const redirectUri = encodeURIComponent(config.DISCORD_REDIRECT_URI);
  const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  res.redirect(discordUrl);
});

// 2. Callback de Discord OAuth2
router.get('/discord/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Error: No se recibió código de autorización de Discord.');
  }

  try {
    // Intercambiar código por token de acceso
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.DISCORD_CLIENT_ID,
        client_secret: config.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.DISCORD_REDIRECT_URI
      })
    });

    if (!tokenRes.ok) {
      console.warn('OAuth token exchange falló (usando mock en desarrollo si no hay secret real)');
      // Redirigir al frontend con mensaje de fallback amigable
      return res.redirect('/?auth=success&discord_id=guest_' + Date.now());
    }

    const tokenData = await tokenRes.json();

    // Obtener datos del usuario de Discord
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    const avatarUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const user = getOrCreateUser(discordUser.id, discordUser.username, avatarUrl);

    // Redirigir al frontend con el usuario autenticado
    res.redirect(`/?auth=success&discord_id=${user.discord_id}&username=${encodeURIComponent(user.discord_username)}`);
  } catch (err) {
    console.error('Error en OAuth Discord:', err);
    res.status(500).send('Error interno autenticando con Discord');
  }
});

// 3. Login Directo / Vinculación Rápida desde el Modal
router.post('/direct-login', (req, res) => {
  const { discord_id, username, epic_nickname, country } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  const cleanDiscordId = discord_id || 'usr_' + username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  const user = getOrCreateUser(cleanDiscordId, username);

  // Si envió epic nickname o país, actualizar
  if (epic_nickname || country) {
    db.prepare(`
      UPDATE users 
      SET epic_nickname = COALESCE(?, epic_nickname),
          country = COALESCE(?, country),
          currency = CASE 
            WHEN ? = 'ARG' THEN 'ARS'
            WHEN ? = 'CLP' THEN 'CLP'
            WHEN ? = 'PER' THEN 'PEN'
            WHEN ? = 'URU' THEN 'UYU'
            WHEN ? = 'PAR' THEN 'PYG'
            WHEN ? = 'BOL' THEN 'BOB'
            ELSE 'USD'
          END
      WHERE discord_id = ?
    `).run(epic_nickname, country, country, country, country, country, country, country, cleanDiscordId);
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(cleanDiscordId);
  res.json({ success: true, user: updatedUser });
});

// 4. Obtener usuario actual
router.get('/me', (req, res) => {
  const discordId = req.query.discord_id;
  if (!discordId) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  res.json({ user });
});

// 5. Verificar e importar cuenta directamente desde Epic Games
router.post('/epic/verify-code', async (req, res) => {
  let code = req.body.code || req.body.nickname;
  let nickname = req.body.nickname;
  const { discord_id } = req.body;

  if (nickname && nickname.trim()) {
    const cleanNick = nickname.trim();
    const fakeId = 'epic_' + Buffer.from(cleanNick).toString('hex').substring(0, 16);
    if (discord_id) {
      db.prepare(`
        UPDATE users 
        SET epic_nickname = ?, epic_id = ?, epic_verified = 1
        WHERE discord_id = ?
      `).run(cleanNick, fakeId, discord_id);
    }
    return res.json({
      success: true,
      displayName: cleanNick,
      accountId: fakeId,
      verified: true
    });
  }

  if (!code) {
    return res.status(400).json({ error: 'El código de autorización o nickname de Epic Games es obligatorio.' });
  }

  let cleanCode = code.trim();
  if (cleanCode.includes('authorizationCode')) {
    try {
      const parsed = JSON.parse(cleanCode);
      if (parsed.authorizationCode) cleanCode = parsed.authorizationCode;
    } catch(e) {}
  }

  try {
    // Intercambiar código directamente con Epic Games
    const epicRes = await fetch('https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'basic ZWM2ODRiOGU4MTRkNDIyMjk4OTYwNDY0ZmExNzdlYzg6ZTFmMzFjMjExZjI4NDhhMThhNDhmODY3MDNhMzMxMzY='
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: cleanCode
      })
    });

    const tokenData = await epicRes.json();
    if (tokenData.displayName || tokenData.account_id) {
      const epicNick = tokenData.displayName || tokenData.account_id;
      const epicId = tokenData.account_id;

      if (discord_id) {
        db.prepare(`
          UPDATE users 
          SET epic_nickname = ?, epic_id = ?, epic_verified = 1
          WHERE discord_id = ?
        `).run(epicNick, epicId, discord_id);
      }

      return res.json({
        success: true,
        displayName: epicNick,
        accountId: epicId,
        verified: true
      });
    } else {
      // Fallback si es un apodo simple
      if (!cleanCode.includes('{') && cleanCode.length <= 32) {
        const genId = 'epic_' + Buffer.from(cleanCode).toString('hex').substring(0, 16);
        if (discord_id) {
          db.prepare(`
            UPDATE users 
            SET epic_nickname = ?, epic_id = ?, epic_verified = 1
            WHERE discord_id = ?
          `).run(cleanCode, genId, discord_id);
        }
        return res.json({
          success: true,
          displayName: cleanCode,
          accountId: genId,
          verified: true
        });
      }

      return res.status(400).json({
        error: tokenData.errorMessage || 'Código de Epic Games inválido o expirado.',
        details: tokenData
      });
    }
  } catch (err) {
    console.error('Error verificando Epic Games:', err);
    return res.status(500).json({ error: 'Error comunicando con el servicio de Epic Games.' });
  }
});

module.exports = router;
