import type { User } from "./contracts";

export type Ranking = NonNullable<User["ranking"]>;
const artwork = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "elite",
  "champion",
  "master",
  "grandmaster",
  "legend",
];
export const badgeSource = (level: number) =>
  `/assets/ranks/${artwork[level - 1]}.png`;

export function rankProgress(ranking: Ranking, mode: string) {
  const standing =
    ranking.modes.find((item) => item.mode === mode) ?? ranking.modes[0];
  if (!standing) return null;
  const tier = ranking.tiers.find((item) => item.level === standing.level);
  if (!tier) return null;
  const next = ranking.tiers.find((item) => item.level === standing.level + 1);
  const remaining = next
    ? Math.max(0, next.minimumPoints - standing.points)
    : 0;
  const progress = next
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            (100 * (standing.points - tier.minimumPoints)) /
              (next.minimumPoints - tier.minimumPoints),
          ),
        ),
      )
    : 100;
  return { standing, tier, next, remaining, progress };
}
