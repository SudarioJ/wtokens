# WTOKENS · TypeScript Arena

Frontend React + TypeScript para [el backend Java WTOKENS](https://github.com/SudarioJ/wtokens-backend). Landing pública basada en la web original y panel privado con el nuevo diseño de arena, modalidades, billetera, partida y ayuda. Los datos de identidad y dinero se consultan en el servidor; no se simulan recargas, retiros o ganadores.

## Landing y panel

- `/`: landing pública con encabezado horizontal, título original, carrusel de modalidades, sistema, comunidad Discord, sección LATAM y preguntas frecuentes. Sigue disponible aunque el usuario tenga sesión; «Mi panel» abre su espacio personal.
- `/app`: panel con navegación lateral, lobby, billetera y gestión de partidas. Comprueba `/v1/me` antes de mostrar la interfaz personal; sin sesión vuelve a la landing y solicita Discord. Esa separación visual complementa la autorización que ya aplica el backend a los datos y operaciones.
- Después del callback de Discord se abre `/app`. «Volver al sitio» regresa a `/` manteniendo la sesión; cerrar sesión vuelve a la landing y limpia los datos privados.

El carrusel tiene controles anterior/siguiente, indicadores y teclado, sin rotación automática. Las imágenes, tipografía condensada y paleta azul conservan la dirección de la landing original; el diseño azul/lima del panel se mantiene para después del acceso. No se publican cantidades inventadas de jugadores ni equivalencias sin proveedor.

## Inicio rápido

Requisitos: Node.js 24 y npm. Clonar esta rama, instalar y configurar el origen del backend:

```powershell
npm ci --no-audit
Copy-Item .env.example .env
npm run dev
```

Abrir `http://127.0.0.1:5173`. `.env` contiene `BACKEND_URL=http://127.0.0.1:8080`; cambiarlo si el backend usa otro origen. Vite lee ese valor en el servidor de desarrollo. No poner secretos en variables `VITE_*`.

Para probar el build con las cabeceras de producción y el proxy:

```powershell
npm run build
npm start
```

Abrir `http://127.0.0.1:3000`. `npm start` carga `.env` si existe; las variables ya definidas en el proceso tienen prioridad. `npm run preview` sirve únicamente el build estático y no integra el proxy: no usarlo para probar OAuth o la API.

## Conectar el backend Java

Levantar el proyecto Java con PostgreSQL, `COOKIE_SECURE=false` solo para HTTP local y la API en `127.0.0.1:8080`. El backend debe incluir el endpoint público `/v1/platform` de la rama `feat/frontend-capabilities`.

El navegador llama al mismo origen (`/v1/*`, `/oauth2/*`, `/login/oauth2/*`, `/actuator/health`). Vite o el servidor TypeScript reenvían esas rutas al origen fijo `BACKEND_URL`. No se utiliza CORS abierto, bearer tokens en el navegador ni un parámetro de usuario para elegir el destino del proxy.

Para Discord, configurar en el backend:

```text
SPRING_PROFILES_ACTIVE=discord
DISCORD_CLIENT_ID=<application ID>
DISCORD_CLIENT_SECRET=<secret solo en el backend>
DISCORD_REDIRECT_URI=http://127.0.0.1:3000/login/oauth2/code/discord
COOKIE_SECURE=false
```

Registrar exactamente esa URL en Discord Developer Portal. Si se usa Vite, el callback debe usar el puerto 5173. La web inicia `/oauth2/authorization/discord`; Spring mantiene la sesión HttpOnly y el proxy conserva las cookies. El backend retorna a `/v1/me` después del login: el proxy redirige la navegación HTML a `/app`; las consultas JSON siguen llegando al API.

Sin credenciales de Discord se puede verificar salud y catálogo, pero la interfaz informa que el login no está configurado. No hay bypass de sesión ni usuario demo en el producto. Las apuestas del backend están apagadas por defecto, y entrar con Discord no establece elegibilidad.

## Qué cambió

- Landing pública azul con carrusel 3D y contenido del negocio; panel privado oscuro con acentos azul y lima, navegación lateral y móvil, buscador y filtros funcionales.
- Diálogos nativos con foco, Escape, labels, contraste revisado y respeto por movimiento reducido.
- TypeScript estricto en código activo: componentes, contratos Zod, cliente API, dinero y servidor/proxy.
- Billetera y extracto basados en respuestas validadas. Importes en unidades menores como string y cálculos BigInt; nunca float para dinero.
- Flujos para crear, aceptar, confirmar presencia, reportar, cancelar y disputar partidas según permisos/capacidades del backend.
- Estados separados de desconexión, sesión requerida, ausencia de movimientos, función pendiente y rechazo del servidor.
- CSRF e idempotencia en escrituras. Sin identidad, saldo ni tokens en localStorage/sessionStorage. CSP sin scripts inline, fuentes externas ni ejecución CDN.

La comisión, máximo de aporte y capacidades vienen de `/v1/platform`. La moneda seleccionada cambia la cuenta consultada; **no convierte** el saldo. FX y medios de pago siguen pendientes en el backend. Los importes del catálogo no se inventan. El acceso a la información de una partida está limitado por el backend a sus participantes.

## Estructura

```text
src/                  UI React y cliente tipado
server/               servidor HTTP y proxy TypeScript
api/gateway.ts        adaptador de proxy para Vercel
public/assets/        imágenes existentes
tests/unit/           dinero, contratos y seguridad del proxy
tests/e2e/            UX, accesibilidad y regresiones de seguridad
scripts/              smoke HTTP local contra Java
docs/                 alcance de revisión y pruebas
legacy/               frontend, API Node y scripts previos, no servidos
```

El JavaScript histórico se conserva para trazabilidad bajo `legacy/`; no forma parte de la migración activa, el build ni el runtime. No ejecutar su backend, verificadores ni scripts Discord. El despliegue anterior y sus supuestos de pagos no aplican al frontend nuevo. `legacy/README-previous.md` conserva la documentación anterior.

## Verificación

```powershell
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm run test:security:local  # Con frontend :3000 y Java :8080 levantados
npm run audit
```

Los tests de navegador usan API fixtures y cubren escritorio y móvil. El smoke local usa los servicios reales sin realizar apuestas ni pagos. `npm run audit` consulta OSV para todas las versiones del lockfile; falla si encuentra avisos o si la fuente no responde. `npm run audit:npm` conserva la comprobación opcional del registro npm. La CI separa verificación de UI y auditoría OSV. [Ver alcance y límites de seguridad](docs/SECURITY-TESTING.md).

Los resultados no equivalen a una auditoría completa del negocio ni verifican pagos, KYC, licencias, fraude o toda la autorización autenticada. Un error de red de npm audit debe reportarse como auditoría inconclusa, aunque las pruebas de aplicación pasen.

## Despliegue entregado para revisión

- **Node / Cloud Run:** Dockerfile sirve `dist` y reenvía al Java indicado por `BACKEND_URL`. Docker usa `HOST=0.0.0.0`; ejecución local se limita a loopback. En producción usar un origen HTTPS para el backend y cookies Secure.
- **Vercel:** `vercel.json` construye `dist` y reescribe únicamente rutas de API/OAuth a `api/gateway.ts`. Configurar `BACKEND_URL` como variable del servidor y el callback OAuth con el dominio del frontend. La función falla con 503 si falta esa configuración. Nunca copiar secretos de Discord al frontend.

No se ha publicado este rediseño ni se ha cambiado el dominio de producción. Las configuraciones de despliegue y el login real requieren validación en staging. Antes del lanzamiento deben completarse sesiones compartidas, rate limiting, privacidad y el trabajo pendiente de la spec del backend.
