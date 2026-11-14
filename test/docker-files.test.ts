import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const dockerfile = read("Dockerfile");
const compose = read("compose.yaml");

describe("NFR-9 Dockerfile (AD-17)", () => {
  it("has the four stages in order", () => {
    const stages = [...dockerfile.matchAll(/^FROM .* AS (\w+)$/gm)].map(
      (m) => m[1],
    );
    expect(stages).toEqual(["deps", "build", "app", "test"]);
  });

  it("builds on the pinned Node image from the base stages", () => {
    const images = [...dockerfile.matchAll(/^FROM (\S+)/gm)].map((m) => m[1]);
    expect(images).toEqual([
      "node:26.13.1-trixie-slim",
      "deps",
      "node:26.13.1-trixie-slim",
      "deps",
    ]);
  });

  it("sets NODE_ENV=production only in the app stage", () => {
    const [deps = "", build = "", app = "", test = ""] = dockerfile
      .split(/^FROM .*$/m)
      .slice(1);
    expect(app).toContain("NODE_ENV=production");
    for (const other of [deps, build, test]) {
      expect(other).not.toContain("NODE_ENV");
    }
  });

  it("runs the app as node", () => {
    expect(dockerfile).toMatch(/^USER node$/m);
  });

  it("gives /data to node before dropping root", () => {
    expect(dockerfile).toMatch(/chown node:node \/data\nUSER node/);
  });

  it("installs Chromium in the test stage", () => {
    expect(dockerfile).toContain("playwright install --with-deps chromium");
  });
});

describe("NFR-9 compose.yaml (AD-17)", () => {
  it("names the project and the three services", () => {
    expect(compose).toMatch(/^name: jobassistant$/m);
    for (const service of ["db", "app", "test"]) {
      expect(compose).toMatch(new RegExp(`^  ${service}:$`, "m"));
    }
  });

  it("publishes only 127.0.0.1:3000 and 127.0.0.1:54320", () => {
    const ports = [...compose.matchAll(/^\s+- "?(\d[\d.:]*)"?$/gm)].map(
      (m) => m[1],
    );
    expect(ports).toEqual(["127.0.0.1:54320:5432", "127.0.0.1:3000:3000"]);
  });

  it("waits for a healthy db and checks both services", () => {
    expect(compose).toContain("condition: service_healthy");
    expect(compose).toContain("pg_isready -h 127.0.0.1");
    expect(compose).toContain("/api/health");
  });

  it("pins the Postgres image", () => {
    expect(compose).toContain("image: postgres:17.12-alpine");
  });

  it("keeps the test service out of `up` and the secrets file on a volume", () => {
    expect(compose).toContain('profiles: ["test"]');
    expect(compose).toContain("SECRETS_FILE: /data/secrets.env");
    expect(compose).toMatch(/path: \.env\n\s+required: false/);
  });
});

describe("NFR-9 repository hygiene (AD-17)", () => {
  it("does not use standalone output", () => {
    expect(read("next.config.ts")).not.toContain("standalone");
  });

  it("has no shell scripts", () => {
    const dirs = [".", "scripts", "src", "test", "e2e"];
    const found = dirs.flatMap((dir) =>
      readdirSync(dir, { recursive: dir !== "." }).filter((f) =>
        String(f).endsWith(".sh"),
      ),
    );
    expect(found).toEqual([]);
  });

  it("keeps .env, .data and node_modules out of the image", () => {
    const ignore = read(".dockerignore");
    for (const entry of ["node_modules", ".next", ".data", ".env*", ".git"]) {
      expect(ignore.split("\n")).toContain(entry);
    }
  });
});
