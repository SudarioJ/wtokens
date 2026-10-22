export const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://cdn.discordapp.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
} as const;

export function backendOrigin(value: string): string {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "BACKEND_URL must be a bare HTTPS origin (HTTP is allowed only on loopback).",
    );
  }
  return url.origin;
}

export function isBackendPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? "";
  if (!/^\/[A-Za-z0-9/_-]*$/.test(pathname)) return false;
  return (
    /^\/v1(?:\/|$)/.test(pathname) ||
    /^\/oauth2\//.test(pathname) ||
    /^\/login\/oauth2\//.test(pathname) ||
    pathname === "/actuator/health"
  );
}
