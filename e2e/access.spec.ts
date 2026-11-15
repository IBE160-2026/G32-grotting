import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// The Hosted server from playwright.config.ts (same code as there).
const HOSTED = "http://localhost:3101";
const CODE = "e2e-access-code-0123456789";
const WRONG = "a-wrong-code-of-sixteen+";

test.use({ baseURL: HOSTED });

async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

test.describe("FR-31 the gate on the Hosted version", () => {
  test("redirects a page without the cookie to /tilgang", async ({
    request,
  }) => {
    const response = await request.get("/soknad", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location ?? "", HOSTED).pathname).toBe(
      "/tilgang",
    );
  });

  test("answers an API route without the cookie with 401 ACCESS_REQUIRED", async ({
    request,
  }) => {
    const response = await request.post("/api/cv/extract");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "ACCESS_REQUIRED", retryable: false },
    });
  });

  test("leaves /api/health and static files open", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ ok: true, data: { hosted: true } });
    const icon = await request.get("/favicon.ico", { maxRedirects: 0 });
    expect(icon.status()).toBe(200);
  });
});

test.describe("UX-DR35 Tilgangskode screen", () => {
  test("shows the wordmark only, the text, the field and «Åpne»", async ({
    page,
  }) => {
    await page.goto("/tilgang");
    await expect(page).toHaveTitle("Tilgangskode – JobAssistant");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Tilgangskode",
    );
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Meny" })).toHaveCount(0);
    await expect(page.getByText("Denne nettversjonen")).toBeVisible();
    const field = page.getByLabel("Tilgangskode");
    await expect(field).toHaveAttribute("type", "password");
    await expect(field).toHaveAttribute("autocomplete", "off");
    await expect(page.getByRole("button", { name: "Åpne" })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Hopp til hovedinnholdet" }),
    ).toBeFocused();
  });

  test("shows no «Meny» button and no nav at 360 px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/tilgang");
    await expect(page.getByRole("button", { name: "Meny" })).toHaveCount(0);
    await expect(page.locator("nav")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "JobAssistant" }),
    ).toBeVisible();
  });

  test("keeps and clears field errors by the rules", async ({ page }) => {
    await page.goto("/tilgang");
    const field = page.getByLabel("Tilgangskode");
    // Reaching for «Vis» on an empty field raises no error.
    await page.getByRole("button", { name: "Vis" }).click();
    await expect(
      page.locator("form").getByText("Koden har minst 16 tegn."),
    ).toHaveCount(0);
    // A short code is reported on blur; emptying the field and leaving clears it.
    await field.fill("kort");
    await field.blur();
    await expect(
      page.locator("form").getByText("Koden har minst 16 tegn."),
    ).toBeVisible();
    await field.fill("");
    await field.blur();
    await expect(
      page.locator("form").getByText("Koden har minst 16 tegn."),
    ).toHaveCount(0);
    // A refused code survives blur and goes when the text is edited.
    await field.fill(WRONG);
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(
      page.locator("form").getByText("Feil tilgangskode."),
    ).toBeVisible();
    await field.blur();
    await expect(
      page.locator("form").getByText("Feil tilgangskode."),
    ).toBeVisible();
    await field.fill(`${WRONG}x`);
    await expect(
      page.locator("form").getByText("Feil tilgangskode."),
    ).toHaveCount(0);
  });

  test("speaks a refused code through the live region, also a second time", async ({
    page,
  }) => {
    await page.goto("/tilgang");
    const live = page.locator("#live-action");
    await page.getByLabel("Tilgangskode").fill(WRONG);
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(live).toHaveText("Feil tilgangskode.");
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(live).toHaveText("Feil tilgangskode.");
  });

  test("does not call a server fault a wrong code", async ({ page }) => {
    await page.route("**/api/access", (route) =>
      route.fulfill({
        status: 500,
        json: { ok: false, error: { code: "UNEXPECTED", retryable: false } },
      }),
    );
    await page.goto("/tilgang");
    await page.getByLabel("Tilgangskode").fill(CODE);
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    await expect(
      page.locator("form").getByText("Feil tilgangskode."),
    ).toHaveCount(0);
  });

  test("toggles «Vis» / «Skjul» with aria-pressed at 44 px", async ({
    page,
  }) => {
    await page.goto("/tilgang");
    const toggle = page.getByRole("button", { name: "Vis" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect((await toggle.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await page.getByLabel("Tilgangskode").fill("abc");
    await toggle.click();
    const hide = page.getByRole("button", { name: "Skjul" });
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Tilgangskode")).toHaveAttribute(
      "type",
      "text",
    );
    await expect(page.getByLabel("Tilgangskode")).toHaveValue("abc");
  });

  test("rejects a short code before any request, keeping the text", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/access")) requests.push(r.url());
    });
    await page.goto("/tilgang");
    const field = page.getByLabel("Tilgangskode");
    await field.fill("kort");
    await field.blur();
    await expect(
      page.locator("form").getByText("Koden har minst 16 tegn."),
    ).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("kort");
    expect(requests).toEqual([]);
  });

  test("shows «Feil tilgangskode.» for a wrong code and keeps the text", async ({
    page,
  }) => {
    await page.goto("/tilgang");
    const field = page.getByLabel("Tilgangskode");
    await field.fill(WRONG);
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(
      page.locator("form").getByText("Feil tilgangskode."),
    ).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(WRONG);
    const described = await field.getAttribute("aria-describedby");
    expect(described?.split(" ")).toHaveLength(2);
    await expect(page).toHaveURL(/\/tilgang$/);
  });

  test("shows the network-failure alert and keeps the text", async ({
    page,
  }) => {
    await page.route("**/api/access", (route) => route.abort());
    await page.goto("/tilgang");
    const field = page.getByLabel("Tilgangskode");
    await field.fill(CODE);
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "Fikk ikke kontakt med serveren.",
    );
    await expect(field).toHaveValue(CODE);
  });

  test("opens the app with the correct code and sets a session cookie", async ({
    page,
    context,
  }) => {
    await page.goto("/soknad");
    await expect(page).toHaveURL(/\/tilgang$/);
    await page.getByLabel("Tilgangskode").fill(CODE);
    await page.getByRole("button", { name: "Åpne" }).click();
    await expect(page).toHaveURL(`${HOSTED}/`);
    await expect(page).toHaveTitle("Hjem – JobAssistant");

    const cookie = (await context.cookies()).find(
      (c) => c.name === "ja_access",
    );
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "Lax",
      secure: true,
      expires: -1,
    });
    expect(cookie?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(cookie?.value).not.toContain(CODE);

    const response = await page.goto("/soknad");
    expect(response?.url()).toBe(`${HOSTED}/soknad`);

    // Asked once per browser session: /tilgang with the cookie goes on to Hjem.
    await page.goto("/tilgang");
    await expect(page).toHaveURL(`${HOSTED}/`);
  });

  test("passes axe at 1280 px and 360 px, and does not scroll sideways at 320 px", async ({
    page,
  }) => {
    for (const size of [
      { width: 1280, height: 800 },
      { width: 360, height: 800 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("/tilgang");
      expect(await seriousFindings(page)).toEqual([]);
    }
    await page.getByLabel("Tilgangskode").fill("kort");
    await page.getByRole("button", { name: "Åpne" }).click();
    expect(await seriousFindings(page)).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
