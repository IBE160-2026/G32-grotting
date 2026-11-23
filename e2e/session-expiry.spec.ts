import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  CV,
  cvField,
  NETWORK_FAILURE,
  PHONE,
  SUBMIT,
  seriousFindings,
  session,
  toneRadio,
  WIDE,
} from "./support/application";

// Story 6.5: the warning before the session ends, and the work kept if it
// does. Time is the browser's, driven by `page.clock`; the server's session is
// real and is never waited on. The default server has accounts off (3100); the
// eighth (3107) has them on in Test mode; the tenth (3109) has them on with
// Test mode off, so the AI notice shows.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const LIVE_ACCOUNTS = "http://localhost:3109";
const PASSWORD = "12345678";
const NAME = "Kari Nordmann";
const MIN = 60 * 1000;

const WARNING_TITLE = "Økten din avsluttes snart";
const WARNING_BODY =
  "Du blir logget ut om 2 minutter fordi du ikke har gjort noe på en stund. Det du har skrevet, tas vare på.";
const SESSION_ENDED = "Økten din er avsluttet. Logg inn igjen for å fortsette.";
const AD_KEPT = "Vi tok vare på stillingsannonsen du limte inn.";
const DRAFT_KEPT = "Vi tok vare på endringene du ikke hadde lagret.";
const NOTICE_TITLE = "Teksten din sendes til en KI-tjeneste";

const JOB_AD = "Vi søker en utvikler med erfaring fra React. ".repeat(6);
const DRAFT = `${CV} Utkast som ikke er lagret.`;

const warning = (page: Page) =>
  page.getByRole("alertdialog", { name: WARNING_TITLE });
const continueButton = (page: Page) =>
  warning(page).getByRole("button", { name: "Fortsett økten" });
const openDialogs = (page: Page) => page.locator("dialog[open]");

// Registers and logs in through the API; the cookie lands in the page's
// context. A new email each time: the server keeps its database.
async function signIn(page: Page) {
  const email = `okt-${randomUUID()}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { name: NAME, email, password: PASSWORD },
  });
  expect(registered.status()).toBe(200);
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });
  expect(login.status()).toBe(200);
  return email;
}

// A page with a clock the test drives. The session on the server stays alive:
// only the browser's time moves.
async function openWithClock(page: Page, path: string) {
  await page.clock.install();
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

function renewCalls(page: Page): string[] {
  const calls: string[] = [];
  // Answers, not requests: the end moves when the answer is read, so a test
  // that moves the clock sooner would be moving it under the request.
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/session/renew") {
      calls.push(response.url());
    }
  });
  return calls;
}

async function logInOnTheForm(page: Page) {
  // The form is hydrated once the page is idle; typing sooner is lost.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Passord", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Logg inn", exact: true }).click();
  await expect(page).toHaveURL(/\/soknad$/);
}

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

  test("no warning, and no session request, however long the page stays", async ({
    page,
  }) => {
    const sessionCalls: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/session")) {
        sessionCalls.push(request.url());
      }
    });
    await openWithClock(page, "/soknad");
    await page.clock.runFor(29 * MIN);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.keyboard.press("a");
    expect(sessionCalls).toEqual([]);
  });
});

test.describe("the expiry warning", () => {
  test.use({ baseURL: ACCOUNTS });

  test("opens two minutes before the end with the AC text, focus on «Fortsett økten»", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.clock.runFor(27 * MIN);
    await expect(warning(page)).toHaveCount(0);
    await page.clock.runFor(1 * MIN + 5_000);
    await expect(warning(page)).toBeVisible();
    await expect(warning(page)).toContainText(WARNING_BODY);
    await expect(warning(page)).toHaveAttribute("role", "alertdialog");
    await expect(continueButton(page)).toBeFocused();
    await expect(
      warning(page).getByRole("button", { name: "Logg ut" }),
    ).toBeVisible();
    await expect(openDialogs(page)).toHaveCount(1);
  });

  test("«Fortsett økten» renews the session, closes the dialog and gives focus back", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.getByLabel("Stillingstittel").focus();
    await page.clock.runFor(28 * MIN + 5_000);
    await expect(continueButton(page)).toBeFocused();

    const renewed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/session/renew" &&
        response.status() === 200,
    );
    await continueButton(page).click();
    await renewed;
    await expect(warning(page)).toHaveCount(0);
    await expect(page.getByLabel("Stillingstittel")).toBeFocused();

    // The end moved 30 minutes on: ten more minutes bring no warning.
    await page.clock.runFor(10 * MIN);
    await expect(warning(page)).toHaveCount(0);
    await page.clock.runFor(18 * MIN + 5_000);
    await expect(warning(page)).toBeVisible();
  });

  test("Esc does the same as «Fortsett økten»", async ({ page }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.getByLabel("Arbeidsgiver").focus();
    await page.clock.runFor(28 * MIN + 5_000);
    await expect(warning(page)).toBeVisible();
    const renewed = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname === "/api/session/renew" &&
        request.method() === "POST",
    );
    await page.keyboard.press("Escape");
    await renewed;
    await expect(warning(page)).toHaveCount(0);
    await expect(page.getByLabel("Arbeidsgiver")).toBeFocused();
  });

  test("«Logg ut» ends the session, keeps only the ad, title, employer and Tone, and goes to Hjem", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Stillingsannonse").fill(JOB_AD);
    await toneRadio(page, "Direkte").check();
    // Søknad has no CV field with accounts on (Story 6.6); a draft the tab
    // holds from Profil is what the logout must drop.
    await page.evaluate((draft) => {
      const key = "ja.session.v1";
      const held = JSON.parse(sessionStorage.getItem(key) ?? "{}");
      held.inputs = { ...held.inputs, cvDraft: draft, cvText: draft };
      sessionStorage.setItem(key, JSON.stringify(held));
    }, DRAFT);
    await page.clock.runFor(28 * MIN + 5_000);
    await warning(page).getByRole("button", { name: "Logg ut" }).click();
    await expect(page).toHaveURL(`${ACCOUNTS}/`);
    const kept = await session(page);
    expect(kept.inputs).toEqual({ jobTitle: "Utvikler", jobAd: JOB_AD });
    expect(kept.tone).toBe("Direkte");
    expect(kept.lastEmail).toBeUndefined();
    // Logged out: a Student page sends the visitor to Logg inn.
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/logg-inn$/);
  });

  test("activity renews at most once every five minutes", async ({ page }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    const calls = renewCalls(page);
    const field = page.getByLabel("Stillingstittel");
    await field.focus();
    await page.keyboard.type("ab");
    await page.waitForTimeout(300);
    expect(calls).toHaveLength(0);

    await page.clock.runFor(5 * MIN + 3_000);
    await page.keyboard.type("c");
    await expect.poll(() => calls.length).toBe(1);
    await page.keyboard.type("def");
    await page.mouse.move(40, 40);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(calls).toHaveLength(1);

    await page.clock.runFor(4 * MIN);
    await page.keyboard.type("g");
    await page.waitForTimeout(300);
    expect(calls).toHaveLength(1);

    await page.clock.runFor(1 * MIN + 3_000);
    await page.keyboard.type("h");
    await expect.poll(() => calls.length).toBe(2);
  });

  test("typing every five minutes keeps the end moving, so the warning never comes", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    const calls = renewCalls(page);
    await page.getByLabel("Stillingstittel").focus();
    // Thirty-five minutes of typing every five: the end keeps moving on.
    for (let round = 0; round < 7; round++) {
      await page.clock.runFor(5 * MIN + 3_000);
      await page.keyboard.type("x");
      await expect.poll(() => calls.length).toBe(round + 1);
      await expect(warning(page)).toHaveCount(0);
    }
  });

  test("a failing renewal keeps the dialog open with the network alert, and works on the next try", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.clock.runFor(28 * MIN + 5_000);
    await expect(warning(page)).toBeVisible();
    await page.route("**/api/session/renew", (route) => route.abort());
    await continueButton(page).click();
    await expect(warning(page).getByRole("alert")).toContainText(
      NETWORK_FAILURE,
    );
    await expect(warning(page)).toBeVisible();
    await page.unroute("**/api/session/renew");
    await continueButton(page).click();
    await expect(warning(page)).toHaveCount(0);
  });

  test("a failing renewal is not repeated at every key press, and activity in the warning renews nothing", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    const attempts: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/session/renew") {
        attempts.push(request.url());
      }
    });
    await page.route("**/api/session/renew", (route) => route.abort());
    await page.getByLabel("Stillingstittel").focus();
    await page.clock.runFor(5 * MIN + 3_000);
    await page.keyboard.type("abcd");
    await expect.poll(() => attempts.length).toBe(1);
    await page.waitForTimeout(300);
    expect(attempts).toHaveLength(1);

    await page.clock.runFor(23 * MIN);
    await expect(warning(page)).toBeVisible();
    await page.keyboard.press("Tab");
    await page.mouse.move(60, 60);
    await page.waitForTimeout(300);
    expect(attempts).toHaveLength(1);
  });

  test("a failing «Logg ut» keeps the dialog open with the network alert", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.clock.runFor(28 * MIN + 5_000);
    await page.route("**/api/auth/logout", (route) => route.abort());
    await warning(page).getByRole("button", { name: "Logg ut" }).click();
    await expect(warning(page).getByRole("alert")).toContainText(
      NETWORK_FAILURE,
    );
    await expect(page).toHaveURL(`${ACCOUNTS}/soknad`);
  });

  test("passes axe at 1280 px and 360 px", async ({ page }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.clock.runFor(28 * MIN + 5_000);
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await expect(warning(page)).toBeVisible();
      await settled(page);
      expect(await seriousFindings(page)).toEqual([]);
    }
  });
});

test.describe("when the session ends", () => {
  test.use({ baseURL: ACCOUNTS });

  test("the warning runs out: Logg inn with the alert and the email prefilled, then Søknad gets the ad back", async ({
    page,
  }) => {
    const email = await signIn(page);
    await openWithClock(page, "/soknad");
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(JOB_AD);
    await toneRadio(page, "Direkte").check();
    // The email reaches the tab from the session query.
    await expect.poll(async () => (await session(page))?.lastEmail).toBe(email);

    await page.clock.runFor(28 * MIN + 5_000);
    await expect(warning(page)).toBeVisible();
    // The Student is away: on the server the session ends too.
    await page.request.post("/api/auth/logout");
    await page.clock.runFor(2 * MIN);

    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);
    await expect(
      page.getByRole("alert").filter({ hasText: SESSION_ENDED }),
    ).toBeVisible();
    await expect(page.getByLabel("E-post", { exact: true })).toHaveValue(email);
    // A full load: the app bar is the logged-out one.
    await expect(
      page
        .getByRole("navigation", { name: "Hovedmeny" })
        .getByRole("link", { name: "Registrer deg" }),
    ).toBeVisible();
    // Nothing but what the AC names is in the tab: no password, no token.
    const raw = await page.evaluate(() =>
      sessionStorage.getItem("ja.session.v1"),
    );
    expect(raw).not.toContain(PASSWORD);
    expect(raw).not.toContain("ja_sid");
    const stored = JSON.parse(raw ?? "{}");
    expect(
      Object.keys(stored).filter(
        (key) =>
          !["v", "inputs", "tone", "lastEmail", "restoredAfterExpiry"].includes(
            key,
          ),
      ),
    ).toEqual([]);

    await logInOnTheForm(page);
    await expect(page.getByText(AD_KEPT)).toBeVisible();
    await expect(page.getByLabel("Stillingstittel")).toHaveValue("Utvikler");
    await expect(page.getByLabel("Arbeidsgiver")).toHaveValue("Nordic Digital");
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(JOB_AD);
    await expect(toneRadio(page, "Direkte")).toBeChecked();
    // Said once: a new visit does not repeat it.
    await page.goto("/soknad");
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(JOB_AD);
    await expect(page.getByText(AD_KEPT)).toHaveCount(0);
  });

  test("without an ad, Søknad says nothing about one", async ({ page }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.clock.runFor(30 * MIN + 5_000);
    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);
    await logInOnTheForm(page);
    await expect(page.getByText(AD_KEPT)).toHaveCount(0);
  });

  test("an unsaved CV draft on Profil comes back after login, with its notice", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/profil");
    await expect(cvField(page)).toBeVisible();
    await cvField(page).fill(DRAFT);
    await expect
      .poll(async () => (await session(page))?.inputs?.cvDraft)
      .toBe(DRAFT);
    await page.clock.runFor(30 * MIN + 5_000);
    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);
    await logInOnTheForm(page);

    await page.goto("/profil");
    await expect(cvField(page)).toHaveValue(DRAFT);
    await expect(page.getByText(DRAFT_KEPT)).toBeVisible();
    // «Lagre» keeps the text and clears the draft; the notice goes with it.
    await page.getByRole("button", { name: "Lagre", exact: true }).click();
    await expect(
      page.locator("form").getByText("Lagret.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(DRAFT_KEPT)).toHaveCount(0);
    expect((await session(page))?.inputs?.cvDraft).toBeUndefined();
  });

  test("a save answered SESSION_EXPIRED goes to Logg inn and keeps the draft", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/profil");
    await expect(cvField(page)).toBeVisible();
    await page.waitForLoadState("networkidle");
    // The session ends on the server (another tab logged out).
    await page.request.post("/api/auth/logout");
    await cvField(page).fill(DRAFT);
    await page.getByRole("button", { name: "Lagre", exact: true }).click();
    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);
    await expect(
      page.getByRole("alert").filter({ hasText: SESSION_ENDED }),
    ).toBeVisible();
    expect((await session(page))?.inputs?.cvDraft).toBe(DRAFT);
  });

  test("Søknad with accounts on writes no CV to the tab, so nothing is offered on Profil", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    // Søknad has no CV field now (Story 6.6): the ad and the example are all
    // the Student can type, and neither writes a CV.
    await page.getByLabel("Stillingsannonse").fill(JOB_AD);
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    const kept = await session(page);
    expect(kept?.inputs?.cvDraft).toBeUndefined();
    expect(kept?.inputs?.cvText).toBeUndefined();
    await page.clock.runFor(30 * MIN + 5_000);
    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);
    await logInOnTheForm(page);
    await page.goto("/profil");
    await expect(cvField(page)).toHaveValue("");
    await expect(page.getByText(DRAFT_KEPT)).toHaveCount(0);
  });

  test("a draft equal to the saved text is no news: no notice on Profil", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/profil");
    await cvField(page).fill(DRAFT);
    await page.getByRole("button", { name: "Lagre", exact: true }).click();
    await expect(
      page.locator("form").getByText("Lagret.", { exact: true }),
    ).toBeVisible();
    await page.evaluate((draft) => {
      sessionStorage.setItem(
        "ja.session.v1",
        JSON.stringify({
          v: 1,
          inputs: { cvDraft: draft },
          restoredAfterExpiry: { profil: true },
        }),
      );
    }, DRAFT);
    await page.goto("/profil");
    await expect(cvField(page)).toHaveValue(DRAFT);
    await expect(page.getByText(DRAFT_KEPT)).toHaveCount(0);
    // Said or not, it is said once: the flag is used up.
    expect((await session(page))?.restoredAfterExpiry).toBeUndefined();
  });

  test("another Student who logs in on the same tab does not get the first one's work", async ({
    page,
  }) => {
    const first = await signIn(page);
    await openWithClock(page, "/soknad");
    await page.getByLabel("Stillingsannonse").fill(JOB_AD);
    await expect.poll(async () => (await session(page))?.lastEmail).toBe(first);
    await page.request.post("/api/auth/logout");
    await page.clock.runFor(30 * MIN + 5_000);
    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);

    const second = `okt-${randomUUID()}@example.test`;
    const registered = await page.request.post("/api/auth/register", {
      data: { name: "Ola Nordmann", email: second, password: PASSWORD },
    });
    expect(registered.status()).toBe(200);
    await page.getByLabel("E-post", { exact: true }).fill(second);
    await logInOnTheForm(page);
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue("");
    await expect(page.getByText(AD_KEPT)).toHaveCount(0);
  });

  test("an upload answered SESSION_EXPIRED goes to Logg inn, not to the file-picker error", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/profil");
    await expect(cvField(page)).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.route("**/api/cv/extract", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: { code: "SESSION_EXPIRED", retryable: false },
        }),
      }),
    );
    await page.getByLabel("Velg fil, PDF eller TXT, maks 2 MB").setInputFiles({
      name: "cv.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(CV),
    });
    await expect(page).toHaveURL(/\/logg-inn\?okt=utlopt$/);
  });
});

test.describe("one dialog at a time", () => {
  test.use({ baseURL: LIVE_ACCOUNTS });

  test("the warning replaces the AI notice and the notice reopens afterwards", async ({
    page,
  }) => {
    await signIn(page);
    await openWithClock(page, "/soknad");
    await page.getByRole("button", { name: "Bruk eksempelet" }).click();
    await page.getByRole("button", { name: SUBMIT }).click();
    const notice = page.getByRole("dialog", { name: NOTICE_TITLE });
    await expect(notice).toBeVisible();
    await expect(openDialogs(page)).toHaveCount(1);

    await page.clock.runFor(28 * MIN + 5_000);
    await expect(warning(page)).toBeVisible();
    await expect(notice).toBeHidden();
    await expect(openDialogs(page)).toHaveCount(1);
    await expect(continueButton(page)).toBeFocused();

    await continueButton(page).click();
    await expect(warning(page)).toHaveCount(0);
    await expect(notice).toBeVisible();
    await expect(openDialogs(page)).toHaveCount(1);
  });
});
