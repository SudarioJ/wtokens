# Guía de Alojamiento 24/7 — Bot de Discord WTOKENS

Esta guía contiene todo lo necesario para alojar y mantener encendido el Bot de Discord de **WTOKENS** 24/7 en cualquier servidor (VPS, Ubuntu/Debian, Railway, Render, Fly.io, etc.).

---

## 1. Requisitos
- **Node.js**: Versión 20, 22 o 24.
- **Git**
- **npm**

---

## 2. Instalación en el servidor

```bash
# 1. Clonar el repositorio
git clone https://github.com/SudarioJ/wtokens.git
cd wtokens

# 2. Instalar dependencias
npm install
```

---

## 3. Configuración de Variables de Entorno (`.env`)

Crea un archivo llamado `.env` en la raíz del proyecto (`wtokens/.env`) con el siguiente contenido exacto:

```env
# Discord Bot Credentials
DISCORD_BOT_TOKEN=TU_DISCORD_BOT_TOKEN_AQUI
DISCORD_CLIENT_ID=1562186330841161838
DISCORD_GUILD_ID=1562177277821718539

# Roles
DISCORD_STAFF_ROLE_ID=1562188681383776461
DISCORD_VERIFIED_ROLE_ID=1562188696554446848
DISCORD_MEMBER_ROLE_ID=1562188702703427595
DISCORD_UNVERIFIED_ROLE_ID=1562188705928712202
DISCORD_BANNED_ROLE_ID=1564317586446098563
DISCORD_BRAZIL_ROLE_ID=1564334966433906788

# Canales
DISCORD_DUEL_CATEGORY_ID=1563263460643578018
DISCORD_RESULTS_CHANNEL_ID=1562188860077777016
DISCORD_STAFF_ALERTS_CHANNEL_ID=1562188850279743729
DISCORD_AFFILIATES_CHANNEL_ID=1562188764602835177
```

---

## 4. Ejecutar el Bot

### Modo prueba / manual:
```bash
npm run bot
```

### Modo Producción 24/7 (con PM2 - Recomendado):
Para que el bot se reinicie automáticamente si el servidor se reinicia o si ocurre algún error:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el bot como servicio continuo
pm2 start "npm run bot" --name "wtokens-bot"

# Guardar la lista de procesos para el arranque del sistema
pm2 save
pm2 startup
```

### Comandos útiles de PM2:
- **Ver estado:** `pm2 status`
- **Ver logs en tiempo real:** `pm2 logs wtokens-bot`
- **Reiniciar:** `pm2 restart wtokens-bot`
- **Detener:** `pm2 stop wtokens-bot`
