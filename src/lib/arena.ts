import { z } from "zod";
import { request, write } from "./api";
const date = z.iso.datetime().nullable();
export const duelSchema = z.object({
  id: z.uuid(),
  mode: z.string(),
  size: z.number().int().min(1).max(4),
  asset: z.string(),
  stakeMinor: z.literal("0"),
  state: z.enum([
    "CONFIRMING",
    "IN_PROGRESS",
    "RESULT_PENDING",
    "MODERATION",
    "COMPLETED",
    "CANCELLED",
  ]),
  winnerSide: z.enum(["A", "B"]).nullable(),
  rounds: z.string().nullable(),
  createdAt: z.iso.datetime(),
  confirmationDeadline: z.iso.datetime(),
  startedAt: date,
  finishedAt: date,
  reportDeadline: date,
  absentUser: z.uuid().nullable(),
  absenceDeadline: date,
  mapCode: z.string().regex(/^\d{4}-\d{4}-\d{4}$/),
  roomStatus: z.enum(["UNCONFIGURED", "PENDING", "READY", "RETRY", "ARCHIVED"]),
  roomUrl: z
    .string()
    .regex(/^https:\/\/discord\.com\/channels\/[0-9]{17,20}\/[0-9]{17,20}$/)
    .nullable(),
  players: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string().max(100),
        side: z.enum(["A", "B"]),
        captain: z.boolean(),
        confirmed: z.boolean(),
        paymentMode: z.enum(["CAPTAIN", "INDIVIDUAL"]),
      }),
    )
    .min(2)
    .max(8),
  reports: z
    .array(
      z.object({
        captainId: z.uuid(),
        rounds: z.string(),
        evidence: z
          .url()
          .regex(/^https:\/\//)
          .nullable(),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(2),
  events: z.array(
    z.object({
      type: z.string(),
      detail: z.string().max(2000),
      createdAt: z.iso.datetime(),
    }),
  ),
});
export const arenaSchema = z.object({
  queue: z
    .object({
      mode: z.string(),
      size: z.number(),
      asset: z.string(),
      stakeMinor: z.literal("0"),
      paymentMode: z.enum(["CAPTAIN", "INDIVIDUAL"]),
      createdAt: z.iso.datetime(),
      expiresAt: z.iso.datetime(),
    })
    .nullable(),
  duel: duelSchema.nullable(),
  roomsConfigured: z.boolean(),
});
const historySchema = z.object({
  items: z.array(duelSchema),
  nextCursor: z.uuid().nullable(),
});
export type Duel = z.infer<typeof duelSchema>;
export type Arena = z.infer<typeof arenaSchema>;
const send = <T>(path: string, schema: z.ZodType<T>, body: unknown = {}) =>
  write(path, schema, body, crypto.randomUUID());
const duelPath = (id: string) => `/v1/arena/duels/${z.uuid().parse(id)}`;
export const arenaApi = {
  current: () => request("/v1/arena", arenaSchema),
  solo: (mode: string, asset: string) =>
    send("/v1/arena/solo", arenaSchema, { mode, asset }),
  enter: (asset: string, paymentMode: string) =>
    send("/v1/arena/queue", arenaSchema, {
      asset,
      stakeMinor: "0",
      paymentMode,
    }),
  leave: () => send("/v1/arena/queue/leave", arenaSchema),
  get: (id: string) => request(duelPath(id), duelSchema),
  action: (
    id: string,
    action: "confirm" | "decline" | "finish" | "return" | "cancel-request",
  ) => send(`${duelPath(id)}/${action}`, duelSchema),
  report: (id: string, rounds: string, evidence: string) =>
    send(`${duelPath(id)}/report`, duelSchema, {
      rounds,
      evidence: evidence || null,
    }),
  dispute: (id: string, reason: string) =>
    send(`${duelPath(id)}/dispute`, duelSchema, { reason }),
  absence: (id: string, userId: string) =>
    send(`${duelPath(id)}/absence`, duelSchema, { userId }),
  history: (cursor?: string) =>
    request(
      `/v1/arena/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      historySchema,
    ),
  cases: () => request("/v1/arena/moderation", z.array(duelSchema)),
  resolve: (id: string, rounds: string, cancel: boolean, reason: string) =>
    send(`${duelPath(id)}/resolve`, duelSchema, { rounds, cancel, reason }),
};
export const modeTitle = (mode: string) =>
  ({
    BOX_FIGHT: "Box Fight",
    BUILD_FIGHT: "Build Fight",
    REALISTICS: "Realistics",
    ZONE_WARS: "Zone Wars",
  })[mode] ?? mode;
export const duelState = (state: Duel["state"]) =>
  ({
    CONFIRMING: "Esperando confirmaciones",
    IN_PROGRESS: "En juego",
    RESULT_PENDING: "Esperando reportes",
    MODERATION: "En revisión",
    COMPLETED: "Finalizado",
    CANCELLED: "Cancelado",
  })[state];
export function roundScore(rounds: string) {
  let a = 0,
    b = 0,
    winner = "",
    invalid = false;
  for (const side of rounds) {
    if (winner) invalid = true;
    if (side === "A") a++;
    else if (side === "B") b++;
    else invalid = true;
    if (
      (a === 3 && b === 0) ||
      (b === 3 && a === 0) ||
      (Math.max(a, b) >= 5 && Math.abs(a - b) >= 2)
    )
      winner = a > b ? "A" : "B";
  }
  return { a, b, winner: invalid ? "" : winner, invalid };
}
