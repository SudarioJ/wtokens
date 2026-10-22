/**
 * WTOKENS Master API & Full-Stack Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./src/config');
const { initSchema } = require('./src/db');
const { registerSlashCommands } = require('./src/bot/bot_engine');

// Importar Rutas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const paymentRoutes = require('./src/routes/payments');
const matchRoutes = require('./src/routes/matches');
const leaderboardRoutes = require('./src/routes/leaderboard');

const app = express();

// Middlewares Globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de API REST
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Servir Archivos Estáticos del Frontend
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

// Ruta Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'WTOKENS LATAM',
    game: 'Fortnite Competitive',
    database: 'SQLite (node:sqlite)',
    timestamp: new Date().toISOString()
  });
});

// Fallback SPA
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Iniciar Servidor
const PORT = config.PORT;
app.listen(PORT, async () => {
  console.log('========================================================');
  console.log('⚡ WTOKENS MASTER SERVER INICIADO EXITOSAMENTE');
  console.log(`👉 API & Frontend: http://localhost:${PORT}`);
  console.log(`👉 Healthcheck:    http://localhost:${PORT}/api/health`);
  console.log('========================================================');

  // Registrar comandos en Discord en segundo plano
  registerSlashCommands();
});
