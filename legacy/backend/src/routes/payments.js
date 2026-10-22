/**
 * WTOKENS Payments & Wallet Routes (Mercado Pago, Yape, Binance, Retiros)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

// Helper para convertir USD a moneda local
function getLocalAmount(usdAmount, currency) {
  const rate = config.EXCHANGE_RATES[currency] || 1.0;
  return usdAmount * rate;
}

// 1. Crear Intención de Depósito (Genera datos y QR según país)
router.post('/deposit-intent', (req, res) => {
  const { discord_id, amount_usd, payment_method, country } = req.body;

  if (!discord_id || !amount_usd || amount_usd < 0.5) {
    return res.status(400).json({ error: 'Monto mínimo de recarga es $0.50 USD' });
  }

  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const currency = user.currency || 'ARS';
  const localAmount = getLocalAmount(amount_usd, currency);
  const paymentReference = 'DEP-' + Date.now();

  // Guardar transacción como pendiente
  db.prepare(`
    INSERT INTO transactions (user_id, type, amount_usd, currency, local_amount, payment_method, status, reference_id, notes)
    VALUES (?, 'DEPOSIT', ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    discord_id, 
    amount_usd, 
    currency, 
    localAmount, 
    payment_method, 
    paymentReference, 
    `Recarga pendiente de ${amount_usd} USD vía ${payment_method}`
  );

  res.json({
    success: true,
    reference_id: paymentReference,
    amount_usd,
    currency,
    local_amount: localAmount,
    payment_method,
    payment_details: {
      qr_data: `wtokens://pay?ref=${paymentReference}&amount=${localAmount}&curr=${currency}`,
      alias_or_account: payment_method === 'mercadopago' ? 'wtokens.latam.mp' : '928 374 819',
      instructions: 'Transfiere el monto exacto e ingresa tu referencia de pago para acreditación inmediata.'
    }
  });
});

// 2. Webhook de Mercado Pago (Recibe notificación IPN automática)
router.post('/mercadopago/webhook', (req, res) => {
  const { data, type } = req.body;
  console.log('🔔 Webhook recibido de Mercado Pago:', type, data);

  // En producción, consulta a la API de Mercado Pago: GET https://api.mercadopago.com/v1/payments/{id}
  // Simulamos la acreditación automática si viene referencia válida
  if (req.body.reference_id) {
    const tx = db.prepare('SELECT * FROM transactions WHERE reference_id = ? AND status = "pending"').get(req.body.reference_id);
    if (tx) {
      db.prepare('UPDATE transactions SET status = "completed" WHERE id = ?').run(tx.id);
      db.prepare('UPDATE users SET balance_usd = balance_usd + ? WHERE discord_id = ?').run(tx.amount_usd, tx.user_id);
      console.log(`✅ Saldo acreditado automáticamente a ${tx.user_id}: +${tx.amount_usd} USD`);
    }
  }

  res.status(200).send('OK');
});

// 3. Confirmar Depósito Directo (Simulación en vivo para el usuario)
router.post('/confirm-deposit', (req, res) => {
  const { discord_id, amount_usd, payment_method, reference_id } = req.body;

  const depositUSD = parseFloat(amount_usd) || 10.0;
  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const currency = user.currency || 'ARS';
  const localAmount = getLocalAmount(depositUSD, currency);

  // Acreditar saldo en BD
  db.prepare(`
    UPDATE users 
    SET balance_usd = balance_usd + ? 
    WHERE discord_id = ?
  `).run(depositUSD, discord_id);

  // Registrar transacción completada
  db.prepare(`
    INSERT INTO transactions (user_id, type, amount_usd, currency, local_amount, payment_method, status, reference_id, notes)
    VALUES (?, 'DEPOSIT', ?, ?, ?, ?, 'completed', ?, 'Recarga validada y acreditada')
  `).run(discord_id, depositUSD, currency, localAmount, payment_method || 'mercadopago', reference_id || 'DEP-' + Date.now());

  const updatedUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);

  res.json({
    success: true,
    message: `¡Recarga de $${depositUSD.toFixed(2)} USD acreditada exitosamente!`,
    new_balance_usd: updatedUser.balance_usd,
    user: updatedUser
  });
});

// 4. Solicitar Retiro de Ganancias
router.post('/withdraw', (req, res) => {
  const { discord_id, amount_usd, payment_method, destination_data } = req.body;

  if (!discord_id || !amount_usd || !destination_data) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const withdrawUSD = parseFloat(amount_usd);
  if (withdrawUSD < 5.0) {
    return res.status(400).json({ error: 'El monto mínimo de retiro es $5.00 USD' });
  }

  const user = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (user.balance_usd < withdrawUSD) {
    return res.status(400).json({ error: 'Saldo insuficiente en tu billetera' });
  }

  const currency = user.currency || 'ARS';
  const localAmount = getLocalAmount(withdrawUSD, currency);

  // Descontar saldo y registrar solicitud
  db.prepare(`
    UPDATE users 
    SET balance_usd = balance_usd - ? 
    WHERE discord_id = ?
  `).run(withdrawUSD, discord_id);

  db.prepare(`
    INSERT INTO withdrawal_requests (user_id, amount_usd, currency, local_amount, payment_method, destination_data, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(discord_id, withdrawUSD, currency, localAmount, payment_method, destination_data);

  db.prepare(`
    INSERT INTO transactions (user_id, type, amount_usd, currency, local_amount, payment_method, status, notes)
    VALUES (?, 'WITHDRAWAL', ?, ?, ?, ?, 'pending', ?)
  `).run(discord_id, withdrawUSD, currency, localAmount, payment_method, `Solicitud de retiro hacia ${destination_data}`);

  const updatedUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discord_id);

  res.json({
    success: true,
    message: `¡Retiro de $${withdrawUSD.toFixed(2)} USD solicitado con éxito! El pago se procesará en menos de 15 minutos.`,
    new_balance_usd: updatedUser.balance_usd,
    user: updatedUser
  });
});

// 5. Ver Historial de Transacciones
router.get('/history/:discord_id', (req, res) => {
  const { discord_id } = req.params;
  const history = db.prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(discord_id);
  res.json({ history });
});

module.exports = router;
