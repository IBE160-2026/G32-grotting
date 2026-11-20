import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import {
  analysisCalls,
  EXAMPLE_SCORE,
  failure,
  LETTER_ROUTE,
  letterAnswer,
  letterCalls,
  openForm,
  PHONE,
  RUST,
  SUBMIT,
  seriousFindings,
  shownLetter,
  WIDE,
} from "./support/application";

// The planted Letter of the Example pair (FR-11): the Real-gap Keyword
// «TypeScript» twice, the Upgrade word «ledet», the job title, the employer and
// the sign-off. Tests only; the app never reads `_planted`.
const PLANTED = (
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../data/fixtures/_planted/letter-flags.json", import.meta.url),
      ),
      "utf8",
    ),
  ) as { data: { text: string } }
).data.text;

const CHECK_ROUTE = "**/api/analyses/*/letter-check";
const WARNING_NAME = "Sjekk av brevet mot CV-en";
const UNSUPPORTED =
  "Brevet nevner «TypeScript», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.";
const UPGRADE =
  "Brevet bruker ordet «ledet», men CV-en din bruker det ikke. Sjekk at brevet ikke gjør rollen din større enn den var.";
const UNCHECKED = "Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.";

const article = (page: Page) => page.locator("article");
const warnings = (page: Page) =>
  page.getByRole("region", { name: WARNING_NAME });
const retryCheck = (page: Page) =>
  page.getByRole("button", { name: "Sjekk igjen" });
const regenerateButton = (page: Page) =>
  page.getByRole("button", { name: "Lag nytt utkast" });

type CheckBody = {
  fingerprint: string;
  letter: { text: string; rev: number };
  gaps: null | unknown[];
  letterRev: number;
  gapsRev: number;
  consent?: unknown;
};

// The check requests the browser sends, with their bodies.
function checkCalls(page: Page): CheckBody[] {
  const calls: CheckBody[] = [];
  page.on("request", (request) => {
    if (/\/api\/analyses\/[^/]+\/letter-check$/.test(request.url())) {
      calls.push(request.postDataJSON() as CheckBody);
    }
  });
  return calls;
}

// The Letter request answers with the planted Letter; the check, the real
// server's, finds its flags.
async function plantLetter(page: Page, text = PLANTED, rev = 1) {
  await page.route(LETTER_ROUTE, async (route) => {
    const answer = letterAnswer("Formell", text);
    answer.data.letter.rev = rev;
    await route.fulfill({ json: answer });
  });
}

async function submitExample(page: Page) {
  await openForm(page);
  await page.getByRole("button", { name: "Bruk eksempelet" }).click();
  await page.getByRole("button", { name: SUBMIT }).click();
  await expect(article(page)).toBeVisible();
}

test.describe("FR-11 flags in the Letter", () => {
  test("a warning per flagged word sits between the AI label and the Letter, and the words are underlined in the text", async ({
    page,
  }) => {
    const calls = checkCalls(page);
    await plantLetter(page);
    await submitExample(page);

    const list = warnings(page);
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveText([UNSUPPORTED, UPGRADE]);

    // Between the AI label and the Letter, in that order.
    const order = await page.evaluate(() => {
      const label = document.getElementById("letter-ai-label");
      const section = document.querySelector(
        'section[aria-label="Sjekk av brevet mot CV-en"]',
      );
      const letter = document.querySelector("article");
      const precedes = (a: Node | null, b: Node | null) =>
        a !== null &&
        b !== null &&
        Boolean(
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
        );
      return [precedes(label, section), precedes(section, letter)];
    });
    expect(order).toEqual([true, true]);

    // No alert and no live region: a warning is read as part of the page.
    await expect(list.locator("[role=alert], [aria-live]")).toHaveCount(0);
    await expect(list).not.toContainText("Feil");

    // Each occurrence is underlined (dashed, rust, 2 px, offset 4 px) and
    // nothing in the Letter is removed.
    const links = article(page).getByRole("link");
    await expect(links).toHaveText(["TypeScript", "ledet", "TypeScript"]);
    const style = await links.first().evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        style: computed.textDecorationStyle,
        color: computed.textDecorationColor,
        thickness: computed.textDecorationThickness,
        offset: computed.textUnderlineOffset,
      };
    });
    expect(style).toEqual({
      style: "dashed",
      color: RUST,
      thickness: "2px",
      offset: "4px",
    });
    const shown = (await article(page).textContent()) ?? "";
    expect(shown).toBe(
      PLANTED.replace("{{SIGNATUR}}", "[Navnet ditt]")
        .split(/\n{2,}/)
        .join(""),
    );

    // One check request for the one Letter, no consent. The Gap analysis is on
    // by default (Story 4.6), so it carries the Gaps the Student sees: one per
    // Missing keyword.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      letterRev: 1,
      gapsRev: 1,
      letter: { rev: 1 },
    });
    expect(Array.isArray(calls[0]?.gaps)).toBe(true);
    expect(calls[0]).not.toHaveProperty("consent");
  });

  test("a click on a flagged word focuses its line in the list", async ({
    page,
  }) => {
    await plantLetter(page);
    await submitExample(page);
    await expect(warnings(page)).toBeVisible();

    await article(page).getByRole("link", { name: "ledet" }).click();
    await expect(
      warnings(page).getByRole("listitem").filter({ hasText: UPGRADE }),
    ).toBeFocused();

    await article(page)
      .getByRole("link", { name: "TypeScript" })
      .last()
      .click();
    await expect(
      warnings(page).getByRole("listitem").filter({ hasText: UNSUPPORTED }),
    ).toBeFocused();
  });

  test("copy and download still use the whole plain text", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await plantLetter(page);
    await submitExample(page);
    await expect(warnings(page)).toBeVisible();
    await page.getByRole("button", { name: /^Kopier/ }).click();
    await expect(page.locator("#live-action")).toHaveText(
      "Kopiert til utklippstavlen.",
    );
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.replace(/\r\n?/g, "\n")).toBe(
      PLANTED.replace("{{SIGNATUR}}", "[Navnet ditt]"),
    );
  });

  test("a clean Letter (the Cached Letter in Test mode) shows no list and no notice", async ({
    page,
  }) => {
    const calls = checkCalls(page);
    // Wait for the check's answer, not just its request: a count of 0 before
    // the answer arrives would pass for a Letter that is about to be flagged.
    const answered = page.waitForResponse((response) =>
      /\/api\/analyses\/[^/]+\/letter-check$/.test(response.url()),
    );
    await submitExample(page);
    await expect.poll(() => calls.length).toBe(1);
    const answer = await answered;
    expect(answer.ok()).toBe(true);
    await answer.finished();
    // Two frames, so the answer has been rendered before «no list» is asserted.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(article(page)).toContainText(
      shownLetter("Formell").split(/\n{2,}/)[0] ?? "",
    );
    await expect(warnings(page)).toHaveCount(0);
    await expect(article(page).getByRole("link")).toHaveCount(0);
    await expect(page.getByText(UNCHECKED)).toHaveCount(0);
    await expect(retryCheck(page)).toHaveCount(0);
  });

  test("has no serious axe finding at 1280 px and 360 px", async ({ page }) => {
    await plantLetter(page);
    await page.setViewportSize(WIDE);
    await submitExample(page);
    await expect(warnings(page)).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);

    await page.setViewportSize(PHONE);
    await expect(warnings(page)).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("FR-11 a check that cannot be made", () => {
  test("keeps the Letter with a notice (never an alert); «Sjekk igjen» sends the check only and adds the flags", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    const checks = checkCalls(page);
    const analyses = analysisCalls(page);
    await plantLetter(page);
    let failing = true;
    await page.route(CHECK_ROUTE, async (route) => {
      if (failing) {
        await route.fulfill({ status: 500, json: failure("UNEXPECTED") });
        return;
      }
      await route.continue();
    });
    await submitExample(page);

    await expect(page.getByText(UNCHECKED)).toBeVisible();
    await expect(article(page)).toContainText("Jeg søker på stillingen");
    await expect(
      page.locator("section[aria-labelledby=letter-h2] [role=alert]"),
    ).toHaveCount(0);
    await expect(warnings(page)).toHaveCount(0);
    // Nothing is spoken for a failed automatic check.
    await expect(page.locator("#live-action")).not.toHaveText(/sjekk/i);

    failing = false;
    await retryCheck(page).click();
    await expect(warnings(page)).toBeVisible();
    await expect(page.getByText(UNCHECKED)).toHaveCount(0);
    await expect(page.locator("#live-action")).toHaveText(
      "Fant 2 ord å sjekke i brevet.",
    );
    // Focus follows to the section heading, as for «Prøv igjen».
    await expect(
      page.getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toBeFocused();

    // The check only: one Letter request, one phase 1, two checks.
    expect(letters).toHaveLength(1);
    expect(analyses).toHaveLength(1);
    expect(checks).toHaveLength(2);
  });

  test("«Sjekk igjen» that fails again says so and keeps the notice", async ({
    page,
  }) => {
    await plantLetter(page);
    await page.route(CHECK_ROUTE, (route) =>
      route.fulfill({ status: 500, json: failure("UNEXPECTED") }),
    );
    await submitExample(page);
    await expect(page.getByText(UNCHECKED)).toBeVisible();
    await retryCheck(page).click();
    await expect(page.locator("#live-action")).toHaveText(
      "Brevet er fortsatt ikke sjekket mot CV-en.",
    );
    await expect(page.getByText(UNCHECKED)).toBeVisible();
    await expect(retryCheck(page)).toBeVisible();
  });

  test("the notice has no serious axe finding at 1280 px and 360 px", async ({
    page,
  }) => {
    await page.route(CHECK_ROUTE, (route) =>
      route.fulfill({ status: 500, json: failure("UNEXPECTED") }),
    );
    await page.setViewportSize(WIDE);
    await submitExample(page);
    await expect(page.getByText(UNCHECKED)).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
    await page.setViewportSize(PHONE);
    expect(await seriousFindings(page)).toEqual([]);
  });
});

test.describe("AD-6 ANALYSIS_STALE on the check", () => {
  test("reruns phase 1 once, silently, and sends the check again", async ({
    page,
  }) => {
    const checks = checkCalls(page);
    const analyses = analysisCalls(page);
    await plantLetter(page);
    let first = true;
    await page.route(CHECK_ROUTE, async (route) => {
      if (first) {
        first = false;
        await route.fulfill({ status: 409, json: failure("ANALYSIS_STALE") });
        return;
      }
      await route.continue();
    });
    await submitExample(page);
    await expect(warnings(page)).toBeVisible();
    expect(analyses).toHaveLength(2);
    expect(checks).toHaveLength(2);
    await expect(page.getByText(UNCHECKED)).toHaveCount(0);
  });

  test("a second ANALYSIS_STALE is a failed check, never a loop", async ({
    page,
  }) => {
    const checks = checkCalls(page);
    const analyses = analysisCalls(page);
    await page.route(CHECK_ROUTE, (route) =>
      route.fulfill({ status: 409, json: failure("ANALYSIS_STALE") }),
    );
    await submitExample(page);
    await expect(page.getByText(UNCHECKED)).toBeVisible();
    expect(analyses).toHaveLength(2);
    expect(checks).toHaveLength(2);
  });
});

test.describe("AD-6 the rerun of phase 1 from the check is adopted", () => {
  test("changes the score, is said in the second live region, and the next requests carry the new fingerprint", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    const checks = checkCalls(page);
    await plantLetter(page);
    // The first check is stale; the rerun of phase 1 answers another score and
    // fingerprint. The server would not know that fingerprint, so the later
    // checks are answered here, with the rev they were asked about.
    let checkCount = 0;
    await page.route(CHECK_ROUTE, async (route) => {
      checkCount += 1;
      if (checkCount === 1) {
        await route.fulfill({ status: 409, json: failure("ANALYSIS_STALE") });
        return;
      }
      const body = route.request().postDataJSON() as CheckBody;
      await route.fulfill({
        json: {
          ok: true,
          data: {
            flags: [],
            letterRev: body.letterRev,
            gapsRev: body.gapsRev,
          },
        },
      });
    });
    let analyses = 0;
    await page.route("**/api/analyses", async (route) => {
      analyses += 1;
      if (analyses === 1) {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const body = await response.json();
      body.data.result.score = Math.max(0, body.data.result.score - 10);
      body.data.fingerprint = "fp-after-rerun";
      await route.fulfill({ response, json: body });
    });
    await submitExample(page);

    await expect(
      page.getByText(`${EXAMPLE_SCORE - 10} % samsvar`),
    ).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(
      /^Samsvaret er oppdatert: \d+ %, .+, \d+ av \d+ nøkkelord\.$/,
    );
    await expect.poll(() => checks.length).toBe(2);
    expect(checks.map((body) => body.fingerprint)).toEqual([
      letters[0]?.fingerprint,
      "fp-after-rerun",
    ]);

    // A new draft sends the new fingerprint, and so does its check.
    await regenerateButton(page).click();
    await expect.poll(() => letters.length).toBe(2);
    expect(letters[1]?.fingerprint).toBe("fp-after-rerun");
    await expect.poll(() => checks.length).toBe(3);
    expect(checks[2]?.fingerprint).toBe("fp-after-rerun");
    expect(analyses).toBe(2);
  });
});

test.describe("FR-11 a new draft", () => {
  test("a result for the old Letter that arrives late is dropped", async ({
    page,
  }) => {
    const checks = checkCalls(page);
    // First Letter: the planted one (rev 1). The new draft: the same with
    // another Upgrade word (rev 2), so each Letter has flags of its own.
    const SECOND = PLANTED.replace("ledet", "forsket");
    let letterRequests = 0;
    await page.route(LETTER_ROUTE, async (route) => {
      letterRequests += 1;
      const answer =
        letterRequests === 1
          ? letterAnswer("Formell", PLANTED)
          : letterAnswer("Formell", SECOND);
      answer.data.letter.rev = letterRequests;
      await route.fulfill({ json: answer });
    });
    // The check of the first Letter is held until the second Letter is on screen.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let firstCheck = true;
    await page.route(CHECK_ROUTE, async (route) => {
      if (firstCheck) {
        firstCheck = false;
        const response = await route.fetch();
        await held;
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    });

    await submitExample(page);
    await expect.poll(() => checks.length).toBe(1);
    await regenerateButton(page).click();
    await expect(article(page)).toContainText("forsket");
    await expect.poll(() => checks.length).toBe(2);
    expect(checks.map((body) => body.letterRev)).toEqual([1, 2]);
    // The new Letter's own check has returned: its list names «forsket».
    await expect(warnings(page)).toContainText("«forsket»");

    release();
    // Give the late answer time to arrive; it must not replace the new list.
    await page.waitForTimeout(500);
    await expect(warnings(page)).toBeVisible();
    await expect(warnings(page)).toContainText("«forsket»");
    await expect(warnings(page)).not.toContainText("«ledet»");
    await expect(article(page).getByRole("link")).toHaveText([
      "TypeScript",
      "forsket",
      "TypeScript",
    ]);
  });

  test("the old Letter keeps its own flags while a new draft is written, and the new Letter is checked", async ({
    page,
  }) => {
    const checks = checkCalls(page);
    let letterRequests = 0;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(LETTER_ROUTE, async (route) => {
      letterRequests += 1;
      if (letterRequests === 2) await held;
      const answer = letterAnswer("Formell", PLANTED);
      answer.data.letter.rev = letterRequests;
      await route.fulfill({ json: answer });
    });
    await submitExample(page);
    await expect(warnings(page)).toBeVisible();

    await regenerateButton(page).click();
    await expect(page.getByText("Skriver et nytt utkast …")).toBeVisible();
    // The old Letter still shows its flags.
    await expect(warnings(page)).toBeVisible();
    expect(checks).toHaveLength(1);

    release();
    await expect.poll(() => checks.length).toBe(2);
    expect(checks[1]?.letterRev).toBe(2);
    await expect(warnings(page)).toBeVisible();
  });
});
