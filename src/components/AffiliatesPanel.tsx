import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Gift,
  MessageSquare,
  Percent,
} from "lucide-react";
import type { User } from "../lib/contracts";
import { discordCommunityUrl } from "../lib/community";
import "./affiliates.css";

type Props = {
  user: User | null;
  onNotify: (message: string, isError?: boolean) => void;
};

export function AffiliatesPanel({ user, onNotify }: Props) {
  const [copied, setCopied] = useState(false);

  const currentTier =
    user?.affiliate_tier ||
    (user?.role === "admin" || user?.role === "owner" ? "verified" : "standard");
  const currentRatePercent = user?.affiliate_rate
    ? Math.round(user.affiliate_rate * 100)
    : currentTier === "partner"
      ? 20
      : currentTier === "verified"
        ? 15
        : 10;
  const tierName =
    currentTier === "partner"
      ? `Partner Grande (${currentRatePercent}%)`
      : currentTier === "verified"
        ? `Creador Verificado (${currentRatePercent}%)`
        : `Afiliado Normal (${currentRatePercent}%)`;

  // Default affiliate code is user display_name or fallback
  const userCode = user?.display_name
    ? user.display_name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    : "MI-CODIGO";

  const referralUrl = `https://wtokens.net/?ref=${userCode}`;

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    onNotify("¡Enlace de afiliado copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="affiliates-container">
      {/* Hero Banner */}
      <div className="affiliates-hero">
        <div className="affiliates-hero-copy">
          <div className="affiliates-hero-badge">
            <span />
            Programa Oficial de Creadores y Afiliados
          </div>
          <h2>
            Invita jugadores y gana <span>ingresos recurrentes</span>
          </h2>
          <p>
            Comparte tu código único de WTokens. Cada vez que tus referidos
            jueguen y completen un duelo en la arena, recibes una comisión
            automática y de por vida directamente en tu billetera.
          </p>
        </div>
        <a
          href={discordCommunityUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button primary"
          style={{ whiteSpace: "nowrap" }}
        >
          <MessageSquare size={16} /> Contactar Staff / Subir Rango
        </a>
      </div>

      {/* Referral Link & User Code Box */}
      <div className="affiliate-code-card">
        <div className="affiliate-code-header">
          <h3>
            <Gift size={18} color="#5eeaff" /> Tu Código y Enlace de Referido
          </h3>
          <span className={`tier-pill ${currentTier}`}>Rango: {tierName}</span>
        </div>
        <div className="affiliate-link-box">
          <input
            readOnly
            value={referralUrl}
            className="affiliate-link-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            className="button primary"
            onClick={copyToClipboard}
            type="button"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "¡Copiado!" : "Copiar Enlace"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="affiliate-stats-grid">
        <div className="affiliate-stat-card">
          <div className="stat-label">Jugadores Referidos</div>
          <div className="stat-val">0</div>
          <div className="stat-hint">Vinculados con tu código</div>
        </div>
        <div className="affiliate-stat-card">
          <div className="stat-label">Duelos Jugados</div>
          <div className="stat-val">0</div>
          <div className="stat-hint">Partidas completadas</div>
        </div>
        <div className="affiliate-stat-card">
          <div className="stat-label">Tu Comisión Actual</div>
          <div className="stat-val accent">{currentRatePercent}%</div>
          <div className="stat-hint">
            {currentTier === "partner"
              ? "🥇 Partner Grande Activo"
              : currentTier === "verified"
                ? "🥈 Creador Verificado"
                : "🥉 Afiliado Estándar"}
          </div>
        </div>
        <div className="affiliate-stat-card">
          <div className="stat-label">Total Ganado</div>
          <div className="stat-val accent">$0.00</div>
          <div className="stat-hint">Mínimo de retiro: $10 USD</div>
        </div>
      </div>

      {/* 3 Tiers Comparison */}
      <div>
        <div className="tiers-section-title">
          <span>NIVELES DISPONIBLES</span>
          Elige el rango según tu comunidad
        </div>
        <div className="tiers-grid">
          {/* Tier 1 */}
          <div className="tier-card">
            <div className="tier-header">
              <div className="tier-name">1. Afiliado Normal</div>
              <div className="tier-desc">
                Disponible de inmediato para cualquier usuario registrado.
              </div>
            </div>
            <div className="tier-rate-box">
              <div className="tier-rate-val">10%</div>
              <div className="tier-rate-sub">de la comisión WTokens</div>
            </div>
            <ul className="tier-features">
              <li>
                <Check size={14} /> Código generado al instante
              </li>
              <li>
                <Check size={14} /> Ganancias recurrentes por duelo
              </li>
              <li>
                <Check size={14} /> Sin requisitos previos de seguidores
              </li>
              <li>
                <Check size={14} /> Retiros directos desde tu billetera
              </li>
            </ul>
            <button className="button secondary full" disabled>
              {currentTier === "standard" ? "✅ Nivel Actual (10%)" : "Nivel Estándar"}
            </button>
          </div>

          {/* Tier 2 */}
          <div className="tier-card featured">
            <div className="tier-header">
              <div className="tier-name">2. Creador Verificado</div>
              <div className="tier-desc">
                Para streamers, tiktokers y creadores de contenido de Fortnite.
              </div>
            </div>
            <div className="tier-rate-box">
              <div className="tier-rate-val">15%</div>
              <div className="tier-rate-sub">de la comisión WTokens</div>
            </div>
            <ul className="tier-features">
              <li>
                <Check size={14} /> <strong>15% de comisión</strong> recurrente
              </li>
              <li>
                <Check size={14} /> Insignia de Creador en la plataforma
              </li>
              <li>
                <Check size={14} /> Canal privado de soporte con el staff
              </li>
              <li>
                <Check size={14} /> Activación enviando mensaje al staff
              </li>
            </ul>
            {currentTier === "verified" ? (
              <button
                className="button primary full"
                disabled
                style={{ background: "#10b981", borderColor: "#10b981", color: "#fff", fontWeight: 700 }}
              >
                ✅ Nivel Actual Activo ({currentRatePercent}%)
              </button>
            ) : (
              <a
                href={discordCommunityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button primary full"
              >
                Solicitar al Staff <ExternalLink size={14} />
              </a>
            )}
          </div>

          {/* Tier 3 */}
          <div
            className={`tier-card ${currentTier === "partner" ? "featured" : ""}`}
            style={
              currentTier === "partner"
                ? {
                    border: "2px solid #5eeaff",
                    background: "linear-gradient(180deg, rgba(94, 234, 255, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)",
                    boxShadow: "0 0 25px rgba(94, 234, 255, 0.25)",
                  }
                : undefined
            }
          >
            <div className="tier-header">
              <div
                className="tier-name"
                style={currentTier === "partner" ? { color: "#5eeaff", display: "flex", alignItems: "center", gap: "6px" } : undefined}
              >
                {currentTier === "partner" && <span>👑</span>} 3. Partner Grande
              </div>
              <div className="tier-desc">
                Para organizaciones, comunidades masivas o creadores top.
              </div>
            </div>
            <div className="tier-rate-box">
              <div className="tier-rate-val" style={currentTier === "partner" ? { color: "#5eeaff" } : undefined}>
                {currentTier === "partner" ? `${currentRatePercent}%` : "Hasta 20%"}
              </div>
              <div className="tier-rate-sub">
                {currentTier === "partner" ? "comisión asignada y activa" : "porcentaje negociado"}
              </div>
            </div>
            <ul className="tier-features">
              <li>
                <Check size={14} /> <strong>{currentTier === "partner" ? `${currentRatePercent}%` : "Hasta 20%"}</strong> de comisión
              </li>
              <li>
                <Check size={14} /> Eventos y torneos patrocinados para tu canal
              </li>
              <li>
                <Check size={14} /> Soporte VIP y prioridad en liquidaciones
              </li>
              <li>
                <Check size={14} /> Acuerdos personalizados con administración
              </li>
            </ul>
            {currentTier === "partner" ? (
              <button
                className="button primary full"
                disabled
                style={{
                  background: "linear-gradient(135deg, #0284c7, #06b6d4)",
                  borderColor: "#06b6d4",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                👑 Nivel Actual (Partner Oficial {currentRatePercent}%)
              </button>
            ) : (
              <a
                href={discordCommunityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary full"
              >
                Negociar Partner <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Transparent Math Explanation */}
      <div className="affiliate-math-card">
        <div className="affiliate-math-header">
          <Percent size={18} color="#5eeaff" /> ¿Cómo se calcula exactamente tu
          ganancia?
        </div>
        <div className="affiliate-math-body">
          <div className="math-explanation">
            <p>
              En WTokens no cobramos suscripciones ni costos ocultos.
              <strong> Cobramos un 10% del pozo total de cada duelo</strong> para
              sostener los servidores, el escrow y los premios.
            </p>
            <p style={{ marginTop: 10 }}>
              Tu comisión como creador se calcula sobre los ingresos que genera
              WTokens gracias a los jugadores que trajiste:
            </p>
          </div>
          <div className="math-steps">
            <div className="math-step-row">
              <span>Duelo 1v1 (2 jugadores de $5):</span>
              <span>Pozo: $10.00 USD</span>
            </div>
            <div className="math-step-row">
              <span>WTokens retiene (10% del pozo):</span>
              <span>$1.00 USD</span>
            </div>
            <div className="math-step-row">
              <span>Ganador del duelo cobra:</span>
              <span>$9.00 USD</span>
            </div>
            <div className="math-step-row">
              <span>Comisión generada por cada jugador:</span>
              <span>$0.50 USD</span>
            </div>
            <div className="math-step-row total">
              <span>Tu ganancia si eres Creador (15% de $0.50):</span>
              <span>+$0.075 USD / duelo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules and Integrity */}
      <div className="affiliate-rules-card">
        <div className="affiliate-rules-title">Reglas de Integridad y Transparencia</div>
        <div className="affiliate-rules-grid">
          <div className="affiliate-rule-item">
            <span /> Solo se comisiona sobre duelos finalizados y completados.
          </div>
          <div className="affiliate-rule-item">
            <span /> Sin comisiones por partidas canceladas, reembolsadas o en disputa.
          </div>
          <div className="affiliate-rule-item">
            <span /> Prohibido el autorreferido (usar tu propio código en multicuentas).
          </div>
          <div className="affiliate-rule-item">
            <span /> Detección automática antifraude para granjas de cuentas.
          </div>
          <div className="affiliate-rule-item">
            <span /> Ganancias recurrentes: cobras cada vez que tu invitado juegue.
          </div>
          <div className="affiliate-rule-item">
            <span /> Mínimo de retiro fijado en $10 USD o equivalente local.
          </div>
        </div>
      </div>
    </div>
  );
}
