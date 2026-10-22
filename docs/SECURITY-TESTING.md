# Pruebas de seguridad y alcance

Esta rama reemplaza la web activa por React/TypeScript y la conecta al backend Java. No es una certificación de seguridad ni una implementación completa de pagos. Todas las comprobaciones activas realizadas durante este trabajo se dirigen al entorno local o a fixtures de pruebas.

## Hallazgos en el frontend anterior y cambios

| Hallazgo | Impacto | Cambio |
|---|---|---|
| Identidad y saldo leídos de localStorage | El usuario podía modificar lo mostrado y aparentar una sesión válida | Perfil, elegibilidad y saldos se consultan en el backend; no existe sesión local alternativa |
| OAuth implícito en navegador | El navegador recibía el token de Discord | OAuth authorization code en Spring; frontend usa cookie de sesión HttpOnly |
| Recargas y retiros simulados con mensajes de éxito | Se mostraba una operación financiera sin confirmación del servidor | Acciones no disponibles indican su estado; no hay números de cuenta ni cobros ficticios |
| Plantillas HTML dinámicas y contenido de proveedores sin una frontera tipada | Riesgo de XSS si se insertaba contenido no escapado | React renderiza texto; no hay innerHTML ni dangerouslySetInnerHTML; Zod valida respuestas |
| Tailwind y scripts externos en runtime | Dependencia de ejecución de terceros y necesidad de permitir inline scripts | Build local, fuentes y recursos del mismo origen; CSP de producción sin unsafe-inline/unsafe-eval |
| Endpoints legacy de verificación Epic | Existía un segundo contrato y fallbacks de demostración | Archivados fuera de public y funciones activas; no se sirven ni ejecutan |
| No existía una compilación TypeScript | Errores de contrato detectados tarde | TypeScript strict, esquema API, lockfile, CI y pruebas |

El contenido previo se conserva bajo `legacy/` para trazabilidad, fuera del build y de las rutas públicas. No ejecutar ese código en producción. Estas observaciones describen la revisión del código; no prueban una explotación previa de la web pública.

## Comprobaciones reproducibles

1. `npm run build`: typecheck y empaquetado sin sourcemaps públicos.
2. `npm test`: dinero con BigInt, validación de API, CSRF/idempotencia, destino fijo del proxy, cookies, cabeceras y exclusión de archivos privados.
3. `npm run test:e2e`: Chromium escritorio y móvil, landing pública y carrusel, panel posterior al acceso, regreso al sitio sin cerrar sesión, cierre de sesión, acceso directo a `/app`, filtros, modal y foco, sesión falsificada en localStorage, nombre con payload XSS, estado offline y axe WCAG 2 AA. Estas pruebas utilizan fixtures API, no credenciales reales. Servir el HTML de `/app` no otorga autorización; la interfaz comprueba `/v1/me` y el backend sigue protegiendo datos y operaciones.
4. `npm run test:security:local`: comprobaciones HTTP contra frontend/proxy y backend Java reales en loopback. Requiere ambos levantados. Verifica rechazo de sesión/cookie/token falsos, POST sin CSRF, salud/capacidades y ausencia de archivos internos. No realiza fuzzing destructivo ni operaciones financieras.
5. `npm run audit`: consulta OSV para todas las versiones del lockfile activo; falla ante cualquier aviso o respuesta incompleta. `npm run audit:npm` permite además consultar el registro npm. Un fallo de red no significa ausencia de vulnerabilidades. `legacy/backend` tiene su propio árbol antiguo, excluido del producto nuevo; debe retirarse definitivamente antes de un despliegue futuro del antiguo sistema.

La CI tiene trabajos separados para pruebas y auditoría OSV. El endpoint de avisos npm agotó su tiempo de conexión tanto localmente como en GitHub Actions; por ello no se usa como única fuente. Nunca interpretar el modo offline de npm audit como una auditoría actualizada.

Durante esta revisión OSV detectó [GHSA-vfj7-8cjw-p6xm](https://osv.dev/vulnerability/GHSA-vfj7-8cjw-p6xm), un riesgo de agotamiento de pila en `braces@3.0.3`, dependencia transitiva de http-proxy-middleware. Se eliminó ese middleware y sus dependencias de matching y se reemplazó por un proxy de destino fijo con HTTP/HTTPS nativo de Node, límite de cuerpo de 1 MiB, timeout, filtrado de cabeceras y validación de rutas. La consulta posterior a OSV de 226 versiones del lockfile no encontró coincidencias conocidas a fecha de esta revisión. Esto no descarta vulnerabilidades no publicadas ni demuestra la seguridad total de la aplicación.

## Límites y trabajo pendiente

- No se probó el login real de Discord porque falta configurar una aplicación y su secreto. Los tests de navegador simulan perfiles; el backend por defecto informa discordEnabled=false.
- No hay procesador financiero ni se han hecho pagos. Las apuestas permanecen apagadas por defecto.
- La autorización entre usuarios autenticados, KYC, límites, autoexclusión, arbitraje, antifraude y sesiones compartidas requieren el trabajo pendiente de la spec del backend.
- Para auditoría autenticada: usar dos cuentas de pruebas autorizadas, comprobar IDOR de partidas/billeteras/evidencia y CSRF tras expiración/rotación. No habilitar rutas de bypass de login para facilitar el test.
- Configurar rate limiting en el borde y revisión de abuso antes de exponer el servicio; el proxy no implementa un WAF.
- En producción usar HTTPS, cookie Secure, servidor de sesiones compartido y secretos externos. El origen del backend solo lo configura el operador; nunca se toma de una URL del usuario.
- Node sirve `dist/` únicamente; Vercel usa gateway TypeScript y las rutas declaradas en vercel.json. La configuración de Vercel se entrega para revisión, sin desplegarla ni validar aún el flujo OAuth en ese hosting.
- Los assets del repositorio se reutilizan; verificar derechos de uso antes del lanzamiento.

## Datos y privacidad

No se guarda identidad, saldo o token OAuth en localStorage/sessionStorage. No se integran analytics. Los datos de cuenta se muestran en memoria de la pestaña y se vuelven a consultar en cada actualización. Los endpoints privados del proxy llevan `Cache-Control: no-store`. El texto de privacidad del sitio anterior está archivado; se debe revisar y publicar una política adaptada al operador real antes de producción.
