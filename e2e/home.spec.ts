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
    await expect(page.locator("main svg, main figure")).toHaveCount(0);
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
