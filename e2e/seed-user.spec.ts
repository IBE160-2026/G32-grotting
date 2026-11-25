import { expect, type Page, test } from "@playwright/test";
import { cvField, exampleFile } from "./support/application";

// Story 6.11: under E2E=1 the web server seeds the local test user on its
// PGlite when it starts, so the end-to-end tests can log in without
// registering. The email and password are the ones the README names; the unit
// test `test/seed-user-agreement.test.ts` keeps them the same as the seed's.
// The default server (3100) has accounts off, the eighth (3107) has them on, the
// ninth (3108) has them on as Hosted.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const HOSTED = "http://localhost:3108";
const SEED_EMAIL = "testbruker@jobassistant.local";
const SEED_PASSWORD = "testpassord-2026";
const EXAMPLE_CV = exampleFile("cv.txt").replace(/\r\n?/g, "\n");

const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true });

test.describe("the seeded test user, accounts on", () => {
  test.use({ baseURL: ACCOUNTS });

  test("logs in on Logg inn and finds the Example CV saved in Profil", async ({
    page,
  }) => {
    await page.goto("/logg-inn");
    await field(page, "E-post").fill(SEED_EMAIL);
    await field(page, "Passord").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Logg inn", exact: true }).click();
    await expect(page).toHaveURL(/\/soknad$/);

    await page.goto("/profil");
    await expect(cvField(page)).toBeVisible();
    await expect(cvField(page)).toHaveValue(EXAMPLE_CV);
  });

  test("a wrong password for the seed email is refused as INVALID_INPUT", async ({
    page,
  }) => {
    const login = await page.request.post("/api/auth/login", {
      data: { email: SEED_EMAIL, password: "feil-passord-123" },
    });
    expect(login.status()).toBe(400);
  });
});

test.describe("no test user where it must not exist", () => {
  test("accounts off: the account routes are not there to log in to", async ({
    request,
  }) => {
    const login = await request.post(`${DEFAULT}/api/auth/login`, {
      data: { email: SEED_EMAIL, password: SEED_PASSWORD },
    });
    expect(login.status()).toBe(404);
  });

  test("Hosted: the seed email and password do not log in", async ({
    request,
  }) => {
    const login = await request.post(`${HOSTED}/api/auth/login`, {
      data: { email: SEED_EMAIL, password: SEED_PASSWORD },
    });
    // Accounts on Hosted take no Access code at login: the route itself answers,
    // and it knows no such user.
    expect(login.status()).toBe(400);
    expect(await login.json()).toMatchObject({
      error: { code: "INVALID_INPUT", field: "password" },
    });
  });
});
