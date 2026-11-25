import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  cvField,
  EXAMPLE_AD,
  EXAMPLE_META,
  exampleFile,
  PHONE,
  SUBMIT,
  seriousFindings,
  WIDE,
} from "./support/application";

// Story 6.12: the account flows end to end, in a browser, with accounts on as
// they are by default (the eighth server, 3107, sets no FEATURE_ACCOUNTS; Test
// mode, so phase 2 answers from the Cached Letter and Gap analysis of the
// Example pair). The Student goes through the whole of UJ-1 and UJ-2 with an
// account: registration, Profil, Søknad with the Profile CV, the saved
// Application, Historikk (empty first, then with an entry), the reopened
// Application, Konto, logout, login and the expiry warning. Every screen passes
// axe at 1280 px and at 360 px: the journey runs once at each width.
const ACCOUNTS = "http://localhost:3107";
const PASSWORD = "journey-passord-1";
const NAME = "Vera Journey";
const MIN = 60 * 1000;
const EXAMPLE_CV = exampleFile("cv.txt").replace(/\r\n?/g, "\n");

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const main = (page: Page) => page.getByRole("main");

// The buttons ease their colours for 160 ms; axe measures mid-transition otherwise.
async function settled(page: Page) {
  await page.evaluate(async () => {
    for (let round = 0; round < 5; round++) {
      const running = document.getAnimations();
      if (running.length === 0) return;
      await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
    }
  });
}

async function axe(page: Page, what: string) {
  await settled(page);
  expect(await seriousFindings(page), what).toEqual([]);
}

for (const [label, size] of [
  ["1280 px", WIDE],
  ["360 px", PHONE],
] as const) {
  test.describe(`accounts on by default, at ${label}`, () => {
    test.use({ baseURL: ACCOUNTS, viewport: size });

    test("registration, Profil, Søknad with the Profile CV, the saved Application, Historikk, Konto, logout and login", async ({
      page,
    }) => {
      const email = `reise-${randomUUID()}@example.test`;

      // Hjem with the logged-out bar, then Registrer deg.
      await page.goto("/");
      await axe(page, "Hjem, logged out");
      await page
        .getByRole("link", { name: "Lag skreddersydd søknad", exact: true })
        .click();
      await expect(page).toHaveURL(/\/registrer$/);
      await page.waitForLoadState("networkidle");
      await axe(page, "Registrer deg");
      await field(page, "Navn").fill(NAME);
      await field(page, "E-post").fill(email);
      await field(page, "Passord").fill(PASSWORD);
      await button(page, "Registrer deg").click();

      // Profil: empty, then the CV saved.
      await expect(page).toHaveURL(/\/profil$/);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: new RegExp(`^CV ?, ${NAME}$`),
        }),
      ).toBeVisible();
      await expect(cvField(page)).toBeVisible();
      await axe(page, "Profil, empty");
      await cvField(page).fill(EXAMPLE_CV);
      await button(page, "Lagre").click();
      await expect(page.locator("form").getByText("Lagret.")).toBeVisible();
      await axe(page, "Profil, saved");

      // Historikk, empty.
      await page.goto("/historikk");
      await expect(
        page.getByRole("heading", { level: 1, name: "Historikk" }),
      ).toBeVisible();
      await expect(main(page).getByRole("table")).toHaveCount(0);
      await axe(page, "Historikk, empty");

      // Søknad with the Profile CV: the CV is not asked for, the disclosure is.
      await page.goto("/soknad");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByText("CV-tekst fra Profil", { exact: false }).first(),
      ).toBeVisible();
      await axe(page, "Søknad, form with the Profile CV");
      await page.getByLabel("Stillingstittel").fill(EXAMPLE_META.jobTitle);
      await page.getByLabel("Arbeidsgiver").fill(EXAMPLE_META.employer);
      await page.getByLabel("Stillingsannonse").fill(EXAMPLE_AD);
      await page.getByRole("button", { name: SUBMIT }).click();

      // The result and the saved Application.
      await expect(
        page.getByRole("heading", { level: 1 }),
      ).toHaveAccessibleName(
        new RegExp(`^JA-001 ?, ${EXAMPLE_META.employer}$`),
      );
      await expect(
        page.getByText("Lagret i Historikk som JA-001.", { exact: true }),
      ).toBeVisible();
      // Phase 2 (Gap analysis and Letter) has settled and been saved.
      await expect(page.locator("#live-phase")).toContainText(
        "Lagret i Historikk som JA-001.",
        { timeout: 15_000 },
      );
      await axe(page, "Søknad, result");

      // Historikk with the entry, and the reopened Application.
      await page.goto("/historikk");
      const open = page.getByRole("link", { name: "Åpne JA-001" });
      await expect(open).toBeVisible();
      await axe(page, "Historikk, with an entry");
      await open.click();
      await expect(page).toHaveURL(/\/historikk\/[0-9a-f-]{36}$/);
      await expect(
        page.getByRole("heading", { level: 1 }),
      ).toHaveAccessibleName(
        new RegExp(`^JA-001 ?, ${EXAMPLE_META.employer}$`),
      );
      await expect(page.getByText("Ikke laget.")).toHaveCount(0);
      // A client navigation: Next writes the title after the heading shows, and
      // axe (`document-title`) failed once when it ran first.
      await expect(page).toHaveTitle("Lagret søknad – JobAssistant");
      await page.waitForLoadState("networkidle");
      await axe(page, "the saved Application");

      // Konto and logout.
      await page.goto("/konto");
      await expect(main(page).locator("dd").nth(0)).toHaveText(email);
      await expect(main(page).locator("dd").nth(1)).toHaveText("1 søknad");
      await axe(page, "Konto");
      await button(page, "Logg ut").click();
      await expect(page).toHaveURL(`${ACCOUNTS}/`);
      // Hjem is logged out again: its button asks to register.
      await expect(
        page.getByRole("link", {
          name: "Lag skreddersydd søknad",
          exact: true,
        }),
      ).toHaveAttribute("href", "/registrer");
      // The old session no longer opens a Student page.
      await page.goto("/historikk");
      await expect(page).toHaveURL(/\/logg-inn$/);
      await page.waitForLoadState("networkidle");
      await axe(page, "Logg inn");

      // Logg inn again: the Profile CV and the Application are still there.
      await field(page, "E-post").fill(email);
      await field(page, "Passord").fill(PASSWORD);
      await button(page, "Logg inn").click();
      await expect(page).toHaveURL(/\/soknad$/);
      await page.goto("/profil");
      await expect(cvField(page)).toHaveValue(EXAMPLE_CV);
      await page.goto("/historikk");
      await expect(
        page.getByRole("link", { name: "Åpne JA-001" }),
      ).toBeVisible();
    });

    test("the expiry warning, with the browser clock moved past 28 minutes", async ({
      page,
    }) => {
      const email = `utlop-${randomUUID()}@example.test`;
      const registered = await page.request.post("/api/auth/register", {
        data: { name: NAME, email, password: PASSWORD },
      });
      expect(registered.status()).toBe(200);
      const login = await page.request.post("/api/auth/login", {
        data: { email, password: PASSWORD },
      });
      expect(login.status()).toBe(200);
      await page.clock.install();
      await page.goto("/soknad");
      await page.waitForLoadState("networkidle");
      await page.clock.runFor(28 * MIN + 5_000);
      const warning = page.getByRole("alertdialog", {
        name: "Økten din avsluttes snart",
      });
      await expect(warning).toBeVisible();
      await expect(
        warning.getByRole("button", { name: "Fortsett økten" }),
      ).toBeFocused();
      await axe(page, "the expiry warning");
      await warning.getByRole("button", { name: "Fortsett økten" }).click();
      await expect(warning).toHaveCount(0);
    });
  });
}
