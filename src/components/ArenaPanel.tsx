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
import { Deadline } from "./Deadline";
import "./duels.css";
export function DuelDetails({ duel }: { duel: Duel }) {
  return (
    <>
      <div className="duel-summary">
        <strong>
          {modeTitle(duel.mode)} · {duel.size}v{duel.size}
        </strong>
        <span>{duelState(duel.state)}</span>
        <span>Prueba sin dinero · No modifica tu rango</span>
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
  asset,
  modes,
  initialMode = "BOX_FIGHT",
  onTeam,
}: {
  userId: string;
  asset: string;
  modes: Mode[];
  initialMode?: string;
  onTeam: (mode: string) => void;
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
      if (!current.duel && last.current) {
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
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" || searching.current)
        void load();
    }, 5000);
    return () => {
      mounted.current = false;
      version.current++;
      window.clearInterval(timer);
    };
  }, [load]);
  async function act(task: () => Promise<Arena | Duel>) {
    if (busyRef.current) return;
    if (sound) primeMatchSound();
    busyRef.current = true;
    setBusy(true);
    setError("");
    version.current++;
    try {
      const result = await task();
      if (!mounted.current) return;
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
    playing = d?.state === "IN_PROGRESS" || d?.state === "RESULT_PENDING";
  return (
    <section
      className="duel-panel"
      aria-labelledby="duel-title"
      aria-busy={busy}
    >
      <div className="team-heading">
        <h2 id="duel-title">
          {d ? "Tu duelo" : arena?.queue ? "Buscando rival" : "Matchmaking"}
        </h2>
        <button
          className="button secondary small"
          disabled={busy}
          onClick={() => void load()}
        >
          Actualizar duelo
        </button>
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
      ) : d ? (
        <>
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
          {d.state === "MODERATION" && (
            <p role="status">
              El caso está en revisión. No se declara ganador ni se mueve saldo
              automáticamente.
            </p>
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
          {terminal && (
            <button
              className="button primary"
              onClick={() => {
                last.current = null;
                setArena({ ...arena, duel: null });
                void load();
              }}
            >
              Buscar otro duelo
            </button>
          )}
        </>
      ) : arena.queue ? (
        <MatchSearch
          queue={arena.queue}
          canCancel={arena.queue.size === 1 || team?.captainId === userId}
          busy={busy}
          onCancel={() => void act(arenaApi.leave)}
        />
      ) : !team || team.size === 1 ? (
        <div className="solo-matchmaking">
          <div className="solo-matchmaking-heading">
            <span className="solo-format">1v1</span>
            <div>
              <h3>Juega solo. Encuentra tu rival.</h3>
              <p>Elige tu modalidad y entra directamente a la búsqueda.</p>
            </div>
          </div>
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
          <div className="duel-buttons">
            <button
              className="button primary"
              disabled={busy || !modes.length}
              onClick={() =>
                void act(() =>
                  arenaApi.solo(
                    modes.some((item) => item.code === mode)
                      ? mode
                      : modes[0]!.code,
                    asset,
                  ),
                )
              }
            >
              {busy ? "Entrando a la búsqueda…" : "Buscar rival 1v1"}
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
            Esta elección se guarda con el duelo. En las pruebas ambas opciones
            cuestan cero; no reservan ni reparten dinero. Las partidas de prueba
            no suben ni bajan rangos.
          </p>
          <button
            className="button primary"
            disabled={busy || !team.complete || team.captainId !== userId}
            onClick={() => void act(() => arenaApi.enter(asset, payment))}
          >
            Buscar rival de prueba
          </button>
          {team.captainId !== userId && (
            <p>El capitán debe iniciar la búsqueda.</p>
          )}
        </>
      )}
    </section>
  );
}
