import { expect, test } from "@playwright/test";

test.describe("FR-31 the gate never applies locally", () => {
  test("opens pages and API routes without a cookie", async ({ request }) => {
    expect((await request.get("/", { maxRedirects: 0 })).status()).toBe(200);
    expect((await request.get("/api/health")).status()).toBe(200);
  });

  test("has no Access-code screen or endpoint", async ({ request }) => {
    expect((await request.get("/tilgang")).status()).toBe(404);
    const response = await request.post("/api/access", {
      data: { code: "a-long-random-code-1234" },
    });
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", retryable: false },
    });
  });
});
