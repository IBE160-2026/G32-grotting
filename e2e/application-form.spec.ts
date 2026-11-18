import { expect, test } from "@playwright/test";
import {
  AD,
  AD_ERROR,
  AD_UNCLEAR,
  CONFIRM,
  CV,
  CV_ERROR,
  confirmCv,
  cvField,
  DOCX,
  NARROW,
  openForm,
  PHONE,
  picker,
  SCANNED_PDF,
  SUBMIT,
  seriousFindings,
  session,
  TEXT_PDF,
  WIDE,
  WRONG_TYPE,
} from "./support/application";

test.describe("UX-DR36 Søknad form", () => {
  test("shows the heading, the CV slot, the job fields and the submit button", async ({
    page,
  }) => {
    await openForm(page);
    await expect(page).toHaveTitle("Søknad – JobAssistant");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ny søknad",
    );
    await expect(cvField(page)).toBeVisible();
    await expect(
      page.locator("form").getByText("0 av 20 000 tegn"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: CONFIRM })).toBeVisible();
    await expect(page.getByLabel("Stillingstittel")).toBeVisible();
    await expect(page.getByLabel("Arbeidsgiver")).toBeVisible();
    await expect(page.getByLabel("Stillingsannonse")).toBeVisible();
    await expect(
      page.getByText("Lim inn hele annonseteksten, minst 200 tegn."),
    ).toBeVisible();
    await expect(
      page.locator("form").getByText("0 av 15 000 tegn"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: SUBMIT })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Søknad", exact: true }).last(),
    ).toHaveAttribute("aria-current", "page");
  });

  test("offers a file upload for the CV only, above the ad, and no URL import", async ({
    page,
  }) => {
    await openForm(page);
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await expect(page.locator('input[type="url"]')).toHaveCount(0);
    const pickerBox = await page
      .locator("label:has(input[type=file])")
      .boundingBox();
    const adBox = await page.getByLabel("Stillingsannonse").boundingBox();
    expect(pickerBox?.y ?? 0).toBeLessThan(adBox?.y ?? 0);
  });

  test("follows the focus order file, CV, confirm, title, employer, example, ad, submit", async ({
    page,
  }) => {
    await openForm(page);
    await picker(page).focus();
    await page.keyboard.press("Tab");
    await expect(cvField(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: CONFIRM })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Stillingstittel")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Arbeidsgiver")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Bruk eksempelet" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Stillingsannonse")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: SUBMIT })).toBeFocused();
  });

  test("counts the ad as typed and speaks the count on blur", async ({
    page,
  }) => {
    await openForm(page);
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("a".repeat(3412));
    await expect(
      page.locator("form").getByText("3 412 av 15 000 tegn"),
    ).toBeVisible();
    await ad.blur();
    await expect(page.locator("#live-action")).toHaveText(
      "3 412 av 15 000 tegn",
    );
  });
});

test.describe("FR-4, NFR-5 wrong-input tour on the job fields", () => {
  test("input 1: an empty submit shows all errors, focuses the first and keeps what was typed", async ({
    page,
  }) => {
    await openForm(page);
    await cvField(page).fill("kort cv");
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("for kort");
    // Enter, not a click: leaving the ad raises its error, which moves the
    // button down between mouse-down and mouse-up.
    await page.getByRole("button", { name: SUBMIT }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await expect(
      page.locator("form").getByText("Fyll inn stillingstittelen."),
    ).toBeVisible();
    await expect(
      page.locator("form").getByText("Fyll inn arbeidsgiveren."),
    ).toBeVisible();
    await expect(page.locator("form").getByText(AD_ERROR)).toBeVisible();
    await expect(cvField(page)).toBeFocused();
    await expect(cvField(page)).toHaveAttribute("aria-invalid", "true");
    await expect(cvField(page)).toHaveValue("kort cv");
    await expect(ad).toHaveValue("for kort");
    await expect(page.locator("#live-action")).toHaveText(CV_ERROR);
  });

  test("input 1: tells which field is invalid when the first ones are fine", async ({
    page,
  }) => {
    await openForm(page);
    await confirmCv(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByLabel("Stillingsannonse")).toBeFocused();
    await expect(
      page.getByLabel("Stillingsannonse"),
    ).toHaveAccessibleDescription(
      /Lim inn hele annonseteksten.*Stillingsannonsen må være mellom/,
    );
  });

  test("input 4: an ad below 200 characters gives its error on blur and is kept", async ({
    page,
  }) => {
    await openForm(page);
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("a".repeat(199));
    await expect(page.locator("form").getByText(AD_ERROR)).toHaveCount(0);
    await ad.blur();
    await expect(page.locator("form").getByText(AD_ERROR)).toBeVisible();
    await expect(ad).toHaveValue("a".repeat(199));
    await ad.fill("a".repeat(200));
    await ad.blur();
    await expect(page.locator("form").getByText(AD_ERROR)).toHaveCount(0);
  });

  test("input 5: an ad above 15 000 characters gives its error and is not cut", async ({
    page,
  }) => {
    await openForm(page);
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("a".repeat(15_001));
    await expect(
      page.locator("form").getByText("15 001 av 15 000 tegn"),
    ).toBeVisible();
    await ad.blur();
    await expect(page.locator("form").getByText(AD_ERROR)).toBeVisible();
    await expect(ad).toHaveValue("a".repeat(15_001));
  });

  test("limits title and employer to 200 characters and needs real text", async ({
    page,
  }) => {
    await openForm(page);
    const title = page.getByLabel("Stillingstittel");
    const employer = page.getByLabel("Arbeidsgiver");
    await title.fill("t".repeat(201));
    await title.blur();
    await expect(
      page.locator("form").getByText("Maks 200 tegn."),
    ).toBeVisible();
    await expect(title).toHaveValue("t".repeat(201));
    await employer.fill("   ");
    await employer.blur();
    await expect(
      page.locator("form").getByText("Fyll inn arbeidsgiveren."),
    ).toBeVisible();
  });
});

test.describe("AD-16, AD-8 client session and applicationId", () => {
  test("keeps the fields over a refresh", async ({ page }) => {
    await openForm(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    await page.reload();
    await expect(page.getByLabel("Stillingstittel")).toHaveValue("Utvikler");
    await expect(page.getByLabel("Arbeidsgiver")).toHaveValue("Nordic Digital");
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(AD);
    expect((await session(page)).inputs).toEqual({
      jobTitle: "Utvikler",
      employer: "Nordic Digital",
      jobAd: AD,
    });
  });

  test("starts empty from a corrupt store", async ({ page }) => {
    await page.goto("/soknad");
    await page.evaluate(() =>
      sessionStorage.setItem("ja.session.v1", "{not json"),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Stillingstittel")).toHaveValue("");
    await expect(cvField(page)).toHaveValue("");
  });

  test("makes one applicationId on a valid submit, sends it with the request, and drops it on an edit", async ({
    page,
  }) => {
    // An answer that keeps the form, so the submit can be pressed again.
    const sent: string[] = [];
    await page.route("**/api/analyses", async (route) => {
      sent.push(route.request().postDataJSON().applicationId);
      await route.fulfill({
        status: 400,
        json: {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            field: "inputs.jobAd",
            retryable: false,
          },
        },
      });
    });
    await openForm(page);
    await confirmCv(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    const submit = page.getByRole("button", { name: SUBMIT });
    await submit.click();

    const first = (await session(page)).applicationId;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page.locator("form").getByText(AD_UNCLEAR)).toBeVisible();
    await submit.click();
    await expect.poll(() => sent.length).toBe(2);
    expect((await session(page)).applicationId).toBe(first);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: SUBMIT }).click();
    expect((await session(page)).applicationId).toBe(first);

    await page.getByLabel("Arbeidsgiver").fill("Annen AS");
    expect((await session(page)).applicationId).toBeUndefined();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect.poll(() => sent.length).toBe(4);
    const second = (await session(page)).applicationId;
    expect(second).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
    expect(sent).toEqual([first, first, first, second]);

    await page.getByRole("button", { name: "Endre CV-teksten" }).click();
    await cvField(page).fill(`${CV} Mer.`);
    expect((await session(page)).applicationId).toBeUndefined();
  });
});

test.describe("NFR-2 accessibility of Søknad", () => {
  for (const [name, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`has no serious axe findings at ${name}, empty, with errors and with the CV confirmed`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await openForm(page);
      expect(await seriousFindings(page)).toEqual([]);
      await page.getByRole("button", { name: SUBMIT }).click();
      await expect(
        page.locator("form").getByText("Fyll inn arbeidsgiveren."),
      ).toBeVisible();
      expect(await seriousFindings(page)).toEqual([]);
      await confirmCv(page);
      expect(await seriousFindings(page)).toEqual([]);
    });

    test(`has no serious axe findings at ${name} with the picker in its error and scanned states`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await openForm(page);
      await picker(page).setInputFiles(DOCX);
      await expect(page.locator("form").getByText(WRONG_TYPE)).toBeVisible();
      expect(await seriousFindings(page)).toEqual([]);
      await picker(page).setInputFiles(SCANNED_PDF);
      await expect(page.locator("form").getByRole("alert")).toBeVisible();
      expect(await seriousFindings(page)).toEqual([]);
      await picker(page).setInputFiles(TEXT_PDF);
      await expect(cvField(page)).toHaveValue(/Kari Nordmann/);
      expect(await seriousFindings(page)).toEqual([]);
    });
  }

  test("sits in one column with no horizontal scroll at 320 px", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW);
    await openForm(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    const overflow = () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
    await picker(page).setInputFiles(SCANNED_PDF);
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await picker(page).setInputFiles({
      name: `${"Helene_Grotting_CV_2026_final_v3_".repeat(4)}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("x"),
    });
    await expect(page.locator("form").getByText(/ · \d+ kB$/)).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await picker(page).setInputFiles({
      name: `${"en-veldig-lang-filnavn-".repeat(6)}.docx`,
      mimeType: "",
      buffer: Buffer.from("x"),
    });
    await expect(page.locator("form").getByText(WRONG_TYPE)).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await confirmCv(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
