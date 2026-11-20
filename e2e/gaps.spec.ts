import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  analysisCalls,
  EXAMPLE_SENTENCE,
  exampleFile,
  failure,
  LETTER_ROUTE,
  letterCalls,
  openForm,
  PHONE,
  SUBMIT,
  seriousFindings,
} from "./support/application";

// The fifth server: Test mode with FEATURE_GAPS on (playwright.config.ts). The
// Example pair's Cached Gaps are 2 Real and 3 Rewordable.
const GAPS = "http://localhost:3104";
// The default server keeps the Gap analysis off.
const DEFAULT = "http://localhost:3100";
const GAPS_ROUTE = "**/api/analyses/*/gaps";

type CachedGap = {
  keyword: string;
  kind: "real" | "rewordable";
  explanation: string;
  citation: string | null;
};
const CACHED = (
  JSON.parse(exampleFile("cached/gaps.json")) as { data: { gaps: CachedGap[] } }
).data.gaps;

const NO_COPY =
  "Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.";
const HEDGE = "Linjen din dekker trolig dette – vurder å ta det med.";
const FAILED =
  "Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.";
const PROGRESS =
  "Skriver gapanalyse og søknadsbrev … dette tar under ett minutt.";

const gapsSection = (page: Page) =>
  page.locator("section[aria-labelledby=gaps-h2]");
const letterSection = (page: Page) =>
  page.locator("section[aria-labelledby=letter-h2]");
const gapItems = (page: Page) => gapsSection(page).locator("li");
const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The h3 of one Gap: the keyword, then the strip.
const gapHeading = (root: Page | Locator, keyword: string) =>
  root.getByRole("heading", {
    level: 3,
    name: new RegExp(
      `^${escapeRegExp(keyword)} (Reelt gap|Omformulerbart gap)$`,
    ),
  });
const article = (page: Page) => page.locator("article");

// What the Gaps must show for the Missing list on screen: one Gap per Missing
// keyword. A keyword the Cached Gaps cover shows that answer; any other comes
// back as the template Real gap (skipped).
async function expected(page: Page) {
  const entries = page.locator(
    "section[aria-labelledby=missing-heading] li h3",
  );
  await expect(entries.first()).toBeVisible();
  const terms = await entries.evaluateAll((nodes) =>
    nodes.map((node) => node.childNodes[0]?.textContent?.trim() ?? ""),
  );
  const covered = CACHED.filter((gap) =>
    terms.some((term) => term.toLowerCase() === gap.keyword.toLowerCase()),
  );
  return {
    terms,
    total: terms.length,
    rewordable: covered.filter((gap) => gap.kind === "rewordable"),
    real: covered.filter((gap) => gap.kind === "real"),
    skipped: terms.filter(
      (term) =>
        !covered.some(
          (gap) => gap.keyword.toLowerCase() === term.toLowerCase(),
        ),
    ),
  };
}

async function submitExample(page: Page) {
  await openForm(page);
  await page.getByRole("button", { name: "Bruk eksempelet" }).click();
  await page.getByRole("button", { name: SUBMIT }).click();
}

// The requests to the Gaps route, with their bodies.
function gapsCalls(page: Page) {
  const calls: { fingerprint: string; applicationId: string }[] = [];
  page.on("request", (request) => {
    if (/\/api\/analyses\/[^/]+\/gaps$/.test(new URL(request.url()).pathname)) {
      calls.push(request.postDataJSON());
    }
  });
  return calls;
}

// A request is held until `release()`, then goes on to the server.
async function hold(page: Page, route: string) {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(route, async (handler) => {
    await held;
    await handler.continue();
  });
  return release;
}

// Every distinct text the first live region shows, in order.
async function recordPhaseRegion(page: Page) {
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
}

const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { spoken: string[] }).spoken);

test.describe("Story 4.4 with the flag on", () => {
  test.use({ baseURL: GAPS });

  test("phase 2 sends both requests in parallel, with one progress line and two placeholders", async ({
    page,
  }) => {
    const gaps = gapsCalls(page);
    const letters = letterCalls(page);
    const releaseGaps = await hold(page, GAPS_ROUTE);
    const releaseLetter = await hold(page, LETTER_ROUTE);
    await submitExample(page);
    const { total } = await expected(page);

    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      /Gapanalysen og søknadsbrevet skrives nå\.$/,
    );
    // Both requests are out before either has an answer.
    await expect.poll(() => gaps.length).toBe(1);
    await expect.poll(() => letters.length).toBe(1);
    // One line for both sections: plain text, not a live region.
    await expect(page.getByText(PROGRESS)).toHaveCount(1);
    await expect(page.getByText("Skriver søknadsbrevet …")).toHaveCount(0);
    const busy = page.locator("section[aria-busy=true]");
    await expect(busy).toHaveCount(2);
    await expect(
      busy.getByRole("heading", { level: 2, name: "Gapanalyse" }),
    ).toBeVisible();
    await expect(
      busy.getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
    expect(gaps[0]?.fingerprint).toMatch(/\S/);

    releaseGaps();
    releaseLetter();
    await expect(article(page)).toBeVisible();
    await expect(gapItems(page)).toHaveCount(total);
    await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
    await expect(page.getByText(PROGRESS)).toHaveCount(0);
  });

  test("shows each Gap with its strip, citation, hedge and no-copy note", async ({
    page,
  }) => {
    await submitExample(page);
    const { total, real, rewordable, skipped } = await expected(page);
    const section = gapsSection(page);
    await expect(
      section.getByRole("heading", { level: 2, name: "Gapanalyse" }),
    ).toBeVisible();
    await expect(gapItems(page)).toHaveCount(total);
    await expect(section.getByText("Skrevet med KI")).toHaveCount(1);
    await expect(section.getByText("Omformulerbart gap")).toHaveCount(
      rewordable.length,
    );
    await expect(section.getByText("Reelt gap", { exact: true })).toHaveCount(
      real.length + skipped.length,
    );
    // A skipped keyword shows the template line only: no note, no hedge.
    await expect(section.getByText(NO_COPY)).toHaveCount(real.length);
    await expect(section.getByText(HEDGE)).toHaveCount(rewordable.length);

    for (const gap of [...real, ...rewordable]) {
      const item = gapItems(page).filter({
        has: gapHeading(page, gap.keyword),
      });
      await expect(item).toHaveCount(1);
      await expect(item).toContainText(gap.explanation);
      if (gap.kind === "rewordable") {
        await expect(item.locator("blockquote")).toContainText(
          gap.citation ?? "",
        );
        await expect(item).toContainText(
          "Sitert ordrett fra CV-en din · sjekket mot CV-teksten",
        );
        await expect(item).toContainText(HEDGE);
        await expect(item).not.toContainText(NO_COPY);
      } else {
        await expect(item).toContainText(NO_COPY);
        await expect(item).not.toContainText(HEDGE);
        await expect(item.locator("blockquote")).toHaveCount(0);
      }
    }
  });

  test("a Real gap has nothing to copy: no button, no field, no suggestion", async ({
    page,
  }) => {
    await submitExample(page);
    const { total, real } = await expected(page);
    await expect(gapItems(page)).toHaveCount(total);
    await expect(gapsSection(page).getByRole("button")).toHaveCount(0);
    await expect(gapsSection(page).locator("textarea, input")).toHaveCount(0);
    for (const gap of real) {
      const item = gapItems(page).filter({
        has: gapHeading(page, gap.keyword),
      });
      await expect(item.locator("blockquote, button, textarea")).toHaveCount(0);
    }
  });

  test("«Se gapanalysen» on each Missing entry moves focus to the Gap's h3", async ({
    page,
  }) => {
    await submitExample(page);
    const { total, terms } = await expected(page);
    await expect(gapItems(page)).toHaveCount(total);
    const missing = page.locator("section[aria-labelledby=missing-heading] li");
    const links = missing.getByRole("link", { name: /^Se gapanalysen/ });
    await expect(links).toHaveCount(await missing.count());
    await expect(links).toHaveCount(total);

    for (const term of terms) {
      const link = page.getByRole("link", {
        name: `Se gapanalysen for ${term}`,
      });
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      await link.click();
      const heading = gapHeading(gapsSection(page), term);
      await expect(heading).toBeFocused();
      await expect(heading).toHaveAttribute("tabindex", "-1");
      await expect(heading).toHaveAttribute("id", /^gap-\d+$/);
    }
  });

  test("speaks the phase-1 line, then one phase-2 line for both sections", async ({
    page,
  }) => {
    await openForm(page);
    await recordPhaseRegion(page);
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("#live-phase")).toHaveText(
      "Gapanalysen og søknadsbrevet er klare.",
    );
    await page.waitForTimeout(500);
    const lines = await spoken(page);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/Gapanalysen og søknadsbrevet skrives nå\.$/);
    expect(lines[1]).toBe("Gapanalysen og søknadsbrevet er klare.");
  });

  test("has no serious axe finding with the Gaps shown, also on a phone", async ({
    page,
  }) => {
    await submitExample(page);
    const { total } = await expected(page);
    await expect(gapItems(page)).toHaveCount(total);
    await expect(article(page)).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
    await page.setViewportSize(PHONE);
    expect(await seriousFindings(page)).toEqual([]);
  });

  test("a failing Gaps request shows the alert and keeps the score and the Letter", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    await page.route(GAPS_ROUTE, (route) =>
      route.fulfill({ json: failure("AI_TIMEOUT", true) }),
    );
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    await expect(
      gapsSection(page).locator("p", { hasText: FAILED }),
    ).toBeVisible();
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(letterSection(page)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er klart. Gapanalysen kunne ikke lages.",
    );
    await expect(
      page.getByRole("link", { name: /^Se gapanalysen/ }),
    ).toHaveCount(0);
    expect(letters).toHaveLength(1);
  });

  test("«Prøv igjen» sends only the Gaps request and moves focus to the h2", async ({
    page,
  }) => {
    const gaps = gapsCalls(page);
    const letters = letterCalls(page);
    let first = true;
    await page.route(GAPS_ROUTE, async (route) => {
      if (first) {
        first = false;
        await route.fulfill({ json: failure("AI_PROVIDER_ERROR", true) });
        return;
      }
      await route.continue();
    });
    await submitExample(page);
    const { total } = await expected(page);
    const retry = gapsSection(page).getByRole("button", { name: "Prøv igjen" });
    await expect(retry).toBeVisible();
    await expect(article(page)).toBeVisible();
    await retry.click();
    await expect(
      gapsSection(page).getByRole("heading", { level: 2, name: "Gapanalyse" }),
    ).toBeFocused();
    await expect(gapItems(page)).toHaveCount(total);
    expect(gaps).toHaveLength(2);
    expect(letters).toHaveLength(1);
    // A retry is spoken in the second live region, not the first.
    await expect(page.locator("#live-action")).toHaveText(
      "Gapanalysen er klar.",
    );
    await expect(
      page.getByRole("link", { name: /^Se gapanalysen/ }),
    ).toHaveCount(total);
  });

  test("a retry before the Letter has settled leaves the phase-2 line to both sections", async ({
    page,
  }) => {
    const release = await hold(page, LETTER_ROUTE);
    let first = true;
    await page.route(GAPS_ROUTE, async (route) => {
      if (first) {
        first = false;
        await route.fulfill({ json: failure("AI_PROVIDER_ERROR", true) });
        return;
      }
      await route.continue();
    });
    await openForm(page);
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    await recordPhaseRegion(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    const retry = gapsSection(page).getByRole("button", { name: "Prøv igjen" });
    await expect(retry).toBeVisible();
    await retry.click();
    const { total } = await expected(page);
    await expect(gapItems(page)).toHaveCount(total);
    // Nothing is said yet: the Letter has not settled, and the retry is part of
    // the one line.
    await expect(page.locator("#live-action")).toHaveText(
      "Eksempelet er fylt inn.",
    );
    release();
    await expect(article(page)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      "Gapanalysen og søknadsbrevet er klare.",
    );
    expect(await spoken(page)).toHaveLength(2);
  });

  test("a refusal for the notice asks once and sends the Gaps request again on «Godta og fortsett»", async ({
    page,
  }) => {
    const gaps = gapsCalls(page);
    let first = true;
    await page.route(GAPS_ROUTE, async (route) => {
      if (first) {
        first = false;
        await route.fulfill({ json: failure("AI_NOTICE_REQUIRED") });
        return;
      }
      await route.continue();
    });
    await submitExample(page);
    const dialog = page.getByRole("dialog", {
      name: "Teksten din sendes til en KI-tjeneste",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Godta og fortsett" }).click();
    await expect(dialog).toBeHidden();
    const { total } = await expected(page);
    await expect(gapItems(page)).toHaveCount(total);
    expect(gaps).toHaveLength(2);
  });

  test("«Avbryt» on that notice leaves the Gap analysis as the alert with «Prøv igjen»", async ({
    page,
  }) => {
    await page.route(GAPS_ROUTE, (route) =>
      route.fulfill({ json: failure("AI_NOTICE_REQUIRED") }),
    );
    await submitExample(page);
    const dialog = page.getByRole("dialog", {
      name: "Teksten din sendes til en KI-tjeneste",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      gapsSection(page).locator("p", { hasText: FAILED }),
    ).toBeVisible();
    await expect(
      gapsSection(page).getByRole("button", { name: "Prøv igjen" }),
    ).toBeVisible();
    await expect(article(page)).toBeVisible();
  });

  test("the cap shows the «Dagens grense» notice with no retry", async ({
    page,
  }) => {
    await page.route(GAPS_ROUTE, (route) =>
      route.fulfill({ json: failure("DAILY_CAP_REACHED") }),
    );
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    await expect(
      gapsSection(page).getByText("Dagens grense", { exact: true }),
    ).toBeVisible();
    await expect(
      gapsSection(page).getByRole("button", { name: "Prøv igjen" }),
    ).toHaveCount(0);
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er klart. Dagens grense for KI er nådd.",
    );
  });

  test("Test mode refusal shows the «Testmodus» notice with no retry", async ({
    page,
  }) => {
    await page.route(GAPS_ROUTE, (route) =>
      route.fulfill({ json: failure("TEST_MODE_UNAVAILABLE") }),
    );
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    await expect(
      gapsSection(page).getByText("Testmodus", { exact: true }),
    ).toBeVisible();
    await expect(
      gapsSection(page).getByRole("button", { name: "Prøv igjen" }),
    ).toHaveCount(0);
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er klart. Gapanalysen er ikke tilgjengelig i testmodus.",
    );
  });

  test("both sections failing are named in one line", async ({ page }) => {
    await page.route(GAPS_ROUTE, (route) =>
      route.fulfill({ json: failure("AI_TIMEOUT", true) }),
    );
    await page.route(LETTER_ROUTE, (route) =>
      route.fulfill({ json: failure("AI_TIMEOUT", true) }),
    );
    await submitExample(page);
    await expect(page.locator("#live-phase")).toHaveText(
      "Gapanalysen og søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
    );
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
  });

  test("ANALYSIS_STALE reruns phase 1 silently and resends the Gaps request once", async ({
    page,
  }) => {
    const analyses = analysisCalls(page);
    const gaps = gapsCalls(page);
    let first = true;
    await page.route(GAPS_ROUTE, async (route) => {
      if (first) {
        first = false;
        await route.fulfill({ json: failure("ANALYSIS_STALE") });
        return;
      }
      await route.continue();
    });
    await submitExample(page);
    const { total } = await expected(page);
    await expect(gapItems(page)).toHaveCount(total);
    expect(analyses).toHaveLength(2);
    expect(gaps).toHaveLength(2);
    await expect(page.locator("#live-action")).not.toContainText("oppdatert");
  });

  test("a second ANALYSIS_STALE is the failure", async ({ page }) => {
    const gaps = gapsCalls(page);
    await page.route(GAPS_ROUTE, (route) =>
      route.fulfill({ json: failure("ANALYSIS_STALE") }),
    );
    await submitExample(page);
    await expect(
      gapsSection(page).locator("p", { hasText: FAILED }),
    ).toBeVisible();
    expect(gaps).toHaveLength(2);
    await expect(article(page)).toBeVisible();
  });

  test("with no Missing keyword there is no Gaps request, no section and no link", async ({
    page,
  }) => {
    const gaps = gapsCalls(page);
    await page.route("**/api/analyses", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.data.result.missing = [];
      await route.fulfill({ response, json: body });
    });
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er klart.",
    );
    expect(gaps).toHaveLength(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Gapanalyse" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /^Se gapanalysen/ }),
    ).toHaveCount(0);
  });

  test("«Endre annonsen» drops the Gap analysis and a new submit asks for it again", async ({
    page,
  }) => {
    const gaps = gapsCalls(page);
    await submitExample(page);
    const { total } = await expected(page);
    await expect(gapItems(page)).toHaveCount(total);
    await page.getByRole("button", { name: "Endre annonsen" }).click();
    await expect(page.getByRole("button", { name: SUBMIT })).toBeVisible();
    await expect(gapsSection(page)).toHaveCount(0);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(gapItems(page)).toHaveCount(total);
    expect(gaps).toHaveLength(2);
  });
});

test.describe("Story 4.4 with the flag off", () => {
  test.use({ baseURL: DEFAULT });

  test("keeps the Letter-only phase 2: no Gaps request, no section, no link", async ({
    page,
  }) => {
    const gaps = gapsCalls(page);
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er klart.",
    );
    expect(gaps).toHaveLength(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Gapanalyse" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /^Se gapanalysen/ }),
    ).toHaveCount(0);
  });
});
