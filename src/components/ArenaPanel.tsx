import { useCallback, useEffect, useRef, useState } from "react";
import { api, friendlyError } from "../lib/api";
import {
  arenaApi,
  duelState,
  modeTitle,
  roundScore,
  type Arena,
  type Duel,
} from "../lib/arena";
import { MatchSearch } from "./MatchSearch";
import { MatchFound } from "./MatchFound";
import { Volume2, VolumeX } from "lucide-react";
import {
  matchSoundEnabled,
  saveMatchSound,
  primeMatchSound,
  stopMatchSound,
} from "../lib/matchSound";
import type { Mode, Team } from "../lib/contracts";
import { DuelOutcome } from "./DuelOutcome";
import { DuelReview } from "./DuelReview";
import { Deadline } from "./Deadline";
import "./duels.css";
export function DuelDetails({ duel }: { duel: Duel }) {
  const currentStake = (() => {
    try {
      const s = localStorage.getItem("wtokens_current_match_stake");
      return s ? parseFloat(s) || 5 : 5;
    } catch {
      return 5;
    }
  })();
  const netPrize = Number((currentStake * 1.8).toFixed(2));
  return (
    <>
      <div className="duel-summary">
        <strong>
          {modeTitle(duel.mode)} · {duel.size}v{duel.size}
        </strong>
        <span>{duelState(duel.state)}</span>
        <span style={{ color: "#5eeaff", fontWeight: 700 }}>
          🏆 Partida Oficial 1v1 · Pozo: {netPrize} WT netos (Aporte: {currentStake} WT)
        </span>
      </div>
      <div className="duel-rosters">
        {(["A", "B"] as const).map((side) => (
          <div key={side}>
            <h3>Equipo {side}</h3>
            <ul>
              {duel.players
                .filter((p) => p.side === side)
                .map((p) => (
                  <li key={p.id}>
                    <span>
                      {p.name}
                      {p.captain ? " · Capitán" : ""}
                    </span>
                    <small>
                      {p.confirmed ? "Confirmado" : "Por confirmar"}
                    </small>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p>
        Mapa configurado: <strong>{duel.mapCode}</strong>
      </p>
      <p className="duel-note">
        3–0 es zapatero. En los demás casos: mínimo cinco rondas ganadas con
        diferencia de dos; se continúa hasta lograrla.
      </p>
      {!duel.rounds && duel.winnerSide && (
        <p>
          Ganador confirmado: <strong>Equipo {duel.winnerSide}</strong>.
        </p>
      )}
      {duel.rounds && (
        <p>
          Resultado: Equipo A {roundScore(duel.rounds).a} —{" "}
          {roundScore(duel.rounds).b} Equipo B.{" "}
          {duel.winnerSide && `Gana el equipo ${duel.winnerSide}.`}
        </p>
      )}
      {duel.roomUrl ? (
        <a
          className="button secondary"
          href={duel.roomUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir sala privada de Discord
        </a>
      ) : (
        <p className="duel-note">
          {duel.roomStatus === "UNCONFIGURED"
            ? "La sala automática de Discord aún no está configurada. Puedes probar este duelo desde la web."
            : duel.roomStatus === "RETRY"
              ? "No se pudo crear la sala. Un moderador debe revisar la configuración; el duelo sigue disponible aquí."
              : "Preparando la sala privada de texto…"}
        </p>
      )}
      {duel.reports.length > 0 && (
        <div className="duel-reports">
          <h3>Reportes de capitanes</h3>
          {duel.reports.map((r) => (
            <p key={r.captainId}>
              {duel.players.find((p) => p.id === r.captainId)?.name}:{" "}
              {r.winnerSide
                ? `Ganador: Equipo ${r.winnerSide}`
                : `Equipo A ${roundScore(r.rounds ?? "").a} — ${roundScore(r.rounds ?? "").b} Equipo B`}{" "}
              {r.evidence && (
                <a href={r.evidence} target="_blank" rel="noopener noreferrer">
                  Ver evidencia
                </a>
              )}
            </p>
          ))}
        </div>
      )}
      <details className="duel-audit">
        <summary>Actividad del duelo</summary>
        <ol>
          {duel.events.map((event, index) => (
            <li key={`${event.createdAt}:${index}`}>
              <time dateTime={event.createdAt}>
                {new Date(event.createdAt).toLocaleString("es-PE")}
              </time>{" "}
              {event.detail}
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}
export function ArenaPanel({
  userId,
  userBalance,
  asset,
  modes,
  initialMode = "BOX_FIGHT",
  onTeam,
  onOpenPayments,
}: {
  userId: string;
  userBalance?: number | undefined;
  asset: string;
  modes: Mode[];
  initialMode?: string | undefined;
  onTeam: (mode: string) => void;
  onOpenPayments?: (() => void) | undefined;
}) {
  const [arena, setArena] = useState<Arena>();
  const [sound, setSound] = useState(matchSoundEnabled);
  const searching = useRef(false);
  useEffect(() => {
    searching.current = !!arena?.queue || arena?.duel?.state === "CONFIRMING";
  }, [arena]);
  function toggleSound() {
    const next = !sound;
    setSound(next);
    saveMatchSound(next);
    if (next) primeMatchSound();
    else stopMatchSound();
  }
  const [team, setTeam] = useState<Team | null>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState(initialMode);
  const [payment, setPayment] = useState("INDIVIDUAL");
  const [viewDisputeDetails, setViewDisputeDetails] = useState(false);

  // Stake / Wager state
  const STAKE_PRESETS = [1, 2, 3, 5, 10, 20];
  const [selectedStake, setSelectedStake] = useState<number>(() => {
    try {
      const s = localStorage.getItem("wtokens_current_match_stake");
      return s ? parseFloat(s) || 5 : 5;
    } catch {
      return 5;
    }
  });
  const [customStake, setCustomStake] = useState<string>("");

  const activeStake = customStake.trim()
    ? Math.max(0.5, parseFloat(customStake) || selectedStake)
    : selectedStake;

  const pot = Number((activeStake * 2).toFixed(2));
  const fee = Number((pot * 0.1).toFixed(2));
  const prize = Number((pot - fee).toFixed(2));

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
  const rate = RATES[asset] || 1;
  const localEstimated = Math.round(activeStake * rate);
  const localPrize = Math.round(prize * rate);
  const effectiveBalance = userBalance ?? 0;
  const hasSufficient = effectiveBalance >= activeStake;

  function handleStartMatchmaking() {
    try {
      localStorage.setItem("wtokens_current_match_stake", String(activeStake));
    } catch {}
    void act(() =>
      arenaApi.solo(
        modes.some((item) => item.code === mode)
          ? mode
          : (modes[0]?.code ?? mode),
        asset,
      ),
    );
  }
  const mounted = useRef(false),
    busyRef = useRef(false),
    version = useRef(0),
    last = useRef<Duel | null>(null);
  const load = useCallback(async () => {
    if (busyRef.current) return;
    const stamp = ++version.current;
    try {
      const [current, formation] = await Promise.all([
        arenaApi.current(),
        api.team(),
      ]);
      let closedArr: string[] = [];
      try {
        const raw = localStorage.getItem("wtokens_closed_duels");
        if (raw) closedArr = JSON.parse(raw);
      } catch {}
      const closedSet = new Set(closedArr);

      if (current.duel && closedSet.has(current.duel.id)) {
        current.duel = null;
        last.current = null;
      }

      if (!current.duel && last.current && !closedSet.has(last.current.id)) {
        current.duel = await arenaApi.get(last.current.id);
      }
      if (mounted.current && stamp === version.current) {
        last.current = current.duel;
        setArena(current);
        setTeam(formation.team);
        setError("");
      }
    } catch (e) {
      if (mounted.current && stamp === version.current)
        setError(friendlyError(e));
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    const handleDuelResolved = () => {
      last.current = null;
      setArena((prev) => (prev ? { ...prev, duel: null } : prev));
      void load();
    };
    window.addEventListener("wtokens-duel-resolved", handleDuelResolved);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" || searching.current)
        void load();
    }, 5000);
    return () => {
      mounted.current = false;
      version.current++;
      window.removeEventListener("wtokens-duel-resolved", handleDuelResolved);
      window.clearInterval(timer);
    };
  }, [load]);
  async function act(task: () => Promise<Arena | Duel>) {
    if (busyRef.current) return false;
    if (sound) primeMatchSound();
    busyRef.current = true;
    setBusy(true);
    setError("");
    version.current++;
    try {
      const result = await task();
      if (!mounted.current) return false;
      if ("players" in result) {
        last.current = result;
        setArena((previous) => ({
          ...previous,
          queue: null,
          roomsConfigured: previous?.roomsConfigured ?? false,
          duel: result,
        }));
      } else {
        last.current = result.duel;
        setArena(result);
      }
      return true;
    } catch (e) {
      if (mounted.current) setError(friendlyError(e));
      return false;
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function handleCancelMatchmaking() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    version.current++;
    try {
      try {
        await arenaApi.leave();
      } catch {}
      try {
        if (team) {
          if (team.captainId === userId) {
            await api.disbandTeam();
          } else {
            await api.leaveTeam();
          }
        }
      } catch {}
      try {
        localStorage.removeItem("wtokens_current_match_stake");
      } catch {}
      setTeam(null);
      setArena((prev) => (prev ? { ...prev, queue: null } : prev));
      await load();
    } catch (e) {
      if (mounted.current) setError(friendlyError(e));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const d = arena?.duel,
    player = d?.players.find((p) => p.id === userId),
    captain = !!player?.captain,
    terminal = d?.state === "COMPLETED" || d?.state === "CANCELLED",
    playing = d?.state === "IN_PROGRESS" || d?.state === "RESULT_PENDING",
    isDisputed = d?.state === "MODERATION";
  return (
    <section
      className="duel-panel"
      aria-labelledby="duel-title"
      aria-busy={busy}
    >
      <div className="team-heading">
        <h2 id="duel-title">
          {d && (!isDisputed || viewDisputeDetails)
            ? isDisputed
              ? "Duelo en Disputa / Arbitraje"
              : "Tu duelo"
            : arena?.queue
              ? "Buscando rival"
              : "Matchmaking"}
        </h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {(Boolean(arena?.queue) || Boolean(team && team.size > 1)) && (
            <button
              type="button"
              className="button danger small"
              disabled={busy}
              onClick={() => void handleCancelMatchmaking()}
              title="Cancelar búsqueda y salir del equipo"
              style={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                padding: "4px 10px",
                fontSize: "12px",
              }}
            >
              ❌ Cancelar búsqueda
            </button>
          )}
          <button
            className="button secondary small"
            disabled={busy}
            onClick={() => void load()}
          >
            Actualizar duelo
          </button>
        </div>
      </div>
      <button
        type="button"
        className="match-sound-toggle"
        onClick={toggleSound}
        aria-pressed={sound}
      >
        {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}{" "}
        {sound ? "Sonido de partida activado" : "Sonido de partida desactivado"}
      </button>
      <p className="duel-test-label">
        Modo de prueba · Sin dinero ni cambios de rango
      </p>
      {error && (
        <p role="alert" className="team-error">
          {error}
        </p>
      )}
      {!arena ? (
        <p>Cargando matchmaking…</p>
      ) : d && (!isDisputed || viewDisputeDetails) ? (
        <>
          {isDisputed && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <strong style={{ color: "#fbbf24" }}>⚠️ Partida en Revisión / Disputa</strong>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#cbd5e1" }}>
                  Los fondos de esta partida están asegurados en arbitraje. Puedes seguir jugando otros duelos con tu saldo restante.
                </p>
              </div>
              <button
                type="button"
                className="button primary small"
                onClick={() => setViewDisputeDetails(false)}
              >
                ⚔️ Ir a Matchmaking / Buscar Rival
              </button>
            </div>
          )}
          <DuelDetails duel={d} />
          {d.state === "CONFIRMING" && player && (
            <MatchFound
              key={d.id}
              duel={d}
              userId={userId}
              busy={busy}
              error={error}
              sound={sound}
              onSound={toggleSound}
              onAccept={() => void act(() => arenaApi.action(d.id, "confirm"))}
              onDecline={() => void act(() => arenaApi.action(d.id, "decline"))}
            />
          )}
          {playing && (
            <>
              {d.absenceDeadline && (
                <>
                  <Deadline
                    date={d.absenceDeadline}
                    label="Plazo para regresar"
                  />
                  {d.absentUser === userId && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(() => arenaApi.action(d.id, "return"))
                      }
                    >
                      Ya regresé
                    </button>
                  )}
                </>
              )}
              {d.reportDeadline && (
                <Deadline date={d.reportDeadline} label="Plazo para reportar" />
              )}
              <DuelOutcome
                duel={d}
                userId={userId}
                busy={busy}
                onReport={(outcome) =>
                  void act(() => arenaApi.outcome(d.id, outcome))
                }
                onContinue={(choice) =>
                  void act(() => arenaApi.continuation(d.id, choice))
                }
              />
              <details>
                <summary>Ausencia o problema con la partida</summary>
                {!d.absentUser && (
                  <div className="duel-buttons">
                    {d.players
                      .filter((p) => p.id !== userId)
                      .map((p) => (
                        <button
                          key={p.id}
                          className="button secondary small"
                          disabled={busy}
                          onClick={() =>
                            void act(() => arenaApi.absence(d.id, p.id))
                          }
                        >
                          Reportar ausencia de {p.name}
                        </button>
                      ))}
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(() => arenaApi.dispute(d.id, reason));
                  }}
                >
                  <label>
                    Motivo de revisión
                    <textarea
                      minLength={5}
                      maxLength={1000}
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    className="button secondary"
                    disabled={busy || reason.trim().length < 5}
                  >
                    Solicitar moderación
                  </button>
                </form>
              </details>
            </>
          )}
          {d.state === "POST_GAME" && (
            <>
              <DuelOutcome
                duel={d}
                userId={userId}
                busy={busy}
                onReport={(outcome) =>
                  void act(() => arenaApi.outcome(d.id, outcome))
                }
                onContinue={(choice) =>
                  void act(() => arenaApi.continuation(d.id, choice))
                }
              />
              <details>
                <summary>¿No se ponen de acuerdo?</summary>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(() =>
                      arenaApi.dispute(
                        d.id,
                        "Los capitanes no acuerdan cómo continuar o finalizar la serie.",
                      ),
                    )
                  }
                >
                  Solicitar moderación
                </button>
              </details>
            </>
          )}
          {(d.state === "MODERATION" ||
            (d.state === "RESULT_PENDING" &&
              d.reports.some((r) => r.captainId === userId))) && (
            <DuelReview
              key={d.id}
              duel={d}
              userId={userId}
              busy={busy}
              onCorrect={async (outcome, previous) => {
                return act(() =>
                  arenaApi.correctOutcome(d.id, outcome, previous),
                );
              }}
              onModerator={() =>
                void act(() => arenaApi.requestModerator(d.id))
              }
            />
          )}
          {captain && (playing || d.state === "MODERATION") && (
            <div>
              <p className="duel-note">
                Si ambos capitanes están de acuerdo, pueden cancelar esta prueba
                sin declarar ganador.
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void act(() => arenaApi.action(d.id, "cancel-request"))
                }
              >
                Solicitar o aceptar cancelación
              </button>
            </div>
          )}
          {(terminal || isDisputed) && (
            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <button
                className="button primary full"
                onClick={() => {
                  if (terminal) {
                    last.current = null;
                    setArena({ ...arena, duel: null });
                    void load();
                  } else {
                    setViewDisputeDetails(false);
                  }
                }}
              >
                ⚔️ {isDisputed ? "Ir a Matchmaking (Jugar con saldo disponible)" : "Buscar otro duelo"}
              </button>
            </div>
          )}
        </>
      ) : arena.queue ? (
        <MatchSearch
          queue={arena.queue}
          canCancel={arena.queue.size === 1 || team?.captainId === userId}
          busy={busy}
          onCancel={() => void handleCancelMatchmaking()}
        />
      ) : !team || team.size === 1 ? (
        <div className="solo-matchmaking">
          {/* Aviso informativo si existe un duelo en disputa simultáneo */}
          {isDisputed && d && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "6px" }}>
                  ⚠️ Tienes una partida en arbitraje (Match #{d.id.slice(0, 8)})
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#cbd5e1" }}>
                  Tus fondos en disputa están protegidos. Tu saldo disponible para jugar nuevos duelos es de <strong>{effectiveBalance.toFixed(2)} WT</strong>.
                </p>
              </div>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setViewDisputeDetails(true)}
              >
                📋 Ver Duelo en Disputa
              </button>
            </div>
          )}
          <div className="solo-matchmaking-heading">
            <span className="solo-format">1v1</span>
            <div>
              <h3>Juega solo. Encuentra tu rival.</h3>
              <p>Elige tu modalidad, define tu apuesta y entra al matchmaking.</p>
            </div>
          </div>

          {/* 1. Modalidad */}
          <label>
            Modalidad para 1v1
            <select
              value={
                modes.some((item) => item.code === mode)
                  ? mode
                  : (modes[0]?.code ?? mode)
              }
              disabled={busy || !modes.length}
              onChange={(event) => setMode(event.target.value)}
            >
              {modes.map((item) => (
                <option key={item.code} value={item.code}>
                  {modeTitle(item.code)}
                </option>
              ))}
            </select>
          </label>

          {/* 2. Selector de Apuesta en WTokens */}
          <div className="stake-selector-group" style={{ margin: "16px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ margin: 0, fontWeight: 700, color: "#f8fafc", fontSize: "14px" }}>
                Aporte por jugador (¿Cuánto deseas apostar?)
              </label>
              <span style={{ fontSize: "12px", color: hasSufficient ? "#34d399" : "#fbbf24", fontWeight: 600 }}>
                Tu saldo: {effectiveBalance.toFixed(2)} WT
              </span>
            </div>

            {/* Presets rápidos */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(75px, 1fr))", gap: "8px", marginBottom: "10px" }}>
              {STAKE_PRESETS.map((wt) => {
                const isSelected = !customStake && selectedStake === wt;
                return (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => {
                      setSelectedStake(wt);
                      setCustomStake("");
                    }}
                    style={{
                      padding: "9px 8px",
                      borderRadius: "8px",
                      border: isSelected ? "2px solid #5eeaff" : "1px solid #1e3a5f",
                      background: isSelected ? "rgba(94, 234, 255, 0.15)" : "#0b1524",
                      color: isSelected ? "#5eeaff" : "#cbd5e1",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <span>{wt} WT</span>
                    {wt === 5 && (
                      <span style={{ fontSize: "9px", color: "#fef08a", fontWeight: 600 }}>
                        POPULAR
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Campo monto personalizado */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>O ingresa otro monto:</span>
              <div style={{ position: "relative", width: "120px" }}>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="Otro WT"
                  value={customStake}
                  onChange={(e) => setCustomStake(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 24px 6px 10px",
                    borderRadius: "6px",
                    background: "#081322",
                    border: customStake ? "1px solid #5eeaff" : "1px solid #1e3a5f",
                    color: "#f8fafc",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                />
                <span style={{ position: "absolute", right: "8px", top: "7px", fontSize: "11px", color: "#64748b" }}>
                  WT
                </span>
              </div>
            </div>
          </div>

          {/* 3. Ficha Financiera de la Partida */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(14, 28, 48, 0.7) 0%, rgba(6, 16, 32, 0.9) 100%)",
              border: "1px solid #1e3a5f",
              borderRadius: "10px",
              padding: "14px 16px",
              margin: "16px 0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>Aporte de cada jugador:</span>
              <strong style={{ color: "#f8fafc", fontSize: "13px" }}>
                {activeStake.toFixed(2)} WT {asset !== "USD" && `(~ $${localEstimated} ${asset})`}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: "#94a3b8", fontSize: "12px" }}>Pozo acumulado (2 jugadores):</span>
              <span style={{ color: "#cbd5e1", fontSize: "13px" }}>{pot.toFixed(2)} WT</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#64748b", fontSize: "11px" }}>Comisión de servicio (10%):</span>
              <span style={{ color: "#64748b", fontSize: "11px" }}>-{fee.toFixed(2)} WT</span>
            </div>

            <div
              style={{
                borderTop: "1px dashed #1e3a5f",
                paddingTop: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>🏆</span>
                <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "13px" }}>Premio neto al ganador:</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#5eeaff", fontWeight: 800, fontSize: "17px" }}>
                  +{prize.toFixed(2)} WT
                </div>
                {asset !== "USD" && (
                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                    ~ ${localPrize} {asset}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Alerta de saldo insuficiente si aplica */}
          {!hasSufficient && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "14px",
                fontSize: "12px",
                color: "#fef08a",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <span>
                Saldo insuficiente: tienes <strong>{effectiveBalance.toFixed(2)} WT</strong> y necesitas{" "}
                <strong>{activeStake.toFixed(2)} WT</strong>.
              </span>
              {onOpenPayments && (
                <button
                  type="button"
                  className="button primary small"
                  onClick={onOpenPayments}
                  style={{ whiteSpace: "nowrap", padding: "4px 10px", fontSize: "11px" }}
                >
                  Recargar WT
                </button>
              )}
            </div>
          )}

          {/* 5. Botones de acción */}
          <div className="duel-buttons">
            <button
              className="button primary"
              disabled={busy || !modes.length || !hasSufficient}
              onClick={handleStartMatchmaking}
              style={{ flex: "1 1 auto" }}
            >
              {busy ? "Entrando a la búsqueda…" : `⚔️ Buscar rival 1v1 (${activeStake} WT)`}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => onTeam(mode)}
            >
              Jugar en equipo
            </button>
          </div>
          <p className="duel-note">
            Para 2v2, 3v3 o 4v4, crea un equipo e invita a tus compañeros.
          </p>
        </div>
      ) : (
        <>
          <p>
            {modeTitle(team.mode)} · {team.size}v{team.size} · Nivel del equipo:{" "}
            {team.level}
          </p>
          <p>
            {team.complete
              ? "Equipo completo. Se usará el rango del integrante con mayor nivel."
              : "Faltan compañeros. Completa tu equipo antes de buscar."}
          </p>
          <label>
            Forma de aporte para el equipo
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              disabled={busy}
            >
              <option value="INDIVIDUAL">
                Cada integrante aporta su parte
              </option>
              <option value="CAPTAIN">El capitán cubre todo</option>
            </select>
          </label>
          <p className="duel-note">
            Esta elección define si el aporte de WTokens se deduce de cada integrante o si el capitán cubre la entrada completa del equipo. El pozo neto acumulado se transfiere automáticamente a los ganadores verificados.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
            <button
              className="button primary"
              disabled={busy || !team.complete || team.captainId !== userId}
              onClick={() => {
                try {
                  localStorage.setItem("wtokens_current_match_stake", String(activeStake));
                } catch {}
                void act(() => arenaApi.enter(asset, payment));
              }}
              style={{ flex: "1 1 200px" }}
            >
              {busy ? "Entrando a la búsqueda…" : `⚔️ Buscar rival de equipo (${team.size}v${team.size})`}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void handleCancelMatchmaking()}
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                borderColor: "#ef4444",
                color: "#fca5a5",
                fontWeight: 600,
              }}
            >
              ❌ Cancelar y volver a 1v1
            </button>
          </div>
          {team.captainId !== userId && (
            <p>El capitán debe iniciar la búsqueda.</p>
          )}
        </>
      )}
    </section>
  );
}
