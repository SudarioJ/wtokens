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
      "/v1/platform": {
        discordEnabled: true,
        wageringEnabled: false,
        feeBps: 500,
        maxStakeMinor: "100000",
        rulesVersion: "draft-v1",
      },
      "/v1/game-modes": [
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

test("captain can form a 4v4 team, generate an invitation and close it", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/app");
  await page
    .getByRole("button", { name: "Seleccionar Build Fight", exact: true })
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
  await nav(page, "Rangos");
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
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "10");
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
    page.getByRole("heading", { name: "Arena", exact: true }),
  ).toBeVisible();
  await nav(page, "Volver al sitio");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "JUEGA Y GANA EN $$$" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Arena", exact: true }),
  ).toBeVisible();
});

test("private dashboard keeps filters and its original design after sign-in", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Arena", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".landing")).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "Buscar modalidad" })
    .fill("Realistics");
  await expect(page.locator(".mode-card")).toHaveCount(1);
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "Box Fight", exact: true }).click();
  await expect(page.locator(".mode-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Todos los modos" }).click();
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
    page.getByRole("heading", { name: "Arena", exact: true }),
  ).toBeVisible();
  const panel = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(panel.violations).toEqual([]);
});
