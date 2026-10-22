import { Trophy } from "lucide-react";
import type { User } from "../lib/contracts";
import { badgeSource, rankProgress } from "../lib/ranks";
import "./ranks.css";

export function RankPanel({
  ranking,
  mode,
  onModeChange,
}: {
  ranking: NonNullable<User["ranking"]>;
  mode: string;
  onModeChange: (mode: string) => void;
}) {
  const rank = rankProgress(ranking, mode);
  if (!rank) return null;
  const { standing, tier, next, progress, remaining } = rank;
  return (
    <section className="rank-panel" aria-labelledby="rank-title">
      <div className="rank-summary">
        <div className="rank-emblem">
          <img
            src={badgeSource(tier.level)}
            width="96"
            height="96"
            alt={`Insignia de ${tier.name}`}
            decoding="async"
          />
        </div>
        <div className="rank-identity">
          <span className="eyebrow">
            TU RANGO COMPETITIVO · NIVEL {tier.level} / 10
          </span>
          <h2 id="rank-title">{tier.name}</h2>
          <p>
            {standing.points} puntos · {standing.wins} victorias ·{" "}
            {standing.losses} derrotas
          </p>
        </div>
        <label className="rank-mode">
          <span>Modalidad</span>
          <select
            aria-label="Modalidad del rango"
            value={standing.mode}
            onChange={(event) => onModeChange(event.target.value)}
          >
            {ranking.modes.map((item) => (
              <option key={item.mode} value={item.mode}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rank-progress-copy">
        <span>
          {next
            ? `${remaining} puntos para ${next.name}`
            : "Llegaste al rango más alto"}
        </span>
        <span>
          {next ? (
            `${standing.points} / ${next.minimumPoints} pts`
          ) : (
            <Trophy size={16} />
          )}
        </span>
      </div>
      <progress
        className="rank-progress"
        value={progress}
        max={100}
        aria-label={
          next ? `Progreso hacia ${next.name}` : "Rango Leyenda alcanzado"
        }
      />
      <ol className="rank-ladder" aria-label="Los diez rangos de WTOKENS">
        {ranking.tiers.map((item) => (
          <li
            key={item.level}
            aria-current={item.level === tier.level ? "step" : undefined}
            className={item.level <= tier.level ? "rank-unlocked" : ""}
          >
            <img
              src={badgeSource(item.level)}
              width="64"
              height="64"
              alt=""
              loading="lazy"
              decoding="async"
            />
            <strong>{item.name}</strong>
            <small>{item.minimumPoints} pts</small>
          </li>
        ))}
      </ol>
      <p className="rank-note">
        {standing.placementGamesRemaining > 0
          ? `Clasificación inicial: ${10 - standing.placementGamesRemaining} de 10 partidas confirmadas. `
          : "Clasificación inicial completada. "}
        Tu rango es independiente en cada modalidad. Ganas puntos al vencer y
        puedes perderlos al caer; vencer a un rival más fuerte suma más.
      </p>
    </section>
  );
}
