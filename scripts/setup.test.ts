import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it, vi } from "vitest";
import { parseConfig } from "@/shared/server/config";
import { closeDb, getDb } from "@/shared/server/db";
import { isLocalTarget, runSetup } from "./setup";

afterAll(closeDb);

const base = { APP_ENV: "local" };
const local = (url: string) =>
  parseConfig({ ...base, DATABASE_URL: url, TEST_MODE: "true" });

describe("NFR-9 setup production guard (AD-17)", () => {
  it("allows the db container", () => {
    expect(isLocalTarget(local("postgres://u:p@db:5432/x"))).toBe(true);
  });

  it("allows the developer loop on 127.0.0.1 and localhost", () => {
    expect(isLocalTarget(local("postgres://u:p@127.0.0.1:54320/x"))).toBe(true);
    expect(isLocalTarget(local("postgres://u:p@localhost:5432/x"))).toBe(true);
  });

  it("refuses a foreign database", () => {
    expect(isLocalTarget(local("postgres://u:p@x.supabase.co:5432/x"))).toBe(
      false,
    );
  });

  it("refuses Hosted even on a local host", () => {
    const hosted = parseConfig({
      APP_ENV: "hosted",
      ACCESS_CODE: "0123456789abcdef",
      DATABASE_URL: "postgres://u:p@db:5432/x",
    });
    expect(isLocalTarget(hosted)).toBe(false);
  });

  it("refuses PGlite", () => {
    expect(isLocalTarget(local("pglite://memory"))).toBe(false);
  });
});

describe("NFR-9 setup order (AD-17)", () => {
  it("migrates, then runs local steps on a local target", async () => {
    const step = vi.fn(async () => {});
    await runSetup(await getDb(), local("postgres://u:p@db:5432/x"), [step]);
    expect(step).toHaveBeenCalledOnce();
  });

  it("only migrates against a foreign database", async () => {
    const step = vi.fn(async () => {});
    await runSetup(await getDb(), local("postgres://u:p@x.example:5432/x"), [
      step,
    ]);
    expect(step).not.toHaveBeenCalled();
  });

  it("passes a failing step on", async () => {
    await expect(
      runSetup(await getDb(), local("postgres://u:p@db:5432/x"), [
        async () => {
          throw new Error("boom");
        },
      ]),
    ).rejects.toThrow("boom");
  });
});

describe("NFR-9 setup matrix rows through runSetup (AD-17)", () => {
  it("only migrates on Hosted", async () => {
    const step = vi.fn(async () => {});
    const hosted = parseConfig({
      APP_ENV: "hosted",
      ACCESS_CODE: "0123456789abcdef",
      DATABASE_URL: "postgres://u:p@db:5432/x",
    });
    await runSetup(await getDb(), hosted, [step]);
    expect(step).not.toHaveBeenCalled();
  });

  it("only migrates on PGlite", async () => {
    const step = vi.fn(async () => {});
    await runSetup(await getDb(), local("pglite://memory"), [step]);
    expect(step).not.toHaveBeenCalled();
  });
});

describe("NFR-9 setup as a process (AD-17)", () => {
  it("exits 1 and names the failure when the database is unreachable", () => {
    const run = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "--conditions=react-server",
        "scripts/setup.ts",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: "postgres://u:p@127.0.0.1:1/x",
          VITEST: "", // empty counts as unset: not a test run
          E2E: "",
        },
      },
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("Setup failed");
    expect(run.stderr).toContain("ECONNREFUSED");
  }, 30_000);
});
