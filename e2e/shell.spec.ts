import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 800 };

async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

test.describe("UX-DR20 landmarks and skip link", () => {
  test("sets lang, title, one header and one main", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await expect(page).toHaveTitle("Hjem – JobAssistant");
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("main")).toHaveAttribute("id", "hovedinnhold");
    await expect(page.locator("main")).toHaveAttribute("tabindex", "-1");
  });

  test("makes the skip link the first Tab stop and it focuses main", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Hopp til hovedinnholdet" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await expect(skip).toHaveCSS("outline-style", "solid");
    await expect(skip).toHaveCSS("outline-width", "2px");
    await expect(skip).toHaveCSS("outline-offset", "2px");
    await expect(skip).toHaveCSS("outline-color", "rgb(236, 171, 63)");
    await page.keyboard.press("Enter");
    await expect(page.locator("#hovedinnhold")).toBeFocused();
  });

  test("shows the same amber ring on a nav link", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const link = page.getByRole("link", { name: "Hjem", exact: true }).last();
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-width", "2px");
    await expect(link).toHaveCSS("outline-color", "rgb(236, 171, 63)");
  });
});

test.describe("UX-DR19 live regions", () => {
  test("renders two empty polite regions outside main", async ({ page }) => {
    await page.goto("/");
    const regions = page.locator('body > [role="status"][aria-live="polite"]');
    await expect(regions).toHaveCount(2);
    for (const region of await regions.all()) await expect(region).toBeEmpty();
    await expect(page.locator('main [role="status"]')).toHaveCount(0);
  });
});

test.describe("AD-4 RunMode", () => {
  test("sends config only to the client", async ({ request }) => {
    // The props travel inside the escaped RSC payload.
    const html = (await (await request.get("/")).text()).replaceAll("\\", "");
    expect(html).toContain('"testMode":true');
    expect(html).toContain('"hosted":false');
    expect(html).toContain('"keywordFallback":false');
    expect(html).not.toContain("pglite://");
    expect(html).not.toContain("postgres://");
    expect(html).not.toContain("isTestRun");
    expect(html).not.toContain("adapter");
  });
});

test.describe("UX-DR5 app bar", () => {
  test("shows the nav inline on a wide screen with Hjem current", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Hovedmeny" });
    await expect(nav.getByRole("link", { name: "Hjem" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "Søknad" })).not.toHaveAttribute(
      "aria-current",
      /.*/,
    );
    await expect(page.getByRole("button", { name: "Meny" })).toBeHidden();
    const box = await nav.getByRole("link", { name: "Hjem" }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test("scrolls with the page", async ({ page }) => {
    await page.goto("/");
    for (const selector of ["header", "header > div"]) {
      const position = await page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).position);
      expect(position).toBe("static");
    }
  });

  test("collapses behind Meny at 360 px and closes on Esc", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Meny" });
    const nav = page.getByRole("navigation", { name: "Hovedmeny" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(nav).toBeHidden();
    const mainBefore = await page.locator("main").boundingBox();

    await toggle.click();
    const open = page.getByRole("button", { name: "Lukk" });
    await expect(open).toHaveAttribute("aria-expanded", "true");
    await expect(open).toHaveAttribute("aria-controls", /.+/);
    await expect(nav).toBeVisible();
    const row = await nav.getByRole("link", { name: "Søknad" }).boundingBox();
    expect(row?.height).toBeGreaterThanOrEqual(56);
    expect(row?.width).toBeGreaterThan(PHONE.width - 4);
    // In the document flow: the page moved down and starts below the menu.
    const mainAfter = await page.locator("main").boundingBox();
    const menu = await nav.boundingBox();
    expect(mainAfter?.y).toBeGreaterThan(mainBefore?.y ?? 0);
    expect(mainAfter?.y).toBeGreaterThanOrEqual(
      (menu?.y ?? 0) + (menu?.height ?? 0),
    );

    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    const closed = page.getByRole("button", { name: "Meny" });
    await expect(closed).toBeFocused();
    await expect(closed).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("UX-DR5 menu closes on navigation", () => {
  test("a history step closes the open menu", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");
    await page.getByRole("button", { name: "Meny" }).click();
    await page
      .getByRole("navigation", { name: "Hovedmeny" })
      .getByRole("link", { name: "Søknad" })
      .click();
    await expect(page).toHaveURL(/\/soknad$/);
    await expect(page.getByRole("button", { name: "Meny" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await page.getByRole("button", { name: "Meny" }).click();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Meny" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

test.describe("FR-19 Ikke funnet", () => {
  test("answers 404 with the heading, sentence and link", async ({ page }) => {
    const response = await page.goto("/finnes-ikke");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Fant ikke siden – JobAssistant");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Fant ikke siden",
    );
    await expect(
      page.getByText("Den finnes ikke, eller du har ikke tilgang til den."),
    ).toBeVisible();
    const home = page.getByRole("link", { name: "Til Hjem" });
    await expect(home).toHaveAttribute("href", "/");
    await expect(home).toHaveCSS("text-decoration-line", "underline");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Error");
  });
});

test.describe("UX-DR1 look", () => {
  test("applies the dark theme and the three fonts", async ({ page }) => {
    await page.goto("/");
    const facts = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      const wordmark = getComputedStyle(
        document.querySelector("header a") as Element,
      );
      return {
        scheme: html.colorScheme,
        ground: body.backgroundColor,
        font: body.fontFamily,
        wordmarkFont: wordmark.fontFamily,
        wordmarkCase: wordmark.textTransform,
      };
    });
    expect(facts.scheme).toBe("dark");
    expect(facts.ground).toBe("rgb(28, 20, 15)");
    expect(facts.font).toContain("Schibsted");
    expect(facts.wordmarkFont).toContain("Archivo");
    expect(facts.wordmarkCase).toBe("uppercase");
  });

  test("turns transitions off under reduced motion and keeps them otherwise", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    const toggleDuration = async () =>
      page
        .getByRole("button", { name: "Meny" })
        .evaluate((el) => getComputedStyle(el).transitionDuration);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    expect(await toggleDuration()).toBe("0.16s");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await toggleDuration()).toBe("0s");
    const behavior = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(behavior).toBe("auto");
  });

  test("never scrolls sideways at 320 px, menu open or not", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const overflow = () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
    await page.goto("/");
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Meny" }).click();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.goto("/finnes-ikke");
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});

test.describe("NFR-2 axe", () => {
  for (const [name, path] of [
    ["Hjem", "/"],
    ["Ikke funnet", "/finnes-ikke"],
  ] as const) {
    for (const [width, size] of [
      ["1280 px", WIDE],
      ["360 px", PHONE],
    ] as const) {
      test(`${name} has no serious findings at ${width}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.goto(path);
        expect(await seriousFindings(page)).toEqual([]);
      });
    }
  }

  test("the open mobile menu has no serious findings", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");
    await page.getByRole("button", { name: "Meny" }).click();
    expect(await seriousFindings(page)).toEqual([]);
  });
});
