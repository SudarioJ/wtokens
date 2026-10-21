-- ========================================================
-- WTOKENS POSTGRESQL / SUPABASE PRODUCTION SCHEMA
-- ========================================================

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(64) UNIQUE NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    discord_avatar TEXT,
    epic_id VARCHAR(64),
    epic_nickname VARCHAR(100),
    epic_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(32),
    country VARCHAR(10) DEFAULT 'ARG',
    currency VARCHAR(10) DEFAULT 'ARS',
    balance_usd NUMERIC(12, 2) DEFAULT 0.00,
    total_earned_usd NUMERIC(12, 2) DEFAULT 0.00,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    role VARCHAR(32) DEFAULT 'player', -- player, booster, streamer, mediator, admin
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Partidas & Bóveda de Arbitraje (Escrow)
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(32) PRIMARY KEY, -- Ej: 'FN-82914'
    mode VARCHAR(32) NOT NULL, -- boxfight, zonewars, buildfight, zerobuild, realistic
    stake_usd NUMERIC(10, 2) NOT NULL, -- 0.50 a 20.00
    total_pot_usd NUMERIC(10, 2) NOT NULL,
    fee_usd NUMERIC(10, 2) NOT NULL, -- 10% de comisión
    prize_usd NUMERIC(10, 2) NOT NULL, -- 90% para ganador
    player1_id VARCHAR(64) REFERENCES users(discord_id),
    player2_id VARCHAR(64) REFERENCES users(discord_id),
    player1_claim VARCHAR(16), -- 'win', 'loss'
    player2_claim VARCHAR(16),
    winner_id VARCHAR(64) REFERENCES users(discord_id),
    status VARCHAR(32) DEFAULT 'waiting', -- waiting, vault_locked, in_progress, disputed, finished, cancelled
    discord_channel_id VARCHAR(64),
    clip_url TEXT,
    dispute_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Transacciones Contables (Ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(discord_id),
    type VARCHAR(32) NOT NULL, -- DEPOSIT, WITHDRAWAL, MATCH_ENTRY, MATCH_PRIZE, COMMISSION_FEE, BONUS
    amount_usd NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    local_amount NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(32), -- mercadopago, yape, cuentarut, prex, binance, internal
    status VARCHAR(32) DEFAULT 'completed',
    reference_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Solicitudes de Retiro
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(discord_id),
    amount_usd NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    local_amount NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL,
    destination_data TEXT NOT NULL, -- Alias, CVU, Teléfono, Binance Pay ID
    status VARCHAR(32) DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);
