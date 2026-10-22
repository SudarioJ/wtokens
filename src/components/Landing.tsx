import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Headphones,
  Menu,
  MessageCircle,
  ShieldCheck,
  Swords,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { Asset, User } from "../lib/contracts";
import { UserAvatar } from "./UserAvatar";
import "./landing.css";

const modes = [
  {
    code: "BOX_FIGHT",
    name: "Box Fight",
    label: "BOX FIGHT CLÁSICO",
    image: "boxfight",
    title: "CADA PARED CUENTA.",
    description:
      "Edición, precisión y reflejos en el combate a corta distancia.",
    detail: "DOMINA EL COMBATE",
  },
  {
    code: "BUILD_FIGHT",
    name: "Build Fight",
    label: "BUILD FIGHT PURO",
    image: "buildfight",
    title: "CONSTRUYE TU VENTAJA.",
    description: "Toma la altura. Pon a prueba tus mecánicas en cada duelo.",
    detail: "LLEVA TU JUEGO MÁS ALTO",
  },
  {
    code: "ZONE_WARS",
    name: "Zone Wars",
    label: "ZONE WARS ENDGAME",
    image: "zonewars",
    title: "LA ÚLTIMA ZONA ES TUYA.",
    description: "Rotaciones, presión y decisiones que marcan la diferencia.",
    detail: "SOBREVIVE AL ENDGAME",
  },
  {
    code: "REALISTICS",
    name: "Realistics",
    label: "REALISTICS & MID",
    image: "realistic",
    title: "JUEGA COMO EN LA FINAL.",
    description:
      "Escenarios reales para llevar tu instinto al siguiente nivel.",
    detail: "CONFÍA EN TU INSTINTO",
  },
];
const questions = [
  {
    title: "¿Cómo empiezo a jugar en WTOKENS?",
    answer:
      "Entra con Discord y abre tu panel. Desde allí puedes consultar las modalidades, revisar tu cuenta y seguir los desafíos disponibles. La habilitación para participar se valida por separado.",
  },
  {
    title: "¿Qué pasa con el aporte de una partida?",
    answer:
      "Cuando el servidor confirma el desafío, el aporte pasa del saldo disponible al reservado. Se mantiene separado hasta que la partida se resuelve o se devuelve conforme a sus reglas.",
  },
  {
    title: "¿Cómo se confirma el resultado?",
    answer:
      "Ambos participantes reportan al ganador. Si los resultados coinciden, se liquida la partida; si hay desacuerdo, los fondos permanecen reservados y se abre una mediación.",
  },
  {
    title: "¿Puedo depositar y retirar en mi moneda?",
    answer:
      "La billetera muestra cada saldo en su moneda original. Los depósitos, retiros y conversiones se habilitarán según los proveedores y territorios admitidos; todavía no están disponibles en este entorno.",
  },
  {
    title: "¿Necesito una cuenta de Epic Games?",
    answer:
      "Necesitas una cuenta de Fortnite para jugar. El acceso con Discord no verifica automáticamente tu identidad Epic; esa integración y los requisitos de participación se informarán en el panel.",
  },
];

type Props = {
  user: User | null;
  assets: Asset[];
  asset: string;
  connection: "loading" | "online" | "offline";
  onAssetChange: (asset: string) => void;
  onEnter: () => void;
  onRules: () => void;
};

export function Landing({
  user,
  assets,
  asset,
  connection,
  onAssetChange,
  onEnter,
  onRules,
}: Props) {
  const [active, setActive] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mode = modes[active]!;
  const changeSlide = (direction: number) =>
    setActive((current) => (current + direction + modes.length) % modes.length);
  const closeMenu = () => setMobileOpen(false);

  return (
    <div className="landing">
      <a href="#landing-main" className="skip-link">
        Ir al contenido
      </a>
      <header className="lp-header">
        <div className="lp-header-inner">
          <a className="lp-brand" href="/" aria-label="WTOKENS, inicio">
            <img src="/assets/logo_128.png" width="43" height="43" alt="" />
            <span>WTOKENS</span>
            <small>LATAM</small>
          </a>
          <nav
            className={`lp-nav ${mobileOpen ? "lp-nav-open" : ""}`}
            aria-label="Navegación del sitio"
          >
            <a href="#modos" onClick={closeMenu}>
              MODOS
            </a>
            <a href="#sistema" onClick={closeMenu}>
              SISTEMA
            </a>
            <a href="#comunidad" onClick={closeMenu}>
              DISCORD
            </a>
            <a href="#faq" onClick={closeMenu}>
              AYUDA
            </a>
          </nav>
          <div className="lp-header-actions">
            <label className="lp-currency">
              <span className="sr-only">Moneda de consulta</span>
              <select
                value={asset}
                onChange={(event) => onAssetChange(event.target.value)}
              >
                {(assets.length ? assets : [{ code: "USD" }]).map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} />
            </label>
            <button
              className={`lp-account ${user ? "lp-account-signed-in" : ""}`}
              onClick={onEnter}
            >
              {user ? (
                <>
                  <UserAvatar user={user} className="lp-avatar" />
                  <span>
                    <strong>{user.display_name}</strong>
                    <small>
                      Mi panel <ArrowRight size={10} />
                    </small>
                  </span>
                </>
              ) : (
                <>
                  <Gamepad2 size={17} />
                  <span>Entrar con Discord</span>
                  <ArrowUpRight size={13} />
                </>
              )}
            </button>
            <button
              className="lp-menu-button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={
                mobileOpen ? "Cerrar menú del sitio" : "Abrir menú del sitio"
              }
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="lp-hero" id="modos" aria-labelledby="landing-title">
          <div className="lp-hero-glow" aria-hidden="true" />
          <div className="lp-hero-copy">
            <span className="lp-kicker">
              <span />
              FORTNITE ARENA COMPETITIVA · LATAM
            </span>
            <h1 id="landing-title">
              JUEGA Y GANA EN <span>$$$</span>
            </h1>
            <p>
              Tu juego. Tu desafío. Tu próxima victoria.
              <br className="lp-mobile-break" /> Compite en Fortnite con una
              comunidad que juega en serio.
            </p>
          </div>
          <section
            className="lp-carousel"
            aria-label="Modalidades de Fortnite"
            aria-roledescription="carrusel"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                changeSlide(1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                changeSlide(-1);
              }
            }}
          >
            <span className="lp-ghost-index" aria-hidden="true">
              0{active + 1}
            </span>
            <div className="lp-carousel-stage">
              {modes.map((item, index) => {
                const distance = (index - active + modes.length) % modes.length;
                const position =
                  distance === 0
                    ? "center"
                    : distance === 1
                      ? "next"
                      : distance === modes.length - 1
                        ? "previous"
                        : "hidden";
                return (
                  <article
                    className={`lp-slide lp-slide-${position}`}
                    key={item.code}
                    hidden={position === "hidden"}
                    aria-label={
                      position === "center"
                        ? `${index + 1} de ${modes.length}: ${item.name}`
                        : undefined
                    }
                  >
                    <img
                      src={`/assets/modes/${item.image}.jpg`}
                      alt={
                        position === "center"
                          ? `Arena ${item.name} de Fortnite`
                          : ""
                      }
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                    {position === "center" ? (
                      <>
                        <div className="lp-slide-top">
                          <span>
                            0{index + 1} · {item.label}
                          </span>
                          <span>
                            <Swords size={12} />
                            {item.code === "ZONE_WARS"
                              ? "ENDGAME"
                              : "DUELOS 1V1"}
                          </span>
                        </div>
                        <div className="lp-slide-bottom">
                          <div>
                            <span className="lp-slide-eyebrow">
                              {item.detail}
                            </span>
                            <h2>
                              {item.name.toUpperCase()} <span>ARENA</span>
                            </h2>
                            <p>{item.description}</p>
                          </div>
                          <button className="lp-play-button" onClick={onEnter}>
                            {user ? "IR A MI PANEL" : "JUGAR AHORA"}
                            <ArrowUpRight size={17} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="lp-slide-preview"
                        tabIndex={-1}
                        onClick={() => setActive(index)}
                        aria-label={`Ver ${item.name}`}
                      >
                        <span>{item.name.toUpperCase()}</span>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            <button
              className="lp-carousel-arrow lp-arrow-left"
              aria-label="Modalidad anterior"
              onClick={() => changeSlide(-1)}
            >
              <ChevronLeft size={30} strokeWidth={1.2} />
            </button>
            <button
              className="lp-carousel-arrow lp-arrow-right"
              aria-label="Siguiente modalidad"
              onClick={() => changeSlide(1)}
            >
              <ChevronRight size={30} strokeWidth={1.2} />
            </button>
            <div
              className="lp-carousel-caption"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>
                0{active + 1} / 0{modes.length}
              </span>
              <i />
              {mode.label}
            </div>
            <div
              className="lp-carousel-dots"
              role="group"
              aria-label="Elegir modalidad"
            >
              {modes.map((item, index) => (
                <button
                  key={item.code}
                  className={active === index ? "lp-dot-active" : ""}
                  onClick={() => setActive(index)}
                  aria-label={`Mostrar ${item.name}`}
                  aria-pressed={active === index}
                >
                  <span />
                </button>
              ))}
            </div>
          </section>
          <a className="lp-discover" href="#sistema">
            DESCUBRE LA ARENA <ArrowDown size={13} />
          </a>
        </section>

        <div className="lp-benefit-strip">
          <div>
            <ShieldCheck size={23} />
            <span>
              <strong>Reglas antes de jugar</strong>
              <small>Aporte y condiciones a la vista</small>
            </span>
          </div>
          <div>
            <Wallet size={23} />
            <span>
              <strong>Tu cuenta, en un solo lugar</strong>
              <small>Saldo, reservas y actividad</small>
            </span>
          </div>
          <div>
            <Headphones size={23} />
            <span>
              <strong>Respaldo en cada duelo</strong>
              <small>Un proceso para resolver desacuerdos</small>
            </span>
          </div>
        </div>

        <section
          className="lp-section lp-system"
          id="sistema"
          aria-labelledby="system-title"
        >
          <div className="lp-section-title">
            <span className="lp-overline">DEL PRIMER CLIC AL ÚLTIMO DUELO</span>
            <h2 id="system-title">
              ENTRA. COMPITE. <span>REPITE.</span>
            </h2>
            <p>
              Menos vueltas entre tú y tu próxima partida.
              <br />
              Todo el proceso, paso a paso.
            </p>
          </div>
          <div className="lp-step-grid">
            {[
              {
                number: "01",
                icon: Gamepad2,
                title: "Conecta tu Discord",
                copy: "Tu comunidad y tu identidad, conectadas desde el primer momento.",
              },
              {
                number: "02",
                icon: Users,
                title: "Prepara tu cuenta",
                copy: "Revisa tu perfil y los requisitos para participar en los desafíos.",
              },
              {
                number: "03",
                icon: Swords,
                title: "Elige tu desafío",
                copy: "Encuentra tu modo y conoce las condiciones antes de aceptar.",
              },
              {
                number: "04",
                icon: ShieldCheck,
                title: "Juega y confirma",
                copy: "Reporta el resultado y sigue cada movimiento desde tu panel.",
              },
            ].map((item) => (
              <article key={item.number}>
                <div className="lp-step-top">
                  <span>{item.number}</span>
                  <item.icon size={25} strokeWidth={1.5} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
          <button className="lp-text-link" onClick={onRules}>
            Conocer el proceso completo <ArrowRight size={16} />
          </button>
        </section>

        <section
          className="lp-section lp-community-section"
          id="comunidad"
          aria-labelledby="community-title"
        >
          <div className="lp-community-card">
            <div className="lp-community-copy">
              <span className="lp-kicker">
                <MessageCircle size={13} />
                NUESTRA COMUNIDAD ESTÁ EN DISCORD
              </span>
              <h2 id="community-title">
                EL JUEGO NOS UNE.
                <br />
                <span>
                  LA COMPETENCIA
                  <br />
                  NOS MUEVE.
                </span>
              </h2>
              <p>
                Encuentra a tu próximo rival, comparte la partida y forma parte
                de una comunidad que habla tu mismo idioma.
              </p>
              <ul>
                <li>
                  <Check size={16} />
                  Un lugar para conectar con otros jugadores.
                </li>
                <li>
                  <Check size={16} />
                  Modalidades y reglas fáciles de consultar.
                </li>
                <li>
                  <Check size={16} />
                  Tu actividad conectada con tu panel web.
                </li>
              </ul>
              <button className="lp-button lp-button-blue" onClick={onEnter}>
                <Gamepad2 size={19} />
                {user ? "Abrir mi panel" : "Conectar con Discord"}
                <ArrowUpRight size={16} />
              </button>
            </div>
            <div
              className="lp-discord-preview"
              aria-label="Vista ilustrativa de los canales de la comunidad"
            >
              <div className="lp-discord-title">
                <img src="/assets/logo_128.png" alt="" width="33" height="33" />
                <span>
                  WTOKENS<small>FORTNITE COMMUNITY</small>
                </span>
                <ChevronDown size={15} />
              </div>
              <div className="lp-channel-label">EL PUNTO DE ENCUENTRO</div>
              <div className="lp-channel">
                # <span>bienvenida</span>
                <span className="lp-channel-badge">INICIO</span>
              </div>
              <div className="lp-channel">
                # <span>reglas-de-la-arena</span>
              </div>
              <div className="lp-channel-label">ELIGE TU TERRENO</div>
              <div className="lp-channel lp-channel-selected">
                <Swords size={16} />
                <span>1v1-boxfight</span>
                <ArrowRight size={15} />
              </div>
              <div className="lp-channel">
                # <span>1v1-buildfight</span>
              </div>
              <div className="lp-channel">
                # <span>realistics</span>
              </div>
              <div className="lp-channel-label">JUGAMOS EN EQUIPO</div>
              <div className="lp-channel">
                <Headphones size={15} />
                <span>soporte-y-mediación</span>
              </div>
              <div className="lp-discord-preview-footer">
                <ShieldCheck size={16} />
                <span>Respeto dentro y fuera de la partida.</span>
              </div>
              <small className="lp-preview-caption">
                VISTA ILUSTRATIVA DE LA COMUNIDAD
              </small>
            </div>
          </div>
        </section>

        <section
          className="lp-region-section lp-section"
          aria-labelledby="region-title"
        >
          <div>
            <span className="lp-overline">
              UNA MISMA PASIÓN. TODA UNA REGIÓN.
            </span>
            <h2 id="region-title">
              HECHO PARA <span>LATAM.</span>
            </h2>
            <p>Distintos acentos. La misma forma de vivir Fortnite.</p>
          </div>
          <div className="lp-countries">
            {[
              ["🇵🇪", "Perú"],
              ["🇦🇷", "Argentina"],
              ["🇨🇱", "Chile"],
              ["🇺🇾", "Uruguay"],
              ["🇵🇾", "Paraguay"],
              ["🇧🇴", "Bolivia"],
            ].map(([flag, name]) => (
              <span key={name}>
                <span aria-hidden="true">{flag}</span>
                {name}
              </span>
            ))}
          </div>
          <p className="lp-region-note">
            Las monedas y los métodos de pago disponibles se informan en la
            plataforma según el territorio habilitado.
          </p>
        </section>

        <section
          className="lp-section lp-faq"
          id="faq"
          aria-labelledby="faq-title"
        >
          <div className="lp-section-title">
            <span className="lp-overline">ANTES DE ENTRAR A LA ARENA</span>
            <h2 id="faq-title">
              BUENAS PREGUNTAS.
              <br />
              <span>RESPUESTAS CLARAS.</span>
            </h2>
            <p>Lo que necesitas saber para dar el siguiente paso.</p>
          </div>
          <div className="lp-faq-list">
            {questions.map((question, index) => (
              <details key={question.title}>
                <summary>
                  <span>0{index + 1}</span>
                  {question.title}
                  <ChevronDown size={17} />
                </summary>
                <p>{question.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-final-cta" aria-labelledby="cta-title">
          <span className="lp-overline">NOS VEMOS EN LA ARENA</span>
          <h2 id="cta-title">
            TU PRÓXIMA PARTIDA
            <br />
            <span>COMIENZA AQUÍ.</span>
          </h2>
          <p>Elige el desafío. Trae tu mejor juego.</p>
          <button className="lp-button lp-button-white" onClick={onEnter}>
            {user ? "Ir a mi panel" : "Entrar a la arena"}
            <ArrowUpRight size={18} />
          </button>
          <span className="lp-final-grid" aria-hidden="true" />
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-main">
          <div>
            <a href="/" className="lp-brand">
              <img src="/assets/logo_128.png" width="40" height="40" alt="" />
              <span>WTOKENS</span>
              <small>LATAM</small>
            </a>
            <p>
              Una comunidad competitiva.
              <br />
              Un nuevo nivel para tu juego.
            </p>
          </div>
          <div>
            <h3>LA ARENA</h3>
            <a href="#modos">Modalidades</a>
            <a href="#sistema">Cómo funciona</a>
            <a href="#comunidad">Comunidad</a>
          </div>
          <div>
            <h3>TU ESPACIO</h3>
            <button onClick={onEnter}>
              Mi panel <ArrowUpRight size={12} />
            </button>
            <a href="#faq">Preguntas frecuentes</a>
            <button onClick={onRules}>Reglamento</button>
          </div>
          <div className="lp-footer-status">
            <ShieldCheck size={22} />
            <strong>
              Juego limpio.
              <br />
              Competencia real.
            </strong>
            <span
              className={`lp-service-dot ${connection === "offline" ? "lp-service-offline" : ""}`}
            >
              {connection === "loading"
                ? "Conectando con la plataforma"
                : connection === "online"
                  ? "Plataforma conectada"
                  : "Servicio sin conexión"}
            </span>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>
            © {new Date().getFullYear()} WTOKENS. Hecho para competir.
          </span>
          <p>
            Plataforma independiente. Sin afiliación ni patrocinio de Epic
            Games.
          </p>
          <span className="lp-age">18+</span>
        </div>
      </footer>
    </div>
  );
}
