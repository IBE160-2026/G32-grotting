import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  exampleFile,
  failure,
  openForm,
  PHONE,
  SUBMIT,
  seriousFindings,
} from "./support/application";

// The default server (Test mode), where rewording is on since Story 5.4, shows
// the suggestions of the Cached Gaps of the Example pair. The seventh server
// (playwright.config.ts) switches it off (FEATURE_REWORDING=false). Everything
// comes from the Cached Gaps or from a stub in the browser; nothing reaches a
// provider.
const REWORDING_OFF = "http://localhost:3106";
const GAPS_ROUTE = "**/api/analyses/*/gaps";

const HEADING = "Omformuleringsforslag";
const HEDGE = "Linjen din dekker trolig dette – vurder å ta det med.";
const NONE =
  "Ingen forslag her. Vurder selv om og hvordan du vil formulere det.";
const PROGRESS =
  "Skriver gapanalyse, omformuleringer og søknadsbrev … dette tar under ett minutt.";
const SOURCE = "Sitert ordrett fra CV-en din · sjekket mot CV-teksten";
const BLOCKED = "Kopier med Ctrl+C, eller hold inne på mobil.";

type CachedGap = {
  keyword: string;
  kind: "real" | "rewordable";
  citation: string | null;
  suggestion: string | null;
};
const CACHED = (
  JSON.parse(exampleFile("cached/gaps.json")) as { data: { gaps: CachedGap[] } }
).data.gaps;
const REWORDABLE = CACHED.filter(
  (gap) => gap.kind === "rewordable" && gap.suggestion !== null,
);

const gapsSection = (page: Page) =>
  page.locator("section[aria-labelledby=gaps-h2]");
const gapItems = (page: Page) => gapsSection(page).locator("li");
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const gapItem = (page: Page, keyword: string) =>
  gapItems(page).filter({
    has: page.getByRole("heading", {
      level: 3,
      name: new RegExp(
        `^${escapeRegExp(keyword)} (Reelt gap|Omformulerbart gap)$`,
      ),
    }),
  });
const copyButton = (item: Locator) =>
  item.getByRole("button", { name: /^Kopier/ });

async function submitExample(page: Page) {
  await openForm(page);
  await page.getByRole("button", { name: "Bruk eksempelet" }).click();
  await page.getByRole("button", { name: SUBMIT }).click();
}

// The Rewordable gaps of the Cached Gaps that the Missing list on screen shows.
async function shownRewordable(page: Page) {
  await expect(gapItems(page).first()).toBeVisible();
  const shown: CachedGap[] = [];
  for (const gap of REWORDABLE) {
    if ((await gapItem(page, gap.keyword).count()) > 0) shown.push(gap);
  }
  expect(shown.length).toBeGreaterThan(1);
  return shown;
}

// The Gaps response of the server, with the suggestion of one Gap discarded.
async function discard(page: Page, keyword: string) {
  await page.route(GAPS_ROUTE, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    for (const gap of body.data.gaps) {
      if (gap.keyword === keyword) gap.suggestion = null;
    }
    await route.fulfill({ response, json: body });
  });
}

test.describe("FR-16 the suggestion box, rewording on by default", () => {
  test("a Rewordable gap shows the citation, then a raised box with the suggestion and «Kopier», then the hedge, and nothing adds it to the CV", async ({
    page,
  }) => {
    await submitExample(page);
    for (const gap of await shownRewordable(page)) {
      const item = gapItem(page, gap.keyword);
      await expect(item).toHaveCount(1);
      await expect(
        item.getByRole("heading", { level: 4, name: HEADING }),
      ).toBeVisible();
      const shown = (await item.textContent()) ?? "";
      const at = [SOURCE, HEADING, gap.suggestion ?? "", HEDGE].map((part) =>
        shown.toLowerCase().indexOf(part.toLowerCase()),
      );
      expect(at.every((index) => index >= 0)).toBe(true);
      expect(at).toEqual([...at].sort((a, b) => a - b));
      await expect(item.locator("blockquote")).toContainText(
        gap.citation ?? "",
      );
      // One button, «Kopier», and no action that adds the line to the CV.
      await expect(item.getByRole("button")).toHaveCount(1);
      await expect(copyButton(item)).toHaveText("Kopier");
      await expect(item).not.toContainText(NONE);
    }
    await expect(
      gapsSection(page).getByRole("button", { name: /legg til|CV/i }),
    ).toHaveCount(0);
    await expect(
      gapsSection(page).getByRole("link", { name: /legg til/i }),
    ).toHaveCount(0);
  });

  test("a Real gap has no box and no «Ingen forslag her»", async ({ page }) => {
    await submitExample(page);
    const rewordable = await shownRewordable(page);
    await expect(
      gapsSection(page).getByRole("heading", { level: 4, name: HEADING }),
    ).toHaveCount(rewordable.length);
    for (const gap of CACHED.filter((entry) => entry.kind === "real")) {
      const item = gapItem(page, gap.keyword);
      if ((await item.count()) === 0) continue;
      await expect(item.getByRole("button")).toHaveCount(0);
      await expect(item).not.toContainText(HEADING);
      await expect(item).not.toContainText(NONE);
    }
  });

  test("the progress line names the rewordings", async ({ page }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(GAPS_ROUTE, async (route) => {
      await held;
      await route.continue();
    });
    await submitExample(page);
    await expect(page.getByText(PROGRESS)).toBeVisible();
    release();
    await expect(page.getByText(PROGRESS)).toHaveCount(0);
    await expect(gapItems(page).first()).toBeVisible();
  });

  test("speaks the phase-1 line, then the one phase-2 line", async ({
    page,
  }) => {
    await openForm(page);
    await page.evaluate(() => {
      const spoken: string[] = [];
      (window as unknown as { spoken: string[] }).spoken = spoken;
      const region = document.getElementById("live-phase");
      if (region === null) throw new Error("no live region");
      new MutationObserver(() => {
        const text = region.textContent ?? "";
        if (text !== "" && spoken.at(-1) !== text) spoken.push(text);
      }).observe(region, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("#live-phase")).toHaveText(
      "Gapanalysen og søknadsbrevet er klare.",
    );
    await page.waitForTimeout(500);
    const lines = await page.evaluate(
      () => (window as unknown as { spoken: string[] }).spoken,
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Gapanalysen og søknadsbrevet er klare.");
    // The suggestions and the progress line are not spoken in that region.
    expect(lines.join(" ")).not.toContain(HEADING);
    expect(lines.join(" ")).not.toContain("omformuleringer");
  });

  test("a discarded suggestion is replaced by «Ingen forslag her …», and the citation stays", async ({
    page,
  }) => {
    await submitExample(page);
    const [first, second] = await shownRewordable(page);
    if (first === undefined || second === undefined) {
      throw new Error("the Example pair needs two Rewordable gaps");
    }
    await page.getByRole("button", { name: "Endre annonsen" }).click();
    await discard(page, first.keyword);
    await page.getByRole("button", { name: SUBMIT }).click();
    await shownRewordable(page);

    const dropped = gapItem(page, first.keyword);
    await expect(dropped).toContainText(NONE);
    await expect(dropped).not.toContainText(HEADING);
    await expect(dropped.getByRole("button")).toHaveCount(0);
    await expect(dropped.locator("blockquote")).toContainText(
      first.citation ?? "",
    );
    await expect(dropped).toContainText(HEDGE);
    // The other Gaps keep their boxes.
    const kept = gapItem(page, second.keyword);
    await expect(kept).toContainText(HEADING);
    await expect(kept).not.toContainText(NONE);
  });

  test("a failing Gaps request keeps the score and the Letter, with no suggestion", async ({
    page,
  }) => {
    await page.route(GAPS_ROUTE, (route) =>
      route.fulfill({ json: failure("AI_TIMEOUT", true) }),
    );
    await submitExample(page);
    await expect(page.locator("article")).toBeVisible();
    await expect(
      gapsSection(page).getByText(
        "Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.",
      ),
    ).toBeVisible();
    await expect(page.getByText(HEADING)).toHaveCount(0);
    await expect(page.getByText(/ % samsvar – /)).toBeVisible();
  });

  test("has no serious axe finding with the boxes shown, also on a phone", async ({
    page,
  }) => {
    await submitExample(page);
    await shownRewordable(page);
    await expect(page.locator("article")).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
    await page.setViewportSize(PHONE);
    expect(await seriousFindings(page)).toEqual([]);
  });
});

test.describe("FR-16 «Kopier» in a suggestion box", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("copies only the suggestion's plain text, with the Letter's feedback, and focus stays", async ({
    page,
  }) => {
    await submitExample(page);
    const [gap] = await shownRewordable(page);
    if (gap === undefined) throw new Error("no Rewordable gap");
    const item = gapItem(page, gap.keyword);
    const button = copyButton(item);
    await button.click();
    await expect(button).toHaveText("Kopiert");
    await expect(page.locator("#live-action")).toHaveText(
      "Kopiert til utklippstavlen.",
    );
    await expect(button).toBeFocused();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(gap.suggestion);
    await expect(button).toHaveText("Kopier", { timeout: 4000 });
    await expect(button).toBeFocused();
  });

  test("«Kopiert» is held for 1.8 s and no longer", async ({ page }) => {
    await submitExample(page);
    const [gap] = await shownRewordable(page);
    if (gap === undefined) throw new Error("no Rewordable gap");
    await page.clock.install();
    const button = copyButton(gapItem(page, gap.keyword));
    await button.click();
    await expect(button).toHaveText("Kopiert");
    await page.clock.runFor(1700);
    await expect(button).toHaveText("Kopiert");
    await page.clock.runFor(200);
    await expect(button).toHaveText("Kopier");
  });
});

test.describe("FR-16 «Kopier» with the clipboard blocked", () => {
  test("selects the suggestion and shows the Ctrl+C notice", async ({
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
    await submitExample(page);
    const [gap] = await shownRewordable(page);
    if (gap === undefined) throw new Error("no Rewordable gap");
    const item = gapItem(page, gap.keyword);
    await copyButton(item).click();
    await expect(item.getByText(BLOCKED)).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(BLOCKED);
    const selected = await page.evaluate(
      () => window.getSelection()?.toString() ?? "",
    );
    expect(selected.trim()).toBe(gap.suggestion);
  });
});

test.describe("FR-16 rewording switched off with FEATURE_REWORDING=false", () => {
  test.use({ baseURL: REWORDING_OFF });

  test("the Gapanalyse shows no suggestion box, no «Kopier» and no «Ingen forslag her», and the old progress line", async ({
    page,
  }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(GAPS_ROUTE, async (route) => {
      await held;
      await route.continue();
    });
    const response = page.waitForResponse(
      (candidate) =>
        /\/api\/analyses\/[^/]+\/gaps$/.test(candidate.url()) &&
        candidate.request().method() === "POST",
    );
    await submitExample(page);
    await expect(
      page.getByText(
        "Skriver gapanalyse og søknadsbrev … dette tar under ett minutt.",
      ),
    ).toBeVisible();
    await expect(page.getByText(PROGRESS)).toHaveCount(0);
    release();
    await expect(gapItems(page).first()).toBeVisible();
    // The server asks for and returns no suggestion either.
    const body = await (await response).json();
    expect(body.data.gaps.length).toBeGreaterThan(0);
    for (const gap of body.data.gaps) expect(gap.suggestion).toBeNull();
    await expect(page.getByText(HEADING)).toHaveCount(0);
    await expect(page.getByText(NONE)).toHaveCount(0);
    await expect(gapsSection(page).getByRole("button")).toHaveCount(0);
    expect(await seriousFindings(page)).toEqual([]);
  });
});
