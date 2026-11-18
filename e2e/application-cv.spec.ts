import { expect, test } from "@playwright/test";
import {
  AD,
  AMBER,
  CONFIRM,
  CV,
  CV_ERROR,
  confirmCv,
  cvField,
  DOCX,
  EDGE,
  extractCalls,
  NETWORK_FAILURE,
  NOT_CONFIRMED,
  openForm,
  PASTE_HINT,
  picker,
  pickerRow,
  RUST,
  SCANNED,
  SCANNED_PDF,
  SUBMIT,
  session,
  TEXT_PDF,
  TOO_LARGE,
  trackApiCalls,
  WRONG_TYPE,
} from "./support/application";

test.describe("FR-2, FR-3 the CV slot", () => {
  test("sits above the job fields with the CV text in DM Mono", async ({
    page,
  }) => {
    await openForm(page);
    const cvBox = await cvField(page).boundingBox();
    const titleBox = await page.getByLabel("Stillingstittel").boundingBox();
    expect(cvBox?.y ?? 0).toBeLessThan(titleBox?.y ?? 0);
    expect(
      await cvField(page).evaluate((el) => getComputedStyle(el).fontFamily),
    ).toMatch(/DM Mono/i);
  });

  test("input 2: text below 200 or above 20 000 characters gives its error and is kept", async ({
    page,
  }) => {
    await openForm(page);
    const cv = cvField(page);
    await cv.fill("a".repeat(199));
    await expect(page.locator("form").getByText(CV_ERROR)).toHaveCount(0);
    await cv.blur();
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await expect(cv).toHaveValue("a".repeat(199));
    await cv.fill("a".repeat(20_001));
    await expect(
      page.locator("form").getByText("20 001 av 20 000 tegn"),
    ).toBeVisible();
    await cv.blur();
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await expect(cv).toHaveValue("a".repeat(20_001));
    await cv.fill("a".repeat(200));
    await cv.blur();
    await expect(page.locator("form").getByText(CV_ERROR)).toHaveCount(0);
  });

  test("does not confirm text that is too short and keeps focus in the field", async ({
    page,
  }) => {
    await openForm(page);
    await cvField(page).fill("for kort");
    await page.getByRole("button", { name: CONFIRM }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await expect(cvField(page)).toBeFocused();
    expect((await session(page)).inputs.cvText).toBeUndefined();
  });

  test("collapses to the confirmed line with the count and moves focus to the way back", async ({
    page,
  }) => {
    await openForm(page);
    await confirmCv(page, "a".repeat(3412));
    await expect(
      page.locator("form").getByText("CV-tekst bekreftet · 3 412 tegn"),
    ).toBeVisible();
    await expect(cvField(page)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Endre CV-teksten" }),
    ).toBeFocused();
    await expect(page.locator("#live-action")).toHaveText(
      "CV-tekst bekreftet · 3 412 tegn",
    );
    expect((await session(page)).inputs.cvText).toBe("a".repeat(3412));
  });

  test("reopens with the text and focus in the field; an edit clears the confirmation", async ({
    page,
  }) => {
    await openForm(page);
    await confirmCv(page);
    await page.getByRole("button", { name: "Endre CV-teksten" }).click();
    const cv = cvField(page);
    await expect(cv).toBeFocused();
    await expect(cv).toHaveValue(CV);
    expect((await session(page)).inputs.cvText).toBe(CV);
    await cv.press("Control+End");
    await page.keyboard.type("!");
    expect((await session(page)).inputs.cvText).toBeUndefined();
    expect((await session(page)).inputs.cvDraft).toBe(`${CV}!`);
    await expect(page.getByRole("button", { name: CONFIRM })).toBeVisible();
  });

  test("confirms on the first click after fixing a CV error, which the blur would otherwise move away from", async ({
    page,
  }) => {
    await openForm(page);
    await cvField(page).fill("for kort");
    await cvField(page).blur();
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await cvField(page).fill(CV);
    await page.getByRole("button", { name: CONFIRM }).click();
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
    expect((await session(page)).inputs.cvText).toBe(CV);
  });

  test("FR-3: a submit without confirmation is blocked, with the message and focus at the CV field", async ({
    page,
  }) => {
    const apiCalls = trackApiCalls(page);
    await openForm(page);
    await cvField(page).fill(CV);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("form").getByText(NOT_CONFIRMED)).toBeVisible();
    await expect(cvField(page)).toBeFocused();
    await expect(page.locator("#live-action")).toHaveText(NOT_CONFIRMED);
    expect((await session(page)).applicationId).toBeUndefined();
    expect(apiCalls).toEqual([]);
  });

  test("FR-3: leaving the field keeps the missing-confirmation message", async ({
    page,
  }) => {
    await openForm(page);
    await cvField(page).fill(CV);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("form").getByText(NOT_CONFIRMED)).toBeVisible();
    await cvField(page).blur();
    await expect(page.locator("form").getByText(NOT_CONFIRMED)).toBeVisible();
  });

  test("FR-3: after an edit and a new confirmation the held text is the edited text", async ({
    page,
  }) => {
    await openForm(page);
    await confirmCv(page);
    await page.getByRole("button", { name: "Endre CV-teksten" }).click();
    const edited = `${CV} Jeg har også brukt Playwright.`;
    await cvField(page).fill(edited);
    await page.getByRole("button", { name: CONFIRM }).click();
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
    expect((await session(page)).inputs.cvText).toBe(edited);
    expect((await session(page)).inputs.cvDraft).toBe(edited);
  });

  test("AD-16: the confirmed text comes back after a refresh and nothing is sent", async ({
    page,
  }) => {
    const apiCalls = trackApiCalls(page);
    await openForm(page);
    await confirmCv(page, "a".repeat(3412));
    await page.reload();
    await expect(
      page.locator("form").getByText("CV-tekst bekreftet · 3 412 tegn"),
    ).toBeVisible();
    expect((await session(page)).inputs.cvText).toBe("a".repeat(3412));
    expect(apiCalls).toEqual([]);
  });

  test("keeps an unconfirmed draft over a refresh, still unconfirmed", async ({
    page,
  }) => {
    await openForm(page);
    await cvField(page).fill(CV);
    await page.reload();
    await expect(cvField(page)).toHaveValue(CV);
    await expect(page.getByRole("button", { name: CONFIRM })).toBeVisible();
  });
});

test.describe("FR-1 CV file picker", () => {
  test("is one tab stop: a visually hidden native input named for screen readers, with «Velg fil» as its label", async ({
    page,
  }) => {
    await openForm(page);
    const input = picker(page);
    await expect(input).toHaveAttribute("type", "file");
    await expect(input).toHaveAttribute("accept", ".pdf,.txt");
    expect(await input.evaluate((el) => getComputedStyle(el).display)).not.toBe(
      "none",
    );
    const label = page.locator("label:has(input[type=file])");
    await expect(label).toHaveText("Velg fil");
    await expect(label).toBeVisible();
    // Backwards from the CV field: one stop, then the page before the form.
    await cvField(page).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(input).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(input).not.toBeFocused();
    await expect(cvField(page)).not.toBeFocused();
  });

  test("draws the amber ring on the label while the input has keyboard focus", async ({
    page,
  }) => {
    await openForm(page);
    const label = page.locator("label:has(input[type=file])");
    const outline = () =>
      label.evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.outlineStyle, style.outlineWidth, style.outlineColor];
      });
    expect((await outline())[0]).toBe("none");
    await cvField(page).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(picker(page)).toBeFocused();
    // The colour is read once the button's colour transition has ended.
    await expect.poll(outline).toEqual(["solid", "2px", AMBER]);
  });

  test("input 2: a .docx is rejected in the field before any request, and the CV text is untouched", async ({
    page,
  }) => {
    const calls = extractCalls(page);
    await openForm(page);
    await cvField(page).fill(CV);
    await picker(page).setInputFiles(DOCX);
    await expect(page.locator("form").getByText(WRONG_TYPE)).toBeVisible();
    await expect(picker(page)).toHaveAttribute("aria-invalid", "true");
    await expect(picker(page)).toHaveAccessibleDescription(
      `Feil ${WRONG_TYPE}`,
    );
    await expect(pickerRow(page)).toHaveCSS("border-top-color", RUST);
    await expect(page.locator("#live-action")).toHaveText(WRONG_TYPE);
    await expect(page.locator("form").getByText(/^cv\.docx · /)).toBeVisible();
    await expect(cvField(page)).toHaveValue(CV);
    expect(calls).toEqual([]);
  });

  test("input 3: a file of 2 MB and one byte is rejected in the field before any request", async ({
    page,
  }) => {
    const calls = extractCalls(page);
    await openForm(page);
    await cvField(page).fill(CV);
    await picker(page).setInputFiles({
      name: "stor.txt",
      mimeType: "text/plain",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1, "a"),
    });
    await expect(page.locator("form").getByText(TOO_LARGE)).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(TOO_LARGE);
    await expect(cvField(page)).toHaveValue(CV);
    expect(calls).toEqual([]);
  });

  test("the type is judged by the extension, in any case, and a rejection clears on the next choice", async ({
    page,
  }) => {
    await openForm(page);
    await picker(page).setInputFiles({
      name: "CV.TXT",
      mimeType: "",
      buffer: Buffer.from(CV),
    });
    await expect(cvField(page)).toHaveValue(CV);
    await picker(page).setInputFiles(DOCX);
    await expect(page.locator("form").getByText(WRONG_TYPE)).toBeVisible();
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(page.locator("form").getByText(WRONG_TYPE)).toHaveCount(0);
  });

  test("a text PDF fills the CV field unconfirmed, moves focus there and stores no file name", async ({
    page,
  }) => {
    await openForm(page);
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(cvField(page)).toHaveValue(/Kari Nordmann/);
    await expect(cvField(page)).toBeFocused();
    await expect(page.getByRole("button", { name: CONFIRM })).toBeVisible();
    await expect(
      page.locator("form").getByText(/^text-cv\.pdf · /),
    ).toBeVisible();
    const stored = await session(page);
    expect(stored.inputs.cvDraft).toMatch(/Kari Nordmann/);
    expect(stored.inputs.cvText).toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain("text-cv");

    // It cannot be used until confirmed (FR-3).
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("form").getByText(NOT_CONFIRMED)).toBeVisible();
    await page.getByRole("button", { name: CONFIRM }).click();
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
    expect(JSON.stringify(await session(page))).not.toContain("text-cv");
  });

  test("a TXT with CRLF fills the field with LF", async ({ page }) => {
    await openForm(page);
    await picker(page).setInputFiles({
      name: "cv.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("a\r\nb"),
    });
    await expect(cvField(page)).toHaveValue("a\nb");
    expect((await session(page)).inputs.cvDraft).toBe("a\nb");
  });

  test("judges the length of the extracted text at once and keeps it", async ({
    page,
  }) => {
    await openForm(page);
    await picker(page).setInputFiles({
      name: "kort.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("for kort"),
    });
    await expect(cvField(page)).toHaveValue("for kort");
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
  });

  test("replaces typed text, and the same file can be chosen again", async ({
    page,
  }) => {
    const calls = extractCalls(page);
    await openForm(page);
    await cvField(page).fill("Noe jeg skrev selv.");
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(cvField(page)).toHaveValue(/Kari Nordmann/);
    await cvField(page).fill("Skrevet på nytt.");
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(cvField(page)).toHaveValue(/Kari Nordmann/);
    expect(calls).toHaveLength(2);
  });

  test("a new file after a confirmed text clears the confirmation and the applicationId", async ({
    page,
  }) => {
    await openForm(page);
    await confirmCv(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    await page.getByRole("button", { name: SUBMIT }).click();
    expect((await session(page)).applicationId).toMatch(/^[0-9a-f-]{36}$/);
    await expect(picker(page)).toHaveCount(0);

    await page.getByRole("button", { name: "Endre CV-teksten" }).click();
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(cvField(page)).toHaveValue(/Kari Nordmann/);
    const stored = await session(page);
    expect(stored.applicationId).toBeUndefined();
    expect(stored.inputs.cvText).toBeUndefined();
    await expect(page.getByRole("button", { name: CONFIRM })).toBeVisible();
  });

  test("shows the file name with the extracting line while the text is fetched", async ({
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
    await expect(
      page.locator("form").getByText("Henter ut teksten fra CV-en …"),
    ).toBeVisible();
    await expect(
      page.locator("form").getByText(/^text-cv\.pdf · \d+ kB$/),
    ).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(
      "Henter ut teksten fra CV-en …",
    );
    release();
    await expect(
      page.locator("form").getByText("Henter ut teksten fra CV-en …"),
    ).toHaveCount(0);
    await expect(cvField(page)).toHaveValue(/Kari Nordmann/);
  });

  test("the newest choice wins over a slower answer to an older one", async ({
    page,
  }) => {
    await openForm(page);
    let releaseFirst: () => void = () => {};
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let count = 0;
    await page.route("**/api/cv/extract", async (route) => {
      count += 1;
      if (count === 1) await first;
      await route.continue();
    });
    await picker(page).setInputFiles(TEXT_PDF);
    await picker(page).setInputFiles({
      name: "ny.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(CV),
    });
    await expect(cvField(page)).toHaveValue(CV);
    releaseFirst();
    await page.waitForTimeout(500);
    await expect(cvField(page)).toHaveValue(CV);
    await expect(page.locator("form").getByText(/^ny\.txt · /)).toBeVisible();
  });

  test("a scanned PDF shows the alert, a rust border, the other-file button and the hint, and focus goes to the field", async ({
    page,
  }) => {
    await openForm(page);
    await cvField(page).fill("Tekst jeg skrev først.");
    await picker(page).setInputFiles(SCANNED_PDF);
    const alert = page.locator("form").getByRole("alert");
    await expect(alert).toHaveText(`Feil${SCANNED}`);
    await expect(pickerRow(page)).toHaveCSS("border-top-color", RUST);
    await expect(page.locator("label:has(input[type=file])")).toHaveText(
      "Velg en annen fil",
    );
    await expect(page.locator("form").getByText(PASTE_HINT)).toBeVisible();
    await expect(cvField(page)).toBeFocused();
    await expect(cvField(page)).toHaveValue("Tekst jeg skrev først.");
    expect(JSON.stringify(await session(page))).not.toContain("scanned");

    // The state is never stored: a refresh starts clean.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
    await expect(page.locator("form").getByText(PASTE_HINT)).toHaveCount(0);
  });

  test("choosing another file clears the scanned state", async ({ page }) => {
    await openForm(page);
    await picker(page).setInputFiles(SCANNED_PDF);
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
    await expect(page.locator("form").getByText(PASTE_HINT)).toHaveCount(0);
    await expect(page.locator("label:has(input[type=file])")).toHaveText(
      "Velg fil",
    );
    await expect(pickerRow(page)).toHaveCSS("border-top-color", EDGE);
    await expect(cvField(page)).toHaveValue(/Kari Nordmann/);
  });

  test("a PDF the server cannot open is a wrong type, shown in the field", async ({
    page,
  }) => {
    await openForm(page);
    await picker(page).setInputFiles({
      name: "falsk.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("dette er ikke en PDF"),
    });
    await expect(page.locator("form").getByText(WRONG_TYPE)).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(WRONG_TYPE);
    await expect(cvField(page)).toHaveValue("");
  });

  test("an answer that lands after the CV was confirmed does not touch the confirmed text", async ({
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
    await confirmCv(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    await page.getByRole("button", { name: SUBMIT }).click();
    const id = (await session(page)).applicationId;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const answered = page.waitForResponse("**/api/cv/extract");
    release();
    await answered;
    await page.waitForTimeout(500);
    await expect(
      page.locator("form").getByText(/^CV-tekst bekreftet · /),
    ).toBeVisible();
    const stored = await session(page);
    expect(stored.inputs.cvText).toBe(CV);
    expect(stored.applicationId).toBe(id);
  });

  for (const [name, file] of [
    ["a scanned PDF", SCANNED_PDF],
    ["a rejected .docx", DOCX],
  ] as const) {
    test(`confirming the CV resets the picker after ${name}`, async ({
      page,
    }) => {
      await openForm(page);
      await picker(page).setInputFiles(file);
      await expect(page.locator("form").getByText(/ · \d+ kB$/)).toBeVisible();
      await confirmCv(page);
      await page.getByRole("button", { name: "Endre CV-teksten" }).click();
      await expect(page.locator("label:has(input[type=file])")).toHaveText(
        "Velg fil",
      );
      await expect(page.locator("form").getByText(/ · \d+ kB$/)).toHaveCount(0);
      await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
      await expect(page.locator("form").getByText(WRONG_TYPE)).toHaveCount(0);
      await expect(page.locator("form").getByText(PASTE_HINT)).toHaveCount(0);
      await expect(pickerRow(page)).toHaveCSS("border-top-color", EDGE);
    });
  }

  test("a network failure shows the network alert, keeps the text and leaves focus on the picker", async ({
    page,
  }) => {
    await openForm(page);
    await cvField(page).fill(CV);
    await page.route("**/api/cv/extract", (route) => route.abort());
    await picker(page).focus();
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(page.locator("form").getByRole("alert")).toHaveText(
      `Feil${NETWORK_FAILURE}`,
    );
    await expect(cvField(page)).toHaveValue(CV);
    await expect(picker(page)).toBeFocused();
  });
});
