import { expect, test } from "@playwright/test";

test.describe("NFR-11 scaffold", () => {
  test("loads the front page", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "JobAssistant",
    );
  });
});
