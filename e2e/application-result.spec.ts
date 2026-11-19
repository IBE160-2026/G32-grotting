import { expect, type Page, test } from "@playwright/test";
import {
  AD_ERROR,
  AD_UNCLEAR,
  analysisCalls,
  box,
  CONFIRM,
  CV_ERROR,
  confirmCv,
  cvField,
  EXAMPLE_AD,
  EXAMPLE_KEY,
  EXAMPLE_MATCHED,
  EXAMPLE_META,
  EXAMPLE_MISSING,
  EXAMPLE_PARAGRAPHS,
  EXAMPLE_SENTENCE,
  EXAMPLE_TOTAL,
  exampleFile,
  fillExample,
  NARROW,
  NETWORK_FAILURE,
  NO_KEYWORDS,
  openForm,
  PHONE,
  picker,
  SUBMIT,
  seriousFindings,
  session,
  TEXT_PDF,
  trackApiCalls,
  WIDE,
} from "./support/application";

test.describe("FR-7, FR-8 Søknad result", () => {
  test("shows the score, the formula and both lists for the Example pair after one request", async ({
    page,
  }) => {
    const calls = analysisCalls(page);
    await fillExample(page);
    await page.getByRole("button", { name: SUBMIT }).click();

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText(EXAMPLE_META.employer);
    await expect(heading).toBeFocused();
    expect(calls).toHaveLength(1);
    await expect(page.locator("form")).toHaveCount(0);

    const credits = page.locator("dl");
    await expect(credits).toContainText(EXAMPLE_META.jobTitle);
    await expect(credits).toContainText(
      `${EXAMPLE_PARAGRAPHS} avsnitt · ${EXAMPLE_TOTAL} nøkkelord`,
    );
    await expect(credits).toContainText(/\d{1,2}\. [a-zæøå]+\.? 20\d\d/);

    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
      EXAMPLE_SENTENCE,
    );
    const verdict =
      EXAMPLE_KEY.score >= 70 ? "Sterkt samsvar" : "Bør forbedres";
    await expect(page.getByText(verdict, { exact: true })).toBeVisible();
    await expect(page.getByText("Formel", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        `${EXAMPLE_MATCHED} av ${EXAMPLE_TOTAL} nøkkelord funnet = ${EXAMPLE_KEY.score} %`,
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Et anslag på hvor mange av annonsens nøkkelord CV-en din dekker. Ikke en ekte ATS-vurdering, og ingen spådom om intervjusjanser.",
      ),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: "Funnet i CV-en" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Mangler i CV-en" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: /Funnet$/ }),
    ).toHaveCount(EXAMPLE_MATCHED);
    await expect(
      page.getByRole("heading", { level: 3, name: /Mangler$/ }),
    ).toHaveCount(EXAMPLE_MISSING);
    await expect(
      page.getByText(/^Bevis · CV-linje \d+ · annonsen avsnitt \d\d$/),
    ).toHaveCount(EXAMPLE_MATCHED);
    await expect(page.getByText(/^Fra annonsen · avsnitt \d\d$/)).toHaveCount(
      EXAMPLE_MISSING,
    );
    await expect(
      page.getByText(
        /^Annonsen ber om «.+»\. CV-en din viser det ikke ennå\.$/,
      ),
    ).toHaveCount(EXAMPLE_MISSING);
    await expect(page.locator("mark").first()).toBeVisible();
  });

  test("speaks the score sentence, the Verdict and what comes next once in the first live region", async ({
    page,
  }) => {
    // The Letter is held back, so the phase-1 line is still the one spoken.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/analyses/*/letter", async (route) => {
      await held;
      await route.continue();
    });
    await fillExample(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    const verdict =
      EXAMPLE_KEY.score >= 70 ? "sterkt samsvar" : "bør forbedres";
    await expect(page.locator("#live-phase")).toHaveText(
      `Samsvaret er klart: ${EXAMPLE_KEY.score} %, ${verdict}, ${EXAMPLE_MATCHED} av ${EXAMPLE_TOTAL} nøkkelord. Søknadsbrevet skrives nå.`,
    );
    release();
  });

  test("sends one request on a double click and keeps the button busy meanwhile", async ({
    page,
  }) => {
    const calls = analysisCalls(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/analyses", async (route) => {
      await held;
      await route.continue();
    });
    await fillExample(page);
    const submit = page.getByRole("button", { name: SUBMIT });
    await submit.dblclick();
    await expect(submit).toHaveAttribute("aria-disabled", "true");
    // A click while busy, past the actionability wait, does nothing.
    await submit.dispatchEvent("click");
    release();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      EXAMPLE_META.employer,
    );
    expect(calls).toHaveLength(1);
  });

  test("a too-short ad gives the alert at the Job ad field, focus there and no result", async ({
    page,
  }) => {
    await fillExample(page, NO_KEYWORDS);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("form").getByText(AD_UNCLEAR)).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(AD_UNCLEAR);
    await expect(page.getByLabel("Stillingsannonse")).toBeFocused();
    await expect(page.getByLabel("Stillingsannonse")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ny søknad",
    );
    await expect(page.getByText("samsvar –")).toHaveCount(0);
    // The message goes when the ad is edited.
    await page.getByLabel("Stillingsannonse").fill(EXAMPLE_AD);
    await expect(page.locator("form").getByText(AD_UNCLEAR)).toHaveCount(0);
  });

  test("a network failure shows the alert at the top, keeps the inputs and leaves focus on the button", async ({
    page,
  }) => {
    await page.route("**/api/analyses", (route) => route.abort());
    await fillExample(page);
    const submit = page.getByRole("button", { name: SUBMIT });
    await submit.click();
    await expect(page.locator("form").getByRole("alert").first()).toHaveText(
      `Feil${NETWORK_FAILURE}`,
    );
    await expect(submit).toBeFocused();
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(EXAMPLE_AD);
    await expect(page.getByLabel("Arbeidsgiver")).toHaveValue(
      EXAMPLE_META.employer,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ny søknad",
    );
    // Free again: the button is no longer busy.
    await expect(submit).not.toHaveAttribute("aria-disabled", "true");
  });

  test("«Endre annonsen» brings the form back with every input and focus on the h1", async ({
    page,
  }) => {
    await fillExample(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      EXAMPLE_META.employer,
    );
    await page.getByRole("button", { name: "Endre annonsen" }).click();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Ny søknad");
    await expect(heading).toBeFocused();
    await expect(page.getByLabel("Stillingstittel")).toHaveValue(
      EXAMPLE_META.jobTitle,
    );
    await expect(page.getByLabel("Arbeidsgiver")).toHaveValue(
      EXAMPLE_META.employer,
    );
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(EXAMPLE_AD);
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
    // It can be sent again without a new confirmation.
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      EXAMPLE_META.employer,
    );
  });

  test("a refresh shows the form with its inputs and no error", async ({
    page,
  }) => {
    await fillExample(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      EXAMPLE_META.employer,
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ny søknad",
    );
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(EXAMPLE_AD);
    await expect(page.getByLabel("Stillingstittel")).toHaveValue(
      EXAMPLE_META.jobTitle,
    );
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  });

  for (const [name, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
    ["320 px", NARROW],
  ] as const) {
    test(`has no serious axe findings and no horizontal scroll on the result at ${name}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await fillExample(page);
      await page.getByRole("button", { name: SUBMIT }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        EXAMPLE_META.employer,
      );
      expect(await seriousFindings(page)).toEqual([]);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("FR-27 «Bruk eksempelet» fills in the Example pair", () => {
  const USE_EXAMPLE = "Bruk eksempelet";
  const exampleButton = (page: Page) =>
    page.getByRole("button", { name: USE_EXAMPLE });

  test("sits between Arbeidsgiver and Stillingsannonse in the focus order", async ({
    page,
  }) => {
    await openForm(page);
    await expect(exampleButton(page)).toHaveAttribute("type", "button");
    await page.getByLabel("Arbeidsgiver").focus();
    await page.keyboard.press("Tab");
    await expect(exampleButton(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Stillingsannonse")).toBeFocused();
  });

  test("fills the four fields, confirms the CV, moves focus to the submit button and speaks", async ({
    page,
  }) => {
    const calls = trackApiCalls(page);
    await openForm(page);
    await exampleButton(page).click();

    await expect(page.getByLabel("Stillingstittel")).toHaveValue(
      EXAMPLE_META.jobTitle,
    );
    await expect(page.getByLabel("Arbeidsgiver")).toHaveValue(
      EXAMPLE_META.employer,
    );
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(
      EXAMPLE_AD.replace(/\r\n?/g, "\n"),
    );
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · .+ tegn$/),
    ).toBeVisible();
    await expect(cvField(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: SUBMIT })).toBeFocused();
    await expect(page.locator("#live-action")).toHaveText(
      "Eksempelet er fylt inn.",
    );
    const stored = (await session(page)).inputs;
    expect(stored.cvText).toBe(exampleFile("cv.txt").replace(/\r\n?/g, "\n"));
    expect(stored.cvDraft).toBe(stored.cvText);
    expect((await session(page)).applicationId).toBeUndefined();
    // The pair comes with the page: no request, no submit.
    expect(calls).toEqual([]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ny søknad",
    );
  });

  test("submitting after the fill gives the Answer key's score and lists", async ({
    page,
  }) => {
    await openForm(page);
    await exampleButton(page).click();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      EXAMPLE_META.employer,
    );
    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
      EXAMPLE_SENTENCE,
    );
    await expect(
      page.getByRole("heading", { level: 3, name: /Funnet$/ }),
    ).toHaveCount(EXAMPLE_MATCHED);
    await expect(
      page.getByRole("heading", { level: 3, name: /Mangler$/ }),
    ).toHaveCount(EXAMPLE_MISSING);
  });

  test("replaces typed text and clears the errors, collapsing a reopened CV", async ({
    page,
  }) => {
    await openForm(page);
    await confirmCv(page);
    await page.getByRole("button", { name: "Endre CV-teksten" }).click();
    await cvField(page).fill("for kort");
    await page.getByLabel("Stillingstittel").fill("Noe jeg skrev");
    await page.getByLabel("Stillingsannonse").fill("for kort");
    // Enter, not a click: the errors move the button.
    await page.getByRole("button", { name: SUBMIT }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await expect(page.locator("form").getByText(AD_ERROR)).toBeVisible();

    await exampleButton(page).click();
    await expect(page.locator("form").getByText(CV_ERROR)).toHaveCount(0);
    await expect(page.locator("form").getByText(AD_ERROR)).toHaveCount(0);
    await expect(
      page.locator("form").getByText("Fyll inn arbeidsgiveren."),
    ).toHaveCount(0);
    await expect(page.getByLabel("Stillingstittel")).toHaveValue(
      EXAMPLE_META.jobTitle,
    );
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
    await expect(cvField(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: SUBMIT })).toBeFocused();
  });

  test("a file answer that lands after the fill does not touch the Example text", async ({
    page,
  }) => {
    await openForm(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/cv/extract", async (route) => {
      await held;
      await route.continue();
    });
    await picker(page).setInputFiles(TEXT_PDF);
    await exampleButton(page).click();
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();

    const answered = page.waitForResponse("**/api/cv/extract");
    release();
    await answered;
    await page.waitForTimeout(500);
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
    await expect(cvField(page)).toHaveCount(0);
    expect((await session(page)).inputs.cvText).toBe(
      exampleFile("cv.txt").replace(/\r\n?/g, "\n"),
    );
  });

  test("an edit of the CV afterwards drops the confirmation", async ({
    page,
  }) => {
    await openForm(page);
    await exampleButton(page).click();
    await page.getByRole("button", { name: "Endre CV-teksten" }).click();
    await cvField(page).press("Control+End");
    await page.keyboard.type("!");
    await expect(page.getByRole("button", { name: CONFIRM })).toBeVisible();
    expect((await session(page)).inputs.cvText).toBeUndefined();
  });

  test("a refresh restores the values and the confirmed CV", async ({
    page,
  }) => {
    await openForm(page);
    await exampleButton(page).click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Stillingstittel")).toHaveValue(
      EXAMPLE_META.jobTitle,
    );
    await expect(page.getByLabel("Arbeidsgiver")).toHaveValue(
      EXAMPLE_META.employer,
    );
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
  });

  for (const [name, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`has no serious axe findings before and after the fill at ${name}, and no horizontal scroll`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await openForm(page);
      expect(await seriousFindings(page)).toEqual([]);
      const button = await box(exampleButton(page));
      expect(button.height).toBeGreaterThanOrEqual(44);
      await exampleButton(page).click();
      await expect(page.getByRole("button", { name: SUBMIT })).toBeFocused();
      expect(await seriousFindings(page)).toEqual([]);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
