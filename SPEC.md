# ⚡ WTOKENS — Especificación Técnica de Mejoras y Arquitectura (v2.0)

Plataforma de arbitraje (escrow) P2P y duelos competitivos de Fortnite para Sudamérica (**Argentina, Chile, Perú, Uruguay, Bolivia y Paraguay**).

---

## 1. Visión General y Objetivos

El objetivo de esta especificación es elevar el proyecto **WTOKENS** de su prototipo inicial (SQLite local, endpoints simulados y monolito Express) a una **plataforma de producción robusta, segura, escalable y 100% automatizada**.

### Principios Fundamentales
* **Cero Fraude Contable:** El saldo del usuario y el pozo del duelo se gestionan mediante transacciones ACID atómicas en PostgreSQL con bloqueo de fondos en bóveda (escrow).
* **100% Pagos Automatizados:** Eliminación de comprobantes manuales falsificables; integración con webhooks verificados criptográficamente (Mercado Pago y Binance Pay/Crypto).
* **Tiempo Real Nativo:** Sincronización instantánea de lobbies, desafíos y reportes de victoria mediante WebSockets con Supabase Realtime.
* **Serverless & Edge Friendly:** Despliegue en Vercel / Supabase sin necesidad de servidores dedicados pesados ni procesos de bot Gateway 24/7 (usando Discord HTTP Interactions).

---

## 2. Arquitectura del Sistema

```
                       ┌────────────────────────────────────────┐
                       │        CLIENTE WEB (SPA / PWA)         │
                       │    HTML5 + Tailwind CSS + Vanilla JS   │
                       └──────────────┬───────────────────▲─────┘
                                      │                   │
                     HTTP REST / JSON │                   │ Supabase Realtime
                                      ▼                   │ (WebSockets)
  ┌───────────────────────────────────────────────────────┴────────────────────────┐
  │                           CAPA API (Vercel Serverless)                         │
  ├────────────────────────────────────────────────────────────────────────────────┤
  │  • /api/auth/*        (Discord OAuth2 Callback & JWT Session)                 │
  │  • /api/user/*        (Perfil & Verificación Fortnite-API.com)                │
  │  • /api/matches/*     (Motor de Bóveda Escrow: Retención, Aceptación, Claim)   │
  │  • /api/payments/*    (Webhooks Mercado Pago & Binance Pay con firmas HMAC)    │
  │  • /api/discord/*     (HTTP Interactions Endpoint con verificación Ed25519)   │
  │  • /api/admin/*       (Resolución de Disputas & Auditoría de Retiros)          │
  └──────────────────────────────┬─────────────────────────────────────────────────┘
                                 │
           Transacciones ACID /  │ Prisma / Supabase JS Client
           Row-Level Security    ▼
  ┌────────────────────────────────────────────────────────────────────────────────┐
  │                    BASE DE DATOS (Supabase / PostgreSQL)                       │
  │  • Tablas: users, matches, transactions, disputes, withdrawal_requests        │
  │  • Triggers & Funciones para bloqueo/desbloqueo seguro de saldos               │
  └────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos y Esquema Relacional (PostgreSQL)

El esquema sustituye el SQLite local (`backend/data/wtokens.db`) por PostgreSQL con restricciones de integridad y tipos estrictos.

### 3.1. Tablas Principales

```sql
-- Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id TEXT UNIQUE NOT NULL,
    discord_username TEXT NOT NULL,
    discord_avatar TEXT,
    epic_id TEXT,
    epic_nickname TEXT,
    epic_verified BOOLEAN DEFAULT FALSE,
    country VARCHAR(3) DEFAULT 'ARG', -- ARG, CHL, PER, URY, BOL, PRY
    currency VARCHAR(3) DEFAULT 'ARS', -- ARS, CLP, PEN, UYU, BOB, PYG, USD
    balance_usd NUMERIC(12, 2) DEFAULT 0.00 CHECK (balance_usd >= 0),
    total_earned_usd NUMERIC(12, 2) DEFAULT 0.00,
    matches_played INT DEFAULT 0,
    matches_won INT DEFAULT 0,
    win_streak INT DEFAULT 0,
    role VARCHAR(20) DEFAULT 'player' CHECK (role IN ('player', 'booster', 'mediator', 'admin')),
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Partidas y Bóveda (Matches / Wagers)
CREATE TABLE matches (
    id VARCHAR(16) PRIMARY KEY, -- Ej: 'FN-82914'
    mode VARCHAR(30) NOT NULL CHECK (mode IN ('boxfight', 'zonewars', 'buildfight', 'zerobuild', 'realistic')),
    stake_usd NUMERIC(10, 2) NOT NULL CHECK (stake_usd >= 0.50 AND stake_usd <= 50.00),
    total_pot_usd NUMERIC(10, 2) NOT NULL,
    fee_usd NUMERIC(10, 2) NOT NULL,
    prize_usd NUMERIC(10, 2) NOT NULL,
    
    player1_id UUID NOT NULL REFERENCES users(id),
    player2_id UUID REFERENCES users(id), -- Opcional inicialmente en lobbies abiertos
    
    match_type VARCHAR(20) DEFAULT 'open_lobby' CHECK (match_type IN ('direct_challenge', 'open_lobby')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
        'open',             -- Esperando oponente (lobby público)
        'pending_accept',   -- Reto directo enviado a player2
        'vault_locked',     -- Ambos aceptaron, fondos retenidos en bóveda
        'in_progress',      -- Partida en curso
        'claim_submitted',  -- Uno de los jugadores reportó resultado
        'disputed',         -- Resultados contradictorios, en revisión
        'finished',         -- Liquidado y pagado al ganador
        'cancelled'         -- Cancelado y fondos reembolsados
    )),
    
    player1_claim VARCHAR(10) CHECK (player1_claim IN ('win', 'loss')),
    player2_claim VARCHAR(10) CHECK (player2_claim IN ('win', 'loss')),
    claim_deadline TIMESTAMPTZ, -- 10 minutos para que el rival confirme
    winner_id UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 3. Transacciones Contables (Ledger Inmutable)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'DEPOSIT', 'WITHDRAWAL', 'MATCH_LOCK', 'MATCH_WIN', 'MATCH_REFUND', 'FEE_DEDUCTION'
    )),
    amount_usd NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(5) NOT NULL,
    local_amount NUMERIC(14, 2),
    payment_method VARCHAR(30), -- 'mercadopago', 'binance_pay', 'crypto'
    reference_id TEXT UNIQUE,   -- ID de la orden en Mercado Pago o Hash
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Disputas y Evidencia
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id VARCHAR(16) NOT NULL REFERENCES matches(id),
    opened_by UUID NOT NULL REFERENCES users(id),
    player1_clip_url TEXT,
    player2_clip_url TEXT,
    reason TEXT,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id), -- Administrador o Mediador
    status VARCHAR(20) DEFAULT 'under_review' CHECK (status IN ('under_review', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```

---

## 4. Flujo de Identidad y Verificación de Epic Games

```
[ Usuario ] ──> Ingresa Nickname de Epic
                     │
                     ▼
           [ API /api/user/verify-epic ]
                     │
                     ▼ Consulta
           [ Fortnite-API.com pública ]
           GET /v2/stats/br/v2?name={nickname}
                     │
         ┌───────────┴───────────┐
      Existe?                 No Existe
         │                       │
      [ 200 OK ]              [ 404 Error ]
   Guarda accountId        "El jugador no existe o su
   en BD (epic_verified)   perfil es privado"
```

1. **Consulta Externa:** El backend consulta `https://fortnite-api.com/v2/stats/br/v2?name=${nickname}` usando headers con la API Key configurada.
2. **Validación:** Se comprueba existencia del jugador, avatar/nivel y se almacena el `accountId` canónico de Epic Games.
3. **Restricción de Duelos:** Ningún usuario puede unirse o crear un duelo sin tener `epic_verified = true`. Esto evita cuentas fantasmas en las islas competitivas.

---

## 5. Ciclo de Vida del Duelo y Motor de Bóveda (Escrow)

### 5.1. Modalidades de Creación
1. **Lobby Público (Open Matchmaking):**
   * El Jugador 1 crea una apuesta (ej. $1.00 USD Boxfight).
   * Su saldo de $1.00 USD se bloquea inmediatamente (`status: 'open'`).
   * La partida aparece en el Lobby en vivo.
   * Cualquier jugador con saldo suficiente da clic en "Aceptar". En ese instante se descuenta el saldo del Jugador 2 y la partida pasa a `status: 'vault_locked'`.
2. **Desafío Directo (P2P Challenge):**
   * El Jugador 1 desafía a un rival específico por Discord ID o Epic Nickname.
   * Los fondos del Jugador 1 se retienen, y se envía una notificación/invitación al Jugador 2 (`status: 'pending_accept'`).
   * El Jugador 2 tiene 5 minutos para aceptar o rechazar. Si acepta, se descuenta su saldo y pasa a `status: 'vault_locked'`. Si expira o rechaza, se devuelven los fondos al Jugador 1.

### 5.2. Reporte de Resultados y Regla de 10 Minutos
* **Consenso Inmediato:** Si Jugador 1 declara `win` y Jugador 2 declara `loss`, o viceversa:
  * El pozo (90%) se acredita inmediatamente al ganador.
  * La comisión (10%) se registra en el ledger contable.
  * Estado final: `finished`.
* **Regla del Cronómetro (Auto-Resolución por Abandono):**
  * Si un jugador reporta `win` y el rival no reporta nada en **10 minutos** (`claim_deadline`), el sistema otorga la victoria automáticamente por incomparecencia (W.O.).
* **Conflicto (Disputa):**
  * Si ambos reportan `win`, el estado cambia a `disputed`.
  * Se abre un formulario en la web para que ambos adjunten su clip (YouTube, Medal.tv, Twitch o Streamable).
  * La disputa entra a la cola del Panel de Mediadores.

---

## 6. Pasarelas de Pago 100% Automatizadas

Se eliminan endpoints de auto-confirmación desprotegidos. Todo depósito requiere webhook oficial:

### 6.1. Mercado Pago (Argentina, Chile, Perú, Uruguay)
* **Integración:** Mercado Pago Checkout Pro API (`/v1/checkout/preferences`).
* **Flujo:**
  1. El cliente solicita recargar `$X USD`. El backend calcula la moneda local (`ARS`, `CLP`, `PEN`) según el tipo de cambio oficial.
  2. El backend genera la preferencia con `external_reference = transaction_id` y devuelve el `init_point`.
  3. El usuario paga en Mercado Pago (tarjeta, saldo o débito).
  4. Mercado Pago envía un webhook `payment.updated` a `/api/payments/mercadopago/webhook`.
  5. El backend verifica la firma HMAC (`x-signature`) de Mercado Pago, consulta el estado del pago (`status === 'approved'`) y acredita el saldo de manera atómica.

### 6.2. Binance Pay / Crypto (Universal)
* **Integración:** Binance Pay Merchant API (`/binancepay/openapi/v2/order`).
* **Flujo:** Genera orden QR en USDT/BUSD. Al confirmarse en blockchain o en el portal de Binance, el webhook notifica la acreditación instantánea.

### 6.3. Solicitud de Retiros (Cashouts)
* El usuario solicita retiro especificando monto y destino (CVU/Alias Mercado Pago o Binance Pay ID).
* El monto se congela inmediatamente de su `balance_usd`.
* Pasa a estado `pending_approval` para verificación antifraude (comprobar que las ganancias provienen de duelos legítimos y no de bugs contables). Un administrador aprueba y liquida.

---

## 7. Arquitectura del Bot de Discord (HTTP Interactions)

Para evitar caídas de servidor y la necesidad de mantener un proceso WebSocket permanente en un VPS:

1. **Interactions Endpoint:** Se implementa `/api/discord/interactions` bajo especificación de Discord.
2. **Firma Criptográfica:** Cada petición de Discord es verificada mediante su cabecera `X-Signature-Ed25519` y `X-Signature-Timestamp` usando la llave pública de la aplicación.
3. **Comandos Soportados:**
   * `/balance`: Muestra saldo en USD y divisa local.
   * `/vincular <epic_nickname>`: Vincula cuenta de Fortnite verificando con la API.
   * `/duelo <@oponente> <modo> <monto>`: Crea una invitación directa con botones interactivos [Aceptar] / [Rechazar].
   * `/salas`: Lista los duelos públicos abiertos con link directo para unirse desde la web.

---

## 8. Sincronización en Tiempo Real (Supabase Realtime)

* **Canales de Suscripción:**
  * `public:matches`: Emite eventos `INSERT` y `UPDATE`. La interfaz web actualiza la lista de duelos disponibles sin recargar la página.
  * `user:{id}:notifications`: Avisa en tiempo real al jugador si alguien aceptó su reto, si se le transfirieron tokens o si su partida entró en disputa.

---

## 9. Sistema de Diseño y Dirección Visual (UI/UX)

El rediseño del frontend (`public/index.html` y `public/styles.css`) adoptará la estética **Editorial Dark Emerald & 3D Depth Showcase**:

### 9.1. Paleta Cromática e Iluminación Atmosférica
* **Fondo Principal (Radial Spotlight):** Degradado atmosférico desde verde esmeralda oscuro iluminado en el cuadrante superior izquierdo (`#1B3B33` -> `#0D1F1B`) hacia negro carbón profundo en la base y bordes (`#060B0A`).
* **Superficies y Tarjetas:** Gris grafito cálido y translúcido (`#141A19` con `backdrop-filter: blur(16px)`) y bordes sutiles de alto contraste (`1px solid rgba(255, 255, 255, 0.08)`).
* **Acentos Metálicos (Champagne Bronze & Crisp White):**
  * Bronce/Oro Rosa (`#C89D7C` / `#D4AF7A`) para elementos destacados, bordes de nivel, premios del pozo y detalles competitivos.
  * Blanco puro (`#FFFFFF`) para el ítem activo de navegación y titulares, con gris niebla (`#9CA8A5`) para ítems inactivos.

### 9.2. Layout y Estructura de Navegación
1. **Barra Lateral Izquierda Fija (Minimal Sidebar Strip):**
   * Columna vertical de `72px` de ancho en el borde izquierdo con sutil separación translúcida.
   * Ícono de menú (`☰`) en la parte superior para desplegar accesos rápidos/drawer móvil.
   * Íconos sociales/comunidad centrados verticalmente (**Discord**, **Instagram**, **X/Twitter**, **TikTok**).
2. **Header Superior Editorial:**
   * Marca **WTOKENS** en tipografía condensada geométrica (`Bebas Neue` / `Oswald` Bold) a la izquierda.
   * Menú horizontal minimalista en mayúsculas con amplio espaciado (`letter-spacing: 0.14em`): `ARENA`, `MODALIDADES`, `BÓVEDA & PAGOS`, `RANKING`.
   * Selector minimalista de moneda/región en el extremo derecho (`ARS ⌄`, `CLP ⌄`, `PEN ⌄`, `USD ⌄`) junto al estado de sesión de Discord.
3. **Hero Showcase con Carrusel 3D en Profundidad (Coverflow):**
   * **Marca de Agua en Fondo:** Números/tipografía gigante de baja opacidad (`rgba(255, 255, 255, 0.03)`) detrás del escenario central para generar paralaje y profundidad.
   * **Tarjeta Central Protagonista:** Contenedor con esquinas redondeadas pronunciadas (`border-radius: 30px`), sombra profunda (`0 30px 70px rgba(0, 0, 0, 0.85)`) mostrando la modalidad seleccionada (**Box Fight 1v1**, **Zone Wars**, **Build Fight**, **Realistic**, **Zero Build**), el pozo en vivo y acceso directo a crear o aceptar duelo.
   * **Tarjetas Laterales en Segundo Plano:** Vistas previas a izquierda y derecha escaladas (`scale(0.75)`) con menor brillo, flanqueadas por flechas chevron minimalistas (`‹` y `›`).
   * **Micro-interacción Inferior:** Leyenda centrada con tracking amplio (`HAZ CLIC PARA ENTRAR A LA ARENA` / `TAP TO VIEW MORE`).

### 9.3. Assets Visuales de Modalidades Competitivas (`public/assets/modes/`)

| Modalidad | Identificador (`mode`) | Archivo en `public/assets/modes/` | Número de Fondo (Watermark) |
| :--- | :--- | :--- | :--- |
| **Box Fight** | `boxfight` | `public/assets/modes/boxfight.jpg` | `01` |
| **Build Fight** | `buildfight` | `public/assets/modes/buildfight.jpg` | `02` |
| **Zone Wars** | `zonewars` | `public/assets/modes/zonewars.jpg` | `03` |
| **Realistic** | `realistic` | `public/assets/modes/realistic.jpg` | `04` |

---

## 10. Plan de Implementación por Fases

| Fase | Tareas Clave | Entregables |
|---|---|---|
| **Fase 1: Base de Datos y Persistencia** | Migrar de `node:sqlite` a Supabase/PostgreSQL; crear DDL de tablas y transacciones de bóveda. | `schema.sql` ejecutado, cliente Supabase configurado, variables de entorno. |
| **Fase 2: Motor de Escrow & Duelos** | Separar lobby abierto de duelos directos; implementar timers de confirmación (10 min) y endpoints de disputa. | Rutas `/api/matches/*` seguras con bloqueo atómico de saldos. |
| **Fase 3: Pagos Automatizados** | Webhooks oficiales de Mercado Pago y Binance Pay con validación de firma criptográfica; eliminación de endpoints mock. | `/api/payments/*` seguro y funcional en producción. |
| **Fase 4: Bot de Discord (HTTP Interactions)** | Endpoint de interacciones con verificación Ed25519; respuesta a `/duelo`, `/balance`, `/vincular`. | Comandos slash activos respondiendo vía webhook sin servidor de fondo. |
| **Fase 5: Rediseño UI/UX & Realtime** | Rediseñar la interfaz al estilo **Dark Emerald & 3D Carousel** (Sidebar fija, Coverflow de modos, acentos bronce), conectar Supabase Realtime y añadir el Panel de Mediador. | `public/index.html`, `public/styles.css`, `public/app.js` renovados. |
