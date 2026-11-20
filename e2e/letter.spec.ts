import { expect, type Page, test } from "@playwright/test";
import {
  analysisCalls,
  EXAMPLE_AD,
  EXAMPLE_CODE_SENTENCE,
  EXAMPLE_META,
  EXAMPLE_SCORE,
  EXAMPLE_SENTENCE,
  failure,
  failureBox,
  fillExample,
  LESS_PRECISE,
  LETTER_ONLY,
  LETTER_ROUTE,
  letterCalls,
  openForm,
  PHONE,
  SUBMIT,
  seriousFindings,
  session,
  shownLetter,
  TONES,
  type ToneName,
  toneRadio,
  WIDE,
} from "./support/application";

const USE_EXAMPLE = "Bruk eksempelet";
const letterSection = (page: Page) =>
  page.locator("section[aria-labelledby=letter-h2]");
const article = (page: Page) => page.locator("article");

// A Letter request is held until `release()`, then goes on to the server.
async function holdLetter(page: Page) {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(LETTER_ROUTE, async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

async function submitExample(page: Page, tone?: ToneName) {
  await openForm(page);
  await page.getByRole("button", { name: USE_EXAMPLE }).click();
  if (tone !== undefined) await toneRadio(page, tone).check();
  await page.getByRole("button", { name: SUBMIT }).click();
}

test.describe("FR-10 Tone choice on Søknad", () => {
  test("is a fieldset «Tone i brevet» with three radios, «Formell» preselected", async ({
    page,
  }) => {
    await openForm(page);
    const group = page.getByRole("group", { name: "Tone i brevet" });
    await expect(group).toBeVisible();
    await expect(group.getByRole("radio")).toHaveCount(3);
    await expect(
      page.getByRole("radio", { name: "Formell – Høflig og saklig" }),
    ).toBeChecked();
    await expect(
      page.getByRole("radio", { name: "Personlig – Varm, med «jeg» i front" }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("radio", { name: "Direkte – Kort, rett på sak" }),
    ).not.toBeChecked();
  });

  test("the arrow keys move within the group and the whole option is the hit area", async ({
    page,
  }) => {
    await openForm(page);
    await toneRadio(page, "Formell").focus();
    await page.keyboard.press("ArrowRight");
    await expect(toneRadio(page, "Personlig")).toBeChecked();
    await expect(toneRadio(page, "Personlig")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(toneRadio(page, "Direkte")).toBeChecked();
    // Clicking the hint text inside the option selects it.
    await page.getByText("Høflig og saklig").click();
    await expect(toneRadio(page, "Formell")).toBeChecked();
  });

  test("the radio is the one tab stop of the group", async ({ page }) => {
    await openForm(page);
    await page.getByLabel("Stillingsannonse").focus();
    await page.keyboard.press("Tab");
    await expect(toneRadio(page, "Formell")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: SUBMIT })).toBeFocused();
  });

  test("is kept in ja.session.v1 and comes back after a refresh", async ({
    page,
  }) => {
    await openForm(page);
    await toneRadio(page, "Direkte").check();
    expect((await session(page))?.tone).toBe("Direkte");
    await page.reload();
    await expect(toneRadio(page, "Direkte")).toBeChecked();
  });

  test("stacks at 640 px or less and has no serious axe finding", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await openForm(page);
    const first = await toneRadio(page, "Formell").boundingBox();
    const second = await toneRadio(page, "Personlig").boundingBox();
    expect(second?.y ?? 0).toBeGreaterThan((first?.y ?? 0) + 20);
    expect(await seriousFindings(page)).toEqual([]);
  });
});

test.describe("UJ-1 «Bruk eksempelet» in Test mode: the score, then the Letter", () => {
  // The Letter alone: with the Gap analysis on (the default) phase 2 has two
  // sections, which e2e/gaps.spec.ts covers.
  test.use({ baseURL: LETTER_ONLY });

  for (const tone of TONES) {
    test(`shows the score and the ${tone} Letter, and the Tone shown is the Tone requested`, async ({
      page,
    }) => {
      const calls = letterCalls(page);
      await submitExample(page, tone);

      await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
        EXAMPLE_SENTENCE,
      );
      await expect(article(page)).toBeVisible();
      const shown = (await article(page).textContent()) ?? "";
      const paragraphs = shownLetter(tone)
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph !== "");
      expect(paragraphs.length).toBeGreaterThan(2);
      for (const paragraph of paragraphs) expect(shown).toContain(paragraph);
      expect(shown).toContain("[Navnet ditt]");

      // The Tone requested, the Tone in the credits, the Tone of the Letter.
      expect(calls).toHaveLength(1);
      expect(calls[0]?.tone).toBe(tone);
      await expect(page.locator("dl")).toContainText("Tone");
      await expect(page.locator("dl")).toContainText(tone);
      // The score stays.
      await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    });
  }

  test("sends the inputs, the fingerprint, the Tone and consent (none in Test mode)", async ({
    page,
  }) => {
    const calls = letterCalls(page);
    await submitExample(page, "Personlig");
    await expect(article(page)).toBeVisible();
    expect(calls).toHaveLength(1);
    const [body] = calls;
    expect(body?.applicationId).toBe((await session(page)).applicationId);
    expect(body?.fingerprint).toMatch(/\S/);
    expect(body?.inputs.employer).toBe(EXAMPLE_META.employer);
    expect(body?.tone).toBe("Personlig");
    // The notice was never accepted, and Test mode never asks: no consent.
    expect(body?.consent).toBeNull();
  });

  test("the Letter view is read-only text under the AI label, with the heading «Søknadsbrev»", async ({
    page,
  }) => {
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toHaveAttribute("id", "letter-h2");
    await expect(article(page)).toHaveAttribute("aria-labelledby", "letter-h2");
    await expect(article(page)).toHaveAttribute(
      "aria-describedby",
      "letter-ai-label",
    );
    await expect(page.locator("#letter-ai-label")).toHaveText(
      "Utkast skrevet med KI – les gjennom og tilpass før du sender.",
    );
    await expect(page.locator("textarea, [contenteditable]")).toHaveCount(0);
    await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
    await expect(
      page.getByText("Skriver søknadsbrevet … dette tar under ett minutt."),
    ).toHaveCount(0);
  });

  test("does not move focus when the Letter arrives, and speaks the phase-2 line once", async ({
    page,
  }) => {
    await submitExample(page);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText(EXAMPLE_META.employer);
    await expect(heading).toBeFocused();
    await expect(article(page)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er klart.",
    );
    await expect(heading).toBeFocused();
  });

  test("speaks the phase-1 line, then the phase-2 line, even when the Letter arrives at once", async ({
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
    await page.getByRole("button", { name: USE_EXAMPLE }).click();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er klart.",
    );
    const spoken = await page.evaluate(
      () => (window as unknown as { spoken: string[] }).spoken,
    );
    expect(spoken).toHaveLength(2);
    expect(spoken[0]).toMatch(/Søknadsbrevet skrives nå\.$/);
    expect(spoken[1]).toBe("Søknadsbrevet er klart.");
  });

  test("a Tone in the session that is not a Tone reads as «Formell» and is never sent", async ({
    page,
  }) => {
    const calls = letterCalls(page);
    await openForm(page);
    await page.evaluate(() => {
      const raw = sessionStorage.getItem("ja.session.v1");
      const stored = raw === null ? { v: 1, inputs: {} } : JSON.parse(raw);
      sessionStorage.setItem(
        "ja.session.v1",
        JSON.stringify({ ...stored, tone: "Humoristisk" }),
      );
    });
    await page.reload();
    await expect(toneRadio(page, "Formell")).toBeChecked();
    await page.getByRole("button", { name: USE_EXAMPLE }).click();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(article(page)).toBeVisible();
    expect(calls.map((call) => call.tone)).toEqual(["Formell"]);
  });

  test("a Tone change after the result is used by the next submit", async ({
    page,
  }) => {
    const calls = letterCalls(page);
    await submitExample(page, "Formell");
    await expect(article(page)).toBeVisible();
    await page.getByRole("button", { name: "Endre annonsen" }).click();
    await toneRadio(page, "Direkte").check();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("dl")).toContainText("Direkte");
    expect(calls.map((call) => call.tone)).toEqual(["Formell", "Direkte"]);
  });
});

test.describe("NFR-4 phase 2 while the Letter is written", () => {
  // The Letter alone: with the Gap analysis on (the default) phase 2 has two
  // sections, which e2e/gaps.spec.ts covers.
  test.use({ baseURL: LETTER_ONLY });

  test("shows the progress line and the «Søknadsbrev» placeholder, then the Letter", async ({
    page,
  }) => {
    const release = await holdLetter(page);
    await submitExample(page);

    // The score is already there and phase 1 said what comes next.
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      /Søknadsbrevet skrives nå\.$/,
    );
    await expect(
      page.getByText("Skriver søknadsbrevet … dette tar under ett minutt."),
    ).toBeVisible();
    const slot = page.locator("section[aria-busy=true]");
    await expect(slot).toHaveCount(1);
    await expect(
      slot.getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toBeVisible();
    await expect(slot.getByText("Skrives", { exact: true })).toBeVisible();
    // The progress line is plain text: no role, not a live region.
    const line = page
      .getByText("Skriver søknadsbrevet … dette tar under ett minutt.")
      .locator("xpath=..");
    await expect(line).not.toHaveAttribute("role", /.+/);
    expect(await line.locator("[aria-live]").count()).toBe(0);
    expect(await seriousFindings(page)).toEqual([]);

    release();
    await expect(article(page)).toBeVisible();
    await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
  });

  test("the trace stops after 5 s at most", async ({ page }) => {
    const release = await holdLetter(page);
    await submitExample(page);
    const trace = page.locator(".progress-trace");
    await expect(trace).toBeVisible();
    const total = await trace.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        Number.parseFloat(style.animationDuration) *
        Number.parseFloat(style.animationIterationCount)
      );
    });
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(5);
    release();
  });

  test("the trace is static under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const release = await holdLetter(page);
    await submitExample(page);
    const trace = page.locator(".progress-trace");
    await expect(trace).toBeVisible();
    expect(
      await trace.evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
    ).toBe("none");
    release();
  });

  test("«Endre annonsen» while the Letter is written drops it: no Letter appears on the form", async ({
    page,
  }) => {
    const release = await holdLetter(page);
    await submitExample(page);
    await expect(page.locator("section[aria-busy=true]")).toBeVisible();
    await page.getByRole("button", { name: "Endre annonsen" }).click();
    await expect(page.getByRole("button", { name: SUBMIT })).toBeVisible();
    release();
    await page.waitForTimeout(500);
    await expect(article(page)).toHaveCount(0);
    await expect(page.locator("section[aria-busy=true]")).toHaveCount(0);
  });
});

test.describe("AD-6 ANALYSIS_STALE", () => {
  test("reruns phase 1 once, without a message, and resends the Letter request", async ({
    page,
  }) => {
    const analyses = analysisCalls(page);
    const letters = letterCalls(page);
    let first = true;
    await page.route(LETTER_ROUTE, async (route) => {
      if (first) {
        first = false;
        await route.fulfill({ json: failure("ANALYSIS_STALE") });
        return;
      }
      await route.continue();
    });
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    expect(analyses).toHaveLength(2);
    expect(letters).toHaveLength(2);
    // The rerun gave the same result: nothing to announce.
    await expect(page.locator("#live-action")).not.toContainText("oppdatert");
    await expect(
      failureBox(page, "Søknadsbrevet kunne ikke lages."),
    ).toHaveCount(0);
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
  });

  test("a second ANALYSIS_STALE shows the section error", async ({ page }) => {
    const letters = letterCalls(page);
    await page.route(LETTER_ROUTE, (route) =>
      route.fulfill({ json: failure("ANALYSIS_STALE") }),
    );
    await submitExample(page);
    await expect(
      failureBox(page, "Søknadsbrevet kunne ikke lages."),
    ).toBeVisible();
    expect(letters).toHaveLength(2);
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
  });
});

test.describe("AD-6 a silent rerun that changes the score", () => {
  test("is said once in the second live region", async ({ page }) => {
    let letters = 0;
    await page.route(LETTER_ROUTE, async (route) => {
      letters += 1;
      if (letters === 1) {
        await route.fulfill({ json: failure("ANALYSIS_STALE") });
        return;
      }
      await route.continue();
    });
    let analyses = 0;
    await page.route("**/api/analyses", async (route) => {
      analyses += 1;
      if (analyses === 1) {
        await route.continue();
        return;
      }
      // The rerun comes back with another score.
      const response = await route.fetch();
      const body = await response.json();
      body.data.result.score = Math.max(0, body.data.result.score - 10);
      await route.fulfill({ response, json: body });
    });
    await submitExample(page);
    await expect(article(page)).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(
      /^Samsvaret er oppdatert: \d+ %, .+, \d+ av \d+ nøkkelord\.$/,
    );
    await expect(
      page.getByText(`${EXAMPLE_SCORE - 10} % samsvar`),
    ).toBeVisible();
  });
});

test.describe("NFR-5 a Letter that cannot be written keeps the score", () => {
  // The Letter alone: with the Gap analysis on (the default) phase 2 has two
  // sections, which e2e/gaps.spec.ts covers.
  test.use({ baseURL: LETTER_ONLY });

  test("the failure is spoken once: the box is silent, the first live region names the section", async ({
    page,
  }) => {
    await page.route(LETTER_ROUTE, (route) =>
      route.fulfill({ status: 502, json: failure("AI_TIMEOUT", true) }),
    );
    await submitExample(page);
    await expect(
      failureBox(
        page,
        "Søknadsbrevet kunne ikke lages. Samsvaret over er fortsatt riktig.",
      ),
    ).toBeVisible();
    await expect(letterSection(page).getByRole("alert")).toHaveCount(0);
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
    );
    await expect(
      letterSection(page).getByRole("button", { name: "Prøv igjen" }),
    ).toBeVisible();
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
  });

  test("«Prøv igjen» speaks its outcome in the second live region, also when it fails again", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    const analyses = analysisCalls(page);
    let sent = 0;
    await page.route(LETTER_ROUTE, async (route) => {
      sent += 1;
      if (sent <= 2) {
        await route.fulfill({
          status: 502,
          json: failure("AI_PROVIDER_ERROR", true),
        });
        return;
      }
      await route.continue();
    });
    await submitExample(page);
    const retry = letterSection(page).getByRole("button", {
      name: "Prøv igjen",
    });
    await expect(retry).toBeVisible();
    await expect(page.locator("#live-action")).not.toContainText(
      "Søknadsbrevet",
    );
    await retry.click();
    // Failed again: the second region says so, focus is on the h2, the retry is back.
    await expect(page.locator("#live-action")).toHaveText(
      "Søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toBeFocused();
    await retry.click();
    await expect(article(page)).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(
      "Søknadsbrevet er klart.",
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toBeFocused();
    expect(letters).toHaveLength(3);
    expect(analyses).toHaveLength(1);
  });

  test("a double press on «Prøv igjen» sends one Letter request", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    let sent = 0;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(LETTER_ROUTE, async (route) => {
      sent += 1;
      if (sent === 1) {
        await route.fulfill({
          status: 502,
          json: failure("AI_PROVIDER_ERROR", true),
        });
        return;
      }
      await held;
      await route.continue();
    });
    await submitExample(page);
    const retry = letterSection(page).getByRole("button", {
      name: "Prøv igjen",
    });
    await retry.dblclick();
    release();
    await expect(article(page)).toBeVisible();
    expect(letters).toHaveLength(2);
  });

  test("a provider failure becomes an alert with «Prøv igjen», which resends only the Letter request", async ({
    page,
  }) => {
    const analyses = analysisCalls(page);
    const letters = letterCalls(page);
    let first = true;
    await page.route(LETTER_ROUTE, async (route) => {
      if (first) {
        first = false;
        await route.fulfill({
          status: 502,
          json: failure("AI_PROVIDER_ERROR", true),
        });
        return;
      }
      await route.continue();
    });
    await submitExample(page);
    await expect(
      failureBox(
        page,
        "Søknadsbrevet kunne ikke lages. Samsvaret over er fortsatt riktig.",
      ),
    ).toBeVisible();
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
    );

    await letterSection(page)
      .getByRole("button", { name: "Prøv igjen" })
      .click();
    await expect(article(page)).toBeVisible();
    // The button went away; focus stays on the section heading, which is the
    // same element before and after the Letter arrives.
    await expect(
      page.getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toBeFocused();
    expect(letters).toHaveLength(2);
    expect(analyses).toHaveLength(1);
  });

  test("the Daily cap is a notice «Dagens grense» with no retry", async ({
    page,
  }) => {
    await page.route(LETTER_ROUTE, (route) =>
      route.fulfill({ status: 429, json: failure("DAILY_CAP_REACHED") }),
    );
    await submitExample(page);
    await expect(
      letterSection(page).getByText("Dagens grense", { exact: true }),
    ).toBeVisible();
    await expect(letterSection(page)).toContainText(
      "Du har brukt dagens 30 KI-forespørsler. Grensen nullstilles ved midnatt.",
    );
    await expect(letterSection(page).getByRole("button")).toHaveCount(0);
    await expect(failureBox(page, "kunne ikke lages")).toHaveCount(0);
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
  });

  test("inputs that are not a Fixture give the «Testmodus» notice, and the score stays", async ({
    page,
  }) => {
    // The Example pair with one more paragraph: no Cached Letter exists for it.
    await fillExample(
      page,
      `${EXAMPLE_AD}

Vi tilbyr også fleksibel arbeidstid.`,
    );
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(
      letterSection(page).getByText("Testmodus", { exact: true }),
    ).toBeVisible();
    await expect(letterSection(page)).toContainText(
      "Ikke tilgjengelig i testmodus. Bruk eksempelet for å se hele flyten.",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      EXAMPLE_META.employer,
    );
    // No Cached Keyword list exists for this ad either (FR-5b): the score is
    // built on the code-only list and says so.
    await expect(page.getByText(EXAMPLE_CODE_SENTENCE)).toBeVisible();
    await expect(page.getByText(LESS_PRECISE)).toBeVisible();
    await expect(page.locator("#live-phase")).toHaveText(
      "Søknadsbrevet er ikke tilgjengelig i testmodus.",
    );
  });
});

test.describe("NFR-5 a double submit and a refresh while the Letter is written", () => {
  // The Letter alone: with the Gap analysis on (the default) phase 2 has two
  // sections, which e2e/gaps.spec.ts covers.
  test.use({ baseURL: LETTER_ONLY });

  test("a double click on submit starts one Application and one Letter request", async ({
    page,
  }) => {
    const analyses = analysisCalls(page);
    const letters = letterCalls(page);
    await openForm(page);
    await page.getByRole("button", { name: USE_EXAMPLE }).click();
    await page.getByRole("button", { name: SUBMIT }).dblclick();
    await expect(article(page)).toBeVisible();
    expect(analyses).toHaveLength(1);
    expect(letters).toHaveLength(1);
  });

  test("a refresh brings the form back with its inputs and no error page; the next submit reuses the Application id", async ({
    page,
  }) => {
    const letters = letterCalls(page);
    let first = true;
    await page.route(LETTER_ROUTE, async (route) => {
      if (first) {
        first = false;
        // Never answered: the page is gone before it is.
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.abort().catch(() => {});
        return;
      }
      await route.continue();
    });
    await openForm(page);
    await page.getByRole("button", { name: USE_EXAMPLE }).click();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByText("Skriver søknadsbrevet")).toBeVisible();
    const applicationId = (await session(page))?.applicationId;
    expect(applicationId).toMatch(/^[0-9a-f-]{36}$/);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ny søknad",
    );
    await expect(page.getByLabel("Stillingstittel")).toHaveValue(
      EXAMPLE_META.jobTitle,
    );
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(article(page)).toBeVisible();
    expect(letters.map((call) => call.applicationId)).toEqual([
      applicationId,
      applicationId,
    ]);
  });
});

for (const [name, size] of [
  ["1280 px", WIDE],
  ["360 px", PHONE],
] as const) {
  test(`UX-DR28 the result with the Letter has no serious axe finding and no overflow at ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await submitExample(page, "Personlig");
    await expect(article(page)).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}
