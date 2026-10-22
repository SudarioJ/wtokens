import { useCallback, useEffect, useRef, useState } from "react";
import { Users, RefreshCw, Copy } from "lucide-react";
import { api, friendlyError } from "../lib/api";
import type { Mode, Team } from "../lib/contracts";
import "./teams.css";

export function TeamPanel({
  userId,
  modes,
  initialMode = "BOX_FIGHT",
}: {
  userId: string;
  modes: Mode[];
  initialMode?: string;
}) {
  const [team, setTeam] = useState<Team | null>();
  const [mode, setMode] = useState(initialMode);
  const [size, setSize] = useState(2);
  const [code, setCode] = useState("");
  const [invitation, setInvitation] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const busyRef = useRef(false);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    if (busyRef.current) return;
    const request = ++version.current;
    try {
      const response = await api.team();
      if (mounted.current && request === version.current) {
        setTeam(response.team);
        setError("");
      }
    } catch (e) {
      if (mounted.current && request === version.current)
        setError(friendlyError(e));
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => {
      mounted.current = false;
      version.current++;
      window.clearInterval(timer);
    };
  }, [load]);
  async function act(
    command: () => Promise<{ team: Team | null; inviteCode?: string }>,
  ) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    version.current++;
    try {
      const response = await command();
      if (!mounted.current) return;
      setTeam(response.team);
      setInvitation(response.inviteCode ?? "");
      setCode("");
    } catch (e) {
      if (mounted.current) setError(friendlyError(e));
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const captain = team?.captainId === userId;
  return (
    <section
      className="team-panel"
      aria-labelledby="team-title"
      aria-busy={busy}
    >
      <div className="team-heading">
        <div>
          <span className="eyebrow">JUEGA EN EQUIPO</span>
          <h2 id="team-title">
            <Users size={21} />
            Tu formación
          </h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Actualizar equipo"
          onClick={() => void load()}
          disabled={busy}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {error && (
        <p role="alert" className="team-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="team-notice">
          {notice}
        </p>
      )}
      {team === undefined ? (
        <p className="team-copy">
          {error
            ? "No pudimos cargar tu equipo. Usa Actualizar equipo para reintentar."
            : "Cargando tu equipo…"}
        </p>
      ) : team === null ? (
        <div className="team-setup">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void act(() => api.createTeam(mode, size));
            }}
          >
            <h3>Crea tu equipo</h3>
            <p className="team-copy">
              Serás el capitán. Invita a tus compañeros para completar la
              formación.
            </p>
            <div className="team-fields">
              <label>
                Modalidad del equipo
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                  disabled={busy}
                >
                  {modes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name.replace(/ 1v1$/, "")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Formato
                <select
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                  disabled={busy}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}v{n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button primary" disabled={busy || !modes.length}>
              Crear equipo
            </button>
          </form>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void act(() => api.joinTeam(code.trim().toLowerCase()));
            }}
          >
            <h3>¿Te invitaron?</h3>
            <p className="team-copy">
              Pide al capitán el código y confirma que quieres unirte.
            </p>
            <label>
              Código de invitación
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={64}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
            </label>
            <button
              className="button secondary"
              disabled={busy || !/^[a-fA-F0-9]{64}$/.test(code.trim())}
            >
              Unirme al equipo
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="team-status">
            <strong>
              {modes
                .find((item) => item.code === team.mode)
                ?.name.replace(/ 1v1$/, "") ?? team.mode}{" "}
              · {team.size}v{team.size}
            </strong>
            <span>
              {team.members.length}/{team.size} jugadores · Rango del equipo:
              nivel {team.level}
            </span>
          </div>
          <ul className="team-roster">
            {Array.from({ length: team.size }, (_, index) => {
              const member = team.members[index];
              return (
                <li key={member?.id ?? `slot-${index}`}>
                  <span className="team-slot">{index + 1}</span>
                  <div>
                    <strong>{member ? member.name : "Plaza disponible"}</strong>
                    <small>
                      {member
                        ? `${member.id === team.captainId ? "Capitán · " : ""}Nivel ${member.level} · ${member.points} pts`
                        : "Pendiente de invitación"}
                    </small>
                  </div>
                  {captain && member && member.id !== userId && (
                    <button
                      className="button secondary"
                      type="button"
                      disabled={busy}
                      aria-label={`Retirar a ${member.name}`}
                      onClick={() =>
                        void act(() => api.removeTeamMember(member.id))
                      }
                    >
                      Retirar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="team-copy">
            {team.complete
              ? "Formación completa. El siguiente paso será buscar un rival."
              : "Faltan compañeros para completar tu equipo."}{" "}
            El rango del grupo corresponde al integrante de mayor nivel.
          </p>
          <div className="team-actions">
            {captain && !team.complete && (
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={() => void act(() => api.inviteTeam())}
              >
                Generar código de invitación
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void act(() => (captain ? api.disbandTeam() : api.leaveTeam()))
              }
            >
              {captain ? "Cerrar equipo" : "Salir del equipo"}
            </button>
          </div>
          {captain && invitation && !team.complete && (
            <div className="team-invitation">
              <label>
                Código para tus compañeros
                <input
                  readOnly
                  value={invitation}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(invitation)
                    .then(() =>
                      setNotice(
                        "Código copiado. Compártelo con tus compañeros.",
                      ),
                    )
                    .catch(() =>
                      setNotice("Selecciona el código y cópialo manualmente."),
                    );
                }}
              >
                <Copy size={15} />
                Copiar código
              </button>
              <p className="team-copy">
                Válido 24 horas. Generar otro código invalida el anterior.
                Comparte el código solo con quienes quieras invitar.
              </p>
            </div>
          )}
        </>
      )}
      <p className="team-footnote">
        Crear o unirte a un equipo no reserva saldo.
      </p>
    </section>
  );
}
