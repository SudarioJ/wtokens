/**
 * WTOKENS User & Epic Games Verification Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');

// 1. Obtener perfil completo
router.get('/profile/:discord_id', (req, res) => {
  const { discord_id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Obtener últimas 5 partidas
  const recentMatches = db.prepare(`
    SELECT * FROM matches 
    WHERE player1_id = ? OR player2_id = ? 
    ORDER BY created_at DESC LIMIT 5
  `).all(discord_id, discord_id);

  // Obtener últimas 5 transacciones
  const recentTransactions = db.prepare(`
    SELECT * FROM transactions 
    WHERE user_id = ? 
    ORDER BY created_at DESC LIMIT 5
  `).all(discord_id);

  res.json({
    user,
    recentMatches,
    recentTransactions
  });
});

// 2. Generar código de vinculación para Epic Games
router.post('/link-epic/generate-code', (req, res) => {
  const { discord_id, epic_nickname } = req.body;

  if (!discord_id || !epic_nickname) {
    return res.status(400).json({ error: 'Discord ID y Nickname de Epic son requeridos' });
  }

  // Generar código aleatorio estilo: WT-4892
  const code = 'WT-' + Math.floor(1000 + Math.random() * 9000);

  db.prepare(`
    UPDATE users 
    SET epic_nickname = ?, verification_code = ?, epic_verified = 0 
    WHERE discord_id = ?
  `).run(epic_nickname.trim(), code, discord_id);

  res.json({
    success: true,
    epic_nickname: epic_nickname.trim(),
    code,
    instructions: `Ingresa a tu cuenta de Epic Games y coloca el código "${code}" en tu biografía o estado de juego para confirmar que eres el dueño.`
  });
});

// 3. Confirmar Verificación de Epic Games
router.post('/link-epic/confirm', (req, res) => {
  const { discord_id } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (!user.verification_code) {
    return res.status(400).json({ error: 'No hay código de verificación pendiente' });
  }

  // Simulamos la verificación exitosa de Epic Games API
  db.prepare(`
    UPDATE users 
    SET epic_verified = 1, verification_code = NULL 
    WHERE discord_id = ?
  `).run(discord_id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);

  res.json({
    success: true,
    message: '¡Cuenta de Epic Games verificada correctamente con WTOKENS!',
    user: updatedUser
  });
});

// 4. Cambiar País y Moneda
router.post('/country', (req, res) => {
  const { discord_id, country } = req.body;

  const CURRENCY_MAP = {
    ARG: 'ARS',
    CLP: 'CLP',
    PER: 'PEN',
    URU: 'UYU',
    PAR: 'PYG',
    BOL: 'BOB',
    USD: 'USD'
  };

  const currency = CURRENCY_MAP[country] || 'USD';

  db.prepare(`
    UPDATE users SET country = ?, currency = ? WHERE discord_id = ?
  `).run(country, currency, discord_id);

  const updatedUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);
  res.json({ success: true, user: updatedUser });
});

module.exports = router;
