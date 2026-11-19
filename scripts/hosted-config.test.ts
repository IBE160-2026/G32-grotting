import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as Record<
  string,
  unknown
>;
const keepAlive = readFileSync(".github/workflows/keep-alive.yml", "utf8");

describe("FR-30 vercel.json", () => {
  it("builds with Next.js in Frankfurt only", () => {
    expect(vercel.framework).toBe("nextjs");
    expect(vercel.regions).toEqual(["fra1"]);
  });

  it("migrates before it builds (AD-9)", () => {
    expect(vercel.buildCommand).toBe("npm run db:migrate && npm run build");
  });

  it("deploys nothing: the Hosted version is frozen (cut 0, D23)", () => {
    expect(vercel.git).toEqual({
      deploymentEnabled: { "**": false, main: false },
    });
  });

  it("names only npm scripts that exist", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    const named = [
      ...String(vercel.buildCommand).matchAll(/npm run ([\w:-]+)/g),
    ].map((m) => m[1]);
    expect(named).toEqual(["db:migrate", "build"]);
    for (const name of named) expect(pkg.scripts).toHaveProperty(name);
  });

  it("holds no environment values (NFR-7)", () => {
    expect(Object.keys(vercel).sort()).toEqual([
      "$schema",
      "buildCommand",
      "framework",
      "git",
      "regions",
    ]);
  });
});

describe("FR-30 keep-alive.yml", () => {
  it("runs twice a day and by hand", () => {
    const crons = [...keepAlive.matchAll(/- cron: "([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(crons).toHaveLength(2);
    for (const cron of crons) expect(cron).toMatch(/^\d+ \d+ \* \* \*$/);
    expect(keepAlive).toContain("workflow_dispatch:");
  });

  it("calls /api/health at the URL from the HOSTED_URL variable", () => {
    expect(keepAlive).toMatch(/HOSTED_URL: \$\{\{ vars\.HOSTED_URL \}\}/);
    expect(keepAlive).toContain("/api/health");
    expect(keepAlive).not.toMatch(/https?:\/\/[^\s"]*vercel\.app/);
  });

  it("takes no permissions, uses no third-party action and checks the answer", () => {
    expect(keepAlive).toContain("permissions: {}");
    expect(keepAlive).not.toContain("uses:");
    expect(keepAlive).toContain("--fail");
    expect(keepAlive).toContain(".ok == true and .data.hosted == true");
    expect(keepAlive).toContain("https://*");
  });

  it("never puts the variable inside the script text", () => {
    const at = keepAlive.indexOf("run: |");
    expect(at).toBeGreaterThan(-1);
    expect(keepAlive.slice(at)).not.toContain("${{");
  });
});
