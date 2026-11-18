import { expect, type Page, test } from "@playwright/test";
import {
  box,
  EXAMPLE_AD,
  EXAMPLE_MATCHED,
  EXAMPLE_META,
  EXAMPLE_MISSING,
  EXAMPLE_PARAGRAPHS,
  fillExample,
  openForm,
  PHONE,
  SUBMIT,
  WIDE,
} from "./support/application";

test.describe("FR-8 UX-DR22 pulse plot on Søknad", () => {
  async function submitExample(page: Page) {
    await fillExample(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      EXAMPLE_META.employer,
    );
  }

  test("draws the full plot at 1280 px between «Endre annonsen» and the score", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    await submitExample(page);
    const figure = page.locator("main figure[role=img]");
    await expect(figure).toHaveCount(1);
    await expect(figure).toHaveAttribute("role", "img");
    await expect(figure.locator("svg")).toHaveAttribute(
      "viewBox",
      /^0 0 1160 \d+$/,
    );
    await expect(figure.locator("figcaption")).toHaveCount(0);

    // The plot's Matched and Missing terms are the lists below it.
    const label = (await figure.getAttribute("aria-label")) ?? "";
    expect(label.startsWith(`${EXAMPLE_PARAGRAPHS} avsnitt i annonsen`)).toBe(
      true,
    );
    const [found, lacking] = label
      .replace(/^.*Funnet i CV-en: /, "")
      .replace(/\.$/, "")
      .split(". Mangler: ");
    expect(found.split(", ")).toHaveLength(EXAMPLE_MATCHED);
    expect(lacking.split(", ")).toHaveLength(EXAMPLE_MISSING);
    const matchedList = await page
      .locator("#matched-heading + ul h3")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.childNodes[0]?.textContent?.trim()),
      );
    const missingList = await page
      .locator("#missing-heading + ul h3")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.childNodes[0]?.textContent?.trim()),
      );
    expect(found.split(", ")).toEqual(matchedList);
    expect(lacking.split(", ")).toEqual(missingList);

    await expect(
      figure.locator("svg text", { hasText: "FUNNET" }),
    ).not.toHaveCount(0);
    await expect(
      figure.locator("svg text", { hasText: "MANGLER" }),
    ).not.toHaveCount(0);
    await expect(
      page.getByText("Stiplet linje: nøkkelord som mangler"),
    ).toBeVisible();
    await expect(
      page.getByText("Tykk linje: nøkkelord funnet i CV-en"),
    ).toBeVisible();

    const edit = await box(
      page.getByRole("button", { name: "Endre annonsen" }),
    );
    const plot = await box(figure);
    const score = await box(page.getByRole("heading", { level: 2 }).first());
    expect(plot.y).toBeGreaterThan(edit.y + edit.height);
    expect(plot.y + plot.height).toBeLessThan(score.y);
  });

  test("has no focusable part and stays out of the focus order", async ({
    page,
  }) => {
    await submitExample(page);
    const parts = await page
      .locator("main figure[role=img]")
      .evaluate(
        (el) =>
          el.querySelectorAll("a, button, input, [tabindex], title").length,
      );
    expect(parts).toBe(0);
    await page.getByRole("button", { name: "Endre annonsen" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("main figure *:focus")).toHaveCount(0);
  });

  test("draws the compact plot at 360 px with the figcaption and no sideways scroll", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await submitExample(page);
    const figure = page.locator("main figure[role=img]");
    await expect(figure.locator("svg")).toHaveAttribute(
      "viewBox",
      /^0 0 328 \d+$/,
    );
    await expect(figure.locator("figcaption")).toHaveText(
      /^Viser de \d+ av \d+ avsnittene som har nøkkelord\. Tallet til venstre er avsnittet\.$/,
    );
    expect(await figure.getAttribute("aria-label")).toMatch(
      new RegExp(`^\\d+ av ${EXAMPLE_PARAGRAPHS} avsnitt `),
    );
    const svg = await box(figure.locator("svg"));
    expect(svg.width).toBeLessThanOrEqual(328);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("keeps every label's text inside its plate at 1280 px and inside the viewBox at 360 px once the fonts have loaded", async ({
    page,
  }) => {
    const fitting = () =>
      page.evaluate(() => {
        const svg = document.querySelector("main figure[role=img] svg");
        if (!svg) throw new Error("no plot");
        const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number);
        const view = viewBox?.[2] ?? 0;
        const outside: string[] = [];
        let plates = 0;
        let texts = 0;
        for (const group of svg.querySelectorAll("g")) {
          const plate = group.querySelector(":scope > rect.fill-ground");
          for (const text of group.querySelectorAll(":scope > text")) {
            if (!(text instanceof SVGGraphicsElement)) continue;
            const box = text.getBBox();
            texts += 1;
            if (plate) {
              plates += 1;
              const x = Number(plate.getAttribute("x"));
              const width = Number(plate.getAttribute("width"));
              if (box.x < x - 1 || box.x + box.width > x + width + 1) {
                outside.push(
                  `${text.textContent}: ${box.x.toFixed(1)}..${(box.x + box.width).toFixed(1)} vs plate ${x.toFixed(1)}..${(x + width).toFixed(1)}`,
                );
              }
            } else if (box.x + box.width > view) {
              outside.push(
                `${text.textContent}: right edge ${(box.x + box.width).toFixed(1)} > ${view}`,
              );
            }
          }
        }
        return { outside, plates, texts };
      });
    const settle = async () => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
    };

    await page.setViewportSize(WIDE);
    await submitExample(page);
    await expect(page.locator("main figure[role=img] svg")).toHaveAttribute(
      "viewBox",
      /^0 0 1160 /,
    );
    await settle();
    const wide = await fitting();
    expect(wide.plates).toBeGreaterThan(0);
    expect(wide.outside).toEqual([]);

    await page.setViewportSize(PHONE);
    await expect(page.locator("main figure[role=img] svg")).toHaveAttribute(
      "viewBox",
      /^0 0 328 /,
    );
    await settle();
    const phone = await fitting();
    expect(phone.texts).toBeGreaterThan(0);
    expect(phone.outside).toEqual([]);
  });

  test("redraws when the width crosses 640 px", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await submitExample(page);
    const svg = page.locator("main figure[role=img] svg");
    await expect(svg).toHaveAttribute("viewBox", /^0 0 1160 /);
    await page.setViewportSize(PHONE);
    await expect(svg).toHaveAttribute("viewBox", /^0 0 328 /);
    await page.setViewportSize(WIDE);
    await expect(svg).toHaveAttribute("viewBox", /^0 0 1160 /);
  });

  test("shows a flat, hidden plot on the form once the ad has a paragraph, and none before", async ({
    page,
  }) => {
    await openForm(page);
    await expect(page.locator("main div[aria-hidden=true] > svg")).toHaveCount(
      0,
    );
    await page
      .getByLabel("Stillingsannonse")
      .fill("Første avsnitt.\n\nAndre avsnitt.");
    const flat = page.locator("main div[aria-hidden=true] > svg");
    await expect(flat).toHaveCount(1);
    await expect(page.locator("main figure[role=img]")).toHaveCount(0);
    await expect(flat.locator("text")).toHaveCount(0);
    await expect(flat.locator("path.stroke-plot-flat")).toHaveCount(2);
    await page.getByLabel("Stillingsannonse").fill("");
    await expect(page.locator("main div[aria-hidden=true] > svg")).toHaveCount(
      0,
    );
  });

  test("draws the flat plot below the submit button", async ({ page }) => {
    await openForm(page);
    await page.getByLabel("Stillingsannonse").fill(EXAMPLE_AD);
    const submit = await box(page.getByRole("button", { name: SUBMIT }));
    const flat = await box(page.locator("main div[aria-hidden=true] > svg"));
    expect(flat.y).toBeGreaterThan(submit.y + submit.height);
  });
});
