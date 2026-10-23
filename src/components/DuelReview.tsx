import { useState } from "react";
import type { Duel } from "../lib/arena";

export function DuelReview({
  duel,
  userId,
  busy,
  onCorrect,
  onModerator,
}: {
  duel: Duel;
  userId: string;
  busy: boolean;
  onCorrect: (outcome: "WIN" | "LOSS", previous: "A" | "B") => Promise<boolean>;
  onModerator: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<"WIN" | "LOSS">("WIN");
  const player = duel.players.find((p) => p.id === userId);
  const report = duel.reports.find((r) => r.captainId === userId);
  if (!player) return null;
  const correctable =
    duel.review?.correctionsAllowed && player.captain && !!report?.winnerSide;
  const reported = report?.winnerSide === player.side ? "WIN" : "LOSS";
  const notice = duel.review?.noticeStatus ?? "NOT_REQUESTED";
  const requested = notice !== "NOT_REQUESTED" && notice !== "CANCELLED";
  const status = {
    PENDING:
      "Solicitud registrada. El aviso se enviará a la sala privada cuando esté lista.",
    RETRY:
      "La solicitud está registrada, pero Discord no recibió el aviso. Se reintentará automáticamente.",
    SENT: "Aviso enviado al rol de moderadores en la sala privada de Discord.",
    UNCONFIGURED:
      "Solicitud registrada en la web. El bot y las salas de Discord aún no están configurados; no se envió ninguna mención.",
    CANCELLED: "El aviso pendiente se canceló al resolverse el caso.",
    NOT_REQUESTED: "",
  };
  return (
    <section className="duel-outcome" aria-label="Revisión del resultado">
      {duel.state === "MODERATION" && (
        <>
          <h3>Los resultados necesitan revisión</h3>
          <p>
            No se declara un ganador mientras el caso siga en revisión. Si
            marcaste mal tu resultado, puedes corregirlo cuando la opción esté
            disponible.
          </p>
        </>
      )}
      {correctable && !editing && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            setChoice(reported);
            setEditing(true);
          }}
        >
          Corregir mi resultado
        </button>
      )}
      {correctable && editing && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onCorrect(choice, report!.winnerSide!)) setEditing(false);
          }}
        >
          <fieldset className="duel-correction-options">
            <legend>Mi resultado correcto</legend>
            <label>
              <input
                type="radio"
                name={`correct-${duel.id}`}
                checked={choice === "WIN"}
                onChange={() => setChoice("WIN")}
                disabled={busy}
              />
              {duel.size === 1 ? "Gané" : "Ganamos"}
            </label>
            <label>
              <input
                type="radio"
                name={`correct-${duel.id}`}
                checked={choice === "LOSS"}
                onChange={() => setChoice("LOSS")}
                disabled={busy}
              />
              {duel.size === 1 ? "Perdí" : "Perdimos"}
            </label>
          </fieldset>
          <p className="duel-note">
            Solo cambiarás el reporte de tu equipo. Si ambos reportes coinciden,
            el resultado quedará confirmado.
          </p>
          <div className="duel-buttons">
            <button
              className="button primary"
              disabled={busy || choice === reported}
            >
              Guardar corrección
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Volver
            </button>
          </div>
        </form>
      )}
      {duel.state === "MODERATION" && (
        <>
          <div className="duel-buttons">
            <button
              className="button primary"
              disabled={busy || requested}
              onClick={onModerator}
            >
              {requested ? "Moderador solicitado" : "Llamar a un moderador"}
            </button>
          </div>
          {status[notice] && <p role="status">{status[notice]}</p>}
        </>
      )}
    </section>
  );
}
