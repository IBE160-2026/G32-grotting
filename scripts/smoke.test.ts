import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { checkHealth } from "./smoke.mjs";

let server: Server | undefined;
let requestedPaths: string[] = [];

type Run = { code: number; stdout: string; stderr: string };

// Runs `node scripts/smoke.mjs <url>` as the CI step does. Async, so the fake
// server in this process can answer while the child runs.
function runSmoke(url: string): Promise<Run> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ["scripts/smoke.mjs", url],
      { encoding: "utf8" },
      (error, stdout, stderr) => {
        const code = typeof error?.code === "number" ? error.code : 0;
        resolve({ code, stdout, stderr });
      },
    );
  });
}

async function serve(status: number, body: string): Promise<string> {
  requestedPaths = [];
  server = createServer((request, response) => {
    requestedPaths.push(`${request.method} ${request.url}`);
    response.writeHead(status, { "content-type": "application/json" });
    response.end(body);
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  const closing = server;
  server = undefined;
  if (closing === undefined) return;
  closing.closeAllConnections();
  await new Promise((resolve) => closing.close(resolve));
});

describe("NFR-9 smoke run (AD-17)", () => {
  it("passes on 200 with ok and hosted false", async () => {
    const url = await serve(200, '{"ok":true,"data":{"hosted":false}}');
    expect(await checkHealth(url)).toEqual({ ok: true });
    expect(requestedPaths).toEqual(["GET /api/health"]);
  });

  it("fails on a non-200 status", async () => {
    const url = await serve(500, '{"ok":true,"data":{"hosted":false}}');
    const result = await checkHealth(url);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("500");
  });

  it("fails when hosted is true", async () => {
    const url = await serve(200, '{"ok":true,"data":{"hosted":true}}');
    expect((await checkHealth(url)).ok).toBe(false);
  });

  it("fails when the body is not JSON", async () => {
    const url = await serve(200, "<html>");
    const result = await checkHealth(url);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("not JSON");
  });

  it("fails when nothing listens", async () => {
    const result = await checkHealth("http://127.0.0.1:1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("request failed");
  });

  it("as a process exits 0 and says so on a healthy answer", async () => {
    const url = await serve(200, '{"ok":true,"data":{"hosted":false}}');
    const run = await runSmoke(url);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain("Smoke passed");
  }, 30_000);

  it("as a process exits 1 and says why on a bad answer", async () => {
    const url = await serve(500, "{}");
    const run = await runSmoke(url);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain("Smoke failed");
  }, 30_000);
});
