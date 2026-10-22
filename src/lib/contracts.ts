import { z } from "zod";

const minor = z.string().regex(/^-?\d{1,19}$/);
export const platformSchema = z.object({
  discordEnabled: z.boolean(),
  wageringEnabled: z.boolean(),
  feeBps: z.number().int().min(0).max(10000),
  maxStakeMinor: minor,
  rulesVersion: z.string(),
});
export type Platform = z.infer<typeof platformSchema>;
export const userSchema = z.object({
  id: z.uuid(),
  display_name: z.string().max(100),
  avatar_url: z
    .string()
    .regex(
      /^https:\/\/cdn\.discordapp\.com\/(?:avatars\/[0-9]{1,20}\/(?:a_)?[a-f0-9]{32}\.png\?size=128|embed\/avatars\/[0-5]\.png)$/,
    )
    .nullable()
    .optional(),
  eligible: z.boolean(),
  suspended: z.boolean(),
  ranking: z
    .object({
      tiers: z
        .array(
          z.object({
            level: z.number().int().min(1).max(10),
            name: z.string().max(40),
            minimumPoints: z.number().int().nonnegative(),
          }),
        )
        .length(10),
      modes: z.array(
        z.object({
          mode: z.string(),
          name: z.string(),
          points: z.number().int().nonnegative(),
          wins: z.number().int().nonnegative(),
          losses: z.number().int().nonnegative(),
          level: z.number().int().min(1).max(10),
          placementGamesRemaining: z.number().int().min(0).max(10),
        }),
      ),
    })
    .optional(),
});
export const modeSchema = z.object({
  code: z.string().regex(/^[A-Z_]+$/),
  name: z.string().max(100),
});
export const assetSchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  exponent: z.number().int().min(0).max(3),
  settlement_enabled: z.boolean(),
});
export const balanceSchema = z.object({
  asset: z.string().regex(/^[A-Z]{3}$/),
  kind: z.enum(["AVAILABLE", "RESERVED"]),
  amount_minor: minor,
});
export const transactionSchema = z.object({
  journal_id: z.uuid(),
  reference: z.string(),
  asset: z.string(),
  amount_minor: minor,
  kind: z.enum(["AVAILABLE", "RESERVED"]),
  created_at: z.iso.datetime(),
});
export const lobbySchema = z.object({
  id: z.uuid(),
  mode: z.string(),
  asset: z.string(),
  stake_minor: minor,
  fee_bps: z.number().int().min(0).max(10000),
  rules_version: z.string(),
  expires_at: z.iso.datetime(),
});
export const matchSchema = z.object({
  id: z.uuid(),
  creatorId: z.uuid(),
  opponentId: z.uuid().nullable(),
  mode: z.string(),
  asset: z.string(),
  stakeMinor: minor,
  feeBps: z.number().int().min(0).max(10000),
  rulesVersion: z.string(),
  state: z.enum([
    "OPEN",
    "FUNDED",
    "IN_PROGRESS",
    "RESULT_PENDING",
    "DISPUTED",
    "SETTLED",
    "CANCELLED",
    "EXPIRED",
  ]),
  winnerId: z.uuid().nullable(),
  expiresAt: z.iso.datetime(),
});
export type User = z.infer<typeof userSchema>;
export type Mode = z.infer<typeof modeSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Balance = z.infer<typeof balanceSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type LobbyMatch = z.infer<typeof lobbySchema>;
export type Match = z.infer<typeof matchSchema>;
export const teamSchema = z.object({
  id: z.uuid(),
  captainId: z.uuid(),
  mode: z.string(),
  size: z.number().int().min(1).max(4),
  members: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string().max(100),
        points: z.number().int().nonnegative(),
        level: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(4),
  level: z.number().int().min(1).max(10),
  points: z.number().int().nonnegative(),
  complete: z.boolean(),
});
export const currentTeamSchema = z.object({ team: teamSchema.nullable() });
export const teamInvitationSchema = z.object({
  team: teamSchema,
  inviteCode: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.iso.datetime(),
});
export type Team = z.infer<typeof teamSchema>;
