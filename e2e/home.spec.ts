import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 800 };

const HEADLINE = "Se hvilke av annonsens ord CV-en din dekker.";
const STANCE = "Viser arbeidet. Finner aldri på.";
const EXAMPLE_LINE =
  "Du kan prøve med eksempelet først. Det krever ingen konto.";

async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error("element has no box");
  return found;
}

test.describe("NFR-11 scaffold", () => {
  test("loads the front page", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await expect(page).toHaveTitle("Hjem – JobAssistant");
  });
});

test.describe("UX-DR33 Hjem before S6", () => {
  test("shows the headline, lede, outputs, stance and example line", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    await page.goto("/");
    const main = page.locator("main");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(HEADLINE);
    await expect(main).toContainText("Du får et samsvar du kan etterprøve");

    expect(
      await main.getByRole("heading", { level: 2 }).allTextContents(),
    ).toEqual(["Dette får du for hver annonse", STANCE]);
    expect(
      await main.getByRole("heading", { level: 3 }).allTextContents(),
    ).toEqual([
      "ATS-samsvar",
      "Gapanalyse med omformuleringer",
      "Utkast til søknadsbrev",
    ]);
    await expect(main.locator("ol > li")).toHaveCount(3);
    await expect(main.locator("section ul > li")).toHaveCount(3);

    const example = main.getByText(EXAMPLE_LINE);
    await expect(example).toBeVisible();
    await expect(example.locator("a, button")).toHaveCount(0);
  });

  test("reads headline, lede, button, example line, outputs, stance", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    await page.goto("/");
    const ys = [
      (await box(page.getByRole("heading", { level: 1 }))).y,
      (await box(page.getByText("Lim inn CV-en din"))).y,
      (await box(page.getByRole("link", { name: "Lag skreddersydd søknad" })))
        .y,
      (await box(page.getByText(EXAMPLE_LINE))).y,
      (await box(page.getByRole("heading", { level: 2 }).first())).y,
      (await box(page.getByRole("heading", { level: 2 }).last())).y,
    ];
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(ys.length);
  });

  test("keeps the hero text to the reading measure and the stance in two columns", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    await page.goto("/");
    const lede = await box(page.getByText("Lim inn CV-en din"));
    // The div that holds the h1 carries max-w-measure (62ch).
    const measure = await page
      .getByRole("heading", { level: 1 })
      .locator("xpath=..")
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).maxWidth));
    expect(measure).toBeLessThan(700);
    expect(lede.width).toBeLessThanOrEqual(measure);
    const heading = await box(page.getByRole("heading", { name: STANCE }));
    const point = await box(page.getByText("Samsvaret er et anslag"));
    expect(point.x).toBeGreaterThan(heading.x + heading.width);
  });

  test("shows no card or placeholder for a deferred feature (D2)", async ({
    page,
  }) => {
    await page.goto("/");
    const text = await page.locator("main").textContent();
    expect(text).not.toContain("Vurder CV");
    expect(text).not.toContain("Vurder søknad");
    // The Example ad's pulse plot is the one figure (Story 2.9).
    await expect(page.locator("main figure")).toHaveCount(1);
  });
});

test.describe("UX-DR34 the primary action", () => {
  test("is a real link to Søknad with the amber focus ring", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    await page.goto("/");
    const action = page.getByRole("link", { name: "Lag skreddersydd søknad" });
    await expect(action).toHaveAttribute("href", "/soknad");
    expect(await action.evaluate((el) => el.tagName)).toBe("A");
    expect((await box(action)).height).toBeGreaterThanOrEqual(48);

    // Tab from the skip link, the wordmark and the nav until the button.
    for (let i = 0; i < 10 && !(await action.evaluate(isFocused)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(action).toBeFocused();
    await expect(action).toHaveCSS("outline-style", "solid");
    await expect(action).toHaveCSS("outline-width", "2px");
    await expect(action).toHaveCSS("outline-color", "rgb(236, 171, 63)");
    await expect(action).toHaveCSS("text-decoration-line", "none");
  });

  test("goes to /soknad on Enter", async ({ page }) => {
    await page.goto("/");
    const action = page.getByRole("link", { name: "Lag skreddersydd søknad" });
    await action.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/soknad$/);
  });
});

function isFocused(el: Element) {
  return el === document.activeElement;
}

test.describe("NFR-2 NFR-3 Hjem layout and accessibility", () => {
  test("is one column at 360 px", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");

    const title = await box(page.getByRole("heading", { name: "ATS-samsvar" }));
    const body = await box(page.getByText("Hvor mange av annonsens nøkkelord"));
    expect(body.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(body.x).toBe(title.x);

    const stance = await box(page.getByRole("heading", { name: STANCE }));
    const point = await box(page.getByText("Samsvaret er et anslag"));
    expect(point.y).toBeGreaterThanOrEqual(stance.y + stance.height - 1);
    expect(point.x).toBe(stance.x);
  });

  test("passes axe at 1280 px and 360 px, and does not scroll sideways at 320 px", async ({
    page,
  }) => {
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await page.goto("/");
      expect(await seriousFindings(page)).toEqual([]);
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("FR-8 UX-DR34 the Example ad's pulse plot on Hjem", () => {
  test("draws the Example ad between the action block and the outputs, with no request from the browser", async ({
    page,
  }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith("/api/")) calls.push(pathname);
    });
    await page.setViewportSize(WIDE);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const figure = page.locator("main figure");
    await expect(figure).toHaveCount(1);
    await expect(figure).toHaveAttribute("role", "img");
    await expect(figure.locator("svg")).toHaveAttribute(
      "viewBox",
      /^0 0 620 \d+$/,
    );
    const label = (await figure.getAttribute("aria-label")) ?? "";
    expect(label).toMatch(/^\d+ avsnitt i annonsen tegnet som puls\. /);
    expect(label).toContain("Funnet i CV-en: ");
    expect(label).toContain("Mangler: ");

    await expect(
      figure.locator("svg text", { hasText: "FUNNET" }),
    ).not.toHaveCount(0);
    await expect(
      figure.locator("svg text", { hasText: "MANGLER" }),
    ).not.toHaveCount(0);
    await expect(
      page.getByText("Tykk linje: nøkkelord funnet i CV-en"),
    ).toBeVisible();

    const action = await box(page.getByText(EXAMPLE_LINE));
    const plot = await box(figure);
    const outputs = await box(page.getByRole("heading", { level: 2 }).first());
    expect(plot.y).toBeGreaterThan(action.y + action.height);
    expect(plot.y + plot.height).toBeLessThan(outputs.y);
    expect(calls).toEqual([]);
  });

  test("has no focusable part", async ({ page }) => {
    await page.goto("/");
    const parts = await page
      .locator("main figure")
      .evaluate(
        (el) =>
          el.querySelectorAll("a, button, input, [tabindex], title").length,
      );
    expect(parts).toBe(0);
  });

  test("is compact at 360 px with its figcaption, and does not scroll sideways at 320 px", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/");
    const figure = page.locator("main figure");
    await expect(figure.locator("svg")).toHaveAttribute(
      "viewBox",
      /^0 0 328 \d+$/,
    );
    await expect(figure.locator("figcaption")).toHaveText(
      /^Viser de \d+ av \d+ avsnittene som har nøkkelord\. Tallet til venstre er avsnittet\.$/,
    );
    expect(await figure.getAttribute("aria-label")).toMatch(
      /^\d+ av \d+ avsnitt /,
    );
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/");
    await expect(figure.locator("svg")).toHaveAttribute("viewBox", /^0 0 328 /);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    const svg = await box(figure.locator("svg"));
    expect(svg.x + svg.width).toBeLessThanOrEqual(320);
  });
});
