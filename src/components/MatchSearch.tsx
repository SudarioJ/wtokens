import { useEffect, useState } from "react";
import { Crosshair, Pause, Play } from "lucide-react";
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
        <span className="match-search-orbit" />
        <span className="match-search-wave" />
        <span className="match-search-core">
          <Crosshair size={34} strokeWidth={1.4} />
        </span>
      </div>
      <div className="match-search-copy">
        <span className="match-search-mode">
          {modeTitle(queue.mode)} · {queue.size}v{queue.size}
        </span>
        <h3>Buscando tu próximo rival</h3>
        <p role="status">
          Buscando {queue.size === 1 ? "un jugador" : "un equipo completo"} de
          rango compatible.
        </p>
        <div className="match-search-time">
          <span>Tiempo de búsqueda</span>
          <time aria-label="Tiempo transcurrido" aria-live="off">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </time>
        </div>
        <p className="duel-note">
          La búsqueda se actualiza automáticamente. Tu rival debe buscar el
          mismo modo y formato.
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
