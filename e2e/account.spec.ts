import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  EXAMPLE_AD,
  EXAMPLE_META,
  exampleFile,
  NETWORK_FAILURE,
  PHONE,
  seriousFindings,
  session,
  WIDE,
} from "./support/application";

// Story 6.10: Konto and «Logg ut». The default server (3100) has accounts off;
// the eighth (3107) has them on in Test mode. Browser windows of 1280 and 360
// px, not a real phone.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const PASSWORD = "12345678";
const EXAMPLE_CV = exampleFile("cv.txt").replace(/\r\n?/g, "\n");

const STORAGE_TITLE = "Slik lagres dataene dine";
const STORAGE_LINES = [
  "CV-en din og dokumentene som lages, lagres kryptert.",
  "Passordet ditt lagres aldri som lesbar tekst.",
  "Alt som er lagret om deg, slettes når kurset er ferdig. Når sensuren er ferdig, tas nettversjonen ned og databasen slettes.",
  "I denne versjonen kan du ikke bytte passord eller slette kontoen selv.",
];
const LOGGED_OUT_BAR = ["Hjem", "Søknad", "Logg inn", "Registrer deg"];

const main = (page: Page) => page.getByRole("main");
const bar = (page: Page) => page.getByRole("navigation", { name: "Hovedmeny" });
const historyLink = (page: Page) =>
  bar(page).getByRole("link", { name: /^Historikk/ });
const barLabels = (page: Page) => bar(page).getByRole("link").allInnerTexts();
const logOutButton = (page: Page) =>
  main(page).getByRole("button", { name: "Logg ut", exact: true });

// A Student made and logged in through the API, with a saved CV; the cookie
// lands in the page's context.
async function signUp(page: Page, name: string, { cv = true } = {}) {
  const email = `konto-${randomUUID()}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { name, email, password: PASSWORD },
  });
  expect(registered.status()).toBe(200);
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });
  expect(login.status()).toBe(200);
  if (cv) {
    const saved = await page.request.put("/api/profile", {
      data: { cvText: EXAMPLE_CV },
    });
    expect(saved.status()).toBe(200);
  }
  return email;
}

// One Application saved through the real route (phase 1), as the form does.
async function addApplication(page: Page, title: string) {
  const inputs = {
    cvText: EXAMPLE_CV,
    jobAd: EXAMPLE_AD,
    jobTitle: title,
    employer: EXAMPLE_META.employer,
  };
  const phaseOne = await page.request.post("/api/analyses", {
    data: { applicationId: randomUUID(), inputs, consent: null },
  });
  expect(phaseOne.status()).toBe(200);
}

// The buttons ease their colours for 160 ms; axe measures mid-transition.
async function settled(page: Page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 5; round++) {
      const running = document.getAnimations();
      if (running.length === 0) return;
      await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
    }
  });
}

test.describe("accounts off", () => {
  test.use({ baseURL: DEFAULT });

  test("/konto and the logout route are as after Epic 5", async ({ page }) => {
    const response = await page.goto("/konto");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Fant ikke siden" }),
    ).toBeVisible();
    const logout = await page.request.post("/api/auth/logout");
    expect(logout.status()).toBe(404);
    await page.goto("/");
    expect(await barLabels(page)).toEqual(["Hjem", "Søknad"]);
  });
});

test.describe("Konto", () => {
  test.use({ baseURL: ACCOUNTS });

  test("a logged-out visit goes to Logg inn", async ({ page }) => {
    await page.goto("/konto");
    await expect(page).toHaveURL(/\/logg-inn$/);
  });

  test("shows the title, the stacked credits, «Logg ut» and the four lines, with no password change or deletion", async ({
    page,
  }) => {
    const email = await signUp(page, "Kari Nordmann");
    await addApplication(page, "Frontendutvikler");
    await addApplication(page, "Backendutvikler");
    await page.goto("/konto");
    await expect(page).toHaveTitle("Konto – JobAssistant");
    await expect(
      page.getByRole("heading", { level: 1, name: "Konto" }),
    ).toBeVisible();
    // The credits list: one `dl`, E-post and Katalog stacked.
    const credits = main(page).locator("dl");
    await expect(credits.locator("dt")).toHaveText(["E-post", "Katalog"]);
    await expect(credits.locator("dd")).toHaveText([email, "2 søknader"]);
    const rows = await credits
      .locator("dt")
      .evaluateAll((terms) =>
        terms.map((term) => term.getBoundingClientRect().top),
      );
    expect(rows[1]).toBeGreaterThan(rows[0] ?? Number.POSITIVE_INFINITY);
    await expect(logOutButton(page)).toBeVisible();
    await expect(
      main(page).getByRole("heading", { level: 2, name: STORAGE_TITLE }),
    ).toBeVisible();
    const lines = main(page)
      .getByRole("region", { name: STORAGE_TITLE })
      .getByRole("listitem");
    await expect(lines).toHaveText(STORAGE_LINES);
    // No password change and no account deletion (FR-23): one button, no field.
    await expect(main(page).getByRole("button")).toHaveCount(1);
    await expect(main(page).getByRole("textbox")).toHaveCount(0);
    await expect(
      main(page).getByRole("link", { name: /passord|slett/i }),
    ).toHaveCount(0);
    await expect(
      bar(page).getByRole("link", { name: "Konto" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(historyLink(page)).toHaveAccessibleName(
      /^Historikk ?, 2 oppføringer$/,
    );
  });

  test("a Student with no Applications has an empty catalogue", async ({
    page,
  }) => {
    await signUp(page, "Kari Nordmann", { cv: false });
    await page.goto("/konto");
    await expect(main(page).locator("dd").nth(1)).toHaveText(
      "Ingen søknader ennå",
    );
  });

  test("one Application is «1 søknad»", async ({ page }) => {
    await signUp(page, "Kari Nordmann");
    await addApplication(page, "Frontendutvikler");
    await page.goto("/konto");
    await expect(main(page).locator("dd").nth(1)).toHaveText("1 søknad");
  });

  for (const [label, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`passes axe at ${label}, and the failure alert too`, async ({
      page,
    }) => {
      await signUp(page, "Kari Nordmann");
      await page.setViewportSize(size);
      await page.goto("/konto");
      await page.waitForLoadState("networkidle");
      expect(await seriousFindings(page)).toEqual([]);
      // No horizontal scroll at 360 px.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.route("**/api/auth/logout", (route) => route.abort());
      await logOutButton(page).click();
      await expect(main(page).getByRole("alert")).toHaveText(
        new RegExp(NETWORK_FAILURE),
      );
      await settled(page);
      expect(await seriousFindings(page)).toEqual([]);
    });
  }

  test("a failing «Logg ut» keeps the Student logged in, on Konto, with nothing cleared", async ({
    page,
  }) => {
    await signUp(page, "Kari Nordmann");
    await page.goto("/konto");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      sessionStorage.setItem(
        "ja.session.v1",
        JSON.stringify({
          v: 1,
          inputs: { cvDraft: "utkast", jobAd: "annonse" },
        }),
      );
    });
    await page.route("**/api/auth/logout", (route) => route.abort());
    await logOutButton(page).click();
    await expect(main(page).getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(`${ACCOUNTS}/konto`);
    await expect(logOutButton(page)).toBeEnabled();
    expect((await session(page)).inputs.cvDraft).toBe("utkast");
    // Still logged in: the next press, now answered, logs out.
    await page.unroute("**/api/auth/logout");
    await logOutButton(page).click();
    await expect(page).toHaveURL(`${ACCOUNTS}/`);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test.describe("«Logg ut»", () => {
  test.use({ baseURL: ACCOUNTS });

  test("ends the session at once, without a question, and lands on Hjem logged out", async ({
    page,
  }) => {
    await signUp(page, "Kari Nordmann");
    await page.goto("/konto");
    await page.waitForLoadState("networkidle");
    expect(await barLabels(page)).toEqual([
      "Hjem",
      "Søknad",
      "Profil",
      "Historikk",
      "Konto",
    ]);
    let dialogs = 0;
    page.on("dialog", () => {
      dialogs++;
    });
    const logout = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/auth/logout" &&
        response.request().method() === "POST",
    );
    await logOutButton(page).click();
    expect((await logout).status()).toBe(200);
    await expect(page).toHaveURL(`${ACCOUNTS}/`);
    // No confirmation: not a native dialog, not a modal one.
    expect(dialogs).toBe(0);
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    // A full page load gives the logged-out app bar.
    expect(await barLabels(page)).toEqual(LOGGED_OUT_BAR);
    const cookies = await page.context().cookies(ACCOUNTS);
    expect(cookies.filter((cookie) => cookie.name === "ja_sid")).toEqual([]);
    // The old session is over on the server: Student pages ask for Logg inn.
    for (const path of ["/konto", "/profil", "/historikk", "/soknad"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/logg-inn$/);
    }
  });

  test("a «Logg ut» that finds the session already gone goes to Logg inn, with no failure alert", async ({
    page,
  }) => {
    await signUp(page, "Kari Nordmann");
    await page.goto("/konto");
    await page.waitForLoadState("networkidle");
    await page.route("**/api/auth/logout", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "SESSION_EXPIRED", retryable: false },
        }),
      }),
    );
    await logOutButton(page).click();
    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);
    await expect(main(page).getByRole("alert")).toContainText(
      "Økten din er avsluttet. Logg inn igjen for å fortsette.",
    );
  });

  test("clears the client session except the ad, title, employer and Tone, and leaves nothing else in the browser's storage", async ({
    page,
  }) => {
    const email = await signUp(page, "Kari Nordmann");
    await addApplication(page, "Frontendutvikler");
    await page.goto("/profil");
    await page.waitForLoadState("networkidle");
    // The tab holds what the Student typed, the CV draft and the email too.
    await page.evaluate(
      ({ draft }) => {
        const held = JSON.parse(
          sessionStorage.getItem("ja.session.v1") ?? "{}",
        );
        sessionStorage.setItem(
          "ja.session.v1",
          JSON.stringify({
            ...held,
            applicationId: "6f1f1c0e-5d1f-4a43-9d4d-0b8a3a1c1f11",
            noticeVersion: "v1",
            tone: "Direkte",
            restoredAfterExpiry: { profil: true },
            inputs: {
              ...held.inputs,
              jobAd: "Annonsen Studenten limte inn.",
              jobTitle: "Utvikler",
              employer: "Firma AS",
              cvDraft: draft,
              cvText: draft,
            },
          }),
        );
      },
      { draft: "CV-utkast som ikke skal bli igjen." },
    );
    await page.goto("/konto");
    await page.waitForLoadState("networkidle");
    // The session view is read by the keep-alive: the email is in the tab.
    expect((await session(page)).lastEmail).toBe(email);
    await logOutButton(page).click();
    await expect(page).toHaveURL(`${ACCOUNTS}/`);
    await page.waitForLoadState("networkidle");

    const kept = await session(page);
    expect(kept).toEqual({
      v: 1,
      tone: "Direkte",
      inputs: {
        jobAd: "Annonsen Studenten limte inn.",
        jobTitle: "Utvikler",
        employer: "Firma AS",
      },
    });
    const everything = await page.evaluate(() =>
      JSON.stringify([
        Object.entries(localStorage),
        Object.entries(sessionStorage),
      ]),
    );
    expect(everything).not.toContain(email);
    expect(everything).not.toContain("CV-utkast");
    expect(everything).not.toContain(EXAMPLE_CV.slice(0, 40));
    expect(everything).not.toContain("Kari Nordmann");
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([
      "ja.session.v1",
    ]);
  });

  test("the next Student on the same tab sees none of the last one's data", async ({
    page,
  }) => {
    await signUp(page, "Kari Nordmann");
    await addApplication(page, "Frontendutvikler");
    await addApplication(page, "Backendutvikler");
    // Student A reads everything the caches could hold: Profil, Historikk with
    // its count in the app bar, Konto.
    await page.goto("/profil");
    await expect(page.getByLabel("CV-tekst", { exact: true })).toHaveValue(
      EXAMPLE_CV,
    );
    await historyLink(page).click();
    await expect(page).toHaveURL(/\/historikk$/);
    await expect(main(page).getByRole("table")).toBeVisible();
    await page.getByRole("link", { name: "Konto" }).click();
    await expect(page).toHaveURL(/\/konto$/);
    await page.waitForLoadState("networkidle");

    const calls: string[] = [];
    let loggedOut = false;
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (loggedOut && pathname.startsWith("/api/")) calls.push(pathname);
    });
    await logOutButton(page).click();
    loggedOut = true;
    await expect(page).toHaveURL(`${ACCOUNTS}/`);
    await page.waitForLoadState("networkidle");
    // Nothing on the way out asked the API for the last Student's data or sent
    // the page to Logg inn.
    expect(calls).toEqual([]);

    // Student B registers on the same tab, from the app bar.
    const email = `konto-${randomUUID()}@example.test`;
    await page.getByRole("link", { name: "Registrer deg" }).first().click();
    await expect(page).toHaveURL(/\/registrer$/);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Navn", { exact: true }).fill("Ola Hansen");
    await page.getByLabel("E-post", { exact: true }).fill(email);
    await page.getByLabel("Passord", { exact: true }).fill(PASSWORD);
    await page
      .getByRole("button", { name: "Registrer deg", exact: true })
      .click();
    await expect(page).toHaveURL(/\/profil$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /^CV ?, Ola Hansen$/ }),
    ).toBeVisible();
    await expect(page.getByLabel("CV-tekst", { exact: true })).toHaveValue("");

    // Historikk: B's empty catalogue, no count in the app bar.
    await bar(page).getByRole("link", { name: "Historikk" }).click();
    await expect(page).toHaveURL(/\/historikk$/);
    await expect(
      main(page).getByText(
        "Ingen søknader ennå. Start med din første stillingsannonse.",
      ),
    ).toBeVisible();
    await expect(main(page).getByRole("table")).toHaveCount(0);
    await expect(
      bar(page).getByRole("link", { name: /^Historikk/ }),
    ).toHaveAccessibleName("Historikk");

    // Konto: B's email and B's count.
    await bar(page).getByRole("link", { name: "Konto" }).click();
    await expect(main(page).locator("dd")).toHaveText([
      email,
      "Ingen søknader ennå",
    ]);
    const text = (await page.content()).toLowerCase();
    expect(text).not.toContain("kari nordmann");
    expect(text).not.toContain("frontendutvikler");
  });
});
