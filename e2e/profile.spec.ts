import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import {
  CV,
  CV_ERROR,
  cvField,
  NETWORK_FAILURE,
  PASTE_HINT,
  PHONE,
  picker,
  SCANNED,
  SCANNED_PDF,
  seriousFindings,
  TEXT_PDF,
  WIDE,
} from "./support/application";

// Story 6.3. The default server has accounts off; the eighth server
// (playwright.config.ts, port 3107) has them on, in Test mode.
const DEFAULT = "http://localhost:3100";
const ACCOUNTS = "http://localhost:3107";
const PASSWORD = "12345678";
const NAME = "Kari Nordmann";

const OTHER_CV = "Prosjektleder med ansvar for flere team i Stavanger. ".repeat(
  5,
);
const SAVE = "Lagre";
const SAVED = "Lagret.";
const SAVE_HINT = "Lagre blir tilgjengelig når feltet har tekst.";
const PLACEHOLDER = "Lim inn CV-teksten din";
const COLUMN_HINT =
  "PDF-er med to kolonner kan blande linjene. Les gjennom og rett det som har havnet feil før du lagrer.";
const PICKER_HINT =
  "PDF eller TXT, maks 2 MB. Du kan også lime inn teksten direkte i feltet.";
const SESSION_ENDED = "Økten din er avsluttet. Logg inn igjen for å fortsette.";

// Registers and logs in through the API; the cookie lands in the page's
// context. Each call uses a new email: the server keeps its database.
async function signIn(page: Page, name = NAME) {
  const email = `profil-${randomUUID()}@example.test`;
  const registered = await page.request.post("/api/auth/register", {
    data: { name, email, password: PASSWORD },
  });
  expect(registered.status()).toBe(200);
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });
  expect(login.status()).toBe(200);
}

async function openProfile(page: Page, name = NAME) {
  await signIn(page, name);
  await page.goto("/profil");
  await expect(cvField(page)).toBeVisible();
}

const saveButton = (page: Page) =>
  page.getByRole("button", { name: SAVE, exact: true });
const savedLine = (page: Page) => page.locator("form").getByText(SAVED);

test.describe("accounts off", () => {
  test.use({ baseURL: DEFAULT });

  test("/profil shows the not-found page", async ({ page }) => {
    const response = await page.goto("/profil");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Fant ikke siden" }),
    ).toBeVisible();
  });
});

test.describe("Profil with accounts on", () => {
  test.use({ baseURL: ACCOUNTS });

  test("heads the page «CV, navn», with the dot hidden from assistive technology", async ({
    page,
  }) => {
    await openProfile(page);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: new RegExp(`^CV ?, ${NAME}$`),
      }),
    ).toBeVisible();
    await expect(page.locator("h1 [aria-hidden=true]")).toHaveText("·");
    await expect(page).toHaveTitle("Profil – JobAssistant");
  });

  test("shows skeleton rows with aria-busy while the Profile is on its way", async ({
    page,
  }) => {
    await signIn(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/profile", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto("/profil");
    await expect(page.locator("[aria-busy=true]")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("CV");
    await expect(cvField(page)).toHaveCount(0);
    release();
    await expect(cvField(page)).toBeVisible();
    await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      new RegExp(`^CV ?, ${NAME}$`),
    );
  });

  test("starts empty: the placeholder, and «Lagre» disabled with its hint", async ({
    page,
  }) => {
    await openProfile(page);
    await expect(cvField(page)).toHaveAttribute("placeholder", PLACEHOLDER);
    await expect(cvField(page)).toHaveValue("");
    await expect(saveButton(page)).toBeDisabled();
    const hint = page.getByText(SAVE_HINT);
    await expect(hint).toBeVisible();
    await expect(saveButton(page)).toHaveAttribute(
      "aria-describedby",
      (await hint.getAttribute("id")) ?? "",
    );
    await expect(page.getByText(COLUMN_HINT)).toBeVisible();
    await expect(page.getByText(PICKER_HINT)).toBeVisible();
    // Story 6.4 put Profil in the logged-in app bar, so the test no longer
    // says it is missing: it is the current page.
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Profil" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("saves a pasted CV: «Lagret.» shows and is announced, and a reload keeps the text", async ({
    page,
  }) => {
    await openProfile(page);
    await cvField(page).fill(CV);
    await expect(saveButton(page)).toBeEnabled();
    await expect(page.getByText(SAVE_HINT)).toHaveCount(0);
    await saveButton(page).click();
    await expect(savedLine(page)).toBeVisible();
    await expect(page.locator("#live-action")).toHaveText(SAVED);
    await page.reload();
    await expect(cvField(page)).toHaveValue(CV);
    await expect(savedLine(page)).toHaveCount(0);
  });

  test("a second save replaces the first, and an edit clears «Lagret.»", async ({
    page,
  }) => {
    await openProfile(page);
    await cvField(page).fill(CV);
    await saveButton(page).click();
    await expect(savedLine(page)).toBeVisible();
    await cvField(page).fill(OTHER_CV);
    await expect(savedLine(page)).toHaveCount(0);
    await saveButton(page).click();
    await expect(savedLine(page)).toBeVisible();
    await page.reload();
    await expect(cvField(page)).toHaveValue(OTHER_CV);
  });

  test("a text that is too short gives the field error and focus, and sends no request", async ({
    page,
  }) => {
    await openProfile(page);
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "PUT") writes.push(request.url());
    });
    await cvField(page).fill("for kort");
    await saveButton(page).click();
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await expect(cvField(page)).toBeFocused();
    await expect(page.locator("#live-action")).toHaveText(CV_ERROR);
    expect(writes).toEqual([]);
    await expect(cvField(page)).toHaveValue("for kort");
  });

  test("saves from the keyboard alone", async ({ page }) => {
    await openProfile(page);
    await cvField(page).focus();
    await page.keyboard.insertText(CV);
    await page.keyboard.press("Tab");
    await expect(saveButton(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(savedLine(page)).toBeVisible();
  });

  test("an uploaded text PDF fills the field with the two-column hint and no «Bekreft» step", async ({
    page,
  }) => {
    await openProfile(page);
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(cvField(page)).toHaveValue(/frontendutvikler med React/);
    await expect(cvField(page)).toBeFocused();
    await expect(page.getByText(COLUMN_HINT)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bekreft CV-teksten" }),
    ).toHaveCount(0);
    // Nothing is saved until «Lagre».
    await page.reload();
    await expect(cvField(page)).toHaveValue("");
  });

  test("a scanned PDF gives the alert, «Velg en annen fil», the paste hint and focus in the empty field", async ({
    page,
  }) => {
    await openProfile(page);
    await picker(page).setInputFiles(SCANNED_PDF);
    await expect(
      page.getByRole("alert").filter({ hasText: SCANNED }),
    ).toBeVisible();
    await expect(page.getByText("Velg en annen fil")).toBeVisible();
    await expect(page.getByText(PASTE_HINT)).toBeVisible();
    await expect(cvField(page)).toBeFocused();
    await expect(cvField(page)).toHaveValue("");
  });

  test("only JSON goes out on «Lagre», never the file", async ({ page }) => {
    await openProfile(page);
    await picker(page).setInputFiles(TEXT_PDF);
    await expect(cvField(page)).toHaveValue(/frontendutvikler med React/);
    const after: { method: string; path: string; type: string | undefined }[] =
      [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith("/api/")) {
        after.push({
          method: request.method(),
          path: pathname,
          type: request.headers()["content-type"],
        });
      }
    });
    const sent = page.waitForRequest((request) => request.method() === "PUT");
    await saveButton(page).click();
    const request = await sent;
    await expect(savedLine(page)).toBeVisible();
    expect(after).toEqual([
      { method: "PUT", path: "/api/profile", type: "application/json" },
    ]);
    expect(Object.keys(request.postDataJSON())).toEqual(["cvText"]);
    expect(request.postData()).not.toContain("%PDF");
  });

  test("a second Student sees their own empty CV", async ({
    page,
    browser,
  }) => {
    await openProfile(page);
    await cvField(page).fill(CV);
    await saveButton(page).click();
    await expect(savedLine(page)).toBeVisible();

    const other = await browser.newContext({ baseURL: ACCOUNTS });
    const otherPage = await other.newPage();
    await openProfile(otherPage, "Ola Hansen");
    await expect(
      otherPage.getByRole("heading", { level: 1, name: /^CV ?, Ola Hansen$/ }),
    ).toBeVisible();
    await expect(cvField(otherPage)).toHaveValue("");
    await other.close();
  });

  // Story 6.4 replaces the session-ended alert for a logged-out visit: the
  // server sends the visitor to Logg inn.
  test("without a session the page redirects to Logg inn", async ({ page }) => {
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/logg-inn$/);
    await expect(cvField(page)).toHaveCount(0);
  });
});

// Answers only the PUT of the Profile; every other request goes on as it was.
async function answerPut(
  page: Page,
  answer: (route: import("@playwright/test").Route) => Promise<void>,
) {
  await page.route("**/api/profile", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }
    await answer(route);
  });
}

const refused = (code: string, field?: string) => ({
  status: code === "SESSION_EXPIRED" ? 401 : 400,
  contentType: "application/json",
  body: JSON.stringify({
    ok: false,
    error: { code, ...(field ? { field } : {}), retryable: false },
  }),
});

test.describe("Profil when the save does not go through", () => {
  test.use({ baseURL: ACCOUNTS });

  test("an ended session shows its alert, no «Lagret.», and keeps the draft", async ({
    page,
  }) => {
    await openProfile(page);
    await answerPut(page, (route) => route.fulfill(refused("SESSION_EXPIRED")));
    await cvField(page).fill(CV);
    await saveButton(page).click();
    await expect(
      page.getByRole("alert").filter({ hasText: SESSION_ENDED }),
    ).toBeVisible();
    await expect(savedLine(page)).toHaveCount(0);
    await expect(cvField(page)).toHaveValue(CV);
  });

  test("a field error from the server shows CV_LENGTH, focus in the field and the draft kept", async ({
    page,
  }) => {
    await openProfile(page);
    await answerPut(page, (route) =>
      route.fulfill(refused("INVALID_INPUT", "cvText")),
    );
    await cvField(page).fill(CV);
    await saveButton(page).click();
    await expect(page.locator("form").getByText(CV_ERROR)).toBeVisible();
    await expect(cvField(page)).toBeFocused();
    await expect(savedLine(page)).toHaveCount(0);
    await expect(cvField(page)).toHaveValue(CV);
  });

  test("a network failure shows the alert, keeps the draft and leaves «Lagre» usable", async ({
    page,
  }) => {
    await openProfile(page);
    await answerPut(page, (route) => route.abort());
    await cvField(page).fill(CV);
    await saveButton(page).click();
    await expect(
      page.getByRole("alert").filter({ hasText: NETWORK_FAILURE }),
    ).toBeVisible();
    await expect(savedLine(page)).toHaveCount(0);
    await expect(cvField(page)).toHaveValue(CV);
    await expect(saveButton(page)).toBeEnabled();
    await page.unroute("**/api/profile");
    await saveButton(page).click();
    await expect(savedLine(page)).toBeVisible();
  });

  test("an edit made while the save is on its way is kept, and is not called saved", async ({
    page,
  }) => {
    await openProfile(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started: () => void = () => {};
    const sent = new Promise<void>((resolve) => {
      started = resolve;
    });
    await answerPut(page, async (route) => {
      started();
      await gate;
      await route.fallback();
    });
    await cvField(page).fill(CV);
    await saveButton(page).click();
    await sent;
    const newer = `${CV} Og mer erfaring fra drift.`;
    await cvField(page).fill(newer);
    release();
    // The answer has landed once the button is free again.
    await expect(saveButton(page)).not.toHaveAttribute("aria-disabled", "true");
    await expect(cvField(page)).toHaveValue(newer);
    await expect(savedLine(page)).toHaveCount(0);
  });
});

// The buttons ease their colours for 160 ms; axe measures mid-transition otherwise.
async function settled(page: Page) {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
}

test.describe("Profil passes axe", () => {
  test.use({ baseURL: ACCOUNTS });

  for (const [label, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`empty, filled and scanned at ${label}`, async ({ page }) => {
      await page.setViewportSize(size);
      await openProfile(page);
      await page.waitForLoadState("networkidle");
      expect(await seriousFindings(page)).toEqual([]);

      await cvField(page).fill(CV);
      await settled(page);
      expect(await seriousFindings(page)).toEqual([]);

      await picker(page).setInputFiles(SCANNED_PDF);
      await expect(page.getByText(SCANNED)).toBeVisible();
      await settled(page);
      expect(await seriousFindings(page)).toEqual([]);
    });
  }
});
