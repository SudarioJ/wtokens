/**
 * WTOKENS Leaderboard Route
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const { mode } = req.query; // 'all', 'boxfight', 'zonewars', 'buildfight'

  let players = db.prepare(`
    SELECT 
      discord_id, 
      discord_username, 
      discord_avatar, 
      epic_nickname, 
      country,
      matches_played, 
      matches_won, 
      win_streak, 
      total_earned_usd,
      CASE 
        WHEN matches_played > 0 THEN ROUND((matches_won * 100.0) / matches_played, 1)
        ELSE 0.0 
      END as winrate
    FROM users
    WHERE matches_played > 0 OR total_earned_usd > 0
    ORDER BY total_earned_usd DESC, matches_won DESC
    LIMIT 20
  `).all();

  // Si aún no hay partidas jugadas en la base de datos recién creada, sembramos datos iniciales
  if (!players || players.length === 0) {
    const seed = [
      { discord_id: '1', discord_username: 'SlayerKing.fn', epic_nickname: 'SlayerFN_7', country: 'ARG', matches_played: 284, matches_won: 225, win_streak: 8, total_earned_usd: 4920, winrate: 79.2 },
      { discord_id: '2', discord_username: 'Vitor_AimGod', epic_nickname: 'VitorBR_99', country: 'CHI', matches_played: 241, matches_won: 180, win_streak: 5, total_earned_usd: 3840, winrate: 74.5 },
      { discord_id: '3', discord_username: 'Nexuz_Piece', epic_nickname: 'NexuzFNCS', country: 'PER', matches_played: 198, matches_won: 140, win_streak: 3, total_earned_usd: 3110, winrate: 71.0 },
      { discord_id: '4', discord_username: 'K4zuto_Zero', epic_nickname: 'KazutoPlays', country: 'URU', matches_played: 165, matches_won: 113, win_streak: 2, total_earned_usd: 2450, winrate: 68.4 },
      { discord_id: '5', discord_username: 'BlackOut_Build', epic_nickname: 'Blackout_7', country: 'PAR', matches_played: 142, matches_won: 95, win_streak: 4, total_earned_usd: 1980, winrate: 67.1 },
      { discord_id: '6', discord_username: 'BoliviaSniper', epic_nickname: 'AimGod_BO', country: 'BOL', matches_played: 110, matches_won: 74, win_streak: 3, total_earned_usd: 1420, winrate: 67.2 }
    ];
    return res.json({ leaderboard: seed });
  }

  res.json({ leaderboard: players });
});

module.exports = router;
