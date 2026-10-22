import { useCallback, useEffect, useRef, useState } from "react";
import { api, friendlyError } from "../lib/api";
import { formatMoney } from "../lib/money";
import type { Asset, MatchHistoryItem } from "../lib/contracts";
import "./history.css";

const statuses: Record<string, string> = {
  OPEN: "Buscando rival",
  FUNDED: "Por comenzar",
  IN_PROGRESS: "En partida",
  RESULT_PENDING: "Resultado pendiente",
  DISPUTED: "En mediación",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
  SETTLED: "Finalizada",
};
const modes: Record<string, string> = {
  BOX_FIGHT: "Box Fight",
  BUILD_FIGHT: "Build Fight",
  REALISTICS: "Realistics",
  ZONE_WARS: "Zone Wars",
};
export function MatchHistory({
  assets,
  onSelect,
  refreshKey,
  detailBusy,
}: {
  assets: Asset[];
  onSelect: (id: string) => void;
  refreshKey: number;
  detailBusy: boolean;
}) {
  const [items, setItems] = useState<MatchHistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const mounted = useRef(false);
  const pending = useRef(false);
  const load = useCallback(async (next?: string, reset = false) => {
    if (pending.current && !reset) return;
    pending.current = true;
    const request = ++version.current;
    setLoading(true);
    setError("");
    if (reset) {
      setItems([]);
      setCursor(null);
    }
    try {
      const page = await api.matchHistory(next);
      if (mounted.current && request === version.current) {
        setItems((previous) =>
          reset ? page.items : [...previous, ...page.items],
        );
        setCursor(page.nextCursor);
      }
    } catch (e) {
      if (mounted.current && request === version.current)
        setError(friendlyError(e));
    } finally {
      if (request === version.current) {
        pending.current = false;
        if (mounted.current) setLoading(false);
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load(undefined, true);
    return () => {
      mounted.current = false;
      version.current++;
      pending.current = false;
    };
  }, [refreshKey, load]);
  return (
    <section
      className="match-history"
      aria-label="Partidas del historial"
      aria-busy={loading}
    >
      <div className="history-heading">
        <h2>Tus partidas</h2>
        <button
          className="text-button"
          type="button"
          disabled={loading}
          onClick={() => void load(undefined, true)}
        >
          Actualizar historial
        </button>
      </div>
      {error && (
        <p role="alert" className="history-error">
          {error}{" "}
          <button
            className="text-button"
            type="button"
            onClick={() => void load(cursor ?? undefined, items.length === 0)}
          >
            Reintentar
          </button>
        </p>
      )}
      {items.length > 0 && (
        <div
          className="history-scroll"
          role="region"
          aria-label="Tabla de partidas"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">
              Historial personal de partidas, ordenadas de más reciente a más
              antigua
            </caption>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Modalidad</th>
                <th>Rival</th>
                <th>Resultado / estado</th>
                <th>Aporte</th>
                <th>
                  <span className="sr-only">Detalle</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString("es-PE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                  </td>
                  <td>
                    {modes[item.mode] ?? item.mode}
                    <small>1v1</small>
                  </td>
                  <td>{item.opponentName ?? "Sin rival"}</td>
                  <td>
                    <span
                      className={`history-result history-${item.outcome.toLowerCase()}`}
                    >
                      {item.outcome === "WIN"
                        ? "Victoria"
                        : item.outcome === "LOSS"
                          ? "Derrota"
                          : statuses[item.state]}
                    </span>
                  </td>
                  <td>
                    {formatMoney(
                      item.stakeMinor,
                      item.asset,
                      assets.find((a) => a.code === item.asset)?.exponent ?? 2,
                    )}
                    <small>{item.asset}</small>
                  </td>
                  <td>
                    <button
                      className="button secondary small"
                      type="button"
                      disabled={detailBusy}
                      onClick={() => onSelect(item.id)}
                      aria-label={`Ver detalle de ${modes[item.mode] ?? item.mode} del ${new Date(item.createdAt).toLocaleDateString("es-PE")}`}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!items.length && !loading && !error && (
        <div className="history-empty">
          <h3>Aún no tienes partidas</h3>
          <p>
            Tu historial aparecerá aquí cuando crees o participes en un duelo.
          </p>
        </div>
      )}
      {loading && (
        <p className="history-loading" role="status">
          Cargando partidas…
        </p>
      )}
      <div className="history-pagination">
        {items.length > 0 && (
          <span>
            {items.length} partidas cargadas
            {!cursor && !loading ? " · Historial completo" : ""}
          </span>
        )}
        {cursor && (
          <button
            className="button secondary"
            type="button"
            disabled={loading}
            onClick={() => void load(cursor)}
          >
            Cargar más
          </button>
        )}
      </div>
    </section>
  );
}
