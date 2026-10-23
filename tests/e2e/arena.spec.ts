import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Team } from "../../src/lib/contracts";

async function mockApi(
  page: Page,
  options: {
    signedIn?: boolean;
    name?: string;
    offline?: boolean;
    avatar?: string;
  } = {},
) {
  let signedIn = options.signedIn ?? false;
  let team: Team | null = null;
  await page.route("**/actuator/health", (route) =>
    route.fulfill({
      status: options.offline ? 503 : 200,
      json: { status: "UP" },
    }),
  );
  await page.route("**/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/teams" && route.request().method() === "POST") {
      const { mode, size } = route.request().postDataJSON();
      team = {
        id: "9585cba1-c01d-4b3b-acb9-3e825f93c977",
        captainId: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
        mode,
        size,
        members: [
          {
            id: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
            name: "Jugador de prueba",
            level: 1,
            points: 0,
          },
        ],
        level: 1,
        points: 0,
        complete: size === 1,
      };
      return route.fulfill({ json: { team } });
    }
    if (path === "/v1/teams/invitation")
      return route.fulfill({
        json: {
          team,
          inviteCode: "a".repeat(64),
          expiresAt: "2026-10-23T12:00:00Z",
        },
      });
    if (path === "/v1/teams/disband") {
      team = null;
      return route.fulfill({ json: { team } });
    }
    if (path === "/v1/auth/logout") {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    const values: Record<string, unknown> = {
      "/v1/teams": { team },
      "/v1/arena": { queue: null, duel: null, roomsConfigured: false },
      "/v1/arena/history": { items: [], nextCursor: null },
      "/v1/matches/history": { items: [], nextCursor: null },
      "/v1/platform": {
        discordEnabled: true,
        wageringEnabled: false,
        feeBps: 500,
        maxStakeMinor: "100000",
        rulesVersion: "draft-v1",
      },
      "/v1/game-modes": [
        { code: "ZONE_WARS", name: "Zone Wars 1v1" },
        { code: "BOX_FIGHT", name: "Box Fight 1v1" },
        { code: "BUILD_FIGHT", name: "Build Fight 1v1" },
        { code: "REALISTICS", name: "Realistics 1v1" },
      ],
      "/v1/assets": [
        { code: "PEN", exponent: 2, settlement_enabled: false },
        { code: "ARS", exponent: 2, settlement_enabled: false },
        { code: "CLP", exponent: 0, settlement_enabled: false },
        { code: "BOB", exponent: 2, settlement_enabled: false },
        { code: "PYG", exponent: 0, settlement_enabled: false },
        { code: "UYU", exponent: 2, settlement_enabled: false },
        { code: "BRL", exponent: 2, settlement_enabled: false },
      ],
      "/v1/me": {
        id: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
        display_name: options.name ?? "Jugador de prueba",
        avatar_url: options.avatar ?? null,
        eligible: false,
        suspended: false,
        ranking: {
          tiers: [
            ["Bronce", 0],
            ["Plata", 100],
            ["Oro", 250],
            ["Platino", 450],
            ["Diamante", 700],
            ["Élite", 1000],
            ["Campeón", 1350],
            ["Maestro", 1750],
            ["Gran Maestro", 2200],
            ["Leyenda", 2700],
          ].map(([name, minimumPoints], index) => ({
            level: index + 1,
            name,
            minimumPoints,
          })),
          modes: [
            {
              mode: "BOX_FIGHT",
              name: "Box Fight 1v1",
              points: 0,
              wins: 0,
              losses: 0,
              level: 1,
              placementGamesRemaining: 10,
            },
            {
              mode: "BUILD_FIGHT",
              name: "Build Fight 1v1",
              points: 270,
              wins: 15,
              losses: 5,
              level: 3,
              placementGamesRemaining: 0,
            },
          ],
        },
      },
      "/v1/wallets": [
        { asset: "PEN", kind: "AVAILABLE", amount_minor: "12345" },
        { asset: "PEN", kind: "RESERVED", amount_minor: "1000" },
      ],
      "/v1/wallets/transactions": [],
      "/v1/matches": [],
      "/v1/csrf": { headerName: "X-XSRF-TOKEN", token: "csrf-test-fixture" },
    };
    return route.fulfill({
      status: options.offline
        ? 503
        : path === "/v1/me" && !signedIn
          ? 401
          : 200,
      json: values[path] ?? {},
    });
  });
}
async function nav(page: Page, name: string) {
  await expect(page.locator(".workspace")).toBeVisible();
  const menu = page.getByRole("button", { name: "Abrir menú", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name, exact: true }).first().click();
}

test("history lists all pages and opens a selected match without requiring its ID", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  const first = {
    id: "77d15014-3ebc-4bc8-b80c-a096ad89f8d8",
    mode: "BOX_FIGHT",
    asset: "PEN",
    stakeMinor: "500",
    state: "SETTLED",
    createdAt: "2026-10-22T12:00:00Z",
    opponentName: "Rival uno",
    outcome: "WIN",
  };
  const second = {
    ...first,
    id: "c660777e-b0b7-427f-bc9e-a640b88bdd89",
    state: "CANCELLED",
    opponentName: null,
    outcome: "NONE",
  };
  await page.route("**/v1/matches/history*", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has("cursor")
        ? { items: [second], nextCursor: null }
        : { items: [first], nextCursor: "next-page" },
    }),
  );
  await page.route(`**/v1/matches/${first.id}`, (route) =>
    route.fulfill({
      json: {
        ...first,
        creatorId: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
        opponentId: "2b7a32cf-0cd9-4827-87c0-25162a0ba9de",
        feeBps: 500,
        rulesVersion: "draft-v1",
        winnerId: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
        expiresAt: "2026-10-22T13:00:00Z",
      },
    }),
  );
  await page.goto("/app");
  await nav(page, "Historial");
  await expect(
    page.getByRole("heading", { name: "Historial", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Victoria", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cargar más", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Cancelada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2 partidas cargadas · Historial completo"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cargar más", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: /Ver detalle de Box Fight/ })
    .first()
    .click();
  await expect(page.locator(".match-detail")).toContainText(first.id);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/history-${info.project.name}.png`,
    fullPage: true,
  });
});

test("captain can form a 4v4 team, generate an invitation and close it", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Seleccionar Build Fight", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Jugar en equipo", exact: true })
    .click();
  const panel = page.getByRole("region", { name: "Tu formación", exact: true });
  await expect(
    panel.getByRole("heading", { name: "Crea tu equipo" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("combobox", { name: /Modalidad del equipo/ }),
  ).toHaveValue("BUILD_FIGHT");
  await panel
    .getByRole("combobox", { name: /Modalidad del equipo/ })
    .selectOption("BOX_FIGHT");
  await panel.getByRole("combobox", { name: /Formato/ }).selectOption("4");
  await panel
    .getByRole("button", { name: "Crear equipo", exact: true })
    .click();
  await expect(
    panel.getByText("Box Fight · 4v4", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByRole("listitem")).toHaveCount(4);
  await panel
    .getByRole("button", { name: "Generar código de invitación", exact: true })
    .click();
  await expect(
    panel.getByRole("textbox", {
      name: "Código para tus compañeros",
      exact: true,
    }),
  ).toHaveValue("a".repeat(64));
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await panel.screenshot({
    path: `test-results/teams-${info.project.name}.png`,
  });
  await panel
    .getByRole("button", { name: "Cerrar equipo", exact: true })
    .click();
  await expect(
    panel.getByRole("heading", { name: "Crea tu equipo" }),
  ).toBeVisible();
});

test("ten ranks show server progress independently for each mode", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/app");
  const headerRank = page.locator(".header-rank");
  await expect(headerRank).toContainText("Bronce");
  await expect(headerRank).toContainText("100 pts para Plata");
  await headerRank.click();
  const ranks = page.getByRole("region", { name: "Bronce", exact: true });
  await expect(ranks).toBeVisible();
  await expect(ranks.getByRole("listitem")).toHaveCount(10);
  await expect
    .poll(() =>
      ranks
        .locator("img")
        .evaluateAll(
          (images) =>
            images.length === 11 &&
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
        ),
    )
    .toBe(true);
  await expect(
    page.getByRole("img", { name: "Insignia de Bronce", exact: true }),
  ).toBeVisible();
  await expect(ranks.getByRole("progressbar")).toHaveAttribute("value", "0");
  await page
    .getByRole("combobox", { name: "Modalidad del rango", exact: true })
    .selectOption("BUILD_FIGHT");
  await expect(
    page.getByRole("heading", { name: "Oro", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".rank-panel").getByRole("progressbar"),
  ).toHaveAttribute("value", "10");
  await expect(headerRank).toContainText("Oro");
  await expect(headerRank).toContainText("180 pts para Platino");
  await expect(headerRank.getByRole("progressbar")).toHaveAttribute(
    "value",
    "10",
  );
  await nav(page, "Tokens");
  await expect(headerRank).toContainText("Build Fight");
  await headerRank.click();
  await expect(
    page.getByRole("img", { name: "Insignia de Oro", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Modalidad del rango", exact: true })
    .selectOption("BOX_FIGHT");
  await expect(
    page.getByRole("heading", { name: "Bronce", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/ranks-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .locator(".topbar")
    .screenshot({ path: `test-results/header-rank-${info.project.name}.png` });
  await page
    .locator(".rank-panel")
    .screenshot({ path: `test-results/rank-artwork-${info.project.name}.png` });
});

test("regional currency selection persists between landing, reload and panel", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/");
  const selector = page.getByRole("combobox", { name: "Moneda de consulta" });
  await expect(selector).toHaveValue("PEN");
  expect(
    await selector
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual(["PEN", "ARS", "CLP", "BOB", "PYG", "UYU", "BRL"]);
  await selector.selectOption("BRL");
  await page.reload();
  await expect(selector).toHaveValue("BRL");
  await page.goto("/app");
  await expect(page.locator("#currency")).toHaveValue("BRL");
  await page.locator("#currency").selectOption("PYG");
  await expect(page.locator("#currency")).toHaveValue("PYG");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Discord avatar loads on landing and panel, with initials if the image fails", async ({
  page,
}) => {
  const avatar = "https://cdn.discordapp.com/embed/avatars/2.png";
  await mockApi(page, { signedIn: true, avatar });
  let imageFails = false;
  await page.route("https://cdn.discordapp.com/**", (route) =>
    imageFails
      ? route.fulfill({ status: 404, body: "" })
      : route.fulfill({
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k9sAAAAASUVORK5CYII=",
            "base64",
          ),
        }),
  );
  await page.goto("/");
  await expect(page.locator(".lp-avatar img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".lp-avatar img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.goto("/app");
  await expect(page.locator(".profile-button img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".profile-button img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  imageFails = true;
  await page.reload();
  await expect(page.locator(".profile-button img")).toHaveCount(0);
  await expect(page.locator(".profile-button .avatar")).toHaveText("JU");
});

test("public landing preserves the original hero and a working carousel", async ({
  page,
}, info) => {
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "JUEGA Y GANA EN $$$" }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.locator(".wallet-card")).toHaveCount(0);
  await expect(page.locator(".lp-slide-center")).toContainText("BOX FIGHT");
  await page
    .getByRole("button", { name: "Siguiente modalidad", exact: true })
    .click();
  await expect(page.locator(".lp-slide-center")).toContainText("BUILD FIGHT");
  await page
    .getByRole("button", { name: "Mostrar Zone Wars", exact: true })
    .click();
  await expect(page.locator(".lp-slide-center")).toContainText("ZONE WARS");
  await page
    .getByRole("button", { name: "Siguiente modalidad", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".lp-slide-center")).toContainText("REALISTICS");
  await page
    .getByRole("button", { name: "Mostrar Box Fight", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ENTRA. COMPITE. REPITE." }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", {
      name: "EL JUEGO NOS UNE. LA COMPETENCIA NOS MUEVE.",
    }),
  ).toBeAttached();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `test-results/landing-${info.project.name}.png`,
    fullPage: true,
  });
});

test("country flags include Brazil and scroll reveals respect reduced motion", async ({
  page,
}, info) => {
  await mockApi(page);
  await page.goto("/");
  const region = page.locator(".lp-region-section");
  await expect(region).toHaveAttribute("data-reveal", "pending");
  await region.scrollIntoViewIfNeeded();
  await expect(region).toHaveAttribute("data-reveal", "visible");
  await expect(region.locator(".lp-countries img")).toHaveCount(7);
  await expect(region.getByText("Brasil", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      region
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await expect
    .poll(() => region.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
  await region.screenshot({
    path: `test-results/countries-${info.project.name}.png`,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
  await expect(region).toHaveCSS("opacity", "1");
});

test("community renders crisp server channels and a working invitation", async ({
  page,
}, info) => {
  await mockApi(page);
  await page.goto("/");
  const section = page.locator(".lp-community-section");
  const directory = section.getByRole("figure", {
    name: "Canales del servidor WTOKENS",
  });
  await directory.scrollIntoViewIfNeeded();
  await expect(directory.getByRole("listitem")).toHaveCount(13);
  await expect(
    directory.getByText("1v1-buildfight", { exact: true }),
  ).toBeVisible();
  await expect(
    directory.getByText("4v4-mid-realistic", { exact: true }),
  ).toBeVisible();
  await expect(section.locator('img[src*="discord-wtokens"]')).toHaveCount(0);
  await expect(
    directory.getByRole("link", { name: "Ver el servidor" }),
  ).toHaveAttribute("href", "https://discord.gg/GTwH2C2A");
  await expect(section.locator(".lp-channel")).toHaveCount(0);
  await expect(
    section.getByRole("link", { name: "Unirme al Discord" }),
  ).toHaveAttribute("href", "https://discord.gg/GTwH2C2A");
  await expect
    .poll(() =>
      section
        .locator("figure")
        .evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
  await section.screenshot({
    path: `test-results/discord-integrado-${info.project.name}.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("landing FAQ and mobile navigation remain usable", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  const mobileMenu = page.getByRole("button", { name: "Abrir menú del sitio" });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page
    .getByRole("navigation", { name: "Navegación del sitio" })
    .getByRole("link", { name: "AYUDA", exact: true })
    .click();
  const question = page.locator(".lp-faq-list details").first();
  await question.locator("summary").click();
  await expect(question).toHaveAttribute("open", "");
  await expect(question.locator("p")).toBeVisible();
});

test("public play button requests Discord before entering the private panel", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "JUGAR AHORA", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continuar con Discord" }),
  ).toHaveAttribute("href", "/oauth2/authorization/discord");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("signed-in users can move between the public site and private panel", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "JUEGA Y GANA EN $$$" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Jugador de prueba.*Mi panel/ })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Tokens", exact: true }),
  ).toBeVisible();
  await nav(page, "Volver al sitio");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "JUEGA Y GANA EN $$$" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Tokens", exact: true }),
  ).toBeVisible();
});

test("Tokens shows four modes without unnecessary filters after sign-in", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Tokens", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".landing")).toHaveCount(0);
  await expect(page.locator(".mode-card")).toHaveCount(4);
  await expect(
    page.getByRole("searchbox", { name: "Buscar modalidad" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Seleccionar Zone Wars" }),
  ).toBeEnabled();
  await expect(page.locator(".page-tools .connection")).toHaveCount(0);
  await page.locator(".page-footer").scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.locator('[data-reveal="pending"]').count())
    .toBe(0);
  await expect
    .poll(() =>
      page
        .locator(".wallet-card")
        .evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/panel-${info.project.name}.png`,
    fullPage: true,
  });
});

test("direct panel URLs and stored fake identities cannot unlock a wallet", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "wtokens_user_session",
      JSON.stringify({ balance: 999999, username: "Admin", eligible: true }),
    ),
  );
  await page.goto("/app");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.locator(".wallet-summary")).toHaveCount(0);
  await expect(page.getByText("999999")).toHaveCount(0);
});

test("untrusted display names are text and balances still come from the API", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, name: "<img src=x onerror=alert(1)>" });
  let dialogOpened = false;
  page.on("dialog", async (dialog) => {
    dialogOpened = true;
    await dialog.dismiss();
  });
  await page.goto("/app");
  await nav(page, "Billetera");
  await expect(page.locator(".wallet-summary")).toContainText("123.45");
  expect(dialogOpened).toBe(false);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Depositar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pagos en preparación." }),
  ).toBeVisible();
});

test("logging out returns to the public landing and removes private data", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/app");
  await nav(page, "Billetera");
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".wallet-summary")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Entrar con Discord", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "JUEGA Y GANA EN $$$" }),
  ).toBeVisible();
});

test("offline landing stays available and does not invent a session", async ({
  page,
}) => {
  await mockApi(page, { offline: true });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "JUEGA Y GANA EN $$$" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Entrar con Discord", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "El servicio no está conectado.",
  );
  await expect(
    page.getByRole("link", { name: "Continuar con Discord" }),
  ).toHaveCount(0);
});

test("landing, login dialog and private panel pass automated WCAG 2 AA checks", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByText("Plataforma conectada", { exact: true }),
  ).toBeAttached();
  const landing = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(landing.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Entrar con Discord", exact: true })
    .click();
  const modal = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(modal.violations).toEqual([]);
  await page.unroute("**/v1/**");
  await mockApi(page, { signedIn: true });
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Tokens", exact: true }),
  ).toBeVisible();
  const panel = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(panel.violations).toEqual([]);
});

const duelUserId = "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4";
function fixtureDuel() {
  return {
    id: "92938a11-c78b-4fd5-95cf-05b2382d6a33",
    mode: "BOX_FIGHT",
    size: 2,
    asset: "PEN",
    stakeMinor: "0",
    state: "CONFIRMING",
    winnerSide: null,
    rounds: null,
    createdAt: new Date().toISOString(),
    confirmationDeadline: new Date(Date.now() + 120000).toISOString(),
    startedAt: null,
    finishedAt: null,
    reportDeadline: null,
    absentUser: null,
    absenceDeadline: null,
    mapCode: "2355-0939-8965",
    roomStatus: "UNCONFIGURED",
    roomUrl: null,
    players: [
      {
        id: duelUserId,
        name: "Jugador de prueba",
        side: "A",
        captain: true,
        confirmed: false,
        paymentMode: "CAPTAIN",
      },
      {
        id: "9b5a59a0-492b-4635-855d-827bfde02d52",
        name: "Compañero",
        side: "A",
        captain: false,
        confirmed: true,
        paymentMode: "CAPTAIN",
      },
      {
        id: "9b5a59a0-492b-4635-855d-827bfde02d53",
        name: "Capitán rival",
        side: "B",
        captain: true,
        confirmed: true,
        paymentMode: "INDIVIDUAL",
      },
      {
        id: "9b5a59a0-492b-4635-855d-827bfde02d54",
        name: "Rival",
        side: "B",
        captain: false,
        confirmed: true,
        paymentMode: "INDIVIDUAL",
      },
    ],
    reports: [],
    events: [
      {
        type: "MATCH_FOUND",
        detail: "Duelo de prueba encontrado",
        createdAt: new Date().toISOString(),
      },
    ],
  } as import("../../src/lib/arena").Duel;
}

test("team matchmaking searches, confirms everyone, reports rounds and keeps history", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  let currentDuel: ReturnType<typeof fixtureDuel> | null = null;
  let queue: Record<string, unknown> | null = null;
  const duel = fixtureDuel();
  await page.route("**/v1/teams", (route) =>
    route.fulfill({
      json: {
        team: {
          id: "9585cba1-c01d-4b3b-acb9-3e825f93c977",
          captainId: duelUserId,
          mode: "BOX_FIGHT",
          size: 2,
          level: 1,
          points: 0,
          complete: true,
          state: "FORMING",
          members: duel.players
            .slice(0, 2)
            .map((p) => ({ id: p.id, name: p.name, points: 0, level: 1 })),
        },
      },
    }),
  );
  await page.route("**/v1/arena**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/arena/queue") {
      expect(route.request().postDataJSON()).toEqual({
        asset: "PEN",
        stakeMinor: "0",
        paymentMode: "CAPTAIN",
      });
      queue = {
        mode: "BOX_FIGHT",
        size: 2,
        asset: "PEN",
        stakeMinor: "0",
        paymentMode: "CAPTAIN",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      return route.fulfill({
        json: { queue, duel: null, roomsConfigured: false },
      });
    }
    if (path.endsWith("/confirm")) {
      duel.players[0]!.confirmed = true;
      duel.state = "IN_PROGRESS";
      duel.startedAt = new Date().toISOString();
      return route.fulfill({ json: duel });
    }
    if (path.endsWith("/report")) {
      expect(route.request().postDataJSON().rounds).toBe("AAA");
      duel.state = "RESULT_PENDING";
      duel.finishedAt = new Date().toISOString();
      duel.reportDeadline = new Date(Date.now() + 1800000).toISOString();
      duel.reports = [
        {
          captainId: duelUserId,
          rounds: "AAA",
          evidence: null,
          createdAt: new Date().toISOString(),
        },
      ];
      return route.fulfill({ json: duel });
    }
    if (path === "/v1/arena/history")
      return route.fulfill({ json: { items: [duel], nextCursor: null } });
    if (path.includes("/duels/")) return route.fulfill({ json: duel });
    return route.fulfill({
      json: {
        queue,
        duel: duel.state === "COMPLETED" ? null : currentDuel,
        roomsConfigured: false,
      },
    });
  });
  await page.goto("/app");
  await nav(page, "Duelos");
  await page
    .getByLabel("Forma de aporte para el equipo")
    .selectOption("CAPTAIN");
  await page
    .getByRole("button", { name: "Buscar rival de prueba", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Buscando rival", exact: true }),
  ).toBeVisible();
  queue = null;
  currentDuel = duel;
  await page
    .getByRole("button", { name: "Actualizar duelo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tu duelo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar participación", exact: true })
    .click();
  await expect(page.getByText("En juego", { exact: true })).toBeVisible();
  const a = page.getByRole("button", { name: "+ Equipo A", exact: true });
  await a.click();
  await a.click();
  await a.click();
  await expect(a).toBeDisabled();
  await expect(
    page.getByText("Marcador válido. Gana el equipo A.", { exact: true }),
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `test-results/matchmaking-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Enviar resultado definitivo", exact: true })
    .click();
  await expect(
    page.getByText("Esperando reportes", { exact: true }),
  ).toBeVisible();
  duel.state = "COMPLETED";
  duel.winnerSide = "A";
  duel.rounds = "AAA";
  await page
    .getByRole("button", { name: "Actualizar duelo", exact: true })
    .click();
  await expect(page.getByText("Finalizado", { exact: true })).toBeVisible();
  await nav(page, "Historial");
  const history = page.getByRole("region", {
    name: "Duelos de equipo",
    exact: true,
  });
  await history.locator("summary").first().click();
  await expect(
    history.getByText("Resultado: Equipo A 3 — 0 Equipo B. Gana el equipo A.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("moderation requires a reason and records an explicit cancellation", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.route("**/v1/me", (route) =>
    route.fulfill({
      json: {
        id: "d0b715e2-21f3-40b5-b04a-711d7279156b",
        display_name: "Moderador de prueba",
        eligible: false,
        suspended: false,
        moderator: true,
      },
    }),
  );
  const duel = fixtureDuel();
  duel.state = "MODERATION";
  let resolved = false;
  await page.route("**/v1/arena/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/resolve")) {
      const body = route.request().postDataJSON();
      expect(body.cancel).toBe(true);
      expect(body.reason).toContain("Evidencia revisada");
      resolved = true;
      return route.fulfill({ json: { ...duel, state: "CANCELLED" } });
    }
    return route.fulfill({ json: resolved ? [] : [duel] });
  });
  await page.goto("/app");
  await nav(page, "Moderación");
  await page.getByRole("button", { name: /Box Fight · 2v2/ }).click();
  await page.getByLabel("Cancelar sin declarar ganador").check();
  const submit = page.getByRole("button", {
    name: "Registrar resolución definitiva",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await page
    .getByLabel("Motivo de resolución y evidencia revisada")
    .fill("Evidencia revisada: cancelación por incidencia técnica.");
  await submit.click();
  await expect(
    page.getByText("No hay casos pendientes.", { exact: true }),
  ).toBeVisible();
});

test("solo enters 1v1 directly and animated search can pause and cancel", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  let queue: Record<string, unknown> | null = null;
  let teamCreates = 0;
  await page.route("**/v1/teams", (route) => {
    if (route.request().method() === "POST") teamCreates++;
    return route.fulfill({ json: { team: null } });
  });
  await page.route("**/v1/arena**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/v1/arena/solo") {
      expect(route.request().postDataJSON()).toEqual({
        mode: "BUILD_FIGHT",
        asset: "PEN",
      });
      queue = {
        mode: "BUILD_FIGHT",
        size: 1,
        asset: "PEN",
        stakeMinor: "0",
        paymentMode: "INDIVIDUAL",
        createdAt: new Date(Date.now() - 12000).toISOString(),
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
    }
    if (path === "/v1/arena/queue/leave") queue = null;
    return route.fulfill({
      json: { queue, duel: null, roomsConfigured: false },
    });
  });
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Seleccionar Build Fight", exact: true })
    .click();
  await expect(page.getByLabel("Modalidad para 1v1")).toHaveValue(
    "BUILD_FIGHT",
  );
  await page
    .getByRole("button", { name: "Buscar rival 1v1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Buscando tu próximo rival",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Build Fight · 1v1", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Tiempo transcurrido")).toContainText("0:1");
  expect(teamCreates).toBe(0);
  const pause = page.getByRole("button", {
    name: "Pausar animación",
    exact: true,
  });
  await pause.click();
  await expect(page.locator(".match-search-orbit")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  await page
    .getByRole("button", { name: "Reanudar animación", exact: true })
    .click();
  await expect(page.locator(".match-search-orbit")).toHaveCSS(
    "animation-play-state",
    "running",
  );
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `test-results/solo-search-${info.project.name}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".match-search-orbit")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "Pausar animación", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cancelar búsqueda", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Buscar rival 1v1", exact: true }),
  ).toBeVisible();
  expect(teamCreates).toBe(0);
});

test("Equipo offers multiplayer formats and handles an old solo formation without a roster", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.route("**/v1/teams", (route) =>
    route.fulfill({
      json: {
        team: {
          id: "9585cba1-c01d-4b3b-acb9-3e825f93c977",
          captainId: duelUserId,
          mode: "BOX_FIGHT",
          size: 1,
          members: [
            { id: duelUserId, name: "Jugador de prueba", points: 0, level: 1 },
          ],
          level: 1,
          points: 0,
          complete: true,
          state: "FORMING",
        },
      },
    }),
  );
  await page.goto("/app");
  await nav(page, "Equipo");
  const format = page.getByRole("combobox", { name: "Formato", exact: true });
  await expect(format.locator("option")).toHaveText(["2v2", "3v3", "4v4"]);
  await expect(page.locator(".team-roster")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Crea tu equipo", exact: true }),
  ).toBeVisible();
});
