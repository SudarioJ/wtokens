import type { Duel } from "../lib/arena";

export function DuelOutcome({
  duel,
  userId,
  busy,
  onReport,
  onContinue,
}: {
  duel: Duel;
  userId: string;
  busy: boolean;
  onReport: (outcome: "WIN" | "LOSS") => void;
  onContinue: (choice: "DOUBLE" | "REMATCH" | "FINISH") => void;
}) {
  const player = duel.players.find((p) => p.id === userId);
  const report = duel.reports.find((r) => r.captainId === userId);
  const series = duel.series;
  const postGame = duel.state === "POST_GAME";
  const tied = !!series && series.winsA === series.winsB;
  const choice = series?.votes.find((v) => v.captainId === userId)?.choice;
  const labels = {
    DOUBLE: "Doble",
    REMATCH: "Empezar revancha",
    FINISH: "Finalizar",
  };
  const money = (minor: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
    }).format(minor / 100);
  if (!player) return null;
  return (
    <section
      className="duel-outcome"
      aria-label={postGame ? "Continuar o finalizar" : "Reportar resultado"}
    >
      <h3>
        {postGame
          ? duel.winnerSide === player.side
            ? "Victoria confirmada"
            : "Derrota confirmada"
          : "¿Cómo terminó la partida?"}
      </h3>
      {!postGame && (
        <>
          <p>
            Los dos capitanes deben coincidir en el ganador. Si los reportes no
            coinciden, revisará un moderador.
          </p>
          {report ? (
            <p role="status">
              Tu resultado está enviado. Esperando al capitán rival.
            </p>
          ) : player.captain ? (
            <div className="duel-buttons">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => onReport("WIN")}
              >
                {duel.size === 1 ? "Gané" : "Ganamos"}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => onReport("LOSS")}
              >
                {duel.size === 1 ? "Perdí" : "Perdimos"}
              </button>
            </div>
          ) : (
            <p>Tu capitán reportará el resultado.</p>
          )}
        </>
      )}
      {postGame && series && (
        <>
          <p>
            Serie: Equipo A{" "}
            <strong>
              {series.winsA}–{series.winsB}
            </strong>{" "}
            Equipo B.
          </p>
          <p>
            {tied
              ? "Serie igualada. Pueden empezar una revancha con el monto original o finalizar."
              : "Pueden jugar el doble con los mismos equipos o finalizar."}
          </p>
          <p className="duel-note">
            Simulación sin dinero · Referencia por jugador:{" "}
            {money(Number(series.referenceUsdMinor))}.
            {tied
              ? ` Revancha: ${money(50)} por jugador.`
              : ` Doble: ${money(Number(series.referenceUsdMinor) * 2)} por jugador.`}{" "}
            No se descuenta ni se acredita saldo.
          </p>
          {!tied && (
            <p className="duel-note">
              Al activar los pagos, el ganador reutilizará el pozo y el perdedor
              aportará el nuevo monto de su billetera. Un 1–1 en partidas de
              distinto monto no equivale a saldo cero.
            </p>
          )}
          {series.votes.length > 0 && (
            <ul className="duel-votes" aria-label="Decisiones de los capitanes">
              {series.votes.map((v) => (
                <li key={v.captainId}>
                  {duel.players.find((p) => p.id === v.captainId)?.name ??
                    "Capitán"}
                  : {labels[v.choice]}
                </li>
              ))}
            </ul>
          )}
          {player.captain ? (
            <>
              <div className="duel-buttons">
                <button
                  className="button primary"
                  disabled={busy || choice === (tied ? "REMATCH" : "DOUBLE")}
                  onClick={() => onContinue(tied ? "REMATCH" : "DOUBLE")}
                >
                  {tied ? "Empezar revancha" : "Doble"}
                </button>
                <button
                  className="button secondary"
                  disabled={busy || choice === "FINISH"}
                  onClick={() => onContinue("FINISH")}
                >
                  Finalizar
                </button>
              </div>
              <p role="status">
                {choice
                  ? "Decisión enviada. Falta que el otro capitán elija la misma opción. Puedes cambiar tu decisión."
                  : "Ambos capitanes deben elegir la misma opción para continuar o finalizar."}
              </p>
            </>
          ) : (
            <p>Los capitanes decidirán si continúan o finalizan.</p>
          )}
        </>
      )}
    </section>
  );
}
