import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Crosshair,
  Crown,
  Gamepad2,
  Headphones,
  History,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
  Wallet,
  WifiOff,
  X,
} from "lucide-react";
import { Dialog } from "./components/Dialog";
import { Landing } from "./components/Landing";
import { UserAvatar } from "./components/UserAvatar";
import { CurrencyOptions } from "./components/CurrencyOptions";
import { RankPanel } from "./components/RankPanel";
import { useScrollReveal } from "./lib/useScrollReveal";
import { HeaderRank } from "./components/HeaderRank";
import { TeamPanel } from "./components/TeamPanel";
import { ArenaPanel } from "./components/ArenaPanel";
import { ArenaHistory, ModerationPanel } from "./components/ArenaHistory";
import { MatchHistory } from "./components/MatchHistory";
import { AdminPanel } from "./components/AdminPanel";
import { AffiliatesPanel } from "./components/AffiliatesPanel";
import { PaymentsModal } from "./components/PaymentsModal";
import {
  getManagedUsers,
  upsertManagedUserFromSession,
  syncWithServerRegistry,
} from "./lib/admin";

import { initialCurrency, regionalCurrencies } from "./lib/currencies";
import { discordCommunityUrl } from "./lib/community";
import { api, ApiError, friendlyError } from "./lib/api";
import type {
  Asset,
  Balance,
  LobbyMatch,
  Match,
  Mode,
  Platform,
  Transaction,
  User,
} from "./lib/contracts";
import { formatMoney, inputToMinor, prize } from "./lib/money";

type View =
  | "duels"
  | "moderation"
  | "admin"
  | "arena"
  | "teams"
  | "ranks"
  | "wallet"
  | "affiliates"
  | "matches"
  | "help";
const viewLabels: Record<View, string> = {
  duels: "Duelos",
  moderation: "Moderación",
  admin: "Administración",
  arena: "Tokens",
  teams: "Equipo",
  ranks: "Rangos",
  wallet: "Billetera",
  affiliates: "Afiliados & Creadores",
  matches: "Historial",
  help: "Ayuda",
};
const viewDescriptions: Record<View, string> = {
  duels: "Elige modalidad, encuentra rival y juega.",
  moderation: "Revisa reportes y resuelve los casos pendientes.",
  admin: "Manejador de WTokens, balances aislados y gestión de usuarios.",
  arena: "Modalidades y desafíos disponibles.",
  teams: "Reúne a tus compañeros y gestiona tu formación.",
  ranks: "Tu progreso en cada modalidad.",
  wallet: "Saldo y movimientos de tu cuenta.",
  affiliates: "Invita amigos y creadores, gana comisiones recurrentes por cada duelo.",
  matches: "Todas tus partidas y sus resultados.",
  help: "Reglas, cuenta y soporte.",
};
const EPIC_CLIENT_ID = "xyza7891Bi8U2usurzW8tyIXKGjtztOY";
const EPIC_AUTH_URL = `https://www.epicgames.com/id/authorize?client_id=${EPIC_CLIENT_ID}&response_type=code&scope=basic_profile&redirect_uri=https%3A%2F%2Fwtokens.net%2F`;
type Modal = "login" | "create" | "payments" | "rules" | "dispute" | null;
const visualModes = [
  {
    code: "BOX_FIGHT",
    name: "Box Fight",
    label: "REFLEJOS. PRECISIÓN. VICTORIA.",
    image: "boxfight",
    description: "Combates a corta distancia.",
    difficulty: "Táctico",
    tag: "EL CLÁSICO",
    icon: Crosshair,
  },
  {
    code: "BUILD_FIGHT",
    name: "Build Fight",
    label: "CONSTRUYE TU VENTAJA.",
    image: "buildfight",
    description: "Construcción y combate.",
    difficulty: "Mecánico",
    tag: "1V1",
    icon: Swords,
  },
  {
    code: "REALISTICS",
    name: "Realistics",
    label: "TU INSTINTO, A PRUEBA.",
    image: "realistic",
    description: "Escenarios de combate.",
    difficulty: "Estratégico",
    tag: "1V1",
    icon: Target,
  },
  {
    code: "ZONE_WARS",
    name: "Zone Wars",
    label: "NO HAY SEGUNDAS OPORTUNIDADES.",
    image: "zonewars",
    description: "Rondas de Zone Wars.",
    difficulty: "Endgame",
    tag: "PRÓXIMAMENTE",
    icon: Trophy,
  },
];
const stateNames: Record<Match["state"], string> = {
  OPEN: "Buscando rival",
  FUNDED: "Esperando confirmación",
  IN_PROGRESS: "En partida",
  RESULT_PENDING: "Validando resultado",
  DISPUTED: "En mediación",
  SETTLED: "Finalizada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};
const modeName = (code: string) =>
  visualModes.find((mode) => mode.code === code)?.name ?? code;
const navigation = [
  { view: "arena" as const, name: "Tokens", icon: LayoutGrid },
  { view: "teams" as const, name: "Equipo", icon: Users },
  { view: "duels" as const, name: "Duelos", icon: Swords },
  { view: "matches" as const, name: "Historial", icon: History },
  { view: "ranks" as const, name: "Rangos", icon: Trophy },
  { view: "wallet" as const, name: "Billetera", icon: Wallet },
  { view: "affiliates" as const, name: "Afiliados", icon: Share2 },
];

export function App() {
  const [panelRequested, setPanelRequested] = useState(
    window.location.pathname === "/app",
  );
  const [view, setView] = useState<View>("arena");
  const [teamMode, setTeamMode] = useState("BOX_FIGHT");
  const [rankMode, setRankMode] = useState("BOX_FIGHT");
  const [modal, setModal] = useState<Modal>(null);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [connection, setConnection] = useState<
    "loading" | "online" | "offline"
  >("loading");
  const [user, setUser] = useState<User | null>(null);
  const revealRef = useScrollReveal<HTMLElement>(
    `${panelRequested}:${view}:${user?.id ?? ""}`,
  );
  const [modes, setModes] = useState<Mode[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [lobby, setLobby] = useState<LobbyMatch[] | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedMatch && view === "matches")
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedMatch?.id, view]);

  const [asset, setAsset] = useState(initialCurrency);
  const [createMode, setCreateMode] = useState(() => {
    try {
      const m = new URLSearchParams(window.location.search).get("mode");
      return m ? m.toUpperCase() : "BOX_FIGHT";
    } catch {
      return "BOX_FIGHT";
    }
  });
  const [amount, setAmount] = useState(() => {
    try {
      const s = new URLSearchParams(window.location.search).get("stake");
      return s || "5";
    } catch {
      return "5";
    }
  });
  const [disputeReason, setDisputeReason] = useState("");
  const [affiliateCode, setAffiliateCode] = useState(() => {
    try {
      const urlCode = new URLSearchParams(window.location.search).get("ref");
      if (urlCode) {
        localStorage.setItem("wtokens_ref_code", urlCode.trim().toUpperCase());
        return urlCode.trim().toUpperCase();
      }
      return localStorage.getItem("wtokens_ref_code") ?? "";
    } catch {
      return "";
    }
  });
  const [showReferralInput, setShowReferralInput] = useState(() => {
    try {
      const urlCode = new URLSearchParams(window.location.search).get("ref");
      return Boolean(urlCode);
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    () =>
      new URLSearchParams(window.location.search).get("auth_error") ===
      "discord"
        ? {
            text: "No se pudo completar el acceso con Discord. Vuelve a intentarlo.",
            error: true,
          }
        : null,
  );
  const [busy, setBusy] = useState(false);
  const keys = useRef(new Map<string, string>());
  const refreshVersion = useRef(0);
  const modalFocus = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    setConnection("loading");
    const [health, profile, catalog, currencies, settings] =
      await Promise.allSettled([
        api.health(),
        api.me(),
        api.modes(),
        api.assets(),
        api.platform(),
      ]);
    if (version !== refreshVersion.current) return;
    setConnection(health.status === "fulfilled" ? "online" : "offline");
    setModes(catalog.status === "fulfilled" ? catalog.value : []);
    setAssets(currencies.status === "fulfilled" ? currencies.value : []);
    setPlatform(settings.status === "fulfilled" ? settings.value : null);
    if (profile.status !== "fulfilled") {
      setUser(null);
      setBalances(null);
      setTransactions(null);
      setLobby(null);
      setSelectedMatch(null);
      return;
    }
    setUser(profile.value);
    const [wallet, history, offers] = await Promise.allSettled([
      api.balances(),
      api.transactions(),
      api.lobby(),
    ]);
    if (version !== refreshVersion.current) return;
    setBalances(wallet.status === "fulfilled" ? wallet.value : null);
    setTransactions(history.status === "fulfilled" ? history.value : null);
    setLobby(offers.status === "fulfilled" ? offers.value : null);
  }, []);
  useEffect(() => {
    void refresh();
    return () => {
      refreshVersion.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 8000);
    return () => window.clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    const handleHistory = () => {
      setPanelRequested(window.location.pathname === "/app");
      setModal(null);
      setMobileNav(false);
    };
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);
  useEffect(() => {
    if (panelRequested && connection !== "loading" && !user) {
      window.history.replaceState(null, "", "/");
      setPanelRequested(false);
      setModal("login");
    }
  }, [panelRequested, connection, user]);

  useEffect(() => {
    try {
      const challenge = new URLSearchParams(window.location.search).get("challenge");
      const mode = new URLSearchParams(window.location.search).get("mode");
      if ((challenge || mode) && connection !== "loading") {
        if (!user && connection === "online") {
          setModal("login");
        } else if (user) {
          setModal("create");
        }
      }
    } catch {
      /* ignore */
    }
  }, [user, connection]);

  // Epic Games Account Services OAuth Callback
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        (async () => {
          setNotice({
            text: "Conectando con Epic Games... Verificando tu Nickname de Fortnite...",
            error: false,
          });
          try {
            const res = await fetch("/api/epic-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                redirect_uri: "https://wtokens.net/",
              }),
            });
            const data = await res.json();
            if (data.success && data.displayName) {
              setNotice({
                text: `✅ ¡Cuenta de Epic Games vinculada con éxito: ${data.displayName}!`,
                error: false,
              });
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete("code");
              window.history.replaceState(null, "", cleanUrl.toString());

              try {
                localStorage.setItem("wtokens_epic_nick", data.displayName);
                localStorage.setItem("wtokens_epic_verified", "true");
                if (data.accountId) {
                  localStorage.setItem("wtokens_epic_account_id", data.accountId);
                }
              } catch {}

              setUser((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  epic_nickname: data.displayName,
                  epic_verified: true,
                  epic_account_id: data.accountId,
                };
              });
            } else {
              setNotice({
                text: data.error || "No se pudo verificar la cuenta de Epic Games.",
                error: true,
              });
            }
          } catch {
            setNotice({
              text: "Error de conexión al verificar con Epic Games.",
              error: true,
            });
          }
        })();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleSync = () => {
      const allUsers = getManagedUsers();
      setUser((prev) => {
        if (!prev) return null;
        const current = allUsers.find((u) => u.id === prev.id);
        if (!current) return prev;
        return {
          ...prev,
          display_name: current.display_name,
          avatar_url: current.avatar_url,
          role: current.role,
          moderator: current.role === "admin",
          suspended: current.suspended,
          balance_wt: current.balance_wt,
          discord_tag: current.discord_tag,
          epic_nickname: current.epic_nickname,
          epic_verified: current.epic_verified,
          epic_account_id: current.epic_account_id,
          referrer_code: current.referrer_code,
        };
      });
      setUser((prev) => {
        if (prev?.balance_wt !== undefined) {
          const bal = prev.balance_wt;
          setBalances([
            {
              asset: "PEN",
              kind: "AVAILABLE",
              amount_minor: String(Math.round(bal * 3.8 * 100)),
            },
            {
              asset: "ARS",
              kind: "AVAILABLE",
              amount_minor: String(Math.round(bal * 1150 * 100)),
            },
            {
              asset: "CLP",
              kind: "AVAILABLE",
              amount_minor: String(Math.round(bal * 980)),
            },
          ]);
        }
        return prev;
      });
    };
    window.addEventListener("wtokens-admin-sync", handleSync);
    return () => window.removeEventListener("wtokens-admin-sync", handleSync);
  }, []);

  useEffect(() => {
    if (user && user.id) {
      upsertManagedUserFromSession(user);
    }
  }, [user]);

  useEffect(() => {
    void syncWithServerRegistry();
  }, []);

  function enterPanel() {
    if (!user) {
      openModal("login");
      return;
    }
    window.history.pushState(null, "", "/app");
    setPanelRequested(true);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function returnToSite() {
    window.history.pushState(null, "", "/");
    setPanelRequested(false);
    setMobileNav(false);
    setModal(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openModal(next: Modal) {
    modalFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (next === "create") keys.current.delete("create");
    setModal(next);
  }
  function closeModal() {
    setModal(null);
    window.setTimeout(() => modalFocus.current?.focus(), 0);
  }
  function navigate(next: View) {
    setView(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function notify(text: string, error = false) {
    setNotice({ text, error });
  }
  function key(signature: string) {
    const value = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, value);
    return value;
  }
  function selectCurrency(code: string) {
    if (!regionalCurrencies.some((currency) => currency.code === code)) return;
    setAsset(code);
    try {
      localStorage.setItem("wtokens.currency", code);
    } catch {
      /* Optional preference. */
    }
  }
  const exponent =
    regionalCurrencies.find((item) => item.code === asset)?.exponent ?? 2;
  const walletAmount = (kind: Balance["kind"]) =>
    balances?.find((item) => item.asset === asset && item.kind === kind)
      ?.amount_minor;
  const displayBalance = (kind: Balance["kind"]) => {
    const value = walletAmount(kind);
    if (value !== undefined) {
      return formatMoney(value, asset, exponent);
    }
    if (user?.balance_wt !== undefined) {
      if (kind === "RESERVED") {
        return formatMoney("0", asset, exponent);
      }
      const rates: Record<string, number> = {
        PEN: 3.8,
        ARS: 1150,
        CLP: 980,
        BOB: 6.9,
        PYG: 7800,
        UYU: 42,
        BRL: 5.6,
      };
      const rate = rates[asset] ?? 1;
      const converted = user.balance_wt * rate;
      return `${converted.toLocaleString("es", { minimumFractionDigits: exponent, maximumFractionDigits: exponent })}`;
    }
    return "—";
  };
  const canWager =
    !!user?.eligible &&
    !user.suspended &&
    !!platform?.wageringEnabled &&
    connection === "online";

  function challenge(mode = "BOX_FIGHT") {
    if (!user) {
      openModal("login");
      return;
    }
    if (!canWager) {
      notify(
        platform?.wageringEnabled
          ? "Tu cuenta aún no está habilitada para participar."
          : "Los desafíos con dinero están deshabilitados en este entorno.",
        true,
      );
      return;
    }
    setCreateMode(mode);
    openModal("create");
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify(friendlyError(error), true);
      if (error instanceof ApiError && error.status === 401) await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function submitChallenge(event: FormEvent) {
    event.preventDefault();
    let minor: string;
    try {
      minor = inputToMinor(amount, exponent);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Importe inválido.",
        true,
      );
      return;
    }
    if (!platform || BigInt(minor) > BigInt(platform.maxStakeMinor)) {
      notify("El aporte supera el límite del entorno.", true);
      return;
    }
    if (BigInt(minor) > BigInt(walletAmount("AVAILABLE") ?? "0")) {
      notify("El saldo disponible no es suficiente.", true);
      return;
    }
    await run(async () => {
      const payload = { mode: createMode, asset, stakeMinor: minor };
      const match = await api.create(
        payload,
        key(
          `create:${JSON.stringify(payload)}:${keys.current.get("create") ?? key("create")}`,
        ),
      );
      closeModal();
      await refresh();
      setSelectedMatch(match);
      navigate("matches");
      notify("Desafío creado. Tu aporte está reservado.");
    });
  }
  async function matchAction(
    id: string,
    action: "accept" | "ready" | "cancel",
  ) {
    await run(async () => {
      const match = await api.action(id, action, key(`${action}:${id}`));
      await refresh();
      setSelectedMatch(match);
      navigate("matches");
      notify("Partida actualizada.");
    });
  }
  function createPrize() {
    try {
      return platform
        ? formatMoney(
            prize(inputToMinor(amount, exponent), platform.feeBps),
            asset,
            exponent,
          )
        : "—";
    } catch {
      return "—";
    }
  }

  return (
    <div className={panelRequested && user ? "app-shell" : "public-shell"}>
      {!panelRequested && (
        <Landing
          user={user}
          assets={assets}
          asset={asset}
          connection={connection}
          onAssetChange={selectCurrency}
          onEnter={enterPanel}
          onRules={() => openModal("rules")}
        />
      )}
      {panelRequested && !user && (
        <div className="lp-panel-loading" role="status">
          <LoaderCircle size={23} className="spin" />
          Verificando tu sesión de Discord…
        </div>
      )}
      {panelRequested && user && (
        <>
          <a className="skip-link" href="#main">
            Ir al contenido
          </a>
          <aside
            className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}
            aria-label="Navegación principal"
          >
            <a
              className="brand"
              href="#"
              onClick={(event) => {
                event.preventDefault();
                navigate("arena");
              }}
              aria-label="WTOKENS, inicio"
            >
              <img
                className="brand-logo"
                src="/assets/brand.svg"
                width="48"
                height="48"
                alt=""
              />
              <span>
                WTOKENS<small>COMPETITIVE ARENA</small>
              </span>
            </a>
            <button
              className="icon-button mobile-close"
              onClick={() => setMobileNav(false)}
              aria-label="Cerrar menú"
            >
              <X />
            </button>
            <span className="nav-label">JUGAR</span>
            <nav>
              {navigation.map((item) => (
                <button
                  key={item.view}
                  className={`nav-item ${view === item.view ? "active" : ""}`}
                  aria-current={view === item.view ? "page" : undefined}
                  onClick={() => navigate(item.view)}
                >
                  <item.icon size={19} />
                  {item.name}
                  {view === item.view && <ChevronRight size={15} />}
                </button>
              ))}
            </nav>
            {(user?.moderator || user?.role === "admin") && (
              <>
                <div className="sidebar-divider" />
                <span className="nav-label" style={{ color: "#fbbf24" }}>
                  ADMINISTRACIÓN
                </span>
                <button
                  className={`nav-item ${view === "admin" ? "active" : ""}`}
                  onClick={() => navigate("admin")}
                  style={
                    view === "admin"
                      ? {
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#fbbf24",
                        }
                      : { color: "#fbbf24" }
                  }
                >
                  <Crown size={19} />
                  <span>Manejador WT & Usuarios</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "9px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "rgba(245, 158, 11, 0.25)",
                      color: "#fbbf24",
                    }}
                  >
                    ADMIN
                  </span>
                </button>
                <button
                  className={`nav-item ${view === "moderation" ? "active" : ""}`}
                  onClick={() => navigate("moderation")}
                >
                  <ShieldCheck size={18} />
                  Moderación
                </button>
              </>
            )}
            <div className="sidebar-divider" />
            <span className="nav-label">COMUNIDAD</span>
            <a
              className="nav-item"
              href={discordCommunityUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Users size={19} />
              Discord & comunidad
              <ArrowUpRight size={14} />
            </a>
            <button
              className={`nav-item ${view === "help" ? "active" : ""}`}
              onClick={() => navigate("help")}
            >
              <CircleHelp size={19} />
              Centro de ayuda
            </button>
            <div className="sidebar-bottom">
              <button className="nav-item" onClick={returnToSite}>
                <ArrowUpRight size={18} />
                Volver al sitio
              </button>
            </div>
          </aside>
          {mobileNav && (
            <button
              className="nav-backdrop"
              aria-label="Cerrar navegación"
              onClick={() => setMobileNav(false)}
            />
          )}
          <div className="workspace">
            <header className="topbar">
              <div className="topbar-left">
                <button
                  className="icon-button mobile-menu"
                  onClick={() => setMobileNav(true)}
                  aria-label="Abrir menú"
                  aria-expanded={mobileNav}
                >
                  <Menu />
                </button>
                <span className="breadcrumb">
                  Plataforma <ChevronRight size={13} />
                  <strong>{viewLabels[view]}</strong>
                </span>
              </div>
              <div className="topbar-actions">
                <div className="currency-select">
                  <label className="sr-only" htmlFor="currency">
                    Moneda de consulta
                  </label>
                  <select
                    id="currency"
                    value={asset}
                    onChange={(event) => selectCurrency(event.target.value)}
                  >
                    <CurrencyOptions assets={assets} />
                  </select>
                  <ChevronDown size={13} />
                </div>
                {user?.ranking && (
                  <HeaderRank
                    ranking={user.ranking}
                    mode={rankMode}
                    onOpen={() => navigate("ranks")}
                  />
                )}
                {user ? (
                  <button
                    className="profile-button"
                    aria-label={`Billetera de ${user.display_name}`}
                    onClick={() => navigate("wallet")}
                  >
                    <UserAvatar user={user} />
                    <span>{user.display_name}</span>
                  </button>
                ) : (
                  <button
                    className="button discord-button small"
                    onClick={() => openModal("login")}
                  >
                    <Gamepad2 size={17} />
                    Entrar con Discord
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </header>
            <main ref={revealRef} id="main" className="main" tabIndex={-1}>
              <div className="page-heading">
                <div>
                  <h1>{viewLabels[view]}</h1>
                  <p>{viewDescriptions[view]}</p>
                </div>
                <div className="page-tools">
                  {connection !== "online" && (
                    <div className={`connection ${connection}`} role="status">
                      {connection === "offline" ? (
                        <WifiOff size={14} />
                      ) : connection === "loading" ? (
                        <LoaderCircle size={14} className="spin" />
                      ) : (
                        <span />
                      )}
                      <span>
                        {connection === "loading"
                          ? "Conectando"
                          : "Servicio sin conexión"}
                      </span>
                      <button
                        aria-label="Actualizar conexión"
                        onClick={() => void refresh()}
                        disabled={connection === "loading"}
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  )}
                  {view === "arena" && (
                    <button
                      className="button primary"
                      onClick={() => navigate("teams")}
                    >
                      <Users size={16} />
                      Preparar equipo
                    </button>
                  )}
                </div>
              </div>

              {view === "arena" && (
                <>
                  <div className="content-columns">
                    <div className="arena-content">
                      <section
                        id="modes"
                        className="modes-section"
                        aria-labelledby="modes-title"
                      >
                        <div className="section-heading">
                          <div>
                            <h2 id="modes-title">Modalidades</h2>
                          </div>
                          <span className="section-meta">Fortnite</span>
                        </div>
                        <div className="mode-grid">
                          {visualModes.map((mode) => {
                            const enabled = modes.some(
                              (item) => item.code === mode.code,
                            );
                            return (
                              <article className="mode-card" key={mode.code}>
                                <button
                                  className="mode-image-button"
                                  onClick={() => {
                                    setTeamMode(mode.code);
                                    navigate("duels");
                                  }}
                                  aria-label={`Seleccionar ${mode.name}`}
                                  disabled={connection === "online" && !enabled}
                                >
                                  <img
                                    src={`/assets/modes/${mode.image}.jpg`}
                                    alt={`Arena ${mode.name} de Fortnite`}
                                    loading="lazy"
                                  />
                                  <span className="mode-play">
                                    <ArrowUpRight size={20} />
                                  </span>
                                  <span className="image-caption">
                                    {mode.label}
                                  </span>
                                </button>
                                <div className="mode-body">
                                  <div className="mode-title">
                                    <h3>{mode.name}</h3>
                                    <mode.icon size={19} />
                                  </div>
                                  <p>{mode.description}</p>
                                  <div className="mode-footer">
                                    <span>
                                      <Users size={12} />
                                      1v1 – 4v4
                                    </span>
                                    <span
                                      className={`mode-status ${enabled ? "available" : ""}`}
                                    >
                                      {enabled
                                        ? "Buscar rival"
                                        : connection === "online"
                                          ? "Próximamente"
                                          : "Vista previa"}
                                    </span>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                      <section
                        className="lobby-section"
                        aria-labelledby="lobby-title"
                      >
                        <div className="section-heading">
                          <div>
                            <h2 id="lobby-title">Desafíos abiertos</h2>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => challenge()}
                          >
                            <Plus size={15} />
                            Crear desafío
                          </button>
                        </div>
                        {lobby?.length ? (
                          <div className="lobby-list">
                            {lobby.map((offer) => (
                              <article className="lobby-row" key={offer.id}>
                                <span className="lobby-icon">
                                  <Swords size={19} />
                                </span>
                                <div>
                                  <strong>{modeName(offer.mode)}</strong>
                                  <small>1v1 · {offer.rules_version}</small>
                                </div>
                                <div className="lobby-amount">
                                  <strong>
                                    {formatMoney(
                                      offer.stake_minor,
                                      offer.asset,
                                      assets.find(
                                        (item) => item.code === offer.asset,
                                      )?.exponent ?? 2,
                                    )}
                                  </strong>
                                  <small>aporte por jugador</small>
                                </div>
                                <button
                                  className="button secondary small"
                                  disabled={busy || !canWager}
                                  onClick={() =>
                                    void matchAction(offer.id, "accept")
                                  }
                                >
                                  Aceptar
                                  <ArrowRight size={14} />
                                </button>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="lobby-empty">
                            <div className="empty-graphic">
                              <Swords size={25} />
                            </div>
                            <div>
                              <h3>
                                {user
                                  ? "No hay desafíos abiertos"
                                  : "Sin desafíos"}
                              </h3>
                              <p>
                                {user
                                  ? lobby === null
                                    ? "No pudimos consultar los desafíos. Actualiza la conexión."
                                    : "Aquí verás retos de otros jugadores, su modalidad y el monto por jugador. Podrás elegir cuál aceptar."
                                  : "Entra con Discord para consultar los desafíos de la comunidad."}
                              </p>
                            </div>
                            <button
                              className="button secondary small"
                              onClick={() =>
                                user ? challenge() : openModal("login")
                              }
                            >
                              {user ? "Crear desafío" : "Entrar"}
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        )}
                      </section>
                    </div>
                    <aside
                      className="right-rail"
                      aria-label="Resumen de tu cuenta"
                    >
                      <section className="wallet-card">
                        <div className="card-topline">
                          <span>
                            <Wallet size={17} />
                            TU BILLETERA
                          </span>
                          <span className="currency-pill">{asset}</span>
                        </div>
                        <span className="balance-label">Saldo disponible</span>
                        <div className="balance-value">
                          {user ? displayBalance("AVAILABLE") : "—"}
                          <small>{asset}</small>
                        </div>
                        <div className="reserved">
                          <span>
                            <ShieldCheck size={13} />
                            En partidas
                          </span>
                          <strong>
                            {user ? displayBalance("RESERVED") : "—"}
                          </strong>
                        </div>
                        <button
                          className="button primary full"
                          onClick={() =>
                            user ? navigate("wallet") : openModal("login")
                          }
                        >
                          {user ? "Ver mi billetera" : "Conectar mi cuenta"}
                          <ArrowRight size={16} />
                        </button>
                        <p className="wallet-caption">
                          {user
                            ? "Disponible en la moneda seleccionada."
                            : "Tu saldo aparecerá después de iniciar sesión."}
                        </p>
                      </section>
                    </aside>
                  </div>
                </>
              )}

              {view === "duels" && user && (
                <ArenaPanel
                  key={user.id}
                  userId={user.id}
                  userBalance={user.balance_wt}
                  asset={asset}
                  modes={modes}
                  initialMode={teamMode}
                  onTeam={(mode) => {
                    setTeamMode(mode);
                    navigate("teams");
                  }}
                  onOpenPayments={() => openModal("payments")}
                />
              )}
              {view === "admin" &&
                (user?.moderator || user?.role === "admin") && (
                  <AdminPanel
                    currentAdmin={{
                      id: user.id,
                      display_name: user.display_name,
                      role: user.role,
                    }}
                    onBalanceUpdated={() => {
                      const allUsers = getManagedUsers();
                      const me = allUsers.find((u) => u.id === user.id);
                      if (me) {
                        setUser((prev) =>
                          prev
                            ? { ...prev, balance_wt: me.balance_wt }
                            : null,
                        );
                      }
                    }}
                  />
                )}
              {view === "moderation" && user?.moderator && <ModerationPanel />}
              {view === "teams" && user && (
                <TeamPanel
                  key={user.id}
                  userId={user.id}
                  modes={modes}
                  initialMode={teamMode}
                  onFind={() => navigate("duels")}
                />
              )}
              {view === "ranks" && user?.ranking && (
                <RankPanel
                  ranking={user.ranking}
                  mode={rankMode}
                  onModeChange={setRankMode}
                />
              )}
              {view === "ranks" && !user?.ranking && (
                <p className="team-copy">
                  No pudimos cargar tus rangos. Actualiza la conexión para
                  reintentar.
                </p>
              )}

              {view === "wallet" && (
                <section className="panel-page">
                  {!user ? (
                    <Guest
                      title="Tu saldo empieza con tu cuenta."
                      text="Entra con Discord para consultar el dinero disponible, las reservas y tus movimientos."
                      onLogin={() => openModal("login")}
                    />
                  ) : (
                    <>
                      <div className="wallet-summary">
                        <div>
                          <span className="eyebrow">DISPONIBLE / {asset}</span>
                          <h2>{displayBalance("AVAILABLE")}</h2>
                          <p>
                            {user.balance_wt !== undefined
                              ? `Saldo asignado: ${user.balance_wt.toFixed(2)} WT (Intransferible)`
                              : "Saldo registrado en tu cuenta"}
                          </p>
                        </div>
                        <div>
                          <span className="eyebrow">RESERVADO EN PARTIDAS</span>
                          <h2>{displayBalance("RESERVED")}</h2>
                          <p>Se libera al resolver cada desafío</p>
                        </div>
                        <div className="wallet-actions">
                          <button
                            className="button primary"
                            onClick={() => openModal("payments")}
                          >
                            <Plus size={17} />
                            Depositar
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => openModal("payments")}
                          >
                            <ArrowUpRight size={17} />
                            Retirar
                          </button>
                        </div>
                      </div>
                      <div className="info-note">
                        <CircleHelp size={17} />
                        <span>
                          Las equivalencias y conversiones aún no están
                          disponibles. Cada saldo se muestra en su moneda
                          original.
                        </span>
                      </div>

                      {/* Tarjeta Oficial de Identidad Fortnite / Epic Games */}
                      <div
                        style={{
                          background: user.epic_nickname
                            ? "linear-gradient(135deg, rgba(101, 183, 255, 0.08) 0%, rgba(6, 16, 32, 0.95) 100%)"
                            : "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(6, 16, 32, 0.95) 100%)",
                          border: user.epic_nickname
                            ? "1px solid rgba(101, 183, 255, 0.3)"
                            : "1px solid rgba(234, 179, 8, 0.35)",
                          borderRadius: "12px",
                          padding: "16px 20px",
                          margin: "18px 0 24px 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "10px",
                              background: user.epic_nickname ? "#0a1728" : "#1e1608",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: user.epic_nickname
                                ? "1px solid #1c3558"
                                : "1px solid #4a3610",
                            }}
                          >
                            <Gamepad2
                              size={24}
                              color={user.epic_nickname ? "#5eeaff" : "#facc15"}
                            />
                          </div>
                          <div>
                            <span
                              style={{
                                fontSize: "11px",
                                color: user.epic_nickname ? "#7296c8" : "#d97706",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                fontWeight: "700",
                              }}
                            >
                              Identidad Fortnite / Epic Games
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginTop: "2px",
                              }}
                            >
                              <strong
                                style={{
                                  fontSize: "16px",
                                  color: user.epic_nickname ? "#f0f6ff" : "#fef08a",
                                }}
                              >
                                {user.epic_nickname || "Cuenta no vinculada"}
                              </strong>
                              {user.epic_nickname && (
                                <span
                                  style={{
                                    background: "rgba(94, 234, 255, 0.12)",
                                    color: "#5eeaff",
                                    fontSize: "10px",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(94, 234, 255, 0.35)",
                                    fontWeight: "600",
                                  }}
                                >
                                  ✓ Verificado Epic Games
                                </span>
                              )}
                            </div>
                            {!user.epic_nickname && (
                              <p
                                style={{
                                  margin: "3px 0 0 0",
                                  fontSize: "11px",
                                  color: "#a3a3a3",
                                }}
                              >
                                Vincula tu cuenta de Epic Games para que tus rivales puedan agregarte en Fortnite.
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={EPIC_AUTH_URL}
                          className={user.epic_nickname ? "button secondary small" : "button primary small"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            textDecoration: "none",
                          }}
                        >
                          <Gamepad2 size={16} />
                          {user.epic_nickname ? "Cambiar cuenta de Epic" : "Vincular con Epic Games"}
                          <ArrowUpRight size={14} />
                        </a>
                      </div>

                      <div className="section-heading">
                        <h2>Movimientos recientes</h2>
                        <span className="section-meta">
                          Últimos 100 registros
                        </span>
                      </div>
                      {transactions?.length ? (
                        <div className="transaction-list">
                          {transactions.map((item, index) => (
                            <div
                              className="transaction-row"
                              key={`${item.journal_id}:${item.kind}:${index}`}
                            >
                              <span className="transaction-icon">
                                {BigInt(item.amount_minor) > 0n ? (
                                  <ArrowDownLeft size={19} />
                                ) : (
                                  <ArrowUpRight size={19} />
                                )}
                              </span>
                              <div>
                                <strong>
                                  {item.kind === "RESERVED"
                                    ? "Reserva de partida"
                                    : "Movimiento de saldo"}
                                </strong>
                                <small>
                                  {new Intl.DateTimeFormat("es", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(item.created_at))}
                                </small>
                              </div>
                              <strong>
                                {formatMoney(
                                  item.amount_minor,
                                  item.asset,
                                  assets.find(
                                    (value) => value.code === item.asset,
                                  )?.exponent ?? 2,
                                )}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <CreditCard size={30} />
                          <h3>
                            {transactions === null
                              ? "No se pudo consultar el historial"
                              : "Todo listo para tu primer movimiento"}
                          </h3>
                          <p>
                            {transactions === null
                              ? "Actualiza la conexión para volver a intentarlo."
                              : "Aquí aparecerán los movimientos confirmados por la plataforma."}
                          </p>
                        </div>
                      )}
                      <button
                        className="text-button signout"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            try {
                              await api.logout();
                            } catch {
                              /* ignore */
                            }
                            try {
                              localStorage.removeItem("wtokens_demo_logged_in");
                            } catch {
                              /* ignore */
                            }
                            returnToSite();
                            await refresh();
                            notify("Sesión cerrada.");
                          })
                        }
                      >
                        <LogOut size={16} />
                        Cerrar sesión
                      </button>
                    </>
                  )}
                </section>
              )}

              {view === "affiliates" && (
                <section className="panel-page">
                  <AffiliatesPanel
                    user={user}
                    onNotify={(msg, isErr) => notify(msg, isErr)}
                  />
                </section>
              )}

              {view === "matches" && (
                <section className="panel-page">
                  {!user ? (
                    <Guest
                      title="Tu próxima rivalidad empieza aquí."
                      text="Conecta tu cuenta para consultar y gestionar tus desafíos."
                      onLogin={() => openModal("login")}
                    />
                  ) : (
                    <>
                      <ArenaHistory key={`arena-history-${user?.id}`} />
                      <MatchHistory
                        assets={assets}
                        refreshKey={refreshVersion.current}
                        detailBusy={busy}
                        onSelect={(id) => {
                          void run(async () => {
                            setSelectedMatch(await api.match(id));
                          });
                        }}
                      />
                      {selectedMatch ? (
                        <div className="match-detail" ref={detailRef}>
                          <div className="section-heading">
                            <h2>{modeName(selectedMatch.mode)} · 1v1</h2>
                            <span className="status-chip">
                              {stateNames[selectedMatch.state]}
                            </span>
                          </div>
                          <p className="match-id">ID: {selectedMatch.id}</p>
                          <div className="match-versus">
                            <div>
                              <span className="avatar big">
                                {user.id === selectedMatch.creatorId
                                  ? "TÚ"
                                  : "J1"}
                              </span>
                              <strong>
                                {user.id === selectedMatch.creatorId
                                  ? user.display_name
                                  : "Jugador 1"}
                              </strong>
                            </div>
                            <span>VS</span>
                            <div>
                              <span className="avatar big rival">
                                {selectedMatch.opponentId
                                  ? user.id === selectedMatch.opponentId
                                    ? "TÚ"
                                    : "J2"
                                  : "?"}
                              </span>
                              <strong>
                                {!selectedMatch.opponentId
                                  ? "Buscando rival"
                                  : user.id === selectedMatch.opponentId
                                    ? user.display_name
                                    : "Jugador 2"}
                              </strong>
                            </div>
                          </div>
                          <div className="match-totals">
                            <span>
                              Aporte por jugador
                              <strong>
                                {formatMoney(
                                  selectedMatch.stakeMinor,
                                  selectedMatch.asset,
                                  assets.find(
                                    (item) => item.code === selectedMatch.asset,
                                  )?.exponent ?? 2,
                                )}
                              </strong>
                            </span>
                            <span>
                              Premio neto
                              <strong>
                                {formatMoney(
                                  prize(
                                    selectedMatch.stakeMinor,
                                    selectedMatch.feeBps,
                                  ),
                                  selectedMatch.asset,
                                  assets.find(
                                    (item) => item.code === selectedMatch.asset,
                                  )?.exponent ?? 2,
                                )}
                              </strong>
                            </span>
                            <span>
                              Comisión del pozo
                              <strong>{selectedMatch.feeBps / 100}%</strong>
                            </span>
                          </div>
                          <div className="info-note">
                            <ShieldCheck size={17} />
                            <span>
                              {selectedMatch.state === "DISPUTED"
                                ? "El resultado está en mediación. Los fondos permanecen reservados."
                                : selectedMatch.state === "SETTLED"
                                  ? "Resultado confirmado. Consulta la liquidación en tu billetera."
                                  : "Confirma cada paso con tu rival. No declares un resultado antes de terminar la partida."}
                            </span>
                          </div>
                          <div className="match-actions">
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(async () =>
                                  setSelectedMatch(
                                    await api.match(selectedMatch.id),
                                  ),
                                )
                              }
                            >
                              <RefreshCw size={15} />
                              Actualizar
                            </button>
                            {selectedMatch.state === "OPEN" &&
                              user.id === selectedMatch.creatorId && (
                                <button
                                  className="button secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    void matchAction(selectedMatch.id, "cancel")
                                  }
                                >
                                  Cancelar desafío
                                </button>
                              )}
                            {selectedMatch.state === "FUNDED" && (
                              <button
                                className="button primary"
                                disabled={busy}
                                onClick={() =>
                                  void matchAction(selectedMatch.id, "ready")
                                }
                              >
                                <Check size={17} />
                                Estoy listo
                              </button>
                            )}
                            {["IN_PROGRESS", "RESULT_PENDING"].includes(
                              selectedMatch.state,
                            ) && (
                              <>
                                <button
                                  className="button primary"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(async () => {
                                      const match = await api.result(
                                        selectedMatch.id,
                                        user.id,
                                        key(
                                          `result:${selectedMatch.id}:${user.id}`,
                                        ),
                                      );
                                      await refresh();
                                      setSelectedMatch(match);
                                      notify("Resultado enviado.");
                                    })
                                  }
                                >
                                  Reportar mi victoria
                                </button>
                                <button
                                  className="button secondary"
                                  disabled={busy}
                                  onClick={() => {
                                    const rival =
                                      user.id === selectedMatch.creatorId
                                        ? selectedMatch.opponentId
                                        : selectedMatch.creatorId;
                                    if (rival)
                                      void run(async () => {
                                        const match = await api.result(
                                          selectedMatch.id,
                                          rival,
                                          key(
                                            `result:${selectedMatch.id}:${rival}`,
                                          ),
                                        );
                                        await refresh();
                                        setSelectedMatch(match);
                                        notify("Resultado enviado.");
                                      });
                                  }}
                                >
                                  Confirmar victoria rival
                                </button>
                              </>
                            )}
                            {[
                              "FUNDED",
                              "IN_PROGRESS",
                              "RESULT_PENDING",
                            ].includes(selectedMatch.state) && (
                              <button
                                className="text-button"
                                onClick={() => openModal("dispute")}
                              >
                                Solicitar mediación
                              </button>
                            )}
                          </div>
                        </div>
                      ) : null}{" "}
                    </>
                  )}
                </section>
              )}

              {view === "help" && (
                <section className="panel-page help-page">
                  <div className="help-intro">
                    <Headphones size={34} />
                    <h2>Preguntas frecuentes</h2>
                    <p>
                      Consulta las reglas y el funcionamiento de tu cuenta desde
                      el primer clic.
                    </p>
                  </div>
                  {[
                    {
                      title: "¿Cómo entro a la plataforma?",
                      text: "Usa Entrar con Discord. La sesión la gestiona el servidor; conectar Discord no habilita automáticamente tu cuenta para aportar dinero.",
                    },
                    {
                      title: "¿Cómo se confirma una victoria?",
                      text: "Ambos participantes reportan al ganador. Si coinciden, se liquida la partida; si no coinciden, se abre una disputa y se conservan las reservas.",
                    },
                    {
                      title: "¿Qué pasa con mi saldo reservado?",
                      text: "Se mantiene separado del saldo disponible. Cancelar una oferta abierta o vencer su plazo libera el aporte. Una partida iniciada requiere resultado o mediación.",
                    },
                    {
                      title: "¿Puedo depositar o retirar?",
                      text: "Los pagos y retiros aún no están integrados. Nunca envíes dinero a datos bancarios, enlaces o mensajes que esta plataforma no haya validado.",
                    },
                    {
                      title: "¿Dónde está la comunidad de Discord?",
                      text: "Abre Discord & comunidad en el menú para unirte al servidor oficial. El acceso con Discord sirve para identificarte y no te une automáticamente a un servidor.",
                    },
                    {
                      title: "¿Hay apuestas de terceros o monedas digitales?",
                      text: "Esta versión contempla desafíos entre participantes. No incluye apuestas de espectadores ni tokens negociables. Las conversiones de moneda aún están pendientes.",
                    },
                  ].map((item) => (
                    <details key={item.title}>
                      <summary>
                        {item.title}
                        <Plus size={18} />
                      </summary>
                      <p>{item.text}</p>
                    </details>
                  ))}
                </section>
              )}

              <footer className="page-footer">
                <span>
                  © {new Date().getFullYear()} WTOKENS
                  <span className="footer-dot">·</span>Hecho para competir.
                </span>
                <div>
                  <button onClick={() => openModal("rules")}>Reglamento</button>
                  <a href="/privacy.html" style={{ color: "inherit", textDecoration: "none", fontSize: "12px", margin: "0 8px" }}>
                    Privacidad
                  </a>
                  <a href="/terms.html" style={{ color: "inherit", textDecoration: "none", fontSize: "12px", margin: "0 8px" }}>
                    Términos
                  </a>
                  <a href="mailto:wtokens17@gmail.com" style={{ color: "inherit", textDecoration: "none", fontSize: "12px", margin: "0 8px" }}>
                    wtokens17@gmail.com
                  </a>
                  <span className="age-mark">18+</span>
                </div>
                <p>
                  Plataforma independiente. Sin afiliación ni patrocinio de Epic
                  Games.
                </p>
              </footer>
            </main>
          </div>
        </>
      )}
      {notice && (
        <div
          className={`toast ${notice.error ? "toast-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          {notice.error ? <CircleHelp size={19} /> : <CheckCheck size={19} />}
          <span>{notice.text}</span>
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          title={
            modal === "login"
              ? "Tu cuenta. Tu arena."
              : modal === "create"
                ? "Crea tu próximo desafío."
                : modal === "payments"
                  ? "Billetera WTokens: Recargas y Retiros"
                  : modal === "dispute"
                    ? "Solicitar mediación"
                    : "Compite con reglas claras."
          }
          onClose={busy ? () => undefined : closeModal}
        >
          {modal === "login" && (
            <>
              <p className="dialog-copy">
                Conecta tu cuenta de Discord para consultar tu billetera y
                seguir tus desafíos.
              </p>
              <div className="login-benefits">
                <span>
                  <ShieldCheck size={18} />
                  Tu sesión se gestiona en el servidor.
                </span>
                <span>
                  <Wallet size={18} />
                  El saldo siempre viene de tu cuenta.
                </span>
                <span>
                  <Gamepad2 size={18} />
                  Una identidad para toda tu actividad.
                </span>
              </div>
              {/* Código de Creador / Afiliado (SOLO la primera vez; nunca más una vez vinculado) */}
              {user?.referrer_code ? (
                <div
                  style={{
                    background: "#081322",
                    border: "1px solid #1c3558",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    margin: "12px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11px",
                  }}
                >
                  <span style={{ color: "#92a6c8" }}>
                    Creador vinculado: <strong style={{ color: "#5eeaff" }}>{user.referrer_code}</strong>
                  </span>
                  <span style={{ fontSize: "10px", color: "#617a9e", fontStyle: "italic" }}>
                    (Permanente)
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: "#0a1322",
                    border: "1px solid #1e3355",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    margin: "14px 0",
                  }}
                >
                  {!showReferralInput ? (
                    <button
                      type="button"
                      onClick={() => setShowReferralInput(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        fontSize: "11px",
                        color: "#65b7ff",
                        fontWeight: "600",
                        padding: "2px 0",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        🎁 ¿Tienes un código de creador o amigo?
                      </span>
                      <span style={{ fontSize: "10px", color: "#5eeaff" }}>+ Ingresar</span>
                    </button>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "10px",
                            letterSpacing: "0.5px",
                            fontWeight: "700",
                            color: "#8bb5f0",
                            textTransform: "uppercase",
                          }}
                        >
                          🎁 Código de Creador / Afiliado
                        </label>
                        <small style={{ fontSize: "9px", color: "#6e82a3" }}>
                          Solo una vez al inicio
                        </small>
                      </div>
                      <input
                        type="text"
                        placeholder="Ej: SOKER, JUAN123..."
                        value={affiliateCode}
                        onChange={(e) => {
                          const val = e.target.value.trim().toUpperCase();
                          setAffiliateCode(val);
                          try {
                            if (val) localStorage.setItem("wtokens_ref_code", val);
                            else localStorage.removeItem("wtokens_ref_code");
                          } catch {}
                        }}
                        style={{
                          width: "100%",
                          background: "#060b14",
                          border: "1px solid #284470",
                          borderRadius: "5px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          color: "#5eeaff",
                          fontFamily: "var(--font-mono, monospace)",
                          fontWeight: "700",
                          letterSpacing: "1px",
                        }}
                      />
                      <small
                        style={{
                          display: "block",
                          fontSize: "10px",
                          color: "#7a90b3",
                          marginTop: "5px",
                          lineHeight: "1.4",
                        }}
                      >
                        Atención: Solo se puede vincular una única vez al crear o iniciar sesión. No se podrá cambiar después.
                      </small>
                    </div>
                  )}
                </div>
              )}

              {connection === "online" && platform?.discordEnabled ? (
                <>
                  <label className="remember-login">
                    <input
                      type="checkbox"
                      checked={rememberLogin}
                      onChange={(event) =>
                        setRememberLogin(event.target.checked)
                      }
                    />
                    <span>Recordarme durante 15 días</span>
                  </label>
                  <a
                    className="button primary full"
                    href={`/oauth2/authorization/discord?remember=${rememberLogin}${
                      affiliateCode.trim()
                        ? `&ref=${encodeURIComponent(affiliateCode.trim())}`
                        : ""
                    }`}
                  >
                    <Gamepad2 size={20} />
                    Continuar con Discord
                    <ArrowUpRight size={17} />
                  </a>
                </>
              ) : (
                <div className="info-note">
                  <CircleHelp size={17} />
                  <span>
                    {connection !== "online"
                      ? "El servicio no está conectado. Puedes explorar las modalidades mientras vuelve a estar disponible."
                      : "El acceso con Discord aún no está configurado en este entorno."}
                  </span>
                </div>
              )}
              <p className="dialog-footnote">
                La verificación y la habilitación para participar se realizan
                por separado. Solo para mayores de edad conforme al país
                admitido.
              </p>
            </>
          )}
          {modal === "create" && (
            <form
              onSubmit={(event) => void submitChallenge(event)}
              className="form"
            >
              <label>
                Modalidad
                <select
                  value={createMode}
                  onChange={(event) => setCreateMode(event.target.value)}
                >
                  {modes.map((mode) => (
                    <option key={mode.code} value={mode.code}>
                      {mode.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Aporte por jugador ({asset})
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  autoComplete="off"
                  required
                />
              </label>
              <div className="form-totals">
                <span>
                  Comisión del pozo
                  <strong>{(platform?.feeBps ?? 0) / 100}%</strong>
                </span>
                <span>
                  Premio neto estimado<strong>{createPrize()}</strong>
                </span>
                <span>
                  Reglas<strong>{platform?.rulesVersion}</strong>
                </span>
              </div>
              <p className="dialog-footnote">
                Al crear se reserva tu aporte. Los importes definitivos los
                valida el servidor. La partida se inicia cuando ambos jugadores
                confirman.
              </p>
              <button
                className="button primary full"
                disabled={busy || !canWager}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Plus size={18} />
                )}
                Confirmar y reservar aporte
              </button>
            </form>
          )}
          {modal === "payments" && (
            <PaymentsModal
              user={user}
              currentCurrency={asset}
              onClose={closeModal}
              onBalanceUpdated={(newBal) => {
                if (user) {
                  user.balance_wt = newBal;
                  setUser({ ...user, balance_wt: newBal });
                }
              }}
              onEpicLinked={(nick) => {
                if (user) {
                  setUser({
                    ...user,
                    epic_nickname: nick,
                    epic_verified: true,
                  });
                }
              }}
            />
          )}
          {modal === "rules" && (
            <>
              <p className="dialog-copy">
                Antes de aceptar, revisa la modalidad, el aporte, la comisión y
                el reglamento de la partida.
              </p>
              <ol className="rules-list">
                <li>
                  <strong>Aporte reservado</strong>
                  <span>
                    Solo se descuenta del saldo disponible cuando el servidor
                    confirma el desafío.
                  </span>
                </li>
                <li>
                  <strong>Resultado confirmado</strong>
                  <span>
                    Ambos jugadores reportan al ganador. Si hay desacuerdo, la
                    partida pasa a mediación.
                  </span>
                </li>
                <li>
                  <strong>Respeto y juego limpio</strong>
                  <span>
                    Sin suplantación, trampas ni resultados inventados. Conserva
                    evidencia de tu partida.
                  </span>
                </li>
              </ol>
              <p className="dialog-footnote">
                Todas las partidas en WTOKENS se rigen bajo el reglamento de
                juego limpio y verificación obligatoria de evidencia. Juega con
                responsabilidad (+18).
              </p>
              <button className="button primary full" onClick={closeModal}>
                Volver a la arena
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {modal === "dispute" && selectedMatch && (
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const match = await api.dispute(
                    selectedMatch.id,
                    disputeReason.trim(),
                    key(`dispute:${selectedMatch.id}:${disputeReason.trim()}`),
                  );
                  setSelectedMatch(match);
                  closeModal();
                  setDisputeReason("");
                  notify("Solicitud de mediación registrada.");
                });
              }}
            >
              <p className="dialog-copy">
                Explica qué ocurrió. Los fondos seguirán reservados mientras se
                revisa el caso.
              </p>
              <label>
                Motivo
                <textarea
                  value={disputeReason}
                  onChange={(event) => setDisputeReason(event.target.value)}
                  minLength={5}
                  maxLength={1000}
                  required
                  rows={5}
                />
              </label>
              <button
                className="button primary full"
                disabled={busy || disputeReason.trim().length < 5}
              >
                Enviar solicitud
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}

function Guest({
  title,
  text,
  onLogin,
}: {
  title: string;
  text: string;
  onLogin: () => void;
}) {
  return (
    <div className="guest-panel">
      <div className="guest-icon">
        <Gamepad2 size={36} />
      </div>
      <span className="eyebrow">TU ESPACIO COMPETITIVO</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button primary" onClick={onLogin}>
        Entrar con Discord
        <ArrowUpRight size={17} />
      </button>
    </div>
  );
}
