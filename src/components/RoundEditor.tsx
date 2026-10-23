import { roundScore } from "../lib/arena";
export function RoundEditor({
  rounds,
  onChange,
  disabled = false,
}: {
  rounds: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const score = roundScore(rounds);
  return (
    <fieldset className="round-editor" disabled={disabled}>
      <legend>Rondas, en orden de juego</legend>
      <p>
        Marca qué equipo ganó cada ronda. Usa los mismos equipos A y B que
        aparecen arriba.
      </p>
      <output aria-live="polite" aria-label="Marcador">
        Equipo A{" "}
        <strong>
          {score.a} — {score.b}
        </strong>{" "}
        Equipo B
      </output>
      <div className="duel-buttons">
        <button
          type="button"
          className="button secondary"
          disabled={!!score.winner || rounds.length >= 10000}
          onClick={() => onChange(rounds + "A")}
        >
          + Equipo A
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!!score.winner || rounds.length >= 10000}
          onClick={() => onChange(rounds + "B")}
        >
          + Equipo B
        </button>
        <button
          type="button"
          className="text-button"
          disabled={!rounds.length}
          onClick={() => onChange(rounds.slice(0, -1))}
        >
          Deshacer última
        </button>
      </div>
      <p className="round-sequence" aria-label="Secuencia de rondas">
        {rounds
          ? rounds.split("").join(" · ")
          : "Todavía no registraste rondas."}
      </p>
      {score.winner && <p>Marcador válido. Gana el equipo {score.winner}.</p>}
    </fieldset>
  );
}
