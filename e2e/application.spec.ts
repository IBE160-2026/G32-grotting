import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 800 };
const NARROW = { width: 320, height: 800 };

const AD = "Vi søker en utvikler med erfaring fra React. ".repeat(6);
const AD_ERROR = "Stillingsannonsen må være mellom 200 og 15 000 tegn.";

async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.help}`);
}

// The form fills itself from the tab's session after it has mounted; typing
// before that would be overwritten.
async function openForm(page: Page) {
  await page.goto("/soknad");
  await page.waitForLoadState("networkidle");
}

async function session(page: Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem("ja.session.v1");
    return raw === null ? null : JSON.parse(raw);
  });
}

test.describe("UX-DR36 Søknad form", () => {
  test("shows the heading, the three fields and the submit button", async ({
    page,
  }) => {
    await openForm(page);
    await expect(page).toHaveTitle("Søknad – JobAssistant");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ny søknad",
    );
    await expect(page.getByLabel("Stillingstittel")).toBeVisible();
    await expect(page.getByLabel("Arbeidsgiver")).toBeVisible();
    await expect(page.getByLabel("Stillingsannonse")).toBeVisible();
    await expect(
      page.getByText("Lim inn hele annonseteksten, minst 200 tegn."),
    ).toBeVisible();
    await expect(
      page.locator("form").getByText("0 av 15 000 tegn"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analyser og skriv utkast" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Søknad", exact: true }).last(),
    ).toHaveAttribute("aria-current", "page");
  });

  test("offers no file upload and no URL import for the ad", async ({
    page,
  }) => {
    await openForm(page);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator('input[type="url"]')).toHaveCount(0);
  });

  test("follows the focus order title, employer, ad, submit", async ({
    page,
  }) => {
    await openForm(page);
    await page.getByLabel("Stillingstittel").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Arbeidsgiver")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Stillingsannonse")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Analyser og skriv utkast" }),
    ).toBeFocused();
  });

  test("counts the ad as typed and speaks the count on blur", async ({
    page,
  }) => {
    await openForm(page);
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("a".repeat(3412));
    await expect(
      page.locator("form").getByText("3 412 av 15 000 tegn"),
    ).toBeVisible();
    await ad.blur();
    await expect(page.locator("#live-action")).toHaveText(
      "3 412 av 15 000 tegn",
    );
  });
});

test.describe("FR-4, NFR-5 wrong-input tour on the job fields", () => {
  test("input 1: an empty submit shows all errors, focuses the first and keeps what was typed", async ({
    page,
  }) => {
    await openForm(page);
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("for kort");
    // Enter, not a click: leaving the ad raises its error, which moves the
    // button down between mouse-down and mouse-up.
    await page
      .getByRole("button", { name: "Analyser og skriv utkast" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.locator("form").getByText("Fyll inn stillingstittelen."),
    ).toBeVisible();
    await expect(
      page.locator("form").getByText("Fyll inn arbeidsgiveren."),
    ).toBeVisible();
    await expect(page.locator("form").getByText(AD_ERROR)).toBeVisible();
    await expect(page.getByLabel("Stillingstittel")).toBeFocused();
    await expect(page.getByLabel("Stillingstittel")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(ad).toHaveValue("for kort");
    await expect(page.locator("#live-action")).toHaveText(
      "Fyll inn stillingstittelen.",
    );
  });

  test("input 1: tells which field is invalid when the first ones are fine", async ({
    page,
  }) => {
    await openForm(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page
      .getByRole("button", { name: "Analyser og skriv utkast" })
      .click();
    await expect(page.getByLabel("Stillingsannonse")).toBeFocused();
    await expect(
      page.getByLabel("Stillingsannonse"),
    ).toHaveAccessibleDescription(
      /Lim inn hele annonseteksten.*Stillingsannonsen må være mellom/,
    );
  });

  test("input 4: an ad below 200 characters gives its error on blur and is kept", async ({
    page,
  }) => {
    await openForm(page);
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("a".repeat(199));
    await expect(page.locator("form").getByText(AD_ERROR)).toHaveCount(0);
    await ad.blur();
    await expect(page.locator("form").getByText(AD_ERROR)).toBeVisible();
    await expect(ad).toHaveValue("a".repeat(199));
    await ad.fill("a".repeat(200));
    await ad.blur();
    await expect(page.locator("form").getByText(AD_ERROR)).toHaveCount(0);
  });

  test("input 5: an ad above 15 000 characters gives its error and is not cut", async ({
    page,
  }) => {
    await openForm(page);
    const ad = page.getByLabel("Stillingsannonse");
    await ad.fill("a".repeat(15_001));
    await expect(
      page.locator("form").getByText("15 001 av 15 000 tegn"),
    ).toBeVisible();
    await ad.blur();
    await expect(page.locator("form").getByText(AD_ERROR)).toBeVisible();
    await expect(ad).toHaveValue("a".repeat(15_001));
  });

  test("limits title and employer to 200 characters and needs real text", async ({
    page,
  }) => {
    await openForm(page);
    const title = page.getByLabel("Stillingstittel");
    const employer = page.getByLabel("Arbeidsgiver");
    await title.fill("t".repeat(201));
    await title.blur();
    await expect(
      page.locator("form").getByText("Maks 200 tegn."),
    ).toBeVisible();
    await expect(title).toHaveValue("t".repeat(201));
    await employer.fill("   ");
    await employer.blur();
    await expect(
      page.locator("form").getByText("Fyll inn arbeidsgiveren."),
    ).toBeVisible();
  });
});

test.describe("AD-16, AD-8 client session and applicationId", () => {
  test("keeps the fields over a refresh", async ({ page }) => {
    await openForm(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    await page.reload();
    await expect(page.getByLabel("Stillingstittel")).toHaveValue("Utvikler");
    await expect(page.getByLabel("Arbeidsgiver")).toHaveValue("Nordic Digital");
    await expect(page.getByLabel("Stillingsannonse")).toHaveValue(AD);
    expect((await session(page)).inputs).toEqual({
      jobTitle: "Utvikler",
      employer: "Nordic Digital",
      jobAd: AD,
    });
  });

  test("starts empty from a corrupt store", async ({ page }) => {
    await page.goto("/soknad");
    await page.evaluate(() =>
      sessionStorage.setItem("ja.session.v1", "{not json"),
    );
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Stillingstittel")).toHaveValue("");
  });

  test("makes one applicationId on a valid submit, sends no request, and drops it on an edit", async ({
    page,
  }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) {
        apiCalls.push(request.url());
      }
    });
    await openForm(page);
    await page.getByLabel("Stillingstittel").fill("Utvikler");
    await page.getByLabel("Arbeidsgiver").fill("Nordic Digital");
    await page.getByLabel("Stillingsannonse").fill(AD);
    const submit = page.getByRole("button", {
      name: "Analyser og skriv utkast",
    });
    await submit.dblclick();

    const first = (await session(page)).applicationId;
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    await submit.click();
    expect((await session(page)).applicationId).toBe(first);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Analyser og skriv utkast" })
      .click();
    expect((await session(page)).applicationId).toBe(first);

    await page.getByLabel("Arbeidsgiver").fill("Annen AS");
    expect((await session(page)).applicationId).toBeUndefined();
    await page
      .getByRole("button", { name: "Analyser og skriv utkast" })
      .click();
    const second = (await session(page)).applicationId;
    expect(second).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
    expect(apiCalls).toEqual([]);
  });
});

test.describe("NFR-2 accessibility of Søknad", () => {
  for (const [name, size] of [
    ["1280 px", WIDE],
    ["360 px", PHONE],
  ] as const) {
    test(`has no serious axe findings at ${name}, empty and with errors`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await openForm(page);
      expect(await seriousFindings(page)).toEqual([]);
      await page
        .getByRole("button", { name: "Analyser og skriv utkast" })
        .click();
      await expect(
        page.locator("form").getByText("Fyll inn arbeidsgiveren."),
      ).toBeVisible();
      expect(await seriousFindings(page)).toEqual([]);
    });
  }

  test("sits in one column with no horizontal scroll at 320 px", async ({
    page,
  }) => {
    await page.setViewportSize(NARROW);
    await openForm(page);
    await page
      .getByRole("button", { name: "Analyser og skriv utkast" })
      .click();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
