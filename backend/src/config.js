/**
 * WTOKENS Global Configuration
 */

module.exports = {
  PORT: process.env.PORT || 4000,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || '',
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '1562186330841161838',
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || '',
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || '1562177277821718539',
  DISCORD_REDIRECT_URI: process.env.DISCORD_REDIRECT_URI || 'http://localhost:4000/api/auth/discord/callback',
  JWT_SECRET: process.env.JWT_SECRET || 'wtokens_super_secret_jwt_key_2026',
  
  // Cotizaciones de referencia frente a 1 USD
  EXCHANGE_RATES: {
    USD: 1.0,
    ARS: 1225.0,
    CLP: 960.0,
    PEN: 3.75,
    UYU: 41.5,
    PYG: 7750.0,
    BOB: 6.95
  },

  // Comisión estándar de la plataforma (10%)
  PLATFORM_FEE_PERCENT: 10
};
