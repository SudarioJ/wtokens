import { useEffect, useRef, useState } from "react";
import { Check, Crosshair, Volume2, VolumeX } from "lucide-react";
import { modeTitle, type Duel } from "../lib/arena";
import {
  playMatchSound,
  primeMatchSound,
  stopMatchSound,
} from "../lib/matchSound";
import { Deadline } from "./Deadline";

export function MatchFound({
  duel,
  userId,
  busy,
  error,
  sound,
  onSound,
  onAccept,
  onDecline,
}: {
  duel: Duel;
  userId: string;
  busy: boolean;
  error: string;
  sound: boolean;
  onSound: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const alerted = useRef(false);
  const [expired, setExpired] = useState(
    Date.parse(duel.confirmationDeadline) <= Date.now(),
  );
  const [blocked, setBlocked] = useState(false);
  const player = duel.players.find((p) => p.id === userId);
  const accepted = !!player?.confirmed;
  useEffect(() => {
    const dialog = ref.current;
    const title = document.title;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>(".match-found-accept")?.focus();
    document.title = "Partida encontrada · WTOKENS";
    return () => {
      dialog?.close();
      document.title = title;
      stopMatchSound();
    };
  }, []);
  useEffect(() => {
    const remaining = Date.parse(duel.confirmationDeadline) - Date.now();
    setExpired(remaining <= 0);
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(0, remaining),
    );
    return () => window.clearTimeout(timer);
  }, [duel.confirmationDeadline]);
  useEffect(() => {
    if (alerted.current || accepted || expired) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      alerted.current = true;
      if (sound)
        void playMatchSound(controller.signal).then((played) => {
          if (active) setBlocked(!played);
        });
    }, 0);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [accepted, expired, sound]);
  return (
    <dialog
      ref={ref}
      className="match-found"
      aria-labelledby="match-found-title"
      aria-describedby="match-found-description"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="match-found-top">
        <span>WTOKENS / MATCHMAKING</span>
        <button
          type="button"
          className="match-found-sound"
          onClick={onSound}
          aria-label={
            sound ? "Silenciar aviso de partida" : "Activar aviso de partida"
          }
          aria-pressed={sound}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>
      <div
        className={`match-found-emblem ${accepted ? "is-accepted" : ""}`}
        aria-hidden="true"
      >
        <span />
        {accepted ? (
          <Check size={40} strokeWidth={1.6} />
        ) : (
          <Crosshair size={40} strokeWidth={1.4} />
        )}
      </div>
      <p className="match-found-mode">
        {modeTitle(duel.mode)} · {duel.size}v{duel.size}
      </p>
      <h2 id="match-found-title">Partida encontrada</h2>
      <p id="match-found-description">
        {expired
          ? "Se agotó el tiempo. Actualizando el estado de la partida…"
          : accepted
            ? "Ya aceptaste. Esperando a los demás jugadores."
            : "Tu rival está listo. Acepta para entrar a la partida."}
      </p>
      <div className="match-found-teams">
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
                      {p.id === userId ? " (tú)" : ""}
                    </span>
                    <span className={p.confirmed ? "is-ready" : ""}>
                      {p.confirmed ? "Listo" : "Esperando"}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="match-found-ready" role="status">
        {duel.players.filter((p) => p.confirmed).length} de{" "}
        {duel.players.length} jugadores aceptaron
      </p>
      <Deadline date={duel.confirmationDeadline} label="Tiempo para aceptar" />
      {error && (
        <p role="alert" className="match-found-error">
          {error}
        </p>
      )}
      <button
        type="button"
        className="button primary match-found-accept"
        autoFocus
        disabled={busy || accepted || expired}
        onClick={onAccept}
      >
        {expired
          ? "Tiempo agotado"
          : accepted
            ? "Ya confirmaste"
            : busy
              ? "Confirmando…"
              : "Confirmar participación"}
      </button>
      <button
        type="button"
        className="match-found-decline"
        disabled={busy || expired}
        onClick={onDecline}
      >
        No participar
      </button>
      {sound && blocked && (
        <button
          className="match-found-audio-help"
          type="button"
          onClick={() => {
            primeMatchSound();
            void playMatchSound().then((played) => setBlocked(!played));
          }}
        >
          Activar sonido en este navegador
        </button>
      )}
    </dialog>
  );
}
