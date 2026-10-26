import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  Plus,
  Check,
  ExternalLink,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { OFFICIAL_PAYMENT_ACCOUNTS, PaymentAccount } from "../lib/paymentMethods";
import { User } from "../lib/contracts";
import "./payments.css";

interface PaymentsModalProps {
  user: User | null;
  currentCurrency: string;
  onClose: () => void;
  onBalanceUpdated?: (newBalance: number) => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 50, 100];

// Approximate exchange rates relative to 1 WT ($1 USD)
const RATES: Record<string, number> = {
  ARS: 1150,
  BRL: 5.6,
  PEN: 3.8,
  CLP: 940,
  UYU: 41,
  PYG: 7700,
  BOB: 6.9,
  USD: 1,
};

export const PaymentsModal: React.FC<PaymentsModalProps> = ({
  user,
  currentCurrency,
  onClose,
  onBalanceUpdated,
}) => {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState<number>(10);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("mercadopago");
  const [receiptCode, setReceiptCode] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState<number>(10);
  const [withdrawMethod, setWithdrawMethod] = useState<string>("mercadopago");
  const [withdrawAccount, setWithdrawAccount] = useState<string>("");
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);

  // Submission state
  const [depositSuccess, setDepositSuccess] = useState<boolean>(false);

  const selectedMethod: PaymentAccount =
    OFFICIAL_PAYMENT_ACCOUNTS.find((m) => m.id === selectedMethodId) ||
    OFFICIAL_PAYMENT_ACCOUNTS[0]!;

  const rate = RATES[currentCurrency] || 1;
  const localEstimated = Math.round(amount * rate);

  // PayPal fee calculator: standard 5.4% + $0.30 USD
  const payPalAmountNeeded =
    amount > 0 ? (Math.round(((amount + 0.3) / (1 - 0.054)) * 100) / 100).toFixed(2) : "0.00";

  function copyToClipboard(text: string, key: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  function handleConfirmDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptCode.trim()) return;

    // Save pending deposit in local storage audit
    try {
      const pendingDeposits = JSON.parse(
        localStorage.getItem("wtokens_pending_deposits") || "[]",
      );
      pendingDeposits.push({
        id: "dep_" + Date.now(),
        userId: user?.id,
        userDiscord: user?.discord_tag,
        userEpic: user?.epic_nickname,
        amountWt: amount,
        method: selectedMethod.name,
        receiptCode: receiptCode.trim(),
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("wtokens_pending_deposits", JSON.stringify(pendingDeposits));
    } catch {}

    setDepositSuccess(true);
  }

  function handleConfirmWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const userBalance = user?.balance_wt || 0;

    if (withdrawAmount < 10) {
      setWithdrawStatus("El retiro mínimo es de 10.00 WT ($10 USD).");
      return;
    }
    if (withdrawAmount > userBalance) {
      setWithdrawStatus("Saldo insuficiente para realizar este retiro.");
      return;
    }
    if (!withdrawAccount.trim()) {
      setWithdrawStatus("Ingresa los datos de tu cuenta de cobro.");
      return;
    }

    const newBalance = userBalance - withdrawAmount;
    if (onBalanceUpdated) {
      onBalanceUpdated(newBalance);
    }

    try {
      const pendingWithdrawals = JSON.parse(
        localStorage.getItem("wtokens_pending_withdrawals") || "[]",
      );
      pendingWithdrawals.push({
        id: "wth_" + Date.now(),
        userId: user?.id,
        userDiscord: user?.discord_tag,
        userEpic: user?.epic_nickname,
        amountWt: withdrawAmount,
        method: withdrawMethod,
        accountDetails: withdrawAccount.trim(),
        createdAt: new Date().toISOString(),
        status: "PENDING",
      });
      localStorage.setItem("wtokens_pending_withdrawals", JSON.stringify(pendingWithdrawals));
    } catch {}

    setWithdrawStatus("SUCCESS");
  }

  return (
    <div className="payments-container">
      {/* Selector de Pestaña */}
      <div className="payments-tabs">
        <button
          type="button"
          className={`payments-tab ${tab === "deposit" ? "active" : ""}`}
          onClick={() => {
            setTab("deposit");
            setDepositSuccess(false);
          }}
        >
          <Plus size={16} />
          Recargar WTokens
        </button>
        <button
          type="button"
          className={`payments-tab ${tab === "withdraw" ? "active" : ""}`}
          onClick={() => {
            setTab("withdraw");
            setWithdrawStatus(null);
          }}
        >
          <ArrowUpRight size={16} />
          Retirar Fondos
        </button>
      </div>

      {tab === "deposit" ? (
        depositSuccess ? (
          <div
            style={{
              background: "#081526",
              border: "1px solid #1f3d6b",
              borderRadius: "10px",
              padding: "20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(94, 234, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#5eeaff",
              }}
            >
              <Check size={28} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px 0", color: "#f8fafc", fontSize: "17px" }}>
                ¡Comprobante de recarga recibido!
              </h3>
              <p style={{ margin: "0", color: "#94a3b8", fontSize: "13px", lineHeight: "1.5" }}>
                Tu solicitud de <strong>{amount} WT</strong> mediante{" "}
                <strong>{selectedMethod.name}</strong> quedó registrada. El Staff acreditará tus
                WTokens en tu cuenta en breve.
              </p>
            </div>
            <div
              style={{
                background: "#040913",
                border: "1px solid #1a3356",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "12px",
                color: "#5eeaff",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              Comprobante: {receiptCode}
            </div>
            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "6px" }}>
              <a
                href="https://discord.gg/w8h6Yvd28h"
                target="_blank"
                rel="noreferrer"
                className="button primary full"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  textDecoration: "none",
                }}
              >
                <MessageSquare size={16} />
                Avisar al Staff en Discord
              </a>
              <button
                type="button"
                className="button secondary full"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="payments-section">
            {/* Monto a recargar */}
            <div className="payments-amount-box">
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#8bb5f0", textTransform: "uppercase" }}>
                1. Selecciona la cantidad de WTokens (1 WT = $1 USD)
              </span>
              <div className="amount-presets">
                {PRESET_AMOUNTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`preset-chip ${amount === p ? "active" : ""}`}
                    onClick={() => setAmount(p)}
                  >
                    {p} WT
                  </button>
                ))}
              </div>
              <div className="amount-input-row">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={amount || ""}
                  onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                />
                <span className="amount-currency-label">
                  <Wallet size={16} />
                  WT
                </span>
              </div>
              <div className="amount-conversion-hint">
                <span>
                  Equivalente aprox:{" "}
                  <strong style={{ color: "#ffffff" }}>
                    {localEstimated.toLocaleString()} {currentCurrency}
                  </strong>
                </span>
                <span>Tasa oficial $1 USD = 1 WT</span>
              </div>
            </div>

            {/* Selector de Método Oficial */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#8bb5f0", textTransform: "uppercase" }}>
                2. Elige tu método de pago
              </span>
              <div className="methods-list">
                {OFFICIAL_PAYMENT_ACCOUNTS.map((m) => (
                  <div
                    key={m.id}
                    className={`method-card ${selectedMethodId === m.id ? "selected" : ""}`}
                    onClick={() => setSelectedMethodId(m.id)}
                  >
                    <div className="method-header">
                      <div className="method-title-group">
                        <div className="method-icon-circle">
                          {m.category === "mercadopago" && "MP"}
                          {m.category === "binance" && "🟡"}
                          {m.category === "lemon" && "🍋"}
                          {m.category === "belo" && "🟣"}
                          {m.category === "paypal" && "🅿️"}
                        </div>
                        <div>
                          <div className="method-name">{m.name}</div>
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>{m.description}</span>
                        </div>
                      </div>
                      <span className="method-badge">{m.badge}</span>
                    </div>

                    {selectedMethodId === m.id && (
                      <div className="method-details-box" onClick={(e) => e.stopPropagation()}>
                        {m.alias && (
                          <div className="data-row">
                            <span className="data-label">Alias:</span>
                            <div className="data-value">
                              <span>{m.alias}</span>
                              <button
                                type="button"
                                className="copy-mini-btn"
                                onClick={() => copyToClipboard(m.alias!, `${m.id}-alias`)}
                              >
                                {copiedKey === `${m.id}-alias` ? "¡Copiado!" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        )}

                        {m.binanceId && (
                          <div className="data-row">
                            <span className="data-label">Binance Pay ID:</span>
                            <div className="data-value">
                              <span style={{ fontSize: "14px", fontWeight: "700" }}>{m.binanceId}</span>
                              <button
                                type="button"
                                className="copy-mini-btn"
                                onClick={() => copyToClipboard(m.binanceId!, `${m.id}-binanceId`)}
                              >
                                {copiedKey === `${m.id}-binanceId` ? "¡Copiado!" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        )}

                        {m.tag && (
                          <div className="data-row">
                            <span className="data-label">Tag oficial:</span>
                            <div className="data-value">
                              <span>{m.tag}</span>
                              <button
                                type="button"
                                className="copy-mini-btn"
                                onClick={() => copyToClipboard(m.tag!, `${m.id}-tag`)}
                              >
                                {copiedKey === `${m.id}-tag` ? "¡Copiado!" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        )}

                        {m.cvu && (
                          <div className="data-row">
                            <span className="data-label">CVU:</span>
                            <div className="data-value">
                              <span style={{ fontSize: "11px" }}>{m.cvu}</span>
                              <button
                                type="button"
                                className="copy-mini-btn"
                                onClick={() => copyToClipboard(m.cvu!, `${m.id}-cvu`)}
                              >
                                {copiedKey === `${m.id}-cvu` ? "¡Copiado!" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        )}

                        {m.url && (
                          <div className="data-row">
                            <span className="data-label">Enlace de pago:</span>
                            <div className="data-value">
                              <a
                                href={`${m.url}/${payPalAmountNeeded}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  color: "#5eeaff",
                                  textDecoration: "underline",
                                }}
                              >
                                paypal.me/GRojasTissera/{payPalAmountNeeded}
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        )}

                        {m.feeNote && (
                          <div className="paypal-fee-banner">
                            <strong>Tarifa de PayPal:</strong> {m.feeNote}
                            <div style={{ marginTop: "3px" }}>
                              Total a enviar en PayPal:{" "}
                              <strong style={{ color: "#ffffff", fontSize: "12px" }}>
                                ${payPalAmountNeeded} USD
                              </strong>{" "}
                              para recibir {amount} WT netos.
                            </div>
                          </div>
                        )}

                        {m.note && (
                          <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#8bb5f0" }}>
                            ℹ️ {m.note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmar con Comprobante */}
            <form onSubmit={handleConfirmDeposit} className="receipt-input-group">
              <label>3. Ingresa tu número de comprobante o referencia de pago</label>
              <input
                type="text"
                placeholder="Ej. N° de operación, ID de PayPal o referencia bancaria..."
                className="receipt-input"
                value={receiptCode}
                onChange={(e) => setReceiptCode(e.target.value)}
                required
              />
              <button
                type="submit"
                className="button primary full"
                style={{ marginTop: "6px" }}
                disabled={!receiptCode.trim()}
              >
                <Check size={16} />
                Registrar Recarga ({amount} WT)
              </button>
            </form>
          </div>
        )
      ) : (
        /* Pestaña Retirar Fondos */
        <div className="payments-section">
          <div className="withdraw-balance-banner">
            <div>
              <span style={{ fontSize: "11px", color: "#8bb5f0", textTransform: "uppercase", fontWeight: "700" }}>
                Saldo Disponible para Retiro
              </span>
              <div className="withdraw-balance-val">
                {(user?.balance_wt || 0).toFixed(2)} WT
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "12px", color: "#cbd5e1" }}>
              ≈ {Math.round((user?.balance_wt || 0) * rate).toLocaleString()} {currentCurrency}
            </div>
          </div>

          <div className="withdraw-min-notice">
            <AlertCircle size={15} color="#eab308" />
            <span>Mínimo de retiro: <strong>10.00 WT ($10 USD)</strong>. Sin comisión de la plataforma.</span>
          </div>

          {withdrawStatus === "SUCCESS" ? (
            <div
              style={{
                background: "#081526",
                border: "1px solid #1f3d6b",
                borderRadius: "10px",
                padding: "20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "rgba(94, 234, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#5eeaff",
                }}
              >
                <Check size={28} />
              </div>
              <h3 style={{ margin: "0", color: "#f8fafc", fontSize: "17px" }}>
                ¡Solicitud de retiro registrada!
              </h3>
              <p style={{ margin: "0", color: "#94a3b8", fontSize: "13px", lineHeight: "1.4" }}>
                Hemos recibido tu solicitud de retiro por <strong>{withdrawAmount} WT</strong>. El
                Staff transferirá tus fondos a tu cuenta ({withdrawAccount}) en un plazo máximo de
                12 horas.
              </p>
              <button
                type="button"
                className="button secondary full"
                onClick={onClose}
              >
                Entendido
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmWithdraw} className="payments-section">
              <div className="receipt-input-group">
                <label>Monto a Retirar en WTokens (Mínimo 10 WT)</label>
                <input
                  type="number"
                  min="10"
                  max={user?.balance_wt || 10}
                  step="0.01"
                  className="receipt-input"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="receipt-input-group">
                <label>Método de Cobro</label>
                <select
                  className="receipt-input"
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                >
                  <option value="mercadopago">Mercado Pago (Argentina - CVU/Alias)</option>
                  <option value="binance">Binance Pay (Pay ID / Email USDT)</option>
                  <option value="lemon">Lemon Cash ($lemontag / CVU)</option>
                  <option value="belo">Belo ($belotag / CVU)</option>
                  <option value="pix">Pix (Brasil - Llave Pix / CPF)</option>
                  <option value="paypal">PayPal (Email)</option>
                </select>
              </div>

              <div className="receipt-input-group">
                <label>Datos de tu cuenta de cobro</label>
                <input
                  type="text"
                  placeholder="Ej. Tu Alias, CVU, $lemontag, Llave Pix o Email de PayPal..."
                  className="receipt-input"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  required
                />
              </div>

              {withdrawStatus && withdrawStatus !== "SUCCESS" && (
                <div style={{ color: "#f87171", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={14} />
                  {withdrawStatus}
                </div>
              )}

              <button
                type="button"
                className="button primary full"
                onClick={handleConfirmWithdraw}
                disabled={(user?.balance_wt || 0) < 10 || withdrawAmount < 10}
              >
                <ArrowUpRight size={16} />
                Confirmar Solicitud de Retiro ({withdrawAmount} WT)
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
