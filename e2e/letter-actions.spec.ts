import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import {
  EXAMPLE_META,
  failure,
  LETTER_ROUTE,
  letterCalls,
  openForm,
  PHONE,
  SUBMIT,
  seriousFindings,
  shownLetter,
  type ToneName,
  toneRadio,
} from "./support/application";

const article = (page: Page) => page.locator("article");
const copyButton = (page: Page) =>
  page.getByRole("button", { name: /^Kopier/ });
const regenerateButton = (page: Page) =>
  page.getByRole("button", { name: "Lag nytt utkast" });
const downloadButton = (page: Page) =>
  page.getByRole("button", { name: "Last ned (.docx)" });
const NEW_DRAFT = "Skriver et nytt utkast …";
const NEW_DRAFT_FAILED =
  "Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.";

async function openLetter(page: Page, tone?: ToneName) {
  await openForm(page);
  await page.getByRole("button", { name: "Bruk eksempelet" }).click();
  if (tone !== undefined) await toneRadio(page, tone).check();
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(article(page)).toBeVisible();
}

// The first Letter request goes through at once; the next is held until
// `release()`, then goes on to the server.
async function holdSecond(page: Page) {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = true;
  await page.route(LETTER_ROUTE, async (route) => {
    if (first) {
      first = false;
      await route.continue();
      return;
    }
    await held;
    await route.continue();
  });
  return release;
}

test.describe("FR-12 «Kopier»", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("copies the plain text with the sign-off rendered, shows «Kopiert» for 1.8 s and keeps focus on the button", async ({
    page,
  }) => {
    await openLetter(page, "Personlig");
    const button = copyButton(page);
    await expect(button).toHaveText("Kopier");
    await button.click();
    await expect(button).toHaveText("Kopiert");
    await expect(page.locator("#live-action")).toHaveText(
      "Kopiert til utklippstavlen.",
    );
    await expect(button).toBeFocused();

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.replace(/\r\n?/g, "\n")).toBe(shownLetter("Personlig"));
    expect(copied).toContain("[Navnet ditt]");
    expect(copied).not.toContain("SIGNATUR");

    await expect(button).toHaveText("Kopier", { timeout: 4000 });
    await expect(button).toBeFocused();
  });

  test("«Kopiert» is held for 1.8 s and no longer", async ({ page }) => {
    await openLetter(page);
    await page.clock.install();
    const button = copyButton(page);
    await button.click();
    await expect(button).toHaveText("Kopiert");
    await page.clock.runFor(1700);
    await expect(button).toHaveText("Kopiert");
    await page.clock.runFor(200);
    await expect(button).toHaveText("Kopier");
  });

  test("a blocked clipboard selects the Letter and shows the Ctrl+C notice", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => Promise.reject(new DOMException("blocked")),
        },
      });
    });
    await openLetter(page);
    await copyButton(page).click();
    await expect(
      page.locator("main p", {
        hasText: "Kopier med Ctrl+C, eller hold inne på mobil.",
      }),
    ).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(
      "Kopier med Ctrl+C, eller hold inne på mobil.",
    );
    const selected = await page.evaluate(
      () => window.getSelection()?.toString() ?? "",
    );
    const firstParagraph = shownLetter("Formell").split(/\n{2,}/)[0] ?? "";
    expect(firstParagraph).not.toBe("");
    expect(selected.replace(/\s+/g, " ")).toContain(
      firstParagraph.replace(/\s+/g, " "),
    );
    await expect(copyButton(page)).toHaveText("Kopier");
  });
});

test.describe("FR-12 «Last ned (.docx)»", () => {
  test("downloads a Word file under an ASCII name built from the rendered Letter", async ({
    page,
  }) => {
    await openLetter(page, "Direkte");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      downloadButton(page).click(),
    ]);
    const name = download.suggestedFilename();
    expect(name).toMatch(/^soknadsbrev-[a-z0-9-]+-\d{4}\.docx$/);
    expect(name).toContain(`-${new Date().getFullYear()}.docx`);
    expect(name).toContain(
      EXAMPLE_META.employer
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );

    const path = await download.path();
    const files = unzipSync(new Uint8Array(readFileSync(path)));
    const xml = strFromU8(files["word/document.xml"] ?? new Uint8Array());
    const first = (shownLetter("Direkte").split(/\n{2,}/)[0] ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    expect(first).not.toBe("");
    expect(xml).toContain(first);
    expect(xml).toContain("[Navnet ditt]");
    expect(xml).not.toContain("SIGNATUR");
  });
});

test.describe("FR-12 a download that cannot be made", () => {
  test("shows the alert, announces it and leaves the button usable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      URL.createObjectURL = () => {
        throw new Error("no object URL");
      };
    });
    await openLetter(page);
    await downloadButton(page).click();
    const message =
      "Filen kunne ikke lages. Kopier brevet i stedet, og lim det inn i ditt eget program.";
    await expect(
      page.locator("section[aria-labelledby=letter-h2]").getByRole("alert"),
    ).toContainText(message);
    await expect(page.locator("#live-action")).toHaveText(message);
    await expect(downloadButton(page)).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(article(page)).toBeVisible();
  });
});

test.describe("FR-12, FR-10, UX-DR39 «Lag nytt utkast»", () => {
  test("ANALYSIS_STALE on a new draft reruns phase 1 once and the new Letter arrives", async ({
    page,
  }) => {
    const calls = letterCalls(page);
    let stale = false;
    await page.route(LETTER_ROUTE, async (route) => {
      if (stale) {
        stale = false;
        await route.fulfill({ json: failure("ANALYSIS_STALE") });
        return;
      }
      await route.continue();
    });
    await openLetter(page, "Direkte");
    const before = (await article(page).textContent()) ?? "";
    stale = true;
    await regenerateButton(page).click();
    await expect(page.locator("#live-action")).toHaveText(
      "Det nye utkastet er klart.",
    );
    await expect(article(page)).toHaveText(before);
    await expect(
      page.locator("section[aria-labelledby=letter-h2]").getByRole("alert"),
    ).toHaveCount(0);
    expect(calls.map((call) => call.previousRev ?? 0)).toEqual([0, 1, 1]);
  });

  test("is busy, keeps the old Letter, shows the progress line, then replaces it with the Cached Letter of the same Tone", async ({
    page,
  }) => {
    const calls = letterCalls(page);
    const release = await holdSecond(page);
    await openLetter(page, "Direkte");
    const before = (await article(page).textContent()) ?? "";
    const button = regenerateButton(page);
    await button.click();

    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText(NEW_DRAFT)).toBeVisible();
    await expect(article(page)).toHaveText(before);
    // A second press while it runs sends nothing.
    await button.click({ force: true });

    release();
    await expect(page.locator("#live-action")).toHaveText(
      "Det nye utkastet er klart.",
    );
    await expect(page.getByText(NEW_DRAFT)).toHaveCount(0);
    await expect(button).not.toHaveAttribute("aria-disabled", "true");
    // Test mode: the Cached Letter for the Tone again, and the Tone is kept.
    await expect(article(page)).toHaveText(before);
    await expect(page.locator("dl")).toContainText("Direkte");
    expect(calls.map((call) => call.tone)).toEqual(["Direkte", "Direkte"]);
    expect(calls.map((call) => call.previousRev ?? 0)).toEqual([0, 1]);
  });

  test("on failure keeps the old Letter with an alert and «Prøv igjen», and the retry succeeds", async ({
    page,
  }) => {
    const calls = letterCalls(page);
    let failNext = false;
    await page.route(LETTER_ROUTE, async (route) => {
      if (failNext) {
        failNext = false;
        await route.fulfill({
          status: 502,
          json: failure("AI_PROVIDER_ERROR", true),
        });
        return;
      }
      await route.continue();
    });
    await openLetter(page, "Personlig");
    const before = (await article(page).textContent()) ?? "";
    failNext = true;
    await regenerateButton(page).click();

    await expect(
      page.locator("section[aria-labelledby=letter-h2]").getByRole("alert"),
    ).toContainText(NEW_DRAFT_FAILED);
    await expect(page.locator("#live-action")).toHaveText(NEW_DRAFT_FAILED);
    await expect(article(page)).toHaveText(before);
    await expect(page.getByText(NEW_DRAFT)).toHaveCount(0);

    await page.getByRole("button", { name: "Prøv igjen" }).click();
    await expect(page.locator("#live-action")).toHaveText(
      "Det nye utkastet er klart.",
    );
    await expect(
      page.locator("section[aria-labelledby=letter-h2]").getByRole("alert"),
    ).toHaveCount(0);
    await expect(regenerateButton(page)).toBeFocused();
    await expect(article(page)).toHaveText(before);
    expect(calls.map((call) => call.tone)).toEqual([
      "Personlig",
      "Personlig",
      "Personlig",
    ]);
    expect(calls.map((call) => call.previousRev ?? 0)).toEqual([0, 1, 1]);
  });

  test("«Endre annonsen» while a new draft is written drops it", async ({
    page,
  }) => {
    const release = await holdSecond(page);
    await openLetter(page);
    await regenerateButton(page).click();
    await expect(page.getByText(NEW_DRAFT)).toBeVisible();
    await page.getByRole("button", { name: "Endre annonsen" }).click();
    await expect(page.getByRole("button", { name: SUBMIT })).toBeVisible();
    release();
    await page.waitForTimeout(500);
    await expect(article(page)).toHaveCount(0);
    await expect(page.getByText(NEW_DRAFT)).toHaveCount(0);
  });
});

test.describe("UX-DR28 the actions at 640 px or less", () => {
  test("go full width under the Letter and have no serious axe finding", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await openLetter(page);
    const letterBox = await article(page).boundingBox();
    if (letterBox === null) throw new Error("no Letter");
    for (const button of [
      copyButton(page),
      downloadButton(page),
      regenerateButton(page),
    ]) {
      const box = await button.boundingBox();
      if (box === null) throw new Error("no button");
      expect(box.y).toBeGreaterThan(letterBox.y + letterBox.height);
      expect(Math.abs(box.width - letterBox.width)).toBeLessThan(2);
    }
    expect(await seriousFindings(page)).toEqual([]);
  });

  test("have no serious axe finding on a wide screen", async ({ page }) => {
    await openLetter(page);
    await expect(regenerateButton(page)).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
  });
});
