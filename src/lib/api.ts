import { z } from "zod";
import {
  platformSchema,
  userSchema,
  modeSchema,
  assetSchema,
  balanceSchema,
  transactionSchema,
  lobbySchema,
  matchSchema,
} from "./contracts";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      WAGERING_DISABLED:
        "Los desafíos con dinero están deshabilitados en este entorno.",
      NOT_ELIGIBLE: "Tu cuenta aún no está habilitada para participar.",
      STATE_CONFLICT:
        "La partida cambió o el saldo no es suficiente. Actualiza e inténtalo de nuevo.",
      CONFLICT:
        "Esta acción ya se procesó o la partida cambió. Actualiza el estado.",
      NOT_PARTICIPANT: "Solo los participantes pueden consultar esta partida.",
      STAKE_LIMIT: "El aporte supera el límite configurado para este entorno.",
      INVALID_RESPONSE:
        "La respuesta del servicio no es válida. Inténtalo más tarde.",
    };
    if (error.status === 401)
      return "Tu sesión terminó. Vuelve a entrar con Discord.";
    if (error.status === 403)
      return (
        messages[error.code] ??
        "No se pudo autorizar la acción. Actualiza tu sesión."
      );
    return (
      messages[error.code] ??
      "No se pudo completar la acción. Inténtalo de nuevo."
    );
  }
  return "No hay conexión con el servicio. Tus datos no se han modificado.";
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  // Paths are fixed by this module; neither browser input nor a query parameter selects a remote API.
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const error = z.object({ code: z.string() }).safeParse(data);
    throw new ApiError(
      response.status,
      error.success ? error.data.code : `HTTP_${response.status}`,
    );
  }
  const result = schema.safeParse(await response.json());
  if (!result.success) throw new ApiError(502, "INVALID_RESPONSE");
  return result.data;
}

async function write<T>(
  path: string,
  schema: z.ZodType<T>,
  data: unknown,
  key: string,
) {
  const csrf = await request(
    "/v1/csrf",
    z.object({
      headerName: z.literal("X-XSRF-TOKEN"),
      token: z.string().min(1),
    }),
  );
  return request(path, schema, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
      "Idempotency-Key": key,
    },
    body: JSON.stringify(data),
  });
}

const uuid = (id: string) => z.uuid().parse(id);
export const api = {
  platform: () => request("/v1/platform", platformSchema),
  health: () =>
    request("/actuator/health", z.object({ status: z.literal("UP") })),
  me: () => request("/v1/me", userSchema),
  modes: () => request("/v1/game-modes", z.array(modeSchema)),
  assets: () => request("/v1/assets", z.array(assetSchema)),
  balances: () => request("/v1/wallets", z.array(balanceSchema)),
  transactions: () =>
    request("/v1/wallets/transactions", z.array(transactionSchema)),
  lobby: () => request("/v1/matches", z.array(lobbySchema)),
  match: (id: string) => request(`/v1/matches/${uuid(id)}`, matchSchema),
  create: (
    data: { mode: string; asset: string; stakeMinor: string },
    key: string,
  ) => write("/v1/matches", matchSchema, data, key),
  action: (id: string, action: "accept" | "ready" | "cancel", key: string) =>
    write(`/v1/matches/${uuid(id)}/${action}`, matchSchema, {}, key),
  result: (id: string, winnerId: string, key: string) =>
    write(
      `/v1/matches/${uuid(id)}/results`,
      matchSchema,
      { winnerId: uuid(winnerId) },
      key,
    ),
  dispute: (id: string, reason: string, key: string) =>
    write(`/v1/matches/${uuid(id)}/disputes`, matchSchema, { reason }, key),
  logout: async () => {
    const csrf = await request(
      "/v1/csrf",
      z.object({
        headerName: z.literal("X-XSRF-TOKEN"),
        token: z.string().min(1),
      }),
    );
    const response = await fetch("/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { [csrf.headerName]: csrf.token },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new ApiError(response.status, "LOGOUT_FAILED");
  },
};
