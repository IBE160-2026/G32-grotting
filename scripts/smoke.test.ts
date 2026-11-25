import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkHealth,
  checkLogin,
  SEED_EMAIL,
  SEED_PASSWORD,
} from "./smoke.mjs";

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

// What the seed saves: the Example pair's CV with LF line endings.
const EXAMPLE_CV = readFileSync(
  "data/fixtures/example-nordic-digital/cv.txt",
  "utf8",
).replace(/\r\n?/g, "\n");

type FakeApp = {
  loginStatus?: number;
  email?: string;
  cookie?: string | null;
  sessionStatus?: number;
  cvText?: string | null;
};

// An app that answers health, login, session and Profil the way the real one
// does for the seeded test user, with one thing wrong at a time.
async function serveApp(options: FakeApp = {}): Promise<string> {
  requestedPaths = [];
  server = createServer((request, response) => {
    requestedPaths.push(`${request.method} ${request.url}`);
    const send = (status: number, body: unknown, headers = {}) => {
      response.writeHead(status, {
        "content-type": "application/json",
        ...headers,
      });
      response.end(JSON.stringify(body));
    };
    if (request.url === "/api/health") {
      return send(200, { ok: true, data: { hosted: false } });
    }
    if (request.url === "/api/auth/login") {
      const cookie =
        options.cookie === undefined
          ? "ja_sid=token-123; Path=/; HttpOnly"
          : options.cookie;
      return send(
        options.loginStatus ?? 200,
        { ok: true, data: { email: options.email ?? SEED_EMAIL } },
        cookie === null ? {} : { "set-cookie": cookie },
      );
    }
    const signedIn = request.headers.cookie === "ja_sid=token-123";
    if (request.url === "/api/session") {
      return signedIn
        ? send(options.sessionStatus ?? 200, {
            ok: true,
            data: { email: SEED_EMAIL },
          })
        : send(401, { ok: false });
    }
    if (request.url === "/api/profile") {
      const cv = options.cvText === undefined ? EXAMPLE_CV : options.cvText;
      return signedIn
        ? send(200, { ok: true, data: { cvText: cv } })
        : send(401, { ok: false });
    }
    return send(404, { ok: false });
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

  it("as a process exits 0 and says so on a healthy answer and a working test user", async () => {
    const url = await serveApp();
    const run = await runSmoke(url);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain("Smoke passed");
    expect(run.stdout).not.toContain(SEED_PASSWORD);
  }, 30_000);

  it("as a process exits 1 and says why when the test user cannot log in", async () => {
    const url = await serveApp({ loginStatus: 400 });
    const run = await runSmoke(url);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain("Smoke failed");
    expect(run.stderr).toContain("login as the test user");
    expect(run.stderr).not.toContain(SEED_PASSWORD);
  }, 30_000);

  it("as a process exits 1 and says why on a bad answer", async () => {
    const url = await serve(500, "{}");
    const run = await runSmoke(url);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain("Smoke failed");
  }, 30_000);
});

describe("Story 6.12 smoke login as the seeded test user", () => {
  it("logs in, finds the session and the seeded CV in Profil", async () => {
    const url = await serveApp();
    expect(await checkLogin(url)).toEqual({ ok: true });
    expect(requestedPaths).toEqual([
      "POST /api/auth/login",
      "GET /api/session",
      "GET /api/profile",
    ]);
  });

  it("sends the made-up seed email and password, and no other", async () => {
    let sent = "";
    server = createServer((request, response) => {
      request.on("data", (chunk) => {
        sent += String(chunk);
      });
      request.on("end", () => {
        response.writeHead(400, { "content-type": "application/json" });
        response.end("{}");
      });
    });
    await new Promise<void>((resolve) =>
      server?.listen(0, "127.0.0.1", resolve),
    );
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await checkLogin(url);
    expect(JSON.parse(sent)).toEqual({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });
  });

  it.each([
    ["a refused login", { loginStatus: 400 }, "expected status 200, got 400"],
    [
      "another user in the answer",
      { email: "annen@example.test" },
      "unexpected answer",
    ],
    ["no session cookie", { cookie: null }, "no session cookie"],
    [
      "an empty session cookie",
      { cookie: "ja_sid=; Path=/" },
      "no session cookie",
    ],
    ["a dead session", { sessionStatus: 401 }, "/api/session"],
    ["no saved CV", { cvText: null }, "/api/profile"],
    ["a CV that is too short", { cvText: "kort" }, "/api/profile"],
    [
      "another CV than the seeded one",
      { cvText: "b".repeat(300) },
      "/api/profile",
    ],
  ] as [string, FakeApp, string][])(
    "fails on %s, without the password or cookie in the reason",
    async (_name, options, reason) => {
      const url = await serveApp(options);
      const result = await checkLogin(url);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain(reason);
      expect(result.reason).not.toContain(SEED_PASSWORD);
      expect(result.reason).not.toContain("token-123");
    },
  );

  it("fails when nothing listens", async () => {
    const result = await checkLogin("http://127.0.0.1:1");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("request failed");
  });
});
