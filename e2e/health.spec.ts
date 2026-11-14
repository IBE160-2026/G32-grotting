import { expect, test } from "@playwright/test";

test.describe("FR-27 health check", () => {
  test("answers 200 with hosted false after SELECT 1", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { hosted: false },
    });
  });
});
