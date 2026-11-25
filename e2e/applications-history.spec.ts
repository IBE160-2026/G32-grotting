import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  cachedLetter,
  EXAMPLE_AD,
  EXAMPLE_META,
  exampleFile,
  PHONE,
  SUBMIT,
  seriousFindings,
  WIDE,
} from "./support/application";

// Story 6.8: Historikk, the catalogue register. The default server (3100) has
// accounts off; the eighth (3107) has them on in Test mode, so the Cached Letter
// of the Example pair is what phase 2 writes. Browser windows of 1280 and 360
// px, not a real phone.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const PASSWORD = "12345678";
const NAME = "Violet Hansen";
const EXAMPLE_CV = exampleFile("cv.txt").replace(/\r\n?/g, "\n");

const EMPTY_TEXT =
  "Ingen søknader ennå. Start med din første stillingsannonse.";
const EMPTY_HINT = "Den første søknaden du lager, får nummer JA-001.";

async function signUp(page: Page, name = NAME) {
  const email = `historikk-${randomUUID()}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { name, email, password: PASSWORD },
  });
  expect(registered.status()).toBe(200);
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });
  expect(login.status()).toBe(200);
  const saved = await page.request.put("/api/profile", {
    data: { cvText: EXAMPLE_CV },
  });
  expect(saved.status()).toBe(200);
  return email;
}

// One Application saved through the real routes (phase 1, and phase 2 for the
// Letter in Test mode), as the form would do it.
async function addApplication(
  page: Page,
  title: string,
  { letter }: { letter: boolean },
): Promise<string> {
  const id = randomUUID();
  const inputs = {
    cvText: EXAMPLE_CV,
    jobAd: EXAMPLE_AD,
    jobTitle: title,
    employer: EXAMPLE_META.employer,
  };
  const phaseOne = await page.request.post("/api/analyses", {
    data: { applicationId: id, inputs, consent: null },
  });
  expect(phaseOne.status()).toBe(200);
  const body = (await phaseOne.json()) as {
    data: { fingerprint: string; saved: { seq: number } | null };
  };
  expect(body.data.saved).not.toBeNull();
  if (letter) {
    const written = await page.request.post(`/api/analyses/${id}/letter`, {
      data: {
        applicationId: id,
        fingerprint: body.data.fingerprint,
        inputs,
        tone: "Formell",
        consent: null,
        previousRev: 0,
      },
    });
    expect(written.status()).toBe(200);
  }
  return id;
}

const main = (page: Page) => page.getByRole("main");
const bar = (page: Page) => page.getByRole("navigation", { name: "Hovedmeny" });
const historyLink = (page: Page) =>
  bar(page).getByRole("link", { name: /^Historikk/ });

test.describe("with accounts on", () => {
  test.use({ baseURL: ACCOUNTS });

  test("a Student with no Applications sees the empty state and no count", async ({
    page,
  }) => {
    await signUp(page);
    await page.goto("/historikk");
    await expect(page).toHaveTitle("Historikk – JobAssistant");
    await expect(
      page.getByRole("heading", { level: 1, name: "Historikk" }),
    ).toBeVisible();
    await expect(main(page).getByText(EMPTY_TEXT)).toBeVisible();
    await expect(main(page).getByText(EMPTY_HINT)).toBeVisible();
    // The ghost number is decoration: hidden from assistive technology.
    await expect(main(page).locator("p[aria-hidden=true]")).toHaveText(
      "JA-001",
    );
    await expect(
      main(page).getByRole("link", { name: "Lag skreddersydd søknad" }),
    ).toHaveAttribute("href", "/soknad");
    await expect(main(page).getByRole("table")).toHaveCount(0);
    await expect(main(page).getByRole("list")).toHaveCount(0);
    await expect(historyLink(page)).toHaveAccessibleName("Historikk");
    // No search, delete or rename (D5).
    await expect(main(page).getByRole("textbox")).toHaveCount(0);
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await page.waitForLoadState("networkidle");
      expect(await seriousFindings(page)).toEqual([]);
    }
  });

  test("two Applications: the summary, a table at laptop width, newest first, entry-specific names", async ({
    page,
  }) => {
    await signUp(page);
    await addApplication(page, EXAMPLE_META.jobTitle, { letter: true });
    await addApplication(page, "Dataingeniør", { letter: false });
    await page.setViewportSize(WIDE);
    await page.goto("/historikk");
    await expect(
      main(page).getByText("JA-001–JA-002 · 2 søknader, nyeste først"),
    ).toBeVisible();

    // Only one structure is in the accessibility tree.
    const table = main(page).getByRole("table", {
      name: "Alle søknadene dine, nyeste først",
    });
    await expect(table).toBeVisible();
    await expect(main(page).getByRole("list")).toHaveCount(0);
    await expect(
      table.getByRole("columnheader").filter({ hasNotText: /^$/ }),
    ).toHaveCount(5);
    await expect(
      table.getByRole("columnheader", { name: "Nr." }),
    ).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: "Handlinger" }),
    ).toHaveCount(1);
    const rows = table.getByRole("row");
    await expect(rows).toHaveCount(3);
    // Newest first; the job title is the row header and a link.
    await expect(rows.nth(1).getByRole("rowheader")).toContainText(
      "Dataingeniør",
    );
    await expect(rows.nth(2).getByRole("rowheader")).toContainText(
      EXAMPLE_META.jobTitle,
    );
    await expect(rows.nth(1).getByRole("cell").first()).toHaveText("JA-002");
    await expect(rows.nth(1).getByRole("rowheader")).toContainText(
      EXAMPLE_META.employer,
    );
    // The score sentence and the Verdict in words, never colour alone.
    await expect(rows.nth(1)).toContainText(
      /\d+ % samsvar – \d+ av \d+ nøkkelord/,
    );
    await expect(rows.nth(1)).toContainText(/Sterkt samsvar|Bør forbedres/);
    await expect(rows.nth(1).locator("time")).toHaveText(/\d{4}/);
    // Entry-specific accessible names.
    await expect(
      rows.nth(2).getByRole("link", { name: "Åpne JA-001" }),
    ).toBeVisible();
    await expect(
      rows.nth(2).getByRole("button", { name: "Kopier brev for JA-001" }),
    ).toBeEnabled();
    await expect(
      rows.nth(2).getByRole("button", { name: "Last ned (.docx) for JA-001" }),
    ).toBeEnabled();
    // The row without a Letter has the two buttons switched off.
    await expect(
      rows.nth(1).getByRole("button", { name: "Kopier brev for JA-002" }),
    ).toBeDisabled();
    await expect(
      rows.nth(1).getByRole("button", { name: "Last ned (.docx) for JA-002" }),
    ).toBeDisabled();
    await expect(rows.nth(1)).toContainText("Brevet er ikke laget.");
    await expect(
      rows.nth(1).getByRole("link", { name: "Åpne JA-002" }),
    ).toHaveAttribute("href", /^\/historikk\/[0-9a-f-]{36}$/);
    // The app bar shows the count by Historikk.
    await expect(historyLink(page)).toHaveAccessibleName(
      /^Historikk ?, 2 oppføringer$/,
    );
    await expect(
      page.getByRole("button", { name: /Slett|Søk|Gi nytt navn/ }),
    ).toHaveCount(0);
    expect(await seriousFindings(page)).toEqual([]);
  });

  test("at 360 px the register is a list and the table is not in the accessibility tree", async ({
    page,
  }) => {
    await signUp(page);
    await addApplication(page, EXAMPLE_META.jobTitle, { letter: true });
    await addApplication(page, "Dataingeniør", { letter: false });
    await page.setViewportSize(PHONE);
    await page.goto("/historikk");
    const list = main(page).getByRole("list");
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await expect(main(page).getByRole("table")).toHaveCount(0);
    await expect(list.getByRole("listitem").first()).toContainText("JA-002");
    await expect(list.getByRole("link", { name: "Åpne JA-001" })).toBeVisible();
    await expect(
      list.getByRole("button", { name: "Kopier brev for JA-001" }),
    ).toBeEnabled();
    // No page scroll sideways.
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(await seriousFindings(page)).toEqual([]);
  });

  test.describe("copy and download", () => {
    test.use({ permissions: ["clipboard-read", "clipboard-write"] });

    test("«Kopier brev» fetches this row's Letter, signed with the Profile name, and keeps nothing in browser storage", async ({
      page,
    }) => {
      await signUp(page);
      const id = await addApplication(page, EXAMPLE_META.jobTitle, {
        letter: true,
      });
      await page.goto("/historikk");
      // The first list answer is in before the one this test reads is waited
      // for, so the wait cannot catch it and lose its body to the reload.
      await expect(main(page).getByRole("table")).toBeVisible();
      const letterRequests: string[] = [];
      page.on("request", (request) => {
        const { pathname } = new URL(request.url());
        if (pathname.endsWith("/letter")) letterRequests.push(pathname);
      });
      // The list answer carries no Letter text.
      const listAnswer = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/applications" &&
          response.request().method() === "GET",
      );
      await page.reload();
      const listText = await (await listAnswer).text();
      expect(listText).not.toContain("SIGNATUR");
      expect(listText).not.toContain(cachedLetter("Formell").slice(0, 30));
      expect(letterRequests).toEqual([]);

      const button = main(page)
        .getByRole("table")
        .getByRole("button", { name: "Kopier brev for JA-001" });
      await button.click();
      await expect(button).toHaveText("Kopiert");
      await expect(page.locator("#live-action")).toHaveText(
        "Kopiert til utklippstavlen.",
      );
      expect(letterRequests).toEqual([`/api/applications/${id}/letter`]);
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      const expected = cachedLetter("Formell")
        .replace(/\r\n?/g, "\n")
        .split("{{SIGNATUR}}")
        .join(NAME);
      expect(copied.replace(/\r\n?/g, "\n")).toBe(expected);
      expect(copied).not.toContain("SIGNATUR");
      // Nothing of the Letter in the browser's storage.
      const stored = await page.evaluate(() =>
        JSON.stringify([
          Object.entries(localStorage),
          Object.entries(sessionStorage),
        ]),
      );
      expect(stored).not.toContain(expected.slice(0, 40));
    });

    test("«Last ned (.docx)» downloads this row's Letter under its file name", async ({
      page,
    }) => {
      await signUp(page);
      await addApplication(page, EXAMPLE_META.jobTitle, { letter: true });
      await page.goto("/historikk");
      const download = page.waitForEvent("download");
      await main(page)
        .getByRole("table")
        .getByRole("button", { name: "Last ned (.docx) for JA-001" })
        .click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(
        /^violet-hansen-soknadsbrev-nordic-digital-\d{4}\.docx$/,
      );
    });
  });

  test("a Letter that cannot be fetched is said calmly and nothing is copied", async ({
    page,
  }) => {
    await signUp(page);
    await addApplication(page, EXAMPLE_META.jobTitle, { letter: true });
    await page.route("**/api/applications/*/letter", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "NOT_FOUND", retryable: false },
        }),
      }),
    );
    await page.goto("/historikk");
    await main(page)
      .getByRole("table")
      .getByRole("button", { name: "Kopier brev for JA-001" })
      .click();
    await expect(
      main(page)
        .getByRole("alert")
        .filter({ hasText: "Brevet kunne ikke hentes." }),
    ).toBeVisible();
  });

  test("a download whose Letter cannot be fetched is said calmly and nothing downloads", async ({
    page,
  }) => {
    await signUp(page);
    await addApplication(page, EXAMPLE_META.jobTitle, { letter: true });
    await page.route("**/api/applications/*/letter", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "NOT_FOUND", retryable: false },
        }),
      }),
    );
    await page.goto("/historikk");
    let downloads = 0;
    page.on("download", () => downloads++);
    const button = main(page)
      .getByRole("table")
      .getByRole("button", { name: "Last ned (.docx) for JA-001" });
    await button.click();
    await expect(
      main(page)
        .getByRole("alert")
        .filter({ hasText: "Brevet kunne ikke hentes." }),
    ).toBeVisible();
    await expect(button).toBeEnabled();
    expect(downloads).toBe(0);
  });

  test("a blocked clipboard says so in Historikk's own words, not «Kopier med Ctrl+C»", async ({
    page,
  }) => {
    await signUp(page);
    await addApplication(page, EXAMPLE_META.jobTitle, { letter: true });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: () => Promise.reject(new DOMException("denied")),
          write: () => Promise.reject(new DOMException("denied")),
        },
        configurable: true,
      });
    });
    await page.goto("/historikk");
    await main(page)
      .getByRole("table")
      .getByRole("button", { name: "Kopier brev for JA-001" })
      .click();
    await expect(
      main(page).getByText(
        "Kunne ikke kopiere. Åpne søknaden og kopier brevet derfra.",
      ),
    ).toBeVisible();
    await expect(page.getByText(/Ctrl\+C/)).toHaveCount(0);
    await expect(page.locator("#live-action")).toHaveText(
      "Kunne ikke kopiere. Åpne søknaden og kopier brevet derfra.",
    );
  });

  test("a list that cannot be loaded shows the failure and a retry that works", async ({
    page,
  }) => {
    await signUp(page);
    await addApplication(page, EXAMPLE_META.jobTitle, { letter: false });
    let failing = true;
    await page.route("**/api/applications?*", (route) =>
      failing ? route.abort("failed") : route.continue(),
    );
    await page.goto("/historikk");
    await expect(
      main(page).getByRole("alert").filter({ hasText: "Fikk ikke kontakt" }),
    ).toBeVisible();
    failing = false;
    await main(page).getByRole("button", { name: "Prøv igjen" }).click();
    await expect(
      main(page).getByText("JA-001 · 1 søknad, nyeste først"),
    ).toBeVisible();
  });

  test("21 Applications: 20 on the first page, «Neste», «Forrige», the page announced and focus moved", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signUp(page);
    for (let n = 1; n <= 21; n++) {
      await addApplication(page, `Stilling ${n}`, { letter: false });
    }
    await page.setViewportSize(WIDE);
    await page.goto("/historikk");
    const table = main(page).getByRole("table");
    await expect(table.getByRole("row")).toHaveCount(21);
    await expect(
      main(page).getByText("JA-001–JA-021 · 21 søknader, nyeste først"),
    ).toBeVisible();
    const pager = page.getByRole("navigation", { name: "Sider" });
    await expect(pager.getByText("Side 1 av 2")).toBeVisible();
    await expect(pager.getByRole("button", { name: "Forrige" })).toHaveCount(0);
    await pager.getByRole("button", { name: "Neste" }).click();
    await expect(pager.getByText("Side 2 av 2")).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText("Side 2 av 2");
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table.getByRole("rowheader")).toHaveText(/Stilling 1/);
    await expect(pager.getByRole("button", { name: "Neste" })).toHaveCount(0);
    // Focus is on the register's caption.
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
      "CAPTION",
    );
    expect(await seriousFindings(page)).toEqual([]);
    await pager.getByRole("button", { name: "Forrige" }).click();
    await expect(pager.getByText("Side 1 av 2")).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(21);

    // At 360 px the focus goes to the page heading.
    await page.setViewportSize(PHONE);
    await pager.getByRole("button", { name: "Neste" }).click();
    await expect(pager.getByText("Side 2 av 2")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Historikk" }),
    ).toBeFocused();
    expect(await seriousFindings(page)).toEqual([]);
  });

  test("another Student's session does not see the rows or the Letter (FR-19)", async ({
    page,
    browser,
  }) => {
    await signUp(page);
    const id = await addApplication(page, EXAMPLE_META.jobTitle, {
      letter: true,
    });

    const other = await browser.newContext({ baseURL: ACCOUNTS });
    const otherPage = await other.newPage();
    await signUp(otherPage, "Kari Nordmann");
    await otherPage.goto("/historikk");
    await expect(otherPage.getByText(EMPTY_TEXT)).toBeVisible();
    await expect(otherPage.getByText(EXAMPLE_META.jobTitle)).toHaveCount(0);
    const list = await otherPage.request.get("/api/applications");
    expect(
      ((await list.json()) as { data: { total: number } }).data.total,
    ).toBe(0);
    const foreign = await otherPage.request.get(
      `/api/applications/${id}/letter`,
    );
    const unknown = await otherPage.request.get(
      `/api/applications/${randomUUID()}/letter`,
    );
    expect(foreign.status()).toBe(404);
    expect(await foreign.text()).toBe(await unknown.text());
    await other.close();
  });

  test("a saved Application shows in Historikk and the count after client navigation", async ({
    page,
  }) => {
    await signUp(page);
    await page.goto("/soknad");
    await page.waitForLoadState("networkidle");
    await expect(historyLink(page)).toHaveAccessibleName("Historikk");
    await page.getByLabel("Stillingstittel").fill(EXAMPLE_META.jobTitle);
    await page.getByLabel("Arbeidsgiver").fill(EXAMPLE_META.employer);
    await page.getByLabel("Stillingsannonse").fill(EXAMPLE_AD);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(
      page.getByText("Lagret i Historikk som JA-001.", { exact: true }),
    ).toBeVisible();
    await expect(historyLink(page)).toHaveAccessibleName(
      /^Historikk ?, 1 oppføring$/,
    );
    await historyLink(page).click();
    await expect(page).toHaveURL(/\/historikk$/);
    await expect(
      main(page).getByText("JA-001 · 1 søknad, nyeste først"),
    ).toBeVisible();
    await expect(
      main(page)
        .getByRole("table")
        .getByRole("rowheader")
        .getByRole("link", { name: EXAMPLE_META.jobTitle }),
    ).toBeVisible();
  });

  test("a logged-out visitor is sent to Logg inn", async ({ page }) => {
    await page.goto("/historikk");
    await expect(page).toHaveURL(/\/logg-inn$/);
  });
});

test.describe("with accounts off", () => {
  test.use({ baseURL: DEFAULT });

  test("Historikk and its routes are not there", async ({ page }) => {
    const response = await page.goto("/historikk");
    expect(response?.status()).toBe(404);
    for (const path of [
      "/api/applications",
      "/api/applications/count",
      `/api/applications/${randomUUID()}/letter`,
    ]) {
      const answer = await page.request.get(path);
      expect(answer.status()).toBe(404);
    }
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: "Hovedmeny" }).getByRole("link"),
    ).toHaveCount(2);
  });
});
