import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

export const WIDE = { width: 1280, height: 800 };
export const PHONE = { width: 360, height: 800 };
export const NARROW = { width: 320, height: 800 };

export const AD = "Vi søker en utvikler med erfaring fra React. ".repeat(6);
export const AD_ERROR = "Stillingsannonsen må være mellom 200 og 15 000 tegn.";
export const CV =
  "Jeg har to års erfaring som frontendutvikler med React og TypeScript. ".repeat(
    4,
  );
export const CV_ERROR = "CV-teksten må være mellom 200 og 20 000 tegn.";
export const NOT_CONFIRMED = "Bekreft CV-teksten før du går videre.";
export const CONFIRM = "Bekreft CV-teksten";
export const SUBMIT = "Analyser og skriv utkast";
export const PICKER_NAME = "Velg fil, PDF eller TXT, maks 2 MB";
export const WRONG_TYPE = "Bare PDF- og TXT-filer støttes.";
export const TOO_LARGE = "Filen er for stor.";
export const SCANNED =
  "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Lim inn teksten fra CV-en din i stedet.";
export const PASTE_HINT = "Lim inn teksten her. Minst 200 tegn.";
export const NETWORK_FAILURE =
  "Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.";
export const RUST = "rgb(224, 120, 79)";
export const EDGE = "rgb(163, 140, 112)";
export const AMBER = "rgb(236, 171, 63)";
export const FILES = fileURLToPath(new URL("../files/", import.meta.url));
export const TEXT_PDF = `${FILES}text-cv.pdf`;
export const SCANNED_PDF = `${FILES}scanned.pdf`;
export const DOCX = `${FILES}cv.docx`;

// The Example pair and its Answer key: the counts the result must show come
// from the key, not from numbers typed here (SM-2).
export const EXAMPLE = fileURLToPath(
  new URL("../../data/fixtures/example-nordic-digital/", import.meta.url),
);
export const exampleFile = (name: string) =>
  readFileSync(`${EXAMPLE}${name}`, "utf8");
export const EXAMPLE_META = JSON.parse(exampleFile("meta.json")) as {
  jobTitle: string;
  employer: string;
};
export const EXAMPLE_KEY = JSON.parse(exampleFile("answer-key.json")) as {
  keywords: { matched: string[]; missing: string[] };
  score: number;
};
export const EXAMPLE_AD = exampleFile("ad.txt");
export const EXAMPLE_PARAGRAPHS = EXAMPLE_AD.replace(/\r\n?/g, "\n")
  .split(/\n(?:[^\S\n]*\n)+/)
  .filter((paragraph) => paragraph.trim() !== "").length;
export const EXAMPLE_MATCHED = EXAMPLE_KEY.keywords.matched.length;
export const EXAMPLE_MISSING = EXAMPLE_KEY.keywords.missing.length;
export const EXAMPLE_TOTAL = EXAMPLE_MATCHED + EXAMPLE_MISSING;
export const EXAMPLE_SENTENCE = `${EXAMPLE_KEY.score} % samsvar – ${EXAMPLE_MATCHED} av ${EXAMPLE_TOTAL} nøkkelord`;
// Words of no use as Keywords, long enough to pass the length check.
export const NO_KEYWORDS =
  "Vi er et selskap som holder til i Oslo og har kontor. ".repeat(6);
export const AD_UNCLEAR =
  "Annonsen er for kort eller uklar til å analyseres. Lim inn hele stillingsannonsen, også kravene.";

export async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error("element has no box");
  return found;
}

export async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

// The form fills itself from the tab's session after it has mounted; typing
// before that would be overwritten.
export async function openForm(page: Page) {
  await page.goto("/soknad");
  await page.waitForLoadState("networkidle");
}

export function cvField(page: Page) {
  return page.getByLabel("CV-tekst", { exact: true });
}

// Paste a CV and confirm it; the slot collapses to the confirmed line.
export async function confirmCv(page: Page, text: string = CV) {
  await cvField(page).fill(text);
  await page.getByRole("button", { name: CONFIRM }).click();
  await expect(
    page.locator("form").getByText(/^CV-tekst bekreftet · /),
  ).toBeVisible();
}

export async function session(page: Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem("ja.session.v1");
    return raw === null ? null : JSON.parse(raw);
  });
}

export function picker(page: Page) {
  return page.getByLabel(PICKER_NAME);
}

// The row around the picker: its border carries the error state.
export function pickerRow(page: Page) {
  return page.locator("label:has(input[type=file])").locator("xpath=..");
}

export function extractCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/cv/extract") {
      calls.push(request.url());
    }
  });
  return calls;
}

export function trackApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      calls.push(request.url());
    }
  });
  return calls;
}

// Fills the form with the Example pair and confirms the CV.
export async function fillExample(page: Page, jobAd: string = EXAMPLE_AD) {
  await openForm(page);
  await confirmCv(page, exampleFile("cv.txt"));
  await page.getByLabel("Stillingstittel").fill(EXAMPLE_META.jobTitle);
  await page.getByLabel("Arbeidsgiver").fill(EXAMPLE_META.employer);
  await page.getByLabel("Stillingsannonse").fill(jobAd);
}

export function analysisCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/analyses") {
      calls.push(request.url());
    }
  });
  return calls;
}
