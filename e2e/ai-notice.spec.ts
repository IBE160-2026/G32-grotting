import { expect, type Page, test } from "@playwright/test";
import {
  analysisCalls,
  EXAMPLE_CODE_SENTENCE,
  EXAMPLE_SENTENCE,
  failure,
  failureBox,
  fillExample,
  LETTER_ROUTE,
  letterAnswer,
  letterCalls,
  PHONE,
  SUBMIT,
  seriousFindings,
  session,
  WIDE,
} from "./support/application";

// The live-settings server from playwright.config.ts (made-up key, no request
// to a provider). Test mode is off there, so the notice appears.
const LIVE = "http://localhost:3102";
const TITLE = "Teksten din sendes til en KI-tjeneste";

const dialog = (page: Page) => page.getByRole("dialog", { name: TITLE });
const submit = (page: Page) => page.getByRole("button", { name: SUBMIT });

// The live-settings server has a made-up key, so no phase-2 request may reach
// it: the browser answers them here, one answer per request, then the last one.
async function stubLetters(page: Page, answers: object[]) {
  let sent = 0;
  await page.route(LETTER_ROUTE, (route) => {
    const answer = answers[Math.min(sent, answers.length - 1)];
    sent += 1;
    return route.fulfill({ json: answer });
  });
}

async function openNotice(page: Page) {
  await fillExample(page);
  await submit(page).click();
  await expect(dialog(page)).toBeVisible();
}

test.describe("FR-24 the AI notice, Test mode off", () => {
  test.use({ baseURL: LIVE });

  test("opens before phase 1, names OpenRouter and the model host, and has focus on its title", async ({
    page,
  }) => {
    const calls = analysisCalls(page);
    await openNotice(page);
    await expect(
      dialog(page).getByRole("heading", { name: TITLE }),
    ).toBeFocused();
    await expect(dialog(page)).toContainText("OpenRouter");
    await expect(dialog(page)).toContainText(
      "Google (Vertex AI) eller Amazon (Bedrock)",
    );
    await expect(dialog(page)).toContainText(
      "Ingenting er sendt ennå, og ingenting sendes før du godtar.",
    );
    expect(calls).toHaveLength(0);
  });

  test("traps focus and ignores a click on the scrim", async ({ page }) => {
    await openNotice(page);
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(
        () =>
          document.activeElement === document.body ||
          document.activeElement?.closest("dialog") != null,
      );
      expect(inside).toBe(true);
    }
    await page.mouse.click(4, 4);
    await expect(dialog(page)).toBeVisible();
  });

  test("«Avbryt» keeps every input, sends nothing and returns focus to the submit button", async ({
    page,
  }) => {
    const calls = analysisCalls(page);
    await openNotice(page);
    await dialog(page).getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(submit(page)).toBeFocused();
    await expect(page.getByLabel("Arbeidsgiver")).not.toHaveValue("");
    expect((await session(page))?.noticeVersion).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  test("Esc does the same as «Avbryt»", async ({ page }) => {
    const calls = analysisCalls(page);
    await openNotice(page);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();
    await expect(submit(page)).toBeFocused();
    await expect(page.getByLabel("Arbeidsgiver")).not.toHaveValue("");
    expect((await session(page))?.noticeVersion).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  test("«Godta og fortsett» saves the version, starts phase 1 once and is not asked again", async ({
    page,
  }) => {
    const calls = analysisCalls(page);
    await stubLetters(page, [letterAnswer("Formell")]);
    await openNotice(page);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(page.getByText(EXAMPLE_CODE_SENTENCE)).toBeVisible();
    expect(calls).toHaveLength(1);
    expect((await session(page))?.noticeVersion).toMatch(/^notice-/);
    await page.getByRole("button", { name: "Endre annonsen" }).click();
    await submit(page).click();
    await expect(page.getByText(EXAMPLE_CODE_SENTENCE)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(calls).toHaveLength(2);
  });

  test("FR-24, AD-13 the phase-2 request carries the accepted notice version as consent", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    await stubLetters(page, [letterAnswer("Personlig")]);
    await fillExample(page);
    await page.getByRole("radio", { name: /^Personlig – / }).check();
    await submit(page).click();
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(page.locator("article")).toBeVisible();
    const accepted = (await session(page))?.noticeVersion;
    expect(accepted).toMatch(/^notice-/);
    expect(letters).toHaveLength(1);
    expect(letters[0]?.consent).toEqual({ noticeVersion: accepted });
    expect(letters[0]?.tone).toBe("Personlig");
    await expect(page.locator("dl")).toContainText("Personlig");
  });

  test("AD-13 AI_NOTICE_REQUIRED opens the notice again, and «Godta og fortsett» resends the Letter request only", async ({
    page,
  }) => {
    const analyses = analysisCalls(page);
    const letters = letterCalls(page);
    await stubLetters(page, [
      failure("AI_NOTICE_REQUIRED"),
      letterAnswer("Formell"),
    ]);
    await openNotice(page);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    // The server refused: the notice comes back, with the score still shown.
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByText(EXAMPLE_CODE_SENTENCE)).toBeVisible();
    expect(letters).toHaveLength(1);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(page.locator("article")).toBeVisible();
    expect(letters).toHaveLength(2);
    expect(analyses).toHaveLength(1);
    await expect(dialog(page)).toBeHidden();
  });

  test("AD-13 «Avbryt» on the second notice leaves the section alert with «Prøv igjen»", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    await stubLetters(page, [
      failure("AI_NOTICE_REQUIRED"),
      letterAnswer("Formell"),
    ]);
    await openNotice(page);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(
      failureBox(page, "Søknadsbrevet kunne ikke lages."),
    ).toBeVisible();
    await expect(page.getByText(EXAMPLE_CODE_SENTENCE)).toBeVisible();
    expect(letters).toHaveLength(1);
    // «Prøv igjen» sends again, and the server now accepts.
    await page.getByRole("button", { name: "Prøv igjen" }).click();
    await expect(page.locator("article")).toBeVisible();
    expect(letters).toHaveLength(2);
  });

  test("AD-13 a second refusal after the Student accepted shows the alert instead of asking forever", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    await stubLetters(page, [failure("AI_NOTICE_REQUIRED")]);
    await openNotice(page);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(
      failureBox(page, "Søknadsbrevet kunne ikke lages."),
    ).toBeVisible();
    await expect(dialog(page)).toBeHidden();
    expect(letters).toHaveLength(2);
  });

  for (const [name, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`has no serious axe finding at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await openNotice(page);
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

test.describe("FR-24 the AI notice, Test mode on", () => {
  test("never appears, and phase 1 starts at once", async ({ page }) => {
    await fillExample(page);
    await submit(page).click();
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("AD-13, FR-24 «Lag nytt utkast» refused for the notice", () => {
  test.use({ baseURL: LIVE });

  // The notice is accepted, the first Letter arrives, then the server refuses
  // the new draft for the notice (a config change in mid-session).
  async function openLetterThenRefuse(page: Page, rest: object[]) {
    await stubLetters(page, [letterAnswer("Formell"), ...rest]);
    await openNotice(page);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(page.locator("article")).toBeVisible();
  }

  test("opens the notice again, and «Godta og fortsett» sends the new draft", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    const analyses = analysisCalls(page);
    await openLetterThenRefuse(page, [
      failure("AI_NOTICE_REQUIRED"),
      letterAnswer("Formell", "Hei igjen,\n\n{{SIGNATUR}}"),
    ]);
    await page.getByRole("button", { name: "Lag nytt utkast" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.locator("article")).toBeVisible();
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(page.locator("article")).toContainText("Hei igjen,");
    await expect(page.locator("#live-action")).toHaveText(
      "Det nye utkastet er klart.",
    );
    expect(letters).toHaveLength(3);
    expect(letters.map((call) => call.previousRev ?? 0)).toEqual([0, 1, 1]);
    expect(analyses).toHaveLength(1);
  });

  test("«Avbryt» keeps the old Letter and shows the new-draft alert with «Prøv igjen»", async ({
    page,
  }) => {
    await openLetterThenRefuse(page, [
      failure("AI_NOTICE_REQUIRED"),
      letterAnswer("Formell", "Hei igjen,\n\n{{SIGNATUR}}"),
    ]);
    await page.getByRole("button", { name: "Lag nytt utkast" }).click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(
      failureBox(page, "Det nye utkastet kunne ikke lages."),
    ).toBeVisible();
    await expect(page.locator("article")).toContainText("Hei,");
    await expect(page.locator("article")).not.toContainText("Hei igjen");
    await page.getByRole("button", { name: "Prøv igjen" }).click();
    await expect(page.locator("article")).toContainText("Hei igjen,");
  });

  test("a second refusal after the Student accepted is the alert, not another notice", async ({
    page,
  }) => {
    await openLetterThenRefuse(page, [failure("AI_NOTICE_REQUIRED")]);
    await page.getByRole("button", { name: "Lag nytt utkast" }).click();
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(
      failureBox(page, "Det nye utkastet kunne ikke lages."),
    ).toBeVisible();
    await expect(dialog(page)).toBeHidden();
  });
});

// The live-settings server with the Gap analysis on (playwright.config.ts, as
// it is by default since Story 4.6). Made-up key: the browser answers both
// phase-2 requests, so nothing reaches a provider. Epic 4 retro, item 12.
const LIVE_GAPS = "http://localhost:3105";
const GAPS_ROUTE = "**/api/analyses/*/gaps";
const MISSING = "section[aria-labelledby=missing-heading] li h3";
const GAPS_HEADING = "section[aria-labelledby=gaps-h2]";

type GapsBody = { consent: { noticeVersion: string } | null };

// A Gaps answer for one Real gap; it never reaches the server.
function gapsAnswer(keyword: string) {
  return {
    ok: true,
    data: {
      gaps: [
        {
          keyword,
          kind: "real",
          explanation: { key: "REAL_GAP", params: { keyword } },
          citation: null,
          suggestion: null,
        },
      ],
      meta: null,
    },
  };
}

// The Gaps requests the browser sends, answered one by one, then the last.
async function stubGaps(page: Page, answers: object[]) {
  const calls: GapsBody[] = [];
  await page.route(GAPS_ROUTE, (route) => {
    const answer = answers[Math.min(calls.length, answers.length - 1)];
    calls.push(route.request().postDataJSON() as GapsBody);
    return route.fulfill({ json: answer });
  });
  return calls;
}

test.describe("FR-24, AD-13 the Gaps request and the AI notice, Test mode off", () => {
  test.use({ baseURL: LIVE_GAPS });

  test("the Gaps request carries the accepted notice version as consent", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    await stubLetters(page, [letterAnswer("Formell")]);
    const gaps = await stubGaps(page, [gapsAnswer("TypeScript")]);
    await fillExample(page);
    await submit(page).click();
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(page.locator("article")).toBeVisible();
    await expect(page.locator(GAPS_HEADING).locator("li")).toHaveCount(1);
    const accepted = (await session(page))?.noticeVersion;
    expect(accepted).toMatch(/^notice-/);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.consent).toEqual({ noticeVersion: accepted });
    expect(letters).toHaveLength(1);
    expect(letters[0]?.consent).toEqual({ noticeVersion: accepted });
  });

  test("AI_NOTICE_REQUIRED from the Gaps request opens the notice again and leaves the score alone; «Godta og fortsett» resends only the Gaps request", async ({
    page,
  }) => {
    const analyses = analysisCalls(page);
    const letters = letterCalls(page);
    await stubLetters(page, [letterAnswer("Formell")]);
    const gaps = await stubGaps(page, [
      failure("AI_NOTICE_REQUIRED"),
      gapsAnswer("TypeScript"),
    ]);
    await openNotice(page);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    // The server refused the Gaps request: the notice comes back, and the
    // score, the Missing list and the Letter stand as they were.
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByText(EXAMPLE_CODE_SENTENCE)).toBeVisible();
    await expect(page.locator(MISSING).first()).toBeVisible();
    await expect(page.locator("article")).toBeVisible();
    expect(gaps).toHaveLength(1);
    await dialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(page.locator(GAPS_HEADING).locator("li")).toHaveCount(1);
    await expect(dialog(page)).toBeHidden();
    expect(gaps).toHaveLength(2);
    const accepted = (await session(page))?.noticeVersion;
    expect(gaps[1]?.consent).toEqual({ noticeVersion: accepted });
    expect(letters).toHaveLength(1);
    expect(analyses).toHaveLength(1);
    await expect(page.getByText(EXAMPLE_CODE_SENTENCE)).toBeVisible();
  });
});
