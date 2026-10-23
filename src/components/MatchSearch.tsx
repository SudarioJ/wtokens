import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { modeTitle, type Arena } from "../lib/arena";
import { Deadline } from "./Deadline";
export function MatchSearch({
  queue,
  canCancel,
  busy,
  onCancel,
}: {
  queue: NonNullable<Arena["queue"]>;
  canCancel: boolean;
  busy: boolean;
  onCancel: () => void;
}) {
  const [now, setNow] = useState(Date.now()),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [queue.createdAt]);
  const elapsed = Math.max(
    0,
    Math.floor((now - Date.parse(queue.createdAt)) / 1000),
  );
  return (
    <div className={`match-search ${paused ? "match-search-paused" : ""}`}>
      <div className="match-search-visual" aria-hidden="true">
        <span className="match-search-rim" />
        <span className="match-search-orbit match-search-segment" />
        <span className="match-search-inner match-search-segment" />
        <span className="match-search-sweep" />
        <span className="match-search-node match-search-node-one" />
        <span className="match-search-node match-search-node-two" />
        <span className="match-search-core">VS</span>
      </div>
      <div className="match-search-copy">
        <span className="match-search-mode">
          {modeTitle(queue.mode)} · {queue.size}v{queue.size}
        </span>
        <h3 aria-label="Buscando tu próximo rival">
          <span aria-hidden="true">
            Buscando tu próximo rival
            <span className="match-search-dots">
              .<span>.</span>
              <span>.</span>
            </span>
          </span>
        </h3>
        <p
          className="match-search-messages"
          role="status"
          aria-label={`Buscando ${queue.size === 1 ? "un jugador" : "un equipo completo"} de rango compatible.`}
        >
          {[
            `Buscando ${queue.size === 1 ? "un jugador" : "un equipo completo"} de rango compatible.`,
            "Comparando nivel y formato...",
            "Buscando jugadores disponibles...",
            "Comprobando coincidencias...",
          ].map((message, index) => (
            <span
              key={message}
              aria-hidden="true"
              style={{ animationDelay: `${index * 6}s` }}
            >
              {message}
            </span>
          ))}
        </p>
        <div className="match-search-time">
          <span>Tiempo de búsqueda</span>
          <time aria-label="Tiempo transcurrido" aria-live="off">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </time>
        </div>
        <p className="duel-note">
          Buscamos en todos los países, sin separar por moneda. Tu rival debe
          buscar el mismo modo y formato, con rango compatible.
        </p>
        <Deadline date={queue.expiresAt} label="La búsqueda vence en" />
      </div>
      <div className="match-search-actions">
        {canCancel ? (
          <button
            className="button secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar búsqueda
          </button>
        ) : (
          <p>El capitán puede cancelar la búsqueda.</p>
        )}
        <button
          type="button"
          className="match-search-motion"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
          {paused ? "Reanudar animación" : "Pausar animación"}
        </button>
      </div>
    </div>
  );
}
