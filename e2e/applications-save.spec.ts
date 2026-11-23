import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  EXAMPLE_AD,
  EXAMPLE_META,
  EXAMPLE_SENTENCE,
  exampleFile,
  PHONE,
  SUBMIT,
  seriousFindings,
  WIDE,
} from "./support/application";

// Story 6.7: every Application is saved automatically with accounts on. The
// default server (3100) has accounts off; the eighth (3107) has them on in Test
// mode, so phase 2 answers from the Cached Letter and Gap analysis.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const PASSWORD = "12345678";
const EXAMPLE_CV = exampleFile("cv.txt").replace(/\r\n?/g, "\n");

const LEDE =
  "Neste nummer i katalogen. Fyll inn annonsen, så regner vi ut hvilke av nøkkelordene CV-en din dekker.";
const NOT_SAVED =
  "Søknaden ble ikke lagret i Historikk. Samsvaret over er riktig, men brevet og gapanalysen skrives ikke nå. Prøv igjen om litt.";

async function signUpWithCv(page: Page) {
  const email = `save-${randomUUID()}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { name: "Violet Hansen", email, password: PASSWORD },
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

async function openSoknad(page: Page) {
  await page.goto("/soknad");
  await page.waitForLoadState("networkidle");
}

const submit = (page: Page) => page.getByRole("button", { name: SUBMIT });
const back = (page: Page) =>
  page.getByRole("button", { name: "Endre annonsen" });
const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const savedLine = (n: string) => `Lagret i Historikk som ${n}.`;

async function fillJob(page: Page) {
  await page.getByLabel("Stillingstittel").fill(EXAMPLE_META.jobTitle);
  await page.getByLabel("Arbeidsgiver").fill(EXAMPLE_META.employer);
  await page.getByLabel("Stillingsannonse").fill(EXAMPLE_AD);
}

async function nextNumber(page: Page): Promise<number> {
  const response = await page.request.get("/api/applications/next");
  expect(response.status()).toBe(200);
  return ((await response.json()) as { data: { seq: number } }).data.seq;
}

test.describe("with accounts on", () => {
  test.use({ baseURL: ACCOUNTS });

  test("the form shows the next number dimmed with the lede, the result shows the saved number", async ({
    page,
  }) => {
    await signUpWithCv(page);
    await openSoknad(page);
    await expect(heading(page)).toHaveAccessibleName(/^JA-001 ?, Ny søknad$/);
    await expect(page.locator("h1 [aria-hidden=true]")).toHaveText("·");
    await expect(page.getByText(LEDE)).toBeVisible();

    await fillJob(page);
    await submit(page).click();
    await expect(back(page)).toBeVisible();
    await expect(heading(page)).toHaveAccessibleName(
      new RegExp(`^JA-001 ?, ${EXAMPLE_META.employer}$`),
    );
    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    const line = page.getByText(savedLine("JA-001"), { exact: true });
    await expect(line).toHaveCount(1);
    // The line under the heading is silent: no live region holds that element.
    await expect(
      page
        .locator("p", { hasText: savedLine("JA-001") })
        .locator("xpath=ancestor-or-self::*[@aria-live]"),
    ).toHaveCount(0);
    // The phase-2 line carries the saved sentence once phase 2 has settled.
    await expect(page.locator("#live-phase")).toContainText(
      savedLine("JA-001"),
      { timeout: 15_000 },
    );
    expect(await nextNumber(page)).toBe(2);
  });

  test("back to the form shows the next number; a double submit keeps the number, a changed ad takes the next", async ({
    page,
  }) => {
    await signUpWithCv(page);
    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await expect(heading(page)).toHaveAccessibleName(/^JA-001 ?,/);

    await back(page).click();
    await expect(heading(page)).toHaveAccessibleName(/^JA-002 ?, Ny søknad$/);
    // The same inputs again keep the id and so the number.
    await submit(page).click();
    await expect(heading(page)).toHaveAccessibleName(/^JA-001 ?,/);
    await expect(
      page.getByText(savedLine("JA-001"), { exact: true }),
    ).toBeVisible();
    expect(await nextNumber(page)).toBe(2);

    await back(page).click();
    await expect(heading(page)).toHaveAccessibleName(/^JA-002 ?, Ny søknad$/);
    // Another job title is another Application.
    await page.getByLabel("Stillingstittel").fill(`${EXAMPLE_META.jobTitle} 2`);
    await submit(page).click();
    await expect(heading(page)).toHaveAccessibleName(/^JA-002 ?,/);
    await expect(
      page.getByText(savedLine("JA-002"), { exact: true }),
    ).toBeVisible();
    expect(await nextNumber(page)).toBe(3);
  });

  test("a failed save keeps the score, says so calmly and starts no phase 2", async ({
    page,
  }) => {
    await signUpWithCv(page);
    const phaseTwo: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (/^\/api\/analyses\/[^/]+\//.test(pathname)) phaseTwo.push(pathname);
    });
    await page.route("**/api/analyses", async (route) => {
      const real = await route.fetch();
      const body = (await real.json()) as { data: Record<string, unknown> };
      await route.fulfill({
        response: real,
        json: { ...body, data: { ...body.data, saved: null } },
      });
    });
    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await expect(back(page)).toBeVisible();

    await expect(page.getByText(EXAMPLE_SENTENCE)).toBeVisible();
    await expect(page.getByText(NOT_SAVED)).toBeVisible();
    await expect(heading(page)).toHaveAccessibleName(EXAMPLE_META.employer);
    await expect(page.getByText(/Lagret i Historikk som/)).toHaveCount(0);
    await expect(page.locator("main").getByText(/JA-\d+/)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Søknadsbrev" }),
    ).toHaveCount(0);
    await expect(page.locator("#live-phase")).toContainText(
      "Søknaden ble ikke lagret i Historikk.",
    );
    await expect(page.locator("#live-phase")).not.toContainText(
      "Lagret i Historikk som",
    );
    await page.waitForTimeout(2000);
    expect(phaseTwo).toEqual([]);
    // The stub hid the saved answer; the row itself was written.
    expect(await nextNumber(page)).toBe(2);

    // «Endre annonsen», then submitting again retries with the same id.
    await back(page).click();
    await page.unroute("**/api/analyses");
    await submit(page).click();
    await expect(heading(page)).toHaveAccessibleName(/^JA-001 ?,/);
    await expect(
      page.getByText(savedLine("JA-001"), { exact: true }),
    ).toBeVisible();
  });

  test("passes axe on the form and on the result at 1280 px and 360 px", async ({
    page,
  }) => {
    await signUpWithCv(page);
    await openSoknad(page);
    await expect(heading(page)).toHaveAccessibleName(/^JA-001 ?, Ny søknad$/);
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      expect(await seriousFindings(page)).toEqual([]);
    }
    await fillJob(page);
    await submit(page).click();
    await expect(
      page.getByText(savedLine("JA-001"), { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Søknadsbrev" }),
    ).toBeVisible();
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      expect(await seriousFindings(page)).toEqual([]);
    }
  });

  test("writes nothing new to the tab's storage", async ({ page }) => {
    await signUpWithCv(page);
    await openSoknad(page);
    await fillJob(page);
    await submit(page).click();
    await expect(
      page.getByText(savedLine("JA-001"), { exact: true }),
    ).toBeVisible();
    const keys = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }));
    expect(keys.local).toEqual([]);
    expect(keys.session).toEqual(["ja.session.v1"]);
    const stored = await page.evaluate(
      () => sessionStorage.getItem("ja.session.v1") ?? "",
    );
    expect(stored).not.toContain("JA-001");
    expect(stored).not.toContain('"seq"');
    expect(stored).not.toContain("saved");
  });
});

test.describe("with accounts off", () => {
  test.use({ baseURL: DEFAULT });

  test("the heading is «Ny søknad» and the employer alone, with no lede and no saved line", async ({
    page,
  }) => {
    await openSoknad(page);
    await expect(heading(page)).toHaveText("Ny søknad");
    await expect(page.getByText(LEDE)).toHaveCount(0);
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    await submit(page).click();
    await expect(back(page)).toBeVisible();
    await expect(heading(page)).toHaveText(EXAMPLE_META.employer);
    await expect(page.getByText(/Lagret i Historikk som/)).toHaveCount(0);
    await expect(page.getByText(NOT_SAVED)).toHaveCount(0);
  });
});
