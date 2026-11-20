import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";
import { findKeyword, proposeKeywords } from "../../src/modules/keywords/core";
import { scoreOf } from "../../src/modules/match/core";
import { vocabularySchema } from "../../src/shared/core/vocabulary";

// The fifth server (playwright.config.ts): Test mode with FEATURE_GAPS=false, so
// phase 2 is the Letter alone. The default server runs the Gap analysis too.
export const LETTER_ONLY = "http://localhost:3104";
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

// The Example pair and its Answer key: the counts the code-only list must show
// come from the key, not from numbers typed here (SM-2).
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

// In Test mode the Example ad is answered from its Cached Keyword list
// (FR-5b), not by the code alone, so the counts the screen shows come from that
// list: checked against the ad and looked up in the CV by the Keyword engine.
// The Answer key still anchors the code-only list (`EXAMPLE_KEY`, SM-2).
const VOCABULARY = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const CACHED_KEYWORDS = (
  JSON.parse(exampleFile("cached/keywords.json")) as {
    data: { keywords: string[] };
  }
).data.keywords;
const SAVED_LIST = proposeKeywords(EXAMPLE_AD, CACHED_KEYWORDS, VOCABULARY);
const SAVED_FOUND = SAVED_LIST.filter(
  (keyword) =>
    findKeyword(exampleFile("cv.txt"), keyword, VOCABULARY).length > 0,
);
export const EXAMPLE_MATCHED = SAVED_FOUND.length;
export const EXAMPLE_TOTAL = SAVED_LIST.length;
export const EXAMPLE_MISSING = EXAMPLE_TOTAL - EXAMPLE_MATCHED;
export const EXAMPLE_SCORE = scoreOf(EXAMPLE_MATCHED, EXAMPLE_TOTAL);
export const EXAMPLE_SENTENCE = `${EXAMPLE_SCORE} % samsvar – ${EXAMPLE_MATCHED} av ${EXAMPLE_TOTAL} nøkkelord`;
// The code-only list, for a server that has the Keyword fallback off.
export const EXAMPLE_CODE_SENTENCE = `${EXAMPLE_KEY.score} % samsvar – ${EXAMPLE_KEY.keywords.matched.length} av ${EXAMPLE_KEY.keywords.matched.length + EXAMPLE_KEY.keywords.missing.length} nøkkelord`;
// Words of no use as Keywords, long enough to pass the length check.
export const NO_KEYWORDS =
  "Vi er et selskap som holder til i Oslo og har kontor. ".repeat(6);
// FR-5b: the line under the formula for code-only Keywords, and the unannounced
// progress line while phase 1 waits for the Keyword request.
export const LESS_PRECISE =
  "Mindre presist: nøkkelordene er hentet ut uten KI.";
export const KEYWORD_PROGRESS = "Henter nøkkelord fra annonsen …";
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

export const TONES = ["Formell", "Personlig", "Direkte"] as const;
export type ToneName = (typeof TONES)[number];

// The Cached Letter the server returns for the Example pair, per Tone.
export function cachedLetter(tone: ToneName): string {
  const file = exampleFile(`cached/letter-${tone.toLowerCase()}.json`);
  return (JSON.parse(file) as { data: { text: string } }).data.text;
}

// What the Letter view shows for a cached text: the sign-off is the placeholder.
export function shownLetter(tone: ToneName): string {
  return cachedLetter(tone)
    .replace(/\r\n?/g, "\n")
    .split("{{SIGNATUR}}")
    .join("[Navnet ditt]");
}

export type LetterBody = {
  applicationId: string;
  fingerprint: string;
  tone: string;
  consent: { noticeVersion: string } | null;
  previousRev?: number;
  inputs: { employer: string };
};

export const LETTER_ROUTE = "**/api/analyses/*/letter";

// The failure box of an AI section. It is silent (no `role="alert"`): a live
// region speaks the same sentence once (UX-DR39), so it is found by its text.
export const failureBox = (page: Page, text: string) =>
  page.locator("section[aria-labelledby=letter-h2] p", { hasText: text });

// The phase-2 requests the browser sends, with their bodies.
export function letterCalls(page: Page): LetterBody[] {
  const calls: LetterBody[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/\/api\/analyses\/[^/]+\/letter$/.test(pathname)) {
      calls.push(request.postDataJSON() as LetterBody);
    }
  });
  return calls;
}

export const failure = (code: string, retryable = false) => ({
  ok: false,
  error: { code, retryable },
});

// A Letter answer for a route stub: never reaches the server.
export const letterAnswer = (tone: string, text = "Hei,\n\n{{SIGNATUR}}") => ({
  ok: true,
  data: {
    letter: { text, tone, rev: 1 },
    meta: {
      source: "cached",
      provider: "stub",
      model: "stub",
      promptVersion: "letter-1",
      createdAt: "2026-11-19T10:00:00.000Z",
    },
  },
});

export const toneRadio = (page: Page, tone: ToneName) =>
  page.getByRole("radio", { name: new RegExp(`^${tone} – `) });
