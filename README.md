# ⚡ WTOKENS - Plataforma Competitiva de Fortnite (LATAM)

WTOKENS es la primera plataforma competitiva y sistema de arbitraje (escrow) P2P para Fortnite en Sudamérica (**Argentina, Chile, Uruguay, Perú, Paraguay y Bolivia**), inspirada en el modelo de BR Tokens pero adaptada a las monedas y necesidades de la región.

---

## 🏗️ Arquitectura Completa del Sistema

```
                         [ CLIENTE WEB (Vercel) ]
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     [ Discord OAuth2 ]   [ Multi-Moneda ]     [ Billetera Local ]
    (Login sin password)  (ARS, CLP, PEN...)    (MercadoPago, Yape)
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
                   [ BACKEND API (Node.js Express) ]
                         Port: 4000 (o Vercel)
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
 [ BASE DE DATOS ]       [ MOTOR DE BÓVEDA ]       [ BOT DE DISCORD ]
  SQLite / Supabase        (Escrow Lock & Fee)       (Salas & Arbitraje)
  • Usuarios & Saldos     • Bloqueo $0.50-$20 USD   • Slash commands (/duelo)
  • Transacciones         • Comisión 10%            • Anuncios automáticos
  • Partidas & Claims     • Liquidación automática  • Botones de victoria
```

---

## 📁 Estructura del Código

```
wtokens/
├── backend/
│   ├── data/
│   │   └── wtokens.db             # Base de datos SQLite persistente (node:sqlite)
│   ├── src/
│   │   ├── config.js              # Cotizaciones, tokens y comisiones
│   │   ├── db.js                  # Esquema, tablas y foreign keys
│   │   ├── bot/
│   │   │   └── bot_engine.js      # Comandos Slash y avisos en canales de Discord
│   │   └── routes/
│   │       ├── auth.js            # Login Discord OAuth2 y creación de sesión
│   │       ├── user.js            # Vinculación y verificación de Epic Games ID
│   │       ├── payments.js        # Webhooks Mercado Pago, Yape, QR y retiros
│   │       ├── matches.js         # Motor de Bóveda (Escrow, claims, disputas)
│   │       └── leaderboard.js     # Ranking en vivo desde la base de datos
│   ├── schema.sql                 # Esquema compatible con PostgreSQL / Supabase
│   ├── server.js                  # Servidor Express Full-Stack (Puerto 4000)
│   └── package.json
├── public/
│   ├── assets/
│   │   └── logo.png               # Logo oficial WTOKENS (Graffiti con corona)
│   ├── index.html                 # Frontend con Billetera, Selector y Duelos
│   ├── styles.css                 # Estilos Cyber Dark y animaciones
│   └── app.js                     # Multi-currency engine y conexión API
├── INICIAR_WTOKENS.bat            # Script de 1 clic para arrancar todo en Windows
└── README.md
```

---

## 🚀 Cómo Iniciar Todo en tu PC (1 Clic)

Simplemente haz doble clic en el archivo:
👉 **`INICIAR_WTOKENS.bat`**

O desde PowerShell:
```powershell
cd C:\Users\nadador\.gemini\antigravity\scratch\wtokens
node backend/server.js
```

El servidor iniciará:
1. La **Base de Datos** SQLite con todas las tablas contables creadas.
2. La **API REST** en `http://localhost:4000`.
3. El registro en vivo de los **Comandos Slash en tu Discord** (`/balance`, `/vincular`, `/duelo`, `/billetera`).
4. El servidor web con el **nuevo logo** y la **billetera de recargas**.

---

## 💳 Pasarelas y Métodos de Pago Habilitados

* 🇦🇷 **Argentina:** Mercado Pago QR, Alias `wtokens.latam.mp` y CVU.
* 🇵🇪 **Perú:** Yape / Plin al `928 374 819` y transferencias BCP.
* 🇨🇱 **Chile:** CuentaRUT BancoEstado y MACH.
* 🇧🇴 **Bolivia:** QR Simple interoperable (Banco Unión / BCP).
* 🇵🇾 **Paraguay:** Giros Tigo y transferencias SIPAP.
* 🇺🇾 **Uruguay:** Prex Uruguay y Midinero.
* 🌐 **Universal:** Binance Pay ID `82910492` y USDT (TRC-20) sin comisiones bancarias.

---

## 🌐 Cómo Actualizar tu Web en Vercel con el Nuevo Logo

Como ya tienes tu proyecto en Vercel ([`wtokens.vercel.app`](https://wtokens.vercel.app)):
1. Entra a tu panel de Vercel en el navegador.
2. Haz clic en tu proyecto **wtokens** &rarr; pestaña **Deployments**.
3. Arrastra la carpeta actualizada [`C:\Users\nadador\.gemini\antigravity\scratch\wtokens\public`](file:///C:/Users/nadador/.gemini/antigravity/scratch/wtokens/public) para que se actualice con el nuevo logo y la billetera.
