import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 800 };
const NARROW = { width: 320, height: 800 };

const AD = "Vi søker en utvikler med erfaring fra React. ".repeat(6);
const AD_ERROR = "Stillingsannonsen må være mellom 200 og 15 000 tegn.";
const CV =
  "Jeg har to års erfaring som frontendutvikler med React og TypeScript. ".repeat(
    4,
  );
const CV_ERROR = "CV-teksten må være mellom 200 og 20 000 tegn.";
const NOT_CONFIRMED = "Bekreft CV-teksten før du går videre.";
const CONFIRM = "Bekreft CV-teksten";
const SUBMIT = "Analyser og skriv utkast";
const PICKER_NAME = "Velg fil, PDF eller TXT, maks 2 MB";
const WRONG_TYPE = "Bare PDF- og TXT-filer støttes.";
const TOO_LARGE = "Filen er for stor.";
const SCANNED =
  "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Lim inn teksten fra CV-en din i stedet.";
const PASTE_HINT = "Lim inn teksten her. Minst 200 tegn.";
const NETWORK_FAILURE =
  "Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.";
const RUST = "rgb(224, 120, 79)";
const EDGE = "rgb(163, 140, 112)";
const AMBER = "rgb(236, 171, 63)";
const FILES = fileURLToPath(new URL("./files/", import.meta.url));
const TEXT_PDF = `${FILES}text-cv.pdf`;
const SCANNED_PDF = `${FILES}scanned.pdf`;
const DOCX = `${FILES}cv.docx`;

// The Example pair and its Answer key: the counts the result must show come
// from the key, not from numbers typed here (SM-2).
const EXAMPLE = fileURLToPath(
  new URL("../data/fixtures/example-nordic-digital/", import.meta.url),
);
const exampleFile = (name: string) => readFileSync(`${EXAMPLE}${name}`, "utf8");
const EXAMPLE_META = JSON.parse(exampleFile("meta.json")) as {
  jobTitle: string;
  employer: string;
};
const EXAMPLE_KEY = JSON.parse(exampleFile("answer-key.json")) as {
  keywords: { matched: string[]; missing: string[] };
  score: number;
};
const EXAMPLE_AD = exampleFile("ad.txt");
const EXAMPLE_PARAGRAPHS = EXAMPLE_AD.replace(/\r\n?/g, "\n")
  .split(/\n(?:[^\S\n]*\n)+/)
  .filter((paragraph) => paragraph.trim() !== "").length;
const EXAMPLE_MATCHED = EXAMPLE_KEY.keywords.matched.length;
const EXAMPLE_MISSING = EXAMPLE_KEY.keywords.missing.length;
const EXAMPLE_TOTAL = EXAMPLE_MATCHED + EXAMPLE_MISSING;
const EXAMPLE_SENTENCE = `${EXAMPLE_KEY.score} % samsvar – ${EXAMPLE_MATCHED} av ${EXAMPLE_TOTAL} nøkkelord`;
// Words of no use as Keywords, long enough to pass the length check.
const NO_KEYWORDS =
  "Vi er et selskap som holder til i Oslo og har kontor. ".repeat(6);
const AD_UNCLEAR =
  "Annonsen er for kort eller uklar til å analyseres. Lim inn hele stillingsannonsen, også kravene.";

async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

// The form fills itself from the tab's session after it has mounted; typing
// before that would be overwritten.
async function openForm(page: Page) {
  await page.goto("/soknad");
  await page.waitForLoadState("networkidle");
}

function cvField(page: Page) {
  return page.getByLabel("CV-tekst", { exact: true });
}

// Paste a CV and confirm it; the slot collapses to the confirmed line.
async function confirmCv(page: Page, text: string = CV) {
  await cvField(page).fill(text);
  await page.getByRole("button", { name: CONFIRM }).click();
  await expect(
    page.locator("form").getByText(/^CV-tekst bekreftet · /),
  ).toBeVisible();
}

async function session(page: Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem("ja.session.v1");
    return raw === null ? null : JSON.parse(raw);
  });
}

function picker(page: Page) {
  return page.getByLabel(PICKER_NAME);
}

// The row around the picker: its border carries the error state.
function pickerRow(page: Page) {
  return page.locator("label:has(input[type=file])").locator("xpath=..");
}

function extractCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/cv/extract") {
      calls.push(request.url());
    }
  });
  return calls;
}

function trackApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      calls.push(request.url());
    }
  });
  return calls;
}

// Fills the form with the Example pair and confirms the CV.
async function fillExample(page: Page, jobAd: string = EXAMPLE_AD) {
  await openForm(page);
  await confirmCv(page, exampleFile("cv.txt"));
  await page.getByLabel("Stillingstittel").fill(EXAMPLE_META.jobTitle);
  await page.getByLabel("Arbeidsgiver").fill(EXAMPLE_META.employer);
  await page.getByLabel("Stillingsannonse").fill(jobAd);
}

function analysisCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/analyses") {
      calls.push(request.url());
    }
  });
  return calls;
}

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

  test("follows the focus order file, CV, confirm, title, employer, ad, submit", async ({
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

  test("speaks the score sentence and the Verdict once in the first live region", async ({
    page,
  }) => {
    await fillExample(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    const verdict =
      EXAMPLE_KEY.score >= 70 ? "sterkt samsvar" : "bør forbedres";
    await expect(page.locator("#live-phase")).toHaveText(
      `Samsvaret er klart: ${EXAMPLE_KEY.score} %, ${verdict}, ${EXAMPLE_MATCHED} av ${EXAMPLE_TOTAL} nøkkelord.`,
    );
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
