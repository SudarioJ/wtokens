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
  ExternalLink,
  Gamepad2,
  Headphones,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
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

type View = "arena" | "wallet" | "matches" | "help";
type Modal = "login" | "create" | "payments" | "rules" | "dispute" | null;
const visualModes = [
  {
    code: "BOX_FIGHT",
    name: "Box Fight",
    label: "REFLEJOS. PRECISIÓN. VICTORIA.",
    image: "boxfight",
    description: "Cada pared cuenta. Domina el combate a corta distancia.",
    difficulty: "Táctico",
    tag: "EL CLÁSICO",
    icon: Crosshair,
  },
  {
    code: "BUILD_FIGHT",
    name: "Build Fight",
    label: "CONSTRUYE TU VENTAJA.",
    image: "buildfight",
    description: "Toma la altura y lleva tus mecánicas al siguiente nivel.",
    difficulty: "Mecánico",
    tag: "1V1",
    icon: Swords,
  },
  {
    code: "REALISTICS",
    name: "Realistics",
    label: "TU INSTINTO, A PRUEBA.",
    image: "realistic",
    description: "Situaciones reales. Decisiones rápidas. Tu mejor versión.",
    difficulty: "Estratégico",
    tag: "1V1",
    icon: Target,
  },
  {
    code: "ZONE_WARS",
    name: "Zone Wars",
    label: "NO HAY SEGUNDAS OPORTUNIDADES.",
    image: "zonewars",
    description: "Rotaciones, presión y una tormenta que no espera.",
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
  { view: "arena" as const, name: "Arena", icon: LayoutGrid },
  { view: "matches" as const, name: "Mi partida", icon: Swords },
  { view: "wallet" as const, name: "Billetera", icon: Wallet },
];

export function App() {
  const [panelRequested, setPanelRequested] = useState(
    window.location.pathname === "/app",
  );
  const [view, setView] = useState<View>("arena");
  const [modal, setModal] = useState<Modal>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [connection, setConnection] = useState<
    "loading" | "online" | "offline"
  >("loading");
  const [user, setUser] = useState<User | null>(null);
  const [modes, setModes] = useState<Mode[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [lobby, setLobby] = useState<LobbyMatch[] | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchLookup, setMatchLookup] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [asset, setAsset] = useState(initialCurrency);
  const [createMode, setCreateMode] = useState("BOX_FIGHT");
  const [amount, setAmount] = useState("5");
  const [disputeReason, setDisputeReason] = useState("");
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
    return value === undefined ? "—" : formatMoney(value, asset, exponent);
  };
  const availableModes = visualModes.filter(
    (mode) =>
      (filter === "ALL" || mode.code === filter) &&
      `${mode.name} ${mode.description}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
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
            <span className="nav-label">TU ZONA DE JUEGO</span>
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
              <div className="sidebar-card">
                <div className="support-avatar">
                  <Headphones size={21} />
                  <span />
                </div>
                <strong>Juega con respaldo.</strong>
                <p>Consulta las reglas y conoce el proceso de mediación.</p>
                <button onClick={() => openModal("rules")}>
                  Ver cómo funciona <ArrowRight size={15} />
                </button>
              </div>
              <div className="sidebar-foot">
                <ShieldCheck size={15} />
                <span>Tu partida. Tus reglas claras.</span>
              </div>
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
                  <strong>
                    {view === "arena"
                      ? "Arena"
                      : view === "wallet"
                        ? "Billetera"
                        : view === "matches"
                          ? "Mi partida"
                          : "Ayuda"}
                  </strong>
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
                {user ? (
                  <button
                    className="profile-button"
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
            <main id="main" className="main" tabIndex={-1}>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    FORTNITE COMPETITIVO
                  </div>
                  <h1>
                    {view === "arena"
                      ? "Bienvenido a la arena."
                      : view === "wallet"
                        ? "Tu billetera, sin vueltas."
                        : view === "matches"
                          ? "Cada partida cuenta."
                          : "Estamos en tu equipo."}
                  </h1>
                  <p>
                    {view === "arena"
                      ? "Elige tu modo. Encuentra a tu rival. Lleva tu juego más lejos."
                      : view === "wallet"
                        ? "Consulta tu saldo y los movimientos registrados por la plataforma."
                        : view === "matches"
                          ? "Sigue el estado de tu desafío y confirma cada paso."
                          : "Reglas claras y respuestas para tu próxima partida."}
                  </p>
                </div>
                <div className={`connection ${connection}`} role="status">
                  {connection === "offline" ? (
                    <WifiOff size={14} />
                  ) : connection === "loading" ? (
                    <LoaderCircle size={14} className="spin" />
                  ) : (
                    <span />
                  )}
                  <span>
                    {connection === "online"
                      ? "Plataforma conectada"
                      : connection === "loading"
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
              </div>

              {view === "arena" && (
                <>
                  <section className="hero" aria-labelledby="hero-title">
                    <img
                      src="/assets/modes/boxfight.jpg"
                      alt="Duelo de Fortnite en una arena de construcción"
                      className="hero-image"
                    />
                    <div className="hero-shade" />
                    <div className="hero-content">
                      <div className="hero-chip">
                        <span />
                        TU SIGUIENTE NIVEL ESTÁ AQUÍ
                      </div>
                      <h2 id="hero-title">
                        Menos espera.
                        <br />
                        Más <span>competencia.</span>
                      </h2>
                      <p>
                        Una comunidad que juega en serio.
                        <br />
                        Desafíos 1v1, reglas claras y toda tu actividad en un
                        solo lugar.
                      </p>
                      <div className="hero-actions">
                        <button
                          className="button primary"
                          onClick={() =>
                            document.getElementById("modes")?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            })
                          }
                        >
                          Explorar modalidades <ArrowRight size={18} />
                        </button>
                        <button
                          className="hero-secondary"
                          onClick={() => openModal("rules")}
                        >
                          Cómo funciona <ExternalLink size={14} />
                        </button>
                      </div>
                      <div className="hero-footer">
                        <span>
                          <Crosshair size={14} />
                          FORTNITE
                        </span>
                        <span>
                          <Users size={14} />
                          DUELOS 1V1
                        </span>
                        <span>
                          <ShieldCheck size={14} />
                          MEDIACIÓN
                        </span>
                      </div>
                    </div>
                    <div className="hero-index">
                      <span>01</span> / ARENA BOX FIGHT
                    </div>
                  </section>
                  <div className="content-columns">
                    <div className="arena-content">
                      <section
                        id="modes"
                        className="modes-section"
                        aria-labelledby="modes-title"
                      >
                        <div className="section-heading">
                          <div>
                            <span className="eyebrow">
                              ENCUENTRA TU TERRENO
                            </span>
                            <h2 id="modes-title">¿Cuál es tu modo?</h2>
                          </div>
                          <span className="section-meta">
                            4 formas de competir
                          </span>
                        </div>
                        <div className="filter-bar">
                          <div
                            className="filter-tabs"
                            role="group"
                            aria-label="Filtrar modalidad"
                          >
                            <button
                              className={filter === "ALL" ? "selected" : ""}
                              onClick={() => setFilter("ALL")}
                            >
                              Todos los modos
                            </button>
                            <button
                              className={
                                filter === "BOX_FIGHT" ? "selected" : ""
                              }
                              onClick={() => setFilter("BOX_FIGHT")}
                            >
                              Box Fight
                            </button>
                            <button
                              className={
                                filter === "BUILD_FIGHT" ? "selected" : ""
                              }
                              onClick={() => setFilter("BUILD_FIGHT")}
                            >
                              Build Fight
                            </button>
                          </div>
                          <label className="search">
                            <Search size={15} />
                            <input
                              type="search"
                              placeholder="Buscar modo"
                              aria-label="Buscar modalidad"
                              value={search}
                              onChange={(event) =>
                                setSearch(event.target.value)
                              }
                            />
                          </label>
                        </div>
                        <div className="mode-grid">
                          {availableModes.map((mode) => {
                            const enabled = modes.some(
                              (item) => item.code === mode.code,
                            );
                            return (
                              <article className="mode-card" key={mode.code}>
                                <button
                                  className="mode-image-button"
                                  onClick={() => challenge(mode.code)}
                                  aria-label={`Seleccionar ${mode.name}`}
                                  disabled={
                                    mode.code === "ZONE_WARS" ||
                                    (connection === "online" && !enabled)
                                  }
                                >
                                  <img
                                    src={`/assets/modes/${mode.image}.jpg`}
                                    alt={`Arena ${mode.name} de Fortnite`}
                                    loading="lazy"
                                  />
                                  <span
                                    className={`mode-tag ${mode.code === "ZONE_WARS" ? "muted" : ""}`}
                                  >
                                    {mode.tag}
                                  </span>
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
                                      1v1 <i />
                                      {mode.difficulty}
                                    </span>
                                    <span
                                      className={`mode-status ${enabled ? "available" : ""}`}
                                    >
                                      {enabled
                                        ? "En catálogo"
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
                        {!availableModes.length && (
                          <div className="empty-state">
                            <Search size={25} />
                            <h3>No encontramos ese modo</h3>
                            <p>
                              Prueba con otro nombre o vuelve a ver todas las
                              modalidades.
                            </p>
                            <button
                              className="text-button"
                              onClick={() => {
                                setSearch("");
                                setFilter("ALL");
                              }}
                            >
                              Limpiar filtros <ArrowRight size={14} />
                            </button>
                          </div>
                        )}
                      </section>
                      <section
                        className="lobby-section"
                        aria-labelledby="lobby-title"
                      >
                        <div className="section-heading">
                          <div>
                            <span className="eyebrow">EL PRÓXIMO DUELO</span>
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
                                  ? "Tu rival podría ser el próximo."
                                  : "Tu próxima partida empieza contigo."}
                              </h3>
                              <p>
                                {user
                                  ? lobby === null
                                    ? "No pudimos consultar los desafíos. Actualiza la conexión."
                                    : "Aún no hay desafíos abiertos. Crea uno cuando tu cuenta esté habilitada."
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
                    <aside className="right-rail" aria-label="Tu cuenta y guía">
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
                            ? "El saldo se consulta directamente en la plataforma."
                            : "Tu saldo aparecerá después de iniciar sesión."}
                        </p>
                      </section>
                      <section className="steps-card">
                        <span className="eyebrow">ASÍ DE SIMPLE</span>
                        <h3>Del lobby a la partida.</h3>
                        <ol>
                          <li>
                            <span>01</span>
                            <div>
                              <strong>Conecta tu Discord</strong>
                              <p>Una cuenta para toda tu actividad.</p>
                            </div>
                          </li>
                          <li>
                            <span>02</span>
                            <div>
                              <strong>Elige tu desafío</strong>
                              <p>Consulta reglas, aporte y comisión.</p>
                            </div>
                          </li>
                          <li>
                            <span>03</span>
                            <div>
                              <strong>Compite y confirma</strong>
                              <p>Reporta el resultado de tu partida.</p>
                            </div>
                          </li>
                        </ol>
                        <button
                          className="text-button"
                          onClick={() => openModal("rules")}
                        >
                          Conocer el proceso
                          <ArrowRight size={14} />
                        </button>
                      </section>
                      <section className="fairplay-card">
                        <ShieldCheck size={25} />
                        <h3>El respeto también juega.</h3>
                        <p>
                          Competimos con reglas claras. Si hay un desacuerdo, el
                          resultado pasa a mediación.
                        </p>
                        <button onClick={() => openModal("rules")}>
                          Leer las reglas <ArrowUpRight size={13} />
                        </button>
                      </section>
                    </aside>
                  </div>
                </>
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
                          <p>Saldo registrado en tu cuenta</p>
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
                            await api.logout();
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
                      <form
                        className="lookup-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void run(async () => {
                            const match = await api.match(matchLookup.trim());
                            setSelectedMatch(match);
                          });
                        }}
                      >
                        <label htmlFor="match-id">
                          Consultar partida por su ID
                        </label>
                        <div>
                          <input
                            id="match-id"
                            value={matchLookup}
                            onChange={(event) =>
                              setMatchLookup(event.target.value)
                            }
                            placeholder="ID de la partida"
                            required
                          />
                          <button className="button secondary" disabled={busy}>
                            Consultar
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </form>
                      {selectedMatch ? (
                        <div className="match-detail">
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
                      ) : (
                        <div className="empty-state">
                          <Swords size={32} />
                          <h3>Cada gran duelo tiene un comienzo.</h3>
                          <p>
                            Crea un desafío o consulta una partida con su
                            identificador.
                          </p>
                          <button
                            className="button primary"
                            onClick={() => challenge()}
                          >
                            Explorar desafíos
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {view === "help" && (
                <section className="panel-page help-page">
                  <div className="help-intro">
                    <Headphones size={34} />
                    <h2>Reglas claras. Mejor juego.</h2>
                    <p>
                      Tu comunidad merece una experiencia transparente desde el
                      primer clic.
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
                  <button onClick={() => navigate("help")}>
                    Ayuda y privacidad
                  </button>
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
                  ? "Pagos en preparación."
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
              {connection === "online" && platform?.discordEnabled ? (
                <a
                  className="button primary full"
                  href="/oauth2/authorization/discord"
                >
                  <Gamepad2 size={20} />
                  Continuar con Discord
                  <ArrowUpRight size={17} />
                </a>
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
            <>
              <div className="modal-illustration">
                <Wallet size={40} />
              </div>
              <p className="dialog-copy">
                Los depósitos y retiros aún no están disponibles. Aquí
                aparecerán los métodos autorizados cuando estén integrados.
              </p>
              <div className="info-note">
                <ShieldCheck size={19} />
                <span>
                  Esta acción no genera un cobro, no solicita datos bancarios ni
                  modifica tu saldo.
                </span>
              </div>
              <button className="button secondary full" onClick={closeModal}>
                Entendido
              </button>
            </>
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
                Las reglas competitivas y los territorios admitidos están
                pendientes de validación. Los desafíos con dinero permanecen
                deshabilitados en la configuración inicial.
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
