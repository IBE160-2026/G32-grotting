import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { formatCount } from "../src/shared/core/format-count";
import {
  analysisCalls,
  EXAMPLE_AD,
  EXAMPLE_META,
  exampleFile,
  LETTER_ROUTE,
  letterAnswer,
  NETWORK_FAILURE,
  PHONE,
  SUBMIT,
  seriousFindings,
  session,
  WIDE,
} from "./support/application";

// Story 6.6: Søknad uses the Profile. The default server has accounts off
// (3100); the eighth (3107) has them on in Test mode; the tenth (3109) has them
// on with Test mode off, so the AI notice shows. On 3109 every phase-2 request
// that could reach a provider is answered in the browser.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const LIVE_ACCOUNTS = "http://localhost:3109";
const PASSWORD = "12345678";
const NAME = "Violet Hansen";
const NOTICE_TITLE = "Teksten din sendes til en KI-tjeneste";

// The Example CV, with the newlines the form would have made.
const EXAMPLE_CV = exampleFile("cv.txt").replace(/\r\n?/g, "\n");
const NO_CV_TEXT = "Du har ikke lagt inn CV-en din ennå.";
const SUMMARY = "CV-tekst fra Profil";
const EXAMPLE_SUMMARY = "CV-tekst fra eksempelet";
const EXAMPLE_HINT = "Bare til denne søknaden. Profilen din er ikke endret.";
const EDIT_LINK = "Du endrer den i Profil";
const TEXT_NAME = "CV-tekst, bare lesing";

const TODAY = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
}).format(new Date());

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function signUp(
  page: Page,
  name = NAME,
  email = `soknad-${randomUUID()}@example.test`,
) {
  const registered = await page.request.post("/api/auth/register", {
    data: { name, email, password: PASSWORD },
  });
  expect(registered.status()).toBe(200);
  await logIn(page, email);
  return email;
}

async function logIn(page: Page, email: string) {
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });
  expect(login.status()).toBe(200);
}

async function saveCv(page: Page, cvText = EXAMPLE_CV) {
  const saved = await page.request.put("/api/profile", { data: { cvText } });
  expect(saved.status()).toBe(200);
}

async function profileView(page: Page) {
  const response = await page.request.get("/api/profile");
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: Record<string, unknown> }).data;
}

async function openSoknad(page: Page) {
  await page.goto("/soknad");
  await page.waitForLoadState("networkidle");
}

const disclosure = (page: Page) => page.locator("form details");
const summary = (page: Page) => page.locator("form details > summary");
const submit = (page: Page) => page.getByRole("button", { name: SUBMIT });
const noticeDialog = (page: Page) =>
  page.getByRole("dialog", { name: NOTICE_TITLE });
const letter = (page: Page) =>
  page.locator("article[aria-labelledby=letter-h2]");

async function fillJob(page: Page) {
  await page.getByLabel("Stillingstittel").fill(EXAMPLE_META.jobTitle);
  await page.getByLabel("Arbeidsgiver").fill(EXAMPLE_META.employer);
  await page.getByLabel("Stillingsannonse").fill(EXAMPLE_AD);
}

// The tenth server has a made-up key: the browser answers the Letter request.
async function stubLetter(page: Page) {
  await page.route(LETTER_ROUTE, (route) =>
    route.fulfill({
      json: letterAnswer(
        "Formell",
        "Hei Nordic Digital.\n\nMed vennlig hilsen\n{{SIGNATUR}}",
      ),
    }),
  );
}

function noticeCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/profile/ai-notice") {
      calls.push(request.method());
    }
  });
  return calls;
}

test.describe("Søknad without a CV in Profil", () => {
  test.use({ baseURL: ACCOUNTS });

  test("shows the notice with the link, takes no CV and keeps submit unavailable", async ({
    page,
  }) => {
    await signUp(page);
    await openSoknad(page);
    const notice = page.locator("form").getByText(NO_CV_TEXT);
    await expect(notice).toBeVisible();
    await expect(
      page.locator("form").getByRole("link", { name: "Gå til Profil" }),
    ).toHaveAttribute("href", "/profil");
    await expect(disclosure(page)).toHaveCount(0);
    await expect(page.getByLabel("CV-tekst", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Bekreft CV-teksten" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Velg fil", { exact: false })).toHaveCount(0);
    await fillJob(page);
    await expect(submit(page)).toBeDisabled();
  });

  test("the example makes submit available without touching the Profile", async ({
    page,
  }) => {
    await signUp(page);
    const before = await profileView(page);
    await openSoknad(page);
    await expect(submit(page)).toBeDisabled();
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    await expect(submit(page)).toBeEnabled();
    await expect(page.locator("form").getByText(NO_CV_TEXT)).toHaveCount(0);
    expect(await profileView(page)).toEqual(before);
  });

  test("passes axe at 1280 px and 360 px", async ({ page }) => {
    await signUp(page);
    await openSoknad(page);
    await expect(page.locator("form").getByText(NO_CV_TEXT)).toBeVisible();
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      expect(await seriousFindings(page)).toEqual([]);
    }
  });
});

test.describe("Søknad with a CV in Profil", () => {
  test.use({ baseURL: ACCOUNTS });

  test("shows a closed disclosure with the count and the save date, then the read-only text and the link", async ({
    page,
  }) => {
    await signUp(page);
    await saveCv(page);
    await openSoknad(page);
    await expect(summary(page)).toContainText(SUMMARY);
    await expect(summary(page)).toContainText(
      `${formatCount(EXAMPLE_CV.length)} tegn · ${TODAY}`,
    );
    await expect(disclosure(page)).not.toHaveAttribute("open", "");
    // No editor, no picker, no confirmation.
    await expect(page.getByLabel("CV-tekst", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Bekreft CV-teksten" }),
    ).toHaveCount(0);
    await expect(page.locator("input[type=file]")).toHaveCount(0);
    await expect(submit(page)).toBeEnabled();

    await summary(page).click();
    await expect(disclosure(page)).toHaveAttribute("open", "");
    const text = page.getByRole("textbox", { name: TEXT_NAME });
    await expect(text).toHaveValue(EXAMPLE_CV);
    await expect(text).toHaveAttribute("readonly", "");
    await expect(page.getByRole("link", { name: EDIT_LINK })).toHaveAttribute(
      "href",
      "/profil",
    );
    await expect(page.getByText("Teksten hentes fra Profil.")).toBeVisible();
  });

  test("the request carries the Profile CV, and the example CV after «Bruk eksempelet», which leaves the Profile as it was", async ({
    page,
  }) => {
    await signUp(page);
    const profileCv =
      "Prosjektleder med ansvar for flere team i Stavanger. ".repeat(5);
    await saveCv(page, profileCv);
    const sent: string[] = [];
    await page.route("**/api/analyses", async (route) => {
      const body = route.request().postDataJSON() as {
        inputs: { cvText: string };
      };
      sent.push(body.inputs.cvText);
      await route.continue();
    });
    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    // Test mode has no cached Letter for this CV: phase 1 is what is on screen.
    await expect(
      page.getByRole("button", { name: "Endre annonsen" }),
    ).toBeVisible();
    expect(sent).toEqual([profileCv]);

    await page.getByRole("button", { name: "Endre annonsen" }).click();
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    await submit(page).click();
    // Test mode has no cached Letter for this CV: phase 1 is what is on screen.
    await expect(
      page.getByRole("button", { name: "Endre annonsen" }),
    ).toBeVisible();
    expect(sent).toEqual([profileCv, EXAMPLE_CV]);
    expect((await profileView(page)).cvText).toBe(profileCv);
  });

  test("the summary is a native toggle with the keyboard", async ({ page }) => {
    await signUp(page);
    await saveCv(page);
    await openSoknad(page);
    await summary(page).focus();
    await page.keyboard.press("Enter");
    await expect(disclosure(page)).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(disclosure(page)).not.toHaveAttribute("open", "");
  });

  test("the example overrides the CV for this application only, and nothing CV-like reaches the tab", async ({
    page,
  }) => {
    await signUp(page);
    const other =
      "Prosjektleder med ansvar for flere team i Stavanger. ".repeat(5);
    await saveCv(page, other);
    const before = await profileView(page);
    await openSoknad(page);
    await summary(page).click();
    await expect(page.getByRole("textbox", { name: TEXT_NAME })).toHaveValue(
      other,
    );
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();

    await expect(summary(page)).toContainText(EXAMPLE_SUMMARY);
    await expect(summary(page)).not.toContainText(SUMMARY);
    await expect(disclosure(page)).not.toHaveAttribute("open", "");
    await summary(page).click();
    await expect(page.getByRole("textbox", { name: TEXT_NAME })).toHaveValue(
      EXAMPLE_CV,
    );
    await expect(page.getByText(EXAMPLE_HINT)).toBeVisible();
    await expect(page.getByRole("link", { name: EDIT_LINK })).toHaveCount(0);

    expect(await profileView(page)).toEqual(before);
    const stored = (await session(page)) as { inputs: Record<string, string> };
    expect(stored.inputs.cvText).toBeUndefined();
    expect(stored.inputs.cvDraft).toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain("Prosjektleder");
    expect(JSON.stringify(stored)).not.toContain(EXAMPLE_CV.slice(100, 140));

    // A reload returns to the Profile CV.
    await openSoknad(page);
    await expect(summary(page)).toContainText(SUMMARY);
  });

  test("typing the ad writes no CV to the tab", async ({ page }) => {
    await signUp(page);
    await saveCv(page);
    await openSoknad(page);
    await fillJob(page);
    const stored = (await session(page)) as { inputs: Record<string, string> };
    expect(stored.inputs.jobAd).toBe(EXAMPLE_AD.replace(/\r\n?/g, "\n"));
    expect(stored.inputs.cvText).toBeUndefined();
    expect(stored.inputs.cvDraft).toBeUndefined();
  });

  test("shows skeleton rows while the Profile loads, with no submit", async ({
    page,
  }) => {
    await signUp(page);
    await saveCv(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/profile", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto("/soknad");
    await expect(page.locator("form [aria-busy=true]")).toBeVisible();
    await expect(submit(page)).toBeDisabled();
    release();
    await expect(disclosure(page)).toBeVisible();
    await expect(submit(page)).toBeEnabled();
  });

  test("a failed load shows the network alert and keeps submit unavailable", async ({
    page,
  }) => {
    await signUp(page);
    await saveCv(page);
    await page.route("**/api/profile", (route) => route.abort());
    await page.goto("/soknad");
    await expect(
      page
        .locator("form")
        .getByRole("alert")
        .filter({ hasText: NETWORK_FAILURE }),
    ).toBeVisible();
    await expect(disclosure(page)).toHaveCount(0);
    await expect(submit(page)).toBeDisabled();
  });

  test("passes axe at 1280 px and 360 px, the disclosure closed and open", async ({
    page,
  }) => {
    await signUp(page);
    await saveCv(page);
    await openSoknad(page);
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await expect(disclosure(page)).not.toHaveAttribute("open", "");
      expect(await seriousFindings(page)).toEqual([]);
      await summary(page).click();
      await expect(disclosure(page)).toHaveAttribute("open", "");
      expect(await seriousFindings(page)).toEqual([]);
      await summary(page).click();
    }
  });
});

test.describe("the Letter is signed with the Profile name", () => {
  test.use({
    baseURL: ACCOUNTS,
    permissions: ["clipboard-read", "clipboard-write"],
  });

  test("on screen, in the copy and in the .docx, and the file name starts with the name", async ({
    page,
  }) => {
    await signUp(page, NAME);
    await saveCv(page);
    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await expect(letter(page)).toBeVisible();
    await expect(letter(page)).toContainText(NAME);
    await expect(letter(page)).not.toContainText("[Navnet ditt]");

    await page.getByRole("button", { name: "Kopier", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Kopiert", exact: true }),
    ).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain(NAME);
    expect(copied).not.toContain("[Navnet ditt]");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Last ned (.docx)" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `violet-hansen-soknadsbrev-${slug(EXAMPLE_META.employer)}-${new Date().getFullYear()}.docx`,
    );
    const files = unzipSync(
      new Uint8Array(readFileSync(await download.path())),
    );
    const xml = strFromU8(files["word/document.xml"] ?? new Uint8Array());
    expect(xml).toContain(NAME);
    expect(xml).not.toContain("[Navnet ditt]");
    expect(xml).not.toContain("SIGNATUR");
  });
});

test.describe("the AI notice is asked once per account", () => {
  test.use({ baseURL: LIVE_ACCOUNTS });

  test("accept, reload and submit again: no dialog; the Profile holds the version", async ({
    page,
    browser,
  }) => {
    const email = await signUp(page);
    await saveCv(page);
    await stubLetter(page);
    const posts = noticeCalls(page);
    expect((await profileView(page)).aiNoticeVersion).toBeNull();

    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await expect(noticeDialog(page)).toBeVisible();
    await noticeDialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(letter(page)).toBeVisible();
    expect(posts).toEqual(["POST"]);
    // Nothing of the acceptance is kept in the tab.
    expect(
      ((await session(page)) as { noticeVersion?: string }).noticeVersion,
    ).toBeUndefined();
    const stored = (await profileView(page)).aiNoticeVersion;
    expect(stored).toEqual(expect.stringMatching(/^notice-/));

    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await expect(letter(page)).toBeVisible();
    await expect(noticeDialog(page)).toHaveCount(0);
    expect(posts).toEqual(["POST"]);

    // Another browser session of the same account is not asked either.
    const context = await browser.newContext({ baseURL: LIVE_ACCOUNTS });
    const second = await context.newPage();
    await logIn(second, email);
    await stubLetter(second);
    await openSoknad(second);
    await fillJob(second);
    await submit(second).click();
    await expect(letter(second)).toBeVisible();
    await expect(noticeDialog(second)).toHaveCount(0);
    await context.close();
  });

  test("another Student is asked even after the first one accepted", async ({
    page,
    browser,
  }) => {
    await signUp(page, "Anna Aas");
    await saveCv(page);
    await stubLetter(page);
    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await noticeDialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(letter(page)).toBeVisible();

    const context = await browser.newContext({ baseURL: LIVE_ACCOUNTS });
    const other = await context.newPage();
    await signUp(other, "Bjørn Berg");
    await saveCv(other);
    await openSoknad(other);
    await fillJob(other);
    await submit(other).click();
    await expect(noticeDialog(other)).toBeVisible();
    await context.close();
  });

  test("a failed save closes the notice, shows the network alert, sends nothing and asks again next time", async ({
    page,
  }) => {
    await signUp(page);
    await saveCv(page);
    await stubLetter(page);
    const analyses = analysisCalls(page);
    await page.route("**/api/profile/ai-notice", (route) => route.abort());
    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await noticeDialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(noticeDialog(page)).toHaveCount(0);
    await expect(
      page
        .locator("form")
        .getByRole("alert")
        .filter({ hasText: NETWORK_FAILURE }),
    ).toBeVisible();
    expect(analyses).toHaveLength(0);
    expect((await profileView(page)).aiNoticeVersion).toBeNull();

    await page.unroute("**/api/profile/ai-notice");
    await submit(page).click();
    await expect(noticeDialog(page)).toBeVisible();
    await noticeDialog(page)
      .getByRole("button", { name: "Godta og fortsett" })
      .click();
    await expect(letter(page)).toBeVisible();
    expect(analyses).toHaveLength(1);
  });
});

test.describe("the API needs a live session", () => {
  test.use({ baseURL: ACCOUNTS });

  test("answers SESSION_EXPIRED for no cookie and for a cookie that is no session", async ({
    request,
    playwright,
  }) => {
    for (const path of [
      "/api/analyses",
      "/api/analyses/8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f/letter",
      "/api/analyses/8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f/gaps",
      "/api/analyses/8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f/letter-check",
    ]) {
      const bare = await request.post(path, { data: {} });
      expect(bare.status()).toBe(401);
      expect(
        ((await bare.json()) as { error: { code: string } }).error.code,
      ).toBe("SESSION_EXPIRED");
      const bogus = await playwright.request.newContext({
        baseURL: ACCOUNTS,
        extraHTTPHeaders: { cookie: "ja_sid=not-a-session" },
      });
      const response = await bogus.post(path, { data: {} });
      expect(response.status()).toBe(401);
      expect(
        ((await response.json()) as { error: { code: string } }).error.code,
      ).toBe("SESSION_EXPIRED");
      await bogus.dispose();
    }
  });
});

test.describe("accounts off", () => {
  test.use({ baseURL: DEFAULT });

  test("Søknad keeps its own CV field and asks the server nothing about a Profile", async ({
    page,
  }) => {
    const profileCalls: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/profile")) {
        profileCalls.push(request.url());
      }
    });
    await openSoknad(page);
    await expect(page.getByLabel("CV-tekst", { exact: true })).toBeVisible();
    await expect(page.locator("form details")).toHaveCount(0);
    await expect(submit(page)).toBeEnabled();
    expect(profileCalls).toEqual([]);
  });
});
