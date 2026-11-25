import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

// A Student page is never kept by the browser: after «Logg ut», Back must not
// bring the page of the Student who left (the back/forward cache honours
// `Cache-Control: no-store`). The accounts server (3107) has accounts on.
const ACCOUNTS = "http://localhost:3107";
const PASSWORD = "12345678";
const STUDENT_PAGES = ["/soknad", "/profil", "/historikk", "/konto"];

test.use({ baseURL: ACCOUNTS });

async function signUp(page: Page) {
  const email = `cache-${randomUUID()}@example.test`;
  const data = { name: "Cache Student", email, password: PASSWORD };
  expect(
    (await page.request.post("/api/auth/register", { data })).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/auth/login", {
        data: { email, password: PASSWORD },
      })
    ).status(),
  ).toBe(200);
  return email;
}

test.describe("Student pages and the browser's cache", () => {
  for (const path of STUDENT_PAGES) {
    test(`${path} answers with Cache-Control: no-store`, async ({ page }) => {
      await signUp(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      expect(response?.headers()["cache-control"]).toContain("no-store");
    });
  }

  test("Back after «Logg ut» does not show the Student's page", async ({
    page,
  }) => {
    const email = await signUp(page);
    // Historikk, then Konto in the same tab: «Logg ut» replaces Konto in the
    // history, so Back lands on the Historikk page of the Student who left.
    await page.goto("/historikk");
    await expect(page.getByRole("main")).toBeVisible();
    await page
      .getByRole("navigation", { name: "Hovedmeny" })
      .getByRole("link", { name: "Konto" })
      .click();
    await expect(page.getByRole("main")).toContainText(email);
    await page
      .getByRole("main")
      .getByRole("button", { name: "Logg ut", exact: true })
      .click();
    await expect(page).toHaveURL(`${ACCOUNTS}/`);
    await page.goBack();
    // The page is asked for again, and a logged-out visitor is sent to Logg inn.
    await expect(page).toHaveURL(/\/logg-inn/);
    await expect(page.getByText(email)).toHaveCount(0);
  });
});
