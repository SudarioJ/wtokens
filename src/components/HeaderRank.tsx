import { badgeSource, rankProgress, type Ranking } from "../lib/ranks";

export function HeaderRank({
  ranking,
  mode,
  onOpen,
}: {
  ranking: Ranking;
  mode: string;
  onOpen: () => void;
}) {
  const rank = rankProgress(ranking, mode);
  if (!rank) return null;
  const { standing, tier, next, remaining, progress } = rank;
  const modeName = standing.name.replace(/\s+1v1$/i, "");
  const description = next
    ? `${remaining} pts para ${next.name}`
    : "Rango máximo";
  return (
    <button
      className="header-rank"
      onClick={onOpen}
      aria-label={`${tier.name} · ${modeName}. ${description}. Ver rangos`}
      title={`${tier.name} · ${modeName} — ${description}`}
    >
      <img
        src={badgeSource(tier.level)}
        alt=""
        width="36"
        height="36"
        decoding="async"
      />
      <span className="header-rank-copy">
        <span className="header-rank-title">
          <strong>{tier.name}</strong>
          <small>{modeName}</small>
        </span>
        <progress
          value={progress}
          max={100}
          aria-label={`Progreso de ${modeName}: ${description}`}
        />
        <span className="header-rank-remaining">{description}</span>
      </span>
    </button>
  );
}
