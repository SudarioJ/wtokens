import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function mockApi(
  page: Page,
  options: { signedIn?: boolean; name?: string; offline?: boolean } = {},
) {
  await page.route("**/actuator/health", (route) =>
    route.fulfill({
      status: options.offline ? 503 : 200,
      json: { status: "UP" },
    }),
  );
  await page.route("**/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const values: Record<string, unknown> = {
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
        { code: "USD", exponent: 2, settlement_enabled: true },
        { code: "PEN", exponent: 2, settlement_enabled: false },
      ],
      "/v1/me": {
        id: "a5ea7f18-b114-4f91-91bf-f3dfba4ef8f4",
        display_name: options.name ?? "Jugador de prueba",
        eligible: false,
        suspended: false,
      },
      "/v1/wallets": [
        { asset: "USD", kind: "AVAILABLE", amount_minor: "12345" },
        { asset: "USD", kind: "RESERVED", amount_minor: "1000" },
      ],
      "/v1/wallets/transactions": [],
      "/v1/matches": [],
    };
    return route.fulfill({
      status: options.offline
        ? 503
        : path === "/v1/me" && !options.signedIn
          ? 401
          : 200,
      json: values[path] ?? {},
    });
  });
}
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Abrir menú" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name, exact: true }).first().click();
}

test("arena has working filters, keyboard dialog and no horizontal overflow", async ({
  page,
}, info) => {
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bienvenido a la arena." }),
  ).toBeVisible();
  await expect(
    page.getByText("Plataforma conectada", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Buscar modalidad" })
    .fill("Realistics");
  await expect(page.locator(".mode-card")).toHaveCount(1);
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "Box Fight", exact: true }).click();
  await expect(page.locator(".mode-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Todos los modos" }).click();
  await page
    .getByRole("button", { name: "Entrar con Discord", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continuar con Discord" }),
  ).toHaveAttribute("href", "/oauth2/authorization/discord");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/arena-${info.project.name}.png`,
    fullPage: true,
  });
});

test("stored fake identities never unlock a wallet", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "wtokens_user_session",
      JSON.stringify({ balance: 999999, username: "Admin", eligible: true }),
    ),
  );
  await page.reload();
  await nav(page, "Billetera");
  await expect(
    page.getByRole("heading", { name: "Tu saldo empieza con tu cuenta." }),
  ).toBeVisible();
  await expect(page.getByText("999999")).toHaveCount(0);
});

test("untrusted display names are text, and financial values come from the API", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, name: "<img src=x onerror=alert(1)>" });
  let dialogOpened = false;
  page.on("dialog", async (dialog) => {
    dialogOpened = true;
    await dialog.dismiss();
  });
  await page.goto("/");
  await nav(page, "Billetera");
  await expect(page.locator(".wallet-summary")).toContainText("123.45");
  expect(dialogOpened).toBe(false);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Depositar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pagos en preparación." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText("Yape");
});

test("offline mode never invents players, balances or success", async ({
  page,
}) => {
  await mockApi(page, { offline: true });
  await page.goto("/");
  await expect(
    page.getByText("Servicio sin conexión", { exact: true }),
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

test("arena and sign-in dialog meet automated WCAG 2 AA checks", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByText("Plataforma conectada", { exact: true }),
  ).toBeVisible();
  const arena = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(arena.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Entrar con Discord", exact: true })
    .click();
  const modal = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(modal.violations).toEqual([]);
});
