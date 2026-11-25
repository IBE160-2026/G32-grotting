import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  cachedLetter,
  EXAMPLE_AD,
  EXAMPLE_META,
  EXAMPLE_SENTENCE,
  exampleFile,
  NETWORK_FAILURE,
  PHONE,
  seriousFindings,
  type ToneName,
  WIDE,
} from "./support/application";

// Story 6.9: a saved Application reopened, read-only. The default server (3100)
// has accounts off; the eighth (3107) has them on in Test mode, so the Cached
// Letter and Gap analysis of the Example pair are what phase 2 writes. Browser
// windows of 1280 and 360 px, not a real phone.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const PASSWORD = "12345678";
const NAME = "Violet Hansen";
const EXAMPLE_CV = exampleFile("cv.txt").replace(/\r\n?/g, "\n");
const NOT_FOUND_HEADING = "Fant ikke siden";
const UNCHECKED = "Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.";

async function signUp(page: Page, name = NAME) {
  const email = `reopen-${randomUUID()}@example.test`;
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
}

type Parts = {
  employer?: string;
  title?: string;
  // The Tone of the Letter written, or none.
  letter?: ToneName;
  gaps?: boolean;
  // The Letter check is made (needs a Letter).
  check?: boolean;
  // The Letter is written once more after the check, so the check is stale.
  rewrite?: boolean;
};

// One Application saved through the real routes, as the form would do it.
async function addApplication(page: Page, parts: Parts = {}): Promise<string> {
  const id = randomUUID();
  const inputs = {
    cvText: EXAMPLE_CV,
    jobAd: EXAMPLE_AD,
    jobTitle: parts.title ?? EXAMPLE_META.jobTitle,
    employer: parts.employer ?? EXAMPLE_META.employer,
  };
  const phaseOne = await page.request.post("/api/analyses", {
    data: { applicationId: id, inputs, consent: null },
  });
  expect(phaseOne.status()).toBe(200);
  const { fingerprint, saved } = (
    (await phaseOne.json()) as {
      data: { fingerprint: string; saved: { seq: number } | null };
    }
  ).data;
  expect(saved).not.toBeNull();
  const base = { applicationId: id, fingerprint, inputs, consent: null };

  let gapsForCheck:
    | { keyword: string; kind: string; citation: string | null }[]
    | null = null;
  let gapsRev = 0;
  if (parts.gaps) {
    const written = await page.request.post(`/api/analyses/${id}/gaps`, {
      data: { ...base, previousRev: 0 },
    });
    expect(written.status()).toBe(200);
    gapsRev = 1;
    const gaps = (
      (await written.json()) as {
        data: {
          gaps: { keyword: string; kind: string; citation: string | null }[];
        };
      }
    ).data.gaps;
    gapsForCheck = gaps.map(({ keyword, kind, citation }) => ({
      keyword,
      kind,
      citation,
    }));
  }
  if (parts.letter !== undefined) {
    const write = async (previousRev: number) => {
      const written = await page.request.post(`/api/analyses/${id}/letter`, {
        data: { ...base, tone: parts.letter, previousRev },
      });
      expect(written.status()).toBe(200);
      return (
        (await written.json()) as {
          data: { letter: { text: string; tone: string; rev: number } };
        }
      ).data.letter;
    };
    const letter = await write(0);
    if (parts.check) {
      const checked = await page.request.post(
        `/api/analyses/${id}/letter-check`,
        {
          data: {
            applicationId: id,
            fingerprint,
            inputs,
            letter,
            gaps: gapsForCheck,
            letterRev: letter.rev,
            gapsRev,
          },
        },
      );
      expect(checked.status()).toBe(200);
    }
    if (parts.rewrite) await write(letter.rev);
  }
  return id;
}

const main = (page: Page) => page.getByRole("main");
const nav = (page: Page) =>
  main(page).getByRole("navigation", { name: "I Historikk" });
const h1 = (page: Page) => page.getByRole("heading", { level: 1 });
const section = (page: Page, name: string) =>
  main(page).getByRole("region", { name, exact: true });

// The requests to `/api/analyses*` made by the page while it opens.
function analysisRequests(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/analyses")) {
      calls.push(request.url());
    }
  });
  return calls;
}

test.describe("with accounts on", () => {
  test.use({ baseURL: ACCOUNTS });

  test("opens from a Historikk row with the number, employer, previous entry, credits and Tone, and asks for no AI", async ({
    page,
  }) => {
    await signUp(page);
    const first = await addApplication(page, { employer: "Fjord Analytics" });
    const second = await addApplication(page, {
      letter: "Personlig",
      gaps: true,
      check: true,
    });
    await page.setViewportSize(WIDE);
    await page.goto("/historikk");
    const calls = analysisRequests(page);
    await main(page)
      .getByRole("table")
      .getByRole("link", { name: "Åpne JA-002" })
      .click();
    await expect(page).toHaveURL(new RegExp(`/historikk/${second}$`));
    await expect(page).toHaveTitle("Lagret søknad – JobAssistant");
    await expect(h1(page)).toHaveAccessibleName(
      new RegExp(`^JA-002 ?, ${EXAMPLE_META.employer}$`),
    );

    // The previous entry and Historikk.
    await expect(
      nav(page).getByRole("link", { name: "JA-001 · Fjord Analytics" }),
    ).toHaveAttribute("href", `/historikk/${first}`);
    await expect(
      nav(page).getByRole("link", { name: "Historikk" }),
    ).toHaveAttribute("href", "/historikk");

    // Credits: the position, the date, the Tone saved and the ad.
    const credits = main(page).locator("dl");
    await expect(credits).toContainText(EXAMPLE_META.jobTitle);
    await expect(credits).toContainText(/\d{4}/);
    await expect(credits.locator("dt", { hasText: "Tone" })).toBeVisible();
    await expect(
      credits.locator("dd", { hasText: /^Personlig$/ }),
    ).toBeVisible();
    await expect(credits).toContainText(/avsnitt · \d+ nøkkelord/);

    // The Refleksjonsnotat, then Gapanalyse, then Søknadsbrev.
    await expect(main(page).getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(
      main(page).getByRole("heading", { level: 2, name: "Gapanalyse" }),
    ).toBeVisible();
    await expect(
      main(page).getByRole("heading", { level: 2, name: "Søknadsbrev" }),
    ).toBeVisible();
    await expect(
      main(page)
        .getByRole("link", { name: /^Se gapanalysen/ })
        .first(),
    ).toBeVisible();

    // Read-only: no new draft, no check again, no retry, no regenerate alert.
    await expect(
      main(page).getByRole("button", { name: "Lag nytt utkast" }),
    ).toHaveCount(0);
    await expect(
      main(page).getByRole("button", { name: "Sjekk igjen" }),
    ).toHaveCount(0);
    await expect(
      main(page).getByRole("button", { name: "Prøv igjen" }),
    ).toHaveCount(0);
    await expect(
      main(page).getByRole("button", { name: "Kopier", exact: true }).first(),
    ).toBeVisible();
    await expect(
      main(page).getByRole("button", { name: "Last ned (.docx)" }),
    ).toBeVisible();
    // The check was made for this Letter: no unchecked notice.
    await expect(main(page).getByText(UNCHECKED)).toHaveCount(0);
    // The Letter is signed with the Profile name, never the placeholder.
    await expect(main(page).locator("article")).toContainText(NAME);
    await expect(main(page).locator("article")).not.toContainText(
      "{{SIGNATUR}}",
    );
    await expect(main(page)).not.toContainText("[Navnet ditt]");

    // Nothing asked the AI, and nothing of the Application is in browser storage.
    await page.waitForLoadState("networkidle");
    expect(calls).toEqual([]);
    const stored = await page.evaluate(() =>
      JSON.stringify([
        Object.entries(localStorage),
        Object.entries(sessionStorage),
      ]),
    );
    expect(stored).not.toContain(EXAMPLE_META.employer);
    expect(stored).not.toContain("Kjære");

    expect(await seriousFindings(page)).toEqual([]);
    await page.setViewportSize(PHONE);
    await page.waitForLoadState("networkidle");
    expect(await seriousFindings(page)).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test("the first entry has only the link to Historikk", async ({ page }) => {
    await signUp(page);
    const id = await addApplication(page, { letter: "Formell" });
    await page.goto(`/historikk/${id}`);
    await expect(h1(page)).toHaveAccessibleName(
      new RegExp(`^JA-001 ?, ${EXAMPLE_META.employer}$`),
    );
    await expect(nav(page).getByRole("link")).toHaveCount(1);
    await expect(
      nav(page).getByRole("link", { name: "Historikk" }),
    ).toBeVisible();
  });

  test.describe("copy and download", () => {
    test.use({ permissions: ["clipboard-read", "clipboard-write"] });

    test("«Kopier» copies the stored Letter signed with the Profile name; the download is named with the year of the Application", async ({
      page,
    }) => {
      await signUp(page);
      const id = await addApplication(page, {
        letter: "Direkte",
        gaps: true,
        check: true,
      });
      await page.goto(`/historikk/${id}`);
      await expect(h1(page)).toBeVisible();
      // The first button of the Letter's own section, not a suggestion's «Kopier».
      const copy = section(page, "Søknadsbrev").getByRole("button").first();
      await copy.click();
      await expect(copy).toHaveText("Kopiert");
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      const expected = cachedLetter("Direkte")
        .replace(/\r\n?/g, "\n")
        .split("{{SIGNATUR}}")
        .join(NAME);
      expect(copied.replace(/\r\n?/g, "\n")).toBe(expected);
      expect(copied).not.toContain("SIGNATUR");

      const createdAt = (
        (await (await page.request.get(`/api/applications/${id}`)).json()) as {
          data: { createdAt: string };
        }
      ).data.createdAt;
      const download = page.waitForEvent("download");
      await main(page)
        .getByRole("button", { name: "Last ned (.docx)" })
        .click();
      const file = await download;
      expect(file.suggestedFilename()).toBe(
        `violet-hansen-soknadsbrev-nordic-digital-${new Date(createdAt).getFullYear()}.docx`,
      );
    });
  });

  test("an entry with no Letter and no Gaps says «Ikke laget.» under each heading and has no buttons, no Tone and no gap links", async ({
    page,
  }) => {
    await signUp(page);
    const id = await addApplication(page);
    await page.goto(`/historikk/${id}`);
    await expect(h1(page)).toBeVisible();
    await expect(section(page, "Gapanalyse")).toContainText("Ikke laget.");
    await expect(section(page, "Søknadsbrev")).toContainText("Ikke laget.");
    await expect(main(page).getByText("Ikke laget.")).toHaveCount(2);
    await expect(main(page).locator("dt", { hasText: "Tone" })).toHaveCount(0);
    await expect(
      main(page).getByRole("button", { name: /Kopier|Last ned/ }),
    ).toHaveCount(0);
    await expect(
      main(page).getByRole("link", { name: /^Se gapanalysen/ }),
    ).toHaveCount(0);
    await expect(main(page).getByText(UNCHECKED)).toHaveCount(0);
    // The Refleksjonsnotat is still there.
    await expect(main(page).getByText(EXAMPLE_SENTENCE)).toBeVisible();
    expect(await seriousFindings(page)).toEqual([]);
    await page.setViewportSize(PHONE);
    expect(await seriousFindings(page)).toEqual([]);
  });

  test("a Letter with no check, and a Letter whose check is stale, show the unchecked notice with no retry and no flags", async ({
    page,
  }) => {
    await signUp(page);
    const unchecked = await addApplication(page, { letter: "Formell" });
    const stale = await addApplication(page, {
      letter: "Formell",
      check: true,
      rewrite: true,
    });
    const checked = await addApplication(page, {
      letter: "Formell",
      check: true,
    });
    for (const id of [unchecked, stale]) {
      await page.goto(`/historikk/${id}`);
      await expect(main(page).getByText(UNCHECKED)).toBeVisible();
      await expect(
        main(page).getByRole("button", { name: "Sjekk igjen" }),
      ).toHaveCount(0);
      await expect(
        main(page).getByRole("region", { name: "Sjekk av brevet mot CV-en" }),
      ).toHaveCount(0);
      await expect(main(page).locator("article")).toBeVisible();
    }
    // The stale check is not sent at all.
    const answer = (await (
      await page.request.get(`/api/applications/${stale}`)
    ).json()) as {
      data: { check: unknown };
    };
    expect(answer.data.check).toBeNull();
    // A matching check shows no notice.
    await page.goto(`/historikk/${checked}`);
    await expect(main(page).locator("article")).toBeVisible();
    await expect(main(page).getByText(UNCHECKED)).toHaveCount(0);
  });

  test("another Student's id, an unknown id and a malformed id give the same Ikke funnet page and the same API answer (FR-19)", async ({
    page,
    browser,
  }) => {
    await signUp(page);
    const id = await addApplication(page, { letter: "Formell" });

    const other = await browser.newContext({ baseURL: ACCOUNTS });
    const otherPage = await other.newPage();
    await signUp(otherPage, "Kari Nordmann");
    await addApplication(otherPage);

    const seen: { status: number; text: string }[] = [];
    for (const path of [id, randomUUID(), "not-a-uuid"]) {
      const response = await otherPage.goto(`/historikk/${path}`);
      expect(response?.status()).toBe(404);
      await expect(otherPage.getByRole("heading", { level: 1 })).toHaveText(
        NOT_FOUND_HEADING,
      );
      seen.push({
        status: response?.status() ?? 0,
        text: (await main(otherPage).textContent()) ?? "",
      });
    }
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
    expect(seen[0]?.text).not.toContain(EXAMPLE_META.employer);

    const api: { status: number; body: string }[] = [];
    for (const path of [id, randomUUID(), "not-a-uuid"]) {
      const answer = await otherPage.request.get(`/api/applications/${path}`);
      api.push({ status: answer.status(), body: await answer.text() });
    }
    expect(api[0]?.status).toBe(404);
    expect(api[1]).toEqual(api[0]);
    expect(api[2]).toEqual(api[0]);
    expect(api[0]?.body).not.toContain(EXAMPLE_META.employer);
    await other.close();
  });

  test("an answer that cannot be fetched is said calmly, and «Prøv igjen» loads it", async ({
    page,
  }) => {
    await signUp(page);
    const id = await addApplication(page, { letter: "Formell" });
    let failing = true;
    await page.route(`**/api/applications/${id}`, (route) =>
      failing ? route.abort("failed") : route.continue(),
    );
    await page.goto(`/historikk/${id}`);
    await expect(
      main(page).getByRole("alert").filter({ hasText: NETWORK_FAILURE }),
    ).toBeVisible();
    await expect(main(page).locator("article")).toHaveCount(0);
    failing = false;
    await main(page).getByRole("button", { name: "Prøv igjen" }).click();
    await expect(h1(page)).toHaveAccessibleName(
      new RegExp(`^JA-001 ?, ${EXAMPLE_META.employer}$`),
    );
    await expect(main(page).locator("article")).toBeVisible();
  });

  test("a logged-out visitor is sent to Logg inn", async ({ page }) => {
    await page.goto(`/historikk/${randomUUID()}`);
    await expect(page).toHaveURL(/\/logg-inn$/);
  });
});

test.describe("with accounts off", () => {
  test.use({ baseURL: DEFAULT });

  test("the page and the route are not there", async ({ page }) => {
    const id = randomUUID();
    const response = await page.goto(`/historikk/${id}`);
    expect(response?.status()).toBe(404);
    const answer = await page.request.get(`/api/applications/${id}`);
    expect(answer.status()).toBe(404);
  });
});
