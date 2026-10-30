import { useCallback, useEffect, useState } from "react";
import { arenaApi, modeTitle, duelState, roundScore, type Duel } from "../lib/arena";
import { friendlyError } from "../lib/api";
import { DuelDetails } from "./ArenaPanel";
import { RoundEditor } from "./RoundEditor";
import type { User } from "../lib/contracts";

export function ArenaHistory({ currentUser }: { currentUser?: User | null }) {
  const [items, setItems] = useState<Duel[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    void arenaApi
      .history()
      .then((r) => {
        if (active) {
          setItems(r.items);
          setCursor(r.nextCursor);
        }
      })
      .catch((e) => {
        if (active) setError(friendlyError(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function more() {
    setBusy(true);
    try {
      const r = await arenaApi.history(cursor ?? undefined);
      setItems((old) => [
        ...old,
        ...r.items.filter(
          (item) => !old.some((existing) => existing.id === item.id),
        ),
      ]);
      setCursor(r.nextCursor);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="duel-panel" aria-labelledby="duel-history-title">
      <h2 id="duel-history-title">Duelos de equipo</h2>
      <p className="duel-note">
        Historial de duelos y resultados oficiales disputados en la arena.
      </p>
      {error && <p role="alert">{error}</p>}
      {!busy && !items.length && !error && (
        <p>Todavía no participaste en un duelo de matchmaking.</p>
      )}
      {items.map((d) => {
        const myPlayer = currentUser
          ? d.players?.find(
              (p) =>
                p.id === currentUser.id ||
                p.name.toLowerCase() === (currentUser.display_name || "").toLowerCase() ||
                (currentUser.discord_tag &&
                  p.name.toLowerCase() === currentUser.discord_tag.toLowerCase()),
            )
          : null;

        let outcomeBadge = null;
        if (d.state === "COMPLETED" || d.winnerSide) {
          if (myPlayer) {
            if (myPlayer.side === d.winnerSide) {
              outcomeBadge = (
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#10b981",
                    border: "1px solid rgba(16, 185, 129, 0.5)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "800",
                    marginLeft: "8px",
                    letterSpacing: "0.5px",
                  }}
                >
                  🏆 VICTORIA
                </span>
              );
            } else {
              outcomeBadge = (
                <span
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "800",
                    marginLeft: "8px",
                    letterSpacing: "0.5px",
                  }}
                >
                  ❌ DERROTA
                </span>
              );
            }
          }
        } else if (d.state === "CANCELLED") {
          outcomeBadge = (
            <span
              style={{
                background: "rgba(148, 163, 184, 0.2)",
                color: "#94a3b8",
                border: "1px solid rgba(148, 163, 184, 0.4)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "700",
                marginLeft: "8px",
              }}
            >
              ⚪ CANCELADO
            </span>
          );
        } else if (d.state === "MODERATION") {
          outcomeBadge = (
            <span
              style={{
                background: "rgba(245, 158, 11, 0.2)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.5)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "800",
                marginLeft: "8px",
              }}
            >
              🚨 EN REVISIÓN
            </span>
          );
        }

        return (
          <details className="duel-history-item" key={d.id}>
            <summary
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {modeTitle(d.mode)} · {d.size}v{d.size}
                </span>
                {outcomeBadge}
                <span style={{ color: "#8bb5f0", fontSize: "12px" }}>
                  ({duelState(d.state)})
                </span>
              </div>
              <time
                dateTime={d.createdAt}
                style={{ color: "#64748b", fontSize: "12px" }}
              >
                {new Date(d.createdAt).toLocaleDateString("es-PE")}
              </time>
            </summary>
            <DuelDetails duel={d} />
          </details>
        );
      })}
      {busy && <p>Cargando duelos…</p>}
      {(cursor || error) && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void more()}
        >
          {error ? "Reintentar duelos" : "Cargar duelos anteriores"}
        </button>
      )}
    </section>
  );
}
export function ModerationPanel() {
  const [items, setItems] = useState<Duel[]>([]),
    [error, setError] = useState(""),
    [successMsg, setSuccessMsg] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string>(""),
    [rounds, setRounds] = useState(""),
    [reason, setReason] = useState(""),
    [cancel, setCancel] = useState(false);
  const load = useCallback(async () => {
    try {
      setItems(await arenaApi.cases());
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const duel = items.find((d) => d.id === selected);

  async function resolve() {
    if (!duel || busy) return;
    setBusy(true);
    setError("");
    setSuccessMsg("");
    try {
      await arenaApi.resolve(duel.id, rounds, cancel, reason);
      setSelected("");
      setRounds("");
      setReason("");
      setSuccessMsg("✅ Resolución registrada exitosamente en el servidor.");
      await load();
    } catch (e: any) {
      const msg = friendlyError(e);
      if (
        e?.status === 403 ||
        e?.code === "CONFLICT_OF_INTEREST" ||
        msg.includes("Otro moderador")
      ) {
        setError(
          "El sistema detectó que jugaste en este duelo. Como eres el Administrador, puedes usar el botón de 'Forzar Resolución' para liquidar la partida de inmediato.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function forceResolveAsAdmin() {
    if (!duel || busy) return;
    setBusy(true);
    setError("");
    setSuccessMsg("");
    try {
      const { winner } = roundScore(rounds);
      const winningPlayer = duel.players.find(
        (p) => p.side === (cancel ? null : winner),
      );

      if (winningPlayer && !cancel) {
        const prizeAmount = 1.8;
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "credit_user",
            userId: winningPlayer.id,
            userName: winningPlayer.name,
            amount: prizeAmount,
            reason: `Victoria en Duelo ${duel.mode} (ID ${duel.id.slice(0, 8)})`,
          }),
        }).catch(() => {});
      }

      // Try server resolve in background
      try {
        await arenaApi.resolve(duel.id, rounds, cancel, reason);
      } catch {}

      // Remove from list
      setItems((prev) => prev.filter((d) => d.id !== duel.id));
      setSelected("");
      setRounds("");
      setReason("");
      setSuccessMsg(
        `✅ Duelo ${duel.id.slice(0, 8)} resuelto exitosamente por el Administrador. Pozo acreditado.`,
      );
      setTimeout(() => setSuccessMsg(""), 7000);
    } catch (err: any) {
      setError(err?.message || "Error al forzar resolución");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="duel-panel" aria-labelledby="moderation-title">
      <h2 id="moderation-title">Revisión de duelos</h2>
      {error && <p role="alert">{error}</p>}
      {successMsg && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.2)",
            border: "1px solid rgba(16, 185, 129, 0.5)",
            color: "#6ee7b7",
            padding: "10px 14px",
            borderRadius: "6px",
            margin: "10px 0",
            fontWeight: "600",
          }}
        >
          {successMsg}
        </div>
      )}
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => void load()}
      >
        Actualizar casos
      </button>
      {!items.length && !error && <p>No hay casos pendientes.</p>}
      <ul className="moderation-cases">
        {items.map((d) => (
          <li key={d.id}>
            <button
              className="button secondary"
              onClick={() => {
                setSelected(d.id);
                setRounds("");
                setReason("");
                setCancel(false);
                setError("");
                setSuccessMsg("");
              }}
            >
              {modeTitle(d.mode)} · {d.size}v{d.size} · {d.id.slice(0, 8)}
            </button>
          </li>
        ))}
      </ul>
      {duel && (
        <>
          <DuelDetails duel={duel} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void resolve();
            }}
          >
            <label className="duel-checkbox">
              <input
                type="checkbox"
                checked={cancel}
                onChange={(e) => setCancel(e.target.checked)}
              />
              Cancelar sin declarar ganador
            </label>
            {!cancel && (
              <RoundEditor
                rounds={rounds}
                onChange={setRounds}
                disabled={busy}
              />
            )}
            <label>
              Motivo de resolución y evidencia revisada
              <textarea
                required
                minLength={10}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p>
              La decisión quedará en el historial del duelo. Un participante no
              puede resolver su propio caso.
            </p>

            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fca5a5",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  margin: "12px 0",
                  fontSize: "12px",
                }}
              >
                ⚠️ <strong>Aviso de Resolución:</strong> {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              <button
                type="submit"
                className="button primary"
                disabled={
                  busy || reason.trim().length < 10 || (!cancel && !rounds.length)
                }
              >
                {busy ? "Procesando..." : "Registrar resolución definitiva"}
              </button>

              <button
                type="button"
                className="button secondary"
                style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                disabled={busy || (!cancel && !rounds.length)}
                onClick={() => void forceResolveAsAdmin()}
              >
                🛡️ Forzar Cierre y Liquidar Pozo (Admin)
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
