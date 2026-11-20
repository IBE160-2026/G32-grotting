import {
  type APIRequestContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import {
  analysisCalls,
  EXAMPLE_AD,
  EXAMPLE_META,
  EXAMPLE_SENTENCE,
  exampleFile,
  fillExample,
  KEYWORD_PROGRESS,
  LESS_PRECISE,
  LETTER_ROUTE,
  letterAnswer,
  PHONE,
  SUBMIT,
  seriousFindings,
  WIDE,
} from "./support/application";

// FR-5b (Story 3.11). The server on port 3103 has live settings with a made-up
// key and the Keyword fallback left on. Every request it would answer with AI
// is answered in the browser, so no request reaches a provider.
const FALLBACK = "http://localhost:3103";
const TEST_MODE_SERVER = "http://localhost:3100";
const TITLE = "Teksten din sendes til en KI-tjeneste";
const KEYWORD_SENTENCE =
  "For å hente ut nøkkelord sendes bare stillingsannonsen, aldri CV-en.";

const submit = (page: Page) => page.getByRole("button", { name: SUBMIT });
const dialog = (page: Page) => page.getByRole("dialog", { name: TITLE });

// A real phase-1 answer from the Test-mode server, marked as the answer of a
// phase 1 that could not use AI.
async function codeFallbackAnswer(request: APIRequestContext) {
  const response = await request.post(`${TEST_MODE_SERVER}/api/analyses`, {
    data: {
      applicationId: "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f",
      inputs: {
        cvText: exampleFile("cv.txt"),
        jobAd: EXAMPLE_AD,
        jobTitle: EXAMPLE_META.jobTitle,
        employer: EXAMPLE_META.employer,
      },
    },
  });
  const body = await response.json();
  body.data.result.keywordSource = "code-fallback";
  return body;
}

// Phase 1 is held until `release()`; the requests it saw are collected.
async function holdPhaseOne(page: Page, answer: object) {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const bodies: { consent?: { noticeVersion: string } | null }[] = [];
  await page.route("**/api/analyses", async (route) => {
    bodies.push(route.request().postDataJSON());
    await held;
    await route.fulfill({ json: answer });
  });
  await page.route(LETTER_ROUTE, (route) =>
    route.fulfill({ json: letterAnswer("Formell") }),
  );
  return { release, bodies };
}

test.describe("FR-5b the Keyword fallback is on, outside Test mode", () => {
  test.use({ baseURL: FALLBACK });

  test("the AI notice also says that only the Job ad, never the CV, is sent for Keywords", async ({
    page,
  }) => {
    const calls = analysisCalls(page);
    await fillExample(page);
    await submit(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText(KEYWORD_SENTENCE);
    await expect(dialog(page).getByRole("listitem")).toHaveCount(6);
    expect(calls).toHaveLength(0);
  });

  test("shows the unannounced progress line while phase 1 waits, sends the accepted notice with it, and marks code-only Keywords", async ({
    page,
    request,
  }) => {
    const { release, bodies } = await holdPhaseOne(
      page,
      await codeFallbackAnswer(request),
    );
    await fillExample(page);
    await submit(page).click();
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();

    const progress = page.getByText(KEYWORD_PROGRESS);
    await expect(progress).toBeVisible();
    // Plain text: no live region speaks it (NFR-2).
    expect(
      await progress.evaluate((node) =>
        node.closest("[aria-live], [role=status], [role=alert]"),
      ),
    ).toBeNull();
    await expect(page.locator("#live-phase")).not.toContainText(
      "nøkkelord fra",
    );
    await expect(page.locator("#live-action")).not.toContainText(
      "nøkkelord fra",
    );

    release();
    await expect(page.getByText(LESS_PRECISE)).toBeVisible();
    await expect(progress).toHaveCount(0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.consent?.noticeVersion).toMatch(
      /^notice-3:openrouter:unknown:fallback$/,
    );
  });

  for (const [name, viewport] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`has no serious axe findings with the progress line and the less-precise line at ${name}`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize(viewport);
      const { release } = await holdPhaseOne(
        page,
        await codeFallbackAnswer(request),
      );
      await fillExample(page);
      await submit(page).click();
      await dialog(page)
        .getByRole("button", { name: "Godta og fortsett" })
        .click();
      await expect(page.getByText(KEYWORD_PROGRESS)).toBeVisible();
      expect(await seriousFindings(page)).toEqual([]);
      release();
      await expect(page.getByText(LESS_PRECISE)).toBeVisible();
      expect(await seriousFindings(page)).toEqual([]);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }
});

test.describe("FR-5b, FR-27 Test mode", () => {
  test("the Example pair is scored on its saved list: no progress line, no less-precise line, no notice", async ({
    page,
  }) => {
    await fillExample(page);
    await submit(page).click();
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(page.getByText(LESS_PRECISE)).toHaveCount(0);
    await expect(page.getByText(KEYWORD_PROGRESS)).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
