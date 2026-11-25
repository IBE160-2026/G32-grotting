import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SEED_TEST_USER } from "@/modules/identity";
import { SEED_EMAIL, SEED_PASSWORD } from "../scripts/smoke.mjs";

// FR-29 (Story 6.11): the README names the test user's email and password, the
// seed creates that user, and the smoke run logs in as that user. The three
// live in three files that cannot import one another, so this test keeps them
// the same.

const readme = readFileSync("README.md", "utf8");

describe("FR-29 the test user in the README, the seed and the smoke run", () => {
  it("has one email and one password in the seed and in scripts/smoke.mjs", () => {
    expect(SEED_EMAIL).toBe(SEED_TEST_USER.email);
    expect(SEED_PASSWORD).toBe(SEED_TEST_USER.password);
  });

  it("names the same email and password in the README", () => {
    expect(readme).toContain(`\`${SEED_TEST_USER.email}\``);
    expect(readme).toContain(`\`${SEED_TEST_USER.password}\``);
  });

  it("keeps the email a lower-cased address no other end-to-end test registers", () => {
    expect(SEED_TEST_USER.email).toBe(SEED_TEST_USER.email.toLowerCase());
    // The end-to-end tests register `<name>-<uuid>@example.test` and
    // `kari@example.test`; the seed address must not be one of those.
    expect(SEED_TEST_USER.email.endsWith("@example.test")).toBe(false);
    const specs = readdirSync("e2e").filter(
      (name) => name.endsWith(".spec.ts") && name !== "seed-user.spec.ts",
    );
    expect(specs.length).toBeGreaterThan(10);
    for (const spec of specs) {
      const text = readFileSync(`e2e/${spec}`, "utf8");
      expect(text).not.toContain(SEED_TEST_USER.email);
    }
  });

  it("does not put a password hash in any of the three", () => {
    const smoke = readFileSync("scripts/smoke.mjs", "utf8");
    const seed = readFileSync("src/modules/identity/server/seed.ts", "utf8");
    for (const text of [readme, smoke, seed]) {
      expect(text).not.toMatch(/scrypt\$\d/);
    }
  });
});
