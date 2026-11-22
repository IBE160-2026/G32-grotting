import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { PHONE, seriousFindings, WIDE } from "./support/application";

// Story 6.4: Registrer deg, Logg inn, the app bar sets, the Hjem button and the
// redirects. The default server has accounts off (port 3100); the eighth
// (3107) has them on, in Test mode; the ninth (3108) has them on as Hosted.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const HOSTED = "http://localhost:3108";
const HOSTED_ACCESS_CODE = "e2e-hosted-code-0123456789";
const PASSWORD = "12345678";
const NAME = "Kari Nordmann";
const TAKEN = "Denne e-postadressen er allerede registrert.";
const CREDENTIALS = "Feil e-post eller passord.";
const TRUST = "CV-en din og dokumentene som lages, lagres kryptert.";
const PLACEHOLDER_LINE = "Denne siden er ikke ferdig ennå.";
const TRY_EXAMPLE =
  "Du kan prøve med eksempelet først. Det krever ingen konto.";
const HJEM_BUTTON = "Lag skreddersydd søknad";

const newEmail = () => `skjerm-${randomUUID()}@example.test`;

// Through the API; the cookie lands in the page's context.
async function signUp(page: Page, email = newEmail(), name = NAME) {
  const registered = await page.request.post("/api/auth/register", {
    data: { name, email, password: PASSWORD },
  });
  expect(registered.status()).toBe(200);
  return email;
}

async function signIn(page: Page, email: string) {
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });
  expect(login.status()).toBe(200);
}

async function register(page: Page) {
  const email = await signUp(page);
  await signIn(page, email);
  return email;
}

// There is no logout screen before 6.10: the test calls the route.
async function logOut(page: Page) {
  const response = await page.request.post("/api/auth/logout");
  expect(response.status()).toBe(200);
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Hovedmeny" });
const navLabels = (page: Page) => nav(page).getByRole("link").allInnerTexts();
const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true });
const submit = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

// The buttons ease their colours for 160 ms; axe measures mid-transition otherwise.
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
}

async function fillRegister(
  page: Page,
  values: { name?: string; email?: string; password?: string } = {},
) {
  await field(page, "Navn").fill(values.name ?? NAME);
  await field(page, "E-post").fill(values.email ?? newEmail());
  await field(page, "Passord").fill(values.password ?? PASSWORD);
}

test.describe("accounts off", () => {
  test.use({ baseURL: DEFAULT });

  for (const path of ["/registrer", "/logg-inn", "/historikk", "/konto"]) {
    test(`${path} shows the not-found page`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { level: 1, name: "Fant ikke siden" }),
      ).toBeVisible();
    });
  }

  test("the app bar, Hjem and Søknad are as after Epic 5", async ({ page }) => {
    await page.goto("/");
    expect(await navLabels(page)).toEqual(["Hjem", "Søknad"]);
    await expect(
      page.getByRole("link", { name: HJEM_BUTTON, exact: true }),
    ).toHaveAttribute("href", "/soknad");
    await expect(page.getByText(TRY_EXAMPLE)).toBeVisible();
    const response = await page.goto("/soknad");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/soknad$/);
  });
});

test.describe("Registrer deg", () => {
  test.use({ baseURL: ACCOUNTS });

  test("shows the form without a Tilgangskode on the local version", async ({
    page,
  }) => {
    await page.goto("/registrer");
    await expect(page).toHaveTitle("Registrer deg – JobAssistant");
    await expect(
      page.getByRole("heading", { level: 1, name: "Registrer deg" }),
    ).toBeVisible();
    await expect(field(page, "Navn")).toHaveAttribute("autocomplete", "name");
    await expect(field(page, "E-post")).toHaveAttribute("type", "email");
    const password = field(page, "Passord");
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("autocomplete", "new-password");
    await expect(
      page.getByText(
        "Minst 8 tegn. Velg et passord du ikke bruker andre steder.",
      ),
    ).toBeVisible();
    await expect(page.getByText(TRUST)).toBeVisible();
    await expect(page.getByLabel("Tilgangskode")).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: "Har du allerede en konto? Logg inn",
      }),
    ).toHaveAttribute("href", "/logg-inn");

    await page.getByRole("button", { name: "Vis" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Skjul" })).toBeVisible();
  });

  test("registers, logs in and lands on Profil with the logged-in app bar", async ({
    page,
  }) => {
    await page.goto("/registrer");
    await fillRegister(page);
    await submit(page, "Registrer deg").click();
    await expect(page).toHaveURL(/\/profil$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: new RegExp(`^CV ?, ${NAME}$`),
      }),
    ).toBeVisible();
    expect(await navLabels(page)).toEqual([
      "Hjem",
      "Søknad",
      "Profil",
      "Historikk",
      "Konto",
    ]);
    await expect(
      nav(page).getByRole("link", { name: "Profil" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("an email already registered goes in the email field, with focus, announced, all values kept", async ({
    page,
  }) => {
    const email = await signUp(page);
    await logOut(page);
    await page.goto("/registrer");
    await fillRegister(page, { name: "Ola Nordmann", email });
    await submit(page, "Registrer deg").click();
    await expect(page.locator("form").getByText(TAKEN)).toBeVisible();
    await expect(field(page, "E-post")).toBeFocused();
    await expect(page.locator("#live-action")).toHaveText(TAKEN);
    await expect(field(page, "Navn")).toHaveValue("Ola Nordmann");
    await expect(field(page, "E-post")).toHaveValue(email);
    await expect(field(page, "Passord")).toHaveValue(PASSWORD);
    await expect(page).toHaveURL(/\/registrer$/);
  });

  test("field errors show on blur (non-empty) and submit, focus the first, and send no request", async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/")) writes.push(request.url());
    });
    await page.goto("/registrer");

    // An empty field waits for submit: reaching for «Vis» raises nothing.
    await page.getByRole("button", { name: "Vis" }).click();
    await expect(
      page.locator("form").getByText("Passordet må ha minst"),
    ).toHaveCount(0);

    await field(page, "E-post").fill("ikke-en-adresse");
    await field(page, "Passord").focus();
    await expect(
      page.locator("form").getByText("Skriv inn en gyldig e-postadresse."),
    ).toBeVisible();
    await field(page, "Passord").fill("kort");
    await field(page, "Navn").focus();
    await expect(
      page.locator("form").getByText("Passordet må ha minst 8 tegn."),
    ).toBeVisible();

    await submit(page, "Registrer deg").click();
    await expect(
      page.locator("form").getByText("Skriv inn navnet ditt."),
    ).toBeVisible();
    await expect(field(page, "Navn")).toBeFocused();
    await expect(page.locator("#live-action")).toHaveText(
      "Skriv inn navnet ditt.",
    );
    // Nothing the Student typed is cleared.
    await expect(field(page, "E-post")).toHaveValue("ikke-en-adresse");
    await expect(field(page, "Passord")).toHaveValue("kort");
    expect(writes).toEqual([]);
  });

  test("registers from the keyboard alone", async ({ page }) => {
    await page.goto("/registrer");
    await field(page, "Navn").focus();
    await page.keyboard.type(NAME);
    await page.keyboard.press("Tab");
    await page.keyboard.type(newEmail());
    await page.keyboard.press("Tab");
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Vis" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(submit(page, "Registrer deg")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/profil$/);
  });

  test("a login that fails after registering is retried by a second press, which only logs in", async ({
    page,
  }) => {
    const registrations: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/auth/register")) {
        registrations.push(request.url());
      }
    });
    let failLogin = true;
    await page.route("**/api/auth/login", async (route) => {
      if (failLogin) {
        failLogin = false;
        await route.abort();
        return;
      }
      await route.continue();
    });
    await page.goto("/registrer");
    await fillRegister(page);
    await submit(page, "Registrer deg").click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/registrer$/);
    await submit(page, "Registrer deg").click();
    await expect(page).toHaveURL(/\/profil$/);
    expect(registrations).toHaveLength(1);
  });
});

test.describe("Registrer deg on the Hosted version", () => {
  test.use({ baseURL: HOSTED });

  test("asks for the Tilgangskode, and checks its length before any request", async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/")) writes.push(request.url());
    });
    await page.goto("/registrer");
    const code = page.getByLabel("Tilgangskode");
    await expect(code).toHaveAttribute("type", "password");
    await expect(
      page.getByText("Minst 16 tegn. Koden får du av utvikleren."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Vis" })).toHaveCount(2);

    await fillRegister(page);
    await code.fill("for-kort");
    // Enter, not a click: leaving the field first would show the error on blur
    // and move the button from under the pointer.
    await code.press("Enter");
    await expect(
      page.locator("form").getByText("Koden har minst 16 tegn."),
    ).toBeVisible();
    await expect(code).toBeFocused();
    expect(writes).toEqual([]);
  });

  test("a wrong code is refused on the field, with the values kept", async ({
    page,
  }) => {
    await page.goto("/registrer");
    const email = newEmail();
    await fillRegister(page, { email });
    await page.getByLabel("Tilgangskode").fill("a-wrong-code-of-sixteen+");
    await submit(page, "Registrer deg").click();
    // The first request to this server opens its database, which is slow when
    // the whole suite runs at once.
    await expect(
      page.locator("form").getByText("Feil tilgangskode."),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Tilgangskode")).toBeFocused();
    await expect(page.locator("#live-action")).toHaveText("Feil tilgangskode.");
    await expect(field(page, "E-post")).toHaveValue(email);
  });

  test("the right code registers and logs in", async ({ page }) => {
    await page.goto("/registrer");
    await fillRegister(page);
    await page.getByLabel("Tilgangskode").fill(HOSTED_ACCESS_CODE);
    await submit(page, "Registrer deg").click();
    await expect(page).toHaveURL(/\/profil$/, { timeout: 30_000 });
  });
});

test.describe("Logg inn", () => {
  test.use({ baseURL: ACCOUNTS });

  test("shows the form", async ({ page }) => {
    await page.goto("/logg-inn");
    await expect(page).toHaveTitle("Logg inn – JobAssistant");
    await expect(
      page.getByRole("heading", { level: 1, name: "Logg inn" }),
    ).toBeVisible();
    await expect(field(page, "E-post")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    await expect(field(page, "Passord")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    await expect(
      page.getByRole("link", { name: "Har du ingen konto? Registrer deg" }),
    ).toHaveAttribute("href", "/registrer");
  });

  test("the right pair lands on Søknad", async ({ page }) => {
    const email = await signUp(page);
    await logOut(page);
    await page.goto("/logg-inn");
    await field(page, "E-post").fill(email);
    await field(page, "Passord").fill(PASSWORD);
    await submit(page, "Logg inn").click();
    await expect(page).toHaveURL(/\/soknad$/);
    expect(await navLabels(page)).toContain("Konto");
  });

  test("registers, logs out and logs in again", async ({ page }) => {
    const email = newEmail();
    await page.goto("/registrer");
    await fillRegister(page, { email });
    await submit(page, "Registrer deg").click();
    await expect(page).toHaveURL(/\/profil$/);
    await logOut(page);
    await page.goto("/logg-inn");
    await field(page, "E-post").fill(email);
    await field(page, "Passord").fill(PASSWORD);
    await submit(page, "Logg inn").click();
    await expect(page).toHaveURL(/\/soknad$/);
  });

  test("logs in from the keyboard alone", async ({ page }) => {
    const email = await signUp(page);
    await logOut(page);
    await page.goto("/logg-inn");
    await field(page, "E-post").focus();
    await page.keyboard.type(email);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/soknad$/);
  });

  test("a wrong password and an unknown email give the same error on the password field", async ({
    page,
  }) => {
    const email = await signUp(page);
    await logOut(page);
    for (const [typed, password] of [
      [email, "feil-passord-1"],
      [newEmail(), PASSWORD],
    ] as const) {
      await page.goto("/logg-inn");
      await field(page, "E-post").fill(typed);
      await field(page, "Passord").fill(password);
      await submit(page, "Logg inn").click();
      await expect(page.locator("form").getByText(CREDENTIALS)).toBeVisible();
      await expect(field(page, "Passord")).toBeFocused();
      await expect(page.locator("#live-action")).toHaveText(CREDENTIALS);
      await expect(field(page, "E-post")).toHaveValue(typed);
      await expect(field(page, "Passord")).toHaveValue(password);
      await expect(page).toHaveURL(/\/logg-inn$/);
    }
  });

  test("empty fields name what is missing, focus the first, and send no request", async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/auth/")) writes.push(request.url());
    });
    await page.goto("/logg-inn");
    await submit(page, "Logg inn").click();
    await expect(
      page.locator("form").getByText("Skriv inn e-postadressen din."),
    ).toBeVisible();
    await expect(field(page, "E-post")).toBeFocused();
    await field(page, "E-post").fill("kari@example.test");
    await submit(page, "Logg inn").click();
    await expect(
      page.locator("form").getByText("Skriv inn passordet ditt."),
    ).toBeVisible();
    await expect(field(page, "Passord")).toBeFocused();
    expect(writes).toEqual([]);
  });
});

test.describe("app bar and Hjem with accounts on", () => {
  test.use({ baseURL: ACCOUNTS });

  test("logged out: Hjem, Søknad, Logg inn, Registrer deg, with the current page marked", async ({
    page,
  }) => {
    await page.goto("/logg-inn");
    expect(await navLabels(page)).toEqual([
      "Hjem",
      "Søknad",
      "Logg inn",
      "Registrer deg",
    ]);
    await expect(
      nav(page).getByRole("link", { name: "Logg inn" }),
    ).toHaveAttribute("aria-current", "page");
    await page.goto("/registrer");
    await expect(
      nav(page).getByRole("link", { name: "Registrer deg" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("logged in: Hjem, Søknad, Profil, Historikk, Konto", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/");
    expect(await navLabels(page)).toEqual([
      "Hjem",
      "Søknad",
      "Profil",
      "Historikk",
      "Konto",
    ]);
    await expect(nav(page).getByRole("link", { name: "Hjem" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("Hjem: the button goes to Registrer deg when logged out, without the example line", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: HJEM_BUTTON, exact: true }),
    ).toHaveAttribute("href", "/registrer");
    await expect(page.getByText(TRY_EXAMPLE)).toHaveCount(0);
  });

  test("Hjem: the button goes to Søknad when logged in", async ({ page }) => {
    await register(page);
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: HJEM_BUTTON, exact: true }),
    ).toHaveAttribute("href", "/soknad");
    await expect(page.getByText(TRY_EXAMPLE)).toHaveCount(0);
  });

  test("a logged-out app bar is back after the session is ended", async ({
    page,
  }) => {
    await register(page);
    await logOut(page);
    await page.goto("/");
    expect(await navLabels(page)).toEqual([
      "Hjem",
      "Søknad",
      "Logg inn",
      "Registrer deg",
    ]);
  });
});

test.describe("logged-out visits", () => {
  test.use({ baseURL: ACCOUNTS });

  for (const path of ["/soknad", "/profil", "/historikk", "/konto"]) {
    test(`${path} without a cookie redirects to Logg inn`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/logg-inn$/);
      await expect(
        page.getByRole("heading", { level: 1, name: "Logg inn" }),
      ).toBeVisible();
    });

    test(`${path} with a dead cookie redirects to Logg inn`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: "ja_sid", value: "not-a-live-token", url: ACCOUNTS },
      ]);
      await page.goto(path);
      await expect(page).toHaveURL(/\/logg-inn$/);
    });
  }

  test("a session that has been ended redirects, though the old cookie is sent", async ({
    page,
    context,
  }) => {
    await register(page);
    const [session] = (await context.cookies(ACCOUNTS)).filter(
      (cookie) => cookie.name === "ja_sid",
    );
    expect(session).toBeDefined();
    await logOut(page);
    await context.addCookies([
      { name: "ja_sid", value: session?.value ?? "", url: ACCOUNTS },
    ]);
    await page.goto("/soknad");
    await expect(page).toHaveURL(/\/logg-inn$/);
  });

  test("logged in, Søknad and Profil open without a redirect", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/soknad");
    await expect(page).toHaveURL(/\/soknad$/);
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/profil$/);
  });

  test("a logged-in visitor of Logg inn and Registrer deg is not redirected", async ({
    page,
  }) => {
    await register(page);
    await page.goto("/logg-inn");
    await expect(page).toHaveURL(/\/logg-inn$/);
    await page.goto("/registrer");
    await expect(page).toHaveURL(/\/registrer$/);
  });
});

test.describe("Historikk and Konto placeholders", () => {
  test.use({ baseURL: ACCOUNTS });

  for (const [path, title, current] of [
    ["/historikk", "Historikk", "Historikk"],
    ["/konto", "Konto", "Konto"],
  ] as const) {
    test(`${path} is a plain page, not a 404`, async ({ page }) => {
      await register(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`${title} – JobAssistant`);
      await expect(
        page.getByRole("heading", { level: 1, name: title }),
      ).toBeVisible();
      await expect(page.getByText(PLACEHOLDER_LINE)).toBeVisible();
      await expect(
        page.getByRole("main").getByRole("link", { name: "Til Søknad" }),
      ).toHaveAttribute("href", "/soknad");
      await expect(
        nav(page).getByRole("link", { name: current }),
      ).toHaveAttribute("aria-current", "page");
    });
  }
});

test.describe("the screens pass axe", () => {
  test.use({ baseURL: ACCOUNTS });

  for (const [label, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`Registrer deg at ${label}, empty and with errors`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto("/registrer");
      await page.waitForLoadState("networkidle");
      expect(await seriousFindings(page)).toEqual([]);
      await submit(page, "Registrer deg").click();
      await expect(
        page.locator("form").getByText("Skriv inn navnet ditt."),
      ).toBeVisible();
      await settled(page);
      expect(await seriousFindings(page)).toEqual([]);
    });

    test(`Logg inn at ${label}, empty and with the credentials error`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto("/logg-inn");
      await page.waitForLoadState("networkidle");
      expect(await seriousFindings(page)).toEqual([]);
      await field(page, "E-post").fill(newEmail());
      await field(page, "Passord").fill("feil-passord-1");
      await submit(page, "Logg inn").click();
      await expect(page.locator("form").getByText(CREDENTIALS)).toBeVisible();
      await settled(page);
      expect(await seriousFindings(page)).toEqual([]);
    });

    test(`the placeholder pages at ${label}`, async ({ page }) => {
      await page.setViewportSize(size);
      await register(page);
      for (const path of ["/historikk", "/konto"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await seriousFindings(page)).toEqual([]);
      }
    });
  }

  test("the Hosted Registrer deg screen at 1280 px and 360 px", async ({
    page,
  }) => {
    for (const size of [WIDE, PHONE]) {
      await page.setViewportSize(size);
      await page.goto(`${HOSTED}/registrer`);
      await page.waitForLoadState("networkidle");
      expect(await seriousFindings(page)).toEqual([]);
    }
  });
});
