import { useCallback, useEffect, useState } from "react";
import { arenaApi, modeTitle, duelState, type Duel } from "../lib/arena";
import { friendlyError } from "../lib/api";
import { DuelDetails } from "./ArenaPanel";
import { RoundEditor } from "./RoundEditor";
export function ArenaHistory() {
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
        Partidas de prueba sin dinero ni cambios de rango.
      </p>
      {error && <p role="alert">{error}</p>}
      {!busy && !items.length && !error && (
        <p>Todavía no participaste en un duelo de matchmaking.</p>
      )}
      {items.map((d) => (
        <details className="duel-history-item" key={d.id}>
          <summary>
            {modeTitle(d.mode)} · {d.size}v{d.size} · {duelState(d.state)}{" "}
            <time dateTime={d.createdAt}>
              {new Date(d.createdAt).toLocaleDateString("es-PE")}
            </time>
          </summary>
          <DuelDetails duel={d} />
        </details>
      ))}
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
    try {
      await arenaApi.resolve(duel.id, rounds, cancel, reason);
      setSelected("");
      setRounds("");
      setReason("");
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="duel-panel" aria-labelledby="moderation-title">
      <h2 id="moderation-title">Revisión de duelos</h2>
      {error && <p role="alert">{error}</p>}
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
            <button
              className="button primary"
              disabled={
                busy || reason.trim().length < 10 || (!cancel && !rounds.length)
              }
            >
              Registrar resolución definitiva
            </button>
          </form>
        </>
      )}
    </section>
  );
}
