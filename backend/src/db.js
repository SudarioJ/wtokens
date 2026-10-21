/**
 * WTOKENS Database Layer
 * Utiliza 'node:sqlite' nativo de Node.js v24 (Zero dependencias externas C++, ultra estable y rápido).
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'wtokens.db');
const db = new DatabaseSync(DB_PATH);

// Configuración de Pragmas para alta concurrencia y rendimiento
db.exec('PRAGMA foreign_keys = ON;');

// Inicialización de Esquema de Base de Datos
function initSchema() {
  db.exec(`
    -- 1. Tabla de Usuarios
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT NOT NULL,
      discord_avatar TEXT,
      epic_id TEXT,
      epic_nickname TEXT,
      epic_verified INTEGER DEFAULT 0,
      verification_code TEXT,
      country TEXT DEFAULT 'ARG',
      currency TEXT DEFAULT 'ARS',
      balance_usd REAL DEFAULT 0.0,
      total_earned_usd REAL DEFAULT 0.0,
      matches_played INTEGER DEFAULT 0,
      matches_won INTEGER DEFAULT 0,
      win_streak INTEGER DEFAULT 0,
      role TEXT DEFAULT 'player', -- 'player', 'booster', 'streamer', 'mediator', 'admin'
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Tabla de Partidas y Bóveda (Matches / Wagers)
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY, -- Ej: 'FN-82914'
      mode TEXT NOT NULL, -- 'boxfight', 'zonewars', 'buildfight', 'zerobuild', 'realistic', 'piececontrol'
      stake_usd REAL NOT NULL, -- 0.50, 1.00, 2.00, etc.
      total_pot_usd REAL NOT NULL, -- stake_usd * 2
      fee_usd REAL NOT NULL, -- 10% de comisión
      prize_usd REAL NOT NULL, -- 90% para el ganador
      player1_id TEXT NOT NULL REFERENCES users(discord_id),
      player2_id TEXT REFERENCES users(discord_id),
      player1_ready INTEGER DEFAULT 0,
      player2_ready INTEGER DEFAULT 0,
      player1_claim TEXT, -- 'win', 'loss'
      player2_claim TEXT, -- 'win', 'loss'
      winner_id TEXT REFERENCES users(discord_id),
      status TEXT DEFAULT 'waiting', -- 'waiting', 'vault_locked', 'in_progress', 'disputed', 'finished', 'cancelled'
      discord_thread_id TEXT,
      discord_channel_id TEXT,
      clip_url TEXT,
      dispute_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- 3. Tabla Contable / Transacciones (Ledger Inmutable)
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(discord_id),
      type TEXT NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'MATCH_ENTRY', 'MATCH_PRIZE', 'COMMISSION_FEE', 'BONUS'
      amount_usd REAL NOT NULL,
      currency TEXT NOT NULL, -- 'ARS', 'CLP', 'PEN', 'UYU', 'PYG', 'BOB', 'USD'
      local_amount REAL NOT NULL,
      payment_method TEXT, -- 'mercadopago', 'yape', 'cuentarut', 'prex', 'binance', 'internal'
      status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'rejected'
      reference_id TEXT, -- ID de pago de Mercado Pago, Binance o ID de match
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Solicitudes de Retiro
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(discord_id),
      amount_usd REAL NOT NULL,
      currency TEXT NOT NULL,
      local_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      destination_data TEXT NOT NULL, -- CVU, Alias, Teléfono Yape, Pay ID
      status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    );

    -- 5. Colas de Emparejamiento (Matchmaking Queue)
    CREATE TABLE IF NOT EXISTS matchmaking_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(discord_id),
      mode TEXT NOT NULL,
      stake_usd REAL NOT NULL,
      country TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Índices para búsquedas ultrarrápidas
    CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);
    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
  `);

  console.log('✅ Base de datos SQLite inicializada correctamente en:', DB_PATH);
}

initSchema();

module.exports = {
  db,
  initSchema
};
