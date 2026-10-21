/**
 * WTOKENS Match Engine & Escrow (Bóveda P2P de Partidas)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');
const { createMatchDiscordRoom } = require('../bot/bot_engine');

// 1. Crear Desafío Directo / Partida
router.post('/create-duel', (req, res) => {
  const { player1_id, player2_id, mode, stake_usd } = req.body;

  if (!player1_id || !player2_id || !mode || !stake_usd) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
  }

  const p1 = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(player1_id);
  const p2 = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(player2_id);

  if (!p1 || !p2) {
    return res.status(404).json({ error: 'Uno de los jugadores no está registrado' });
  }

  const stake = parseFloat(stake_usd);
  if (p1.balance_usd < stake || p2.balance_usd < stake) {
    return res.status(400).json({ error: 'Uno o ambos jugadores no tienen saldo suficiente en su billetera' });
  }

  const matchId = 'FN-' + Math.floor(10000 + Math.random() * 90000);
  const totalPot = stake * 2;
  const fee = totalPot * (config.PLATFORM_FEE_PERCENT / 100);
  const prize = totalPot - fee;

  // 1. Bloquear saldos en Bóveda (Escrow Lock)
  db.prepare('UPDATE users SET balance_usd = balance_usd - ? WHERE discord_id = ?').run(stake, player1_id);
  db.prepare('UPDATE users SET balance_usd = balance_usd - ? WHERE discord_id = ?').run(stake, player2_id);

  // 2. Registrar Match en BD
  db.prepare(`
    INSERT INTO matches (id, mode, stake_usd, total_pot_usd, fee_usd, prize_usd, player1_id, player2_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'vault_locked')
  `).run(matchId, mode, stake, totalPot, fee, prize, player1_id, player2_id);

  // 3. Registrar transacciones contables de entrada
  db.prepare(`
    INSERT INTO transactions (user_id, type, amount_usd, currency, local_amount, reference_id, notes)
    VALUES (?, 'MATCH_ENTRY', ?, 'USD', ?, ?, 'Entrada retenida en Bóveda WTOKENS')
  `).run(player1_id, stake, stake, matchId);

  db.prepare(`
    INSERT INTO transactions (user_id, type, amount_usd, currency, local_amount, reference_id, notes)
    VALUES (?, 'MATCH_ENTRY', ?, 'USD', ?, ?, 'Entrada retenida en Bóveda WTOKENS')
  `).run(player2_id, stake, stake, matchId);

  // Anunciar sala en Discord
  createMatchDiscordRoom(matchId, player1_id, player2_id, mode, stake).catch(e => console.warn('Discord alert:', e.message));

  res.json({
    success: true,
    match_id: matchId,
    mode,
    stake_usd: stake,
    total_pot: totalPot,
    prize_for_winner: prize,
    status: 'vault_locked',
    message: '¡Partida creada y fondos retenidos en Bóveda! Tienen 5 minutos para ingresar a la isla creativa.'
  });
});

// 2. Reportar Resultado / Reclamar Victoria
router.post('/:id/claim', (req, res) => {
  const { id } = req.params;
  const { discord_id, claim } = req.body; // claim: 'win' o 'loss'

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  if (!match) {
    return res.status(404).json({ error: 'Partida no encontrada' });
  }

  if (match.status === 'finished' || match.status === 'cancelled') {
    return res.status(400).json({ error: 'Esta partida ya ha concluido' });
  }

  let updateQuery = '';
  if (match.player1_id === discord_id) {
    updateQuery = 'UPDATE matches SET player1_claim = ? WHERE id = ?';
  } else if (match.player2_id === discord_id) {
    updateQuery = 'UPDATE matches SET player2_claim = ? WHERE id = ?';
  } else {
    return res.status(403).json({ error: 'No perteneces a esta partida' });
  }

  db.prepare(updateQuery).run(claim, id);

  // Comprobar si ambos jugadores ya enviaron su reporte
  const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);

  if (updatedMatch.player1_claim && updatedMatch.player2_claim) {
    // Caso 1: Consenso mutuo (uno dice 'win' y el otro 'loss')
    if (updatedMatch.player1_claim === 'win' && updatedMatch.player2_claim === 'loss') {
      finalizeMatch(updatedMatch, updatedMatch.player1_id);
      return res.json({ success: true, status: 'finished', winner_id: updatedMatch.player1_id, message: '¡Victoria confirmada por ambos! Saldo liberado.' });
    } else if (updatedMatch.player2_claim === 'win' && updatedMatch.player1_claim === 'loss') {
      finalizeMatch(updatedMatch, updatedMatch.player2_id);
      return res.json({ success: true, status: 'finished', winner_id: updatedMatch.player2_id, message: '¡Victoria confirmada por ambos! Saldo liberado.' });
    } 
    // Caso 2: Conflicto (ambos reclaman victoria o discordancia)
    else {
      db.prepare('UPDATE matches SET status = "disputed" WHERE id = ?').run(id);
      return res.json({
        success: false,
        status: 'disputed',
        message: '⚠️ Conflicto detectado: Ambos reportaron resultados distintos. Partida enviada a revisión de Mediadores. Sube tu clip en #abrir-ticket.'
      });
    }
  }

  res.json({
    success: true,
    status: updatedMatch.status,
    message: 'Reporte registrado. Esperando confirmación del rival...'
  });
});

// Función interna para liquidar pago al ganador
function finalizeMatch(match, winnerId) {
  const loserId = match.player1_id === winnerId ? match.player2_id : match.player1_id;

  // 1. Acreditar premio al ganador
  db.prepare(`
    UPDATE users 
    SET balance_usd = balance_usd + ?,
        total_earned_usd = total_earned_usd + ?,
        matches_played = matches_played + 1,
        matches_won = matches_won + 1,
        win_streak = win_streak + 1
    WHERE discord_id = ?
  `).run(match.prize_usd, match.prize_usd, winnerId);

  // 2. Actualizar perdedor
  db.prepare(`
    UPDATE users 
    SET matches_played = matches_played + 1,
        win_streak = 0
    WHERE discord_id = ?
  `).run(loserId);

  // 3. Cerrar partida
  db.prepare(`
    UPDATE matches 
    SET status = 'finished', winner_id = ?, completed_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(winnerId, match.id);

  // 4. Registro contable del premio
  db.prepare(`
    INSERT INTO transactions (user_id, type, amount_usd, currency, local_amount, reference_id, notes)
    VALUES (?, 'MATCH_PRIZE', ?, 'USD', ?, ?, 'Premio de victoria liberado de Bóveda')
  `).run(winnerId, match.prize_usd, match.prize_usd, match.id);

  console.log(`🏆 Match ${match.id} finalizado. Ganador: ${winnerId} (+${match.prize_usd} USD)`);
}

// 3. Subir Clip de Prueba en Disputa
router.post('/:id/dispute', (req, res) => {
  const { id } = req.params;
  const { clip_url, dispute_reason } = req.body;

  db.prepare(`
    UPDATE matches 
    SET clip_url = ?, dispute_reason = ?, status = 'disputed' 
    WHERE id = ?
  `).run(clip_url, dispute_reason, id);

  res.json({
    success: true,
    message: 'Clip y pruebas adjuntadas. Un mediador revisará el video en Discord en menos de 5 minutos.'
  });
});

// 4. Obtener Estado de la Partida
router.get('/:id', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });
  res.json({ match });
});

module.exports = router;
