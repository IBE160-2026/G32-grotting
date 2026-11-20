import { readFileSync } from "node:fs";
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

// A stub proxy for the manual failure checks (docs/qa/letter-manual-checks.md,
// rows 8-17). It sits in front of the running app and, while a mode is on,
// answers the Letter or the Letter-check request itself with the failure to
// look at; everything else passes through. Nothing in the app changes, so the
// real screens, live regions and focus handling are what the screen reader
// meets. Usage: `npx tsx scripts/qa-stub-proxy.ts [appPort=3000] [proxyPort=3300]`,
// open `http://localhost:<proxyPort>/` and switch modes on `/__stub`.
// A QA tool only: it holds no secrets and the app never imports it.

const APP_PORT = Number(process.argv[2] ?? 3000);
const PROXY_PORT = Number(process.argv[3] ?? 3300);

const PLANTED = JSON.parse(
  readFileSync(
    new URL("../data/fixtures/_planted/letter-flags.json", import.meta.url),
    "utf8",
  ),
) as { data: { text: string }; meta: unknown };

const say = (line: string) =>
  process.stdout.write(`${line}
`);

type Stub = { status: number; json: unknown } | "passthrough";

const failure = (code: string, retryable: boolean) => ({
  ok: false,
  error: { code, retryable },
});

type Mode = {
  readonly label: string;
  readonly rows: string;
  // Called per request: `kind` is "letter" or "check", `body` the parsed JSON.
  readonly answer: (kind: "letter" | "check", body: unknown) => Stub;
  readonly once?: boolean;
};

const MODES: Record<string, Mode> = {
  off: {
    label: "Off: everything passes through",
    rows: "",
    answer: () => "passthrough",
  },
  "letter-fail": {
    label: "The Letter request fails (retryable)",
    rows: "8, 9, 10",
    answer: (kind) =>
      kind === "letter"
        ? { status: 502, json: failure("AI_PROVIDER_ERROR", true) }
        : "passthrough",
  },
  cap: {
    label: "«Dagens grense»: the Daily cap is reached",
    rows: "11",
    answer: (kind) =>
      kind === "letter"
        ? { status: 429, json: failure("DAILY_CAP_REACHED", false) }
        : "passthrough",
  },
  "notice-once": {
    label: "The server asks for the AI notice, once; then everything passes",
    rows: "12",
    once: true,
    answer: (kind) =>
      kind === "letter"
        ? { status: 403, json: failure("AI_NOTICE_REQUIRED", false) }
        : "passthrough",
  },
  plant: {
    label: "The Letter is the planted one with flags (the check is real)",
    rows: "14, 15",
    answer: (kind, body) => {
      if (kind !== "letter") return "passthrough";
      const request = body as { tone?: string; previousRev?: number };
      return {
        status: 200,
        json: {
          ok: true,
          data: {
            letter: {
              text: PLANTED.data.text,
              tone: request.tone ?? "Formell",
              rev: (request.previousRev ?? 0) + 1,
            },
            meta: PLANTED.meta,
          },
        },
      };
    },
  },
  "check-fail": {
    label: "The Letter check fails (the Letter itself is real)",
    rows: "16, 17",
    answer: (kind) =>
      kind === "check"
        ? { status: 500, json: failure("UNEXPECTED", false) }
        : "passthrough",
  },
};

let current = "off";
const counts: Record<string, number> = {};

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function controlPage(): string {
  const items = Object.entries(MODES)
    .map(
      ([id, mode]) =>
        `<li><label><input type="radio" name="mode" value="${id}"${id === current ? " checked" : ""}> ${mode.label}${mode.rows === "" ? "" : ` (rows ${mode.rows})`}</label></li>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stub proxy</title><h1>Stub proxy</h1><p>Mode now: <strong id="now">${current}</strong>. <a href="/">Open the app</a></p><ul style="list-style:none;padding:0;line-height:2.2">${items}</ul><script>document.querySelectorAll('input[name=mode]').forEach(function(el){el.addEventListener('change',function(){fetch('/__stub/set?mode='+el.value).then(function(r){return r.text()}).then(function(t){document.getElementById('now').textContent=t})})})</script>`;
}

function send(res: ServerResponse, status: number, type: string, body: string) {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://proxy");
  if (url.pathname === "/__stub") {
    send(res, 200, "text/html; charset=utf-8", controlPage());
    return;
  }
  if (url.pathname === "/__stub/set") {
    const mode = url.searchParams.get("mode") ?? "";
    if (MODES[mode] === undefined) {
      send(res, 400, "text/plain", "unknown mode");
      return;
    }
    current = mode;
    delete counts[mode];
    say(`mode: ${mode}`);
    send(res, 200, "text/plain", mode);
    return;
  }

  const body = await readBody(req);
  const isLetter =
    req.method === "POST" &&
    /^\/api\/analyses\/[^/]+\/letter$/.test(url.pathname);
  const isCheck =
    req.method === "POST" &&
    /^\/api\/analyses\/[^/]+\/letter-check$/.test(url.pathname);
  if (isLetter || isCheck) {
    const mode = MODES[current];
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.toString("utf8"));
    } catch {
      parsed = undefined;
    }
    const kind = isLetter ? "letter" : "check";
    const stub = mode?.answer(kind, parsed) ?? "passthrough";
    const spent = (counts[current] ?? 0) > 0;
    if (stub !== "passthrough" && !(mode?.once && spent)) {
      counts[current] = (counts[current] ?? 0) + 1;
      say(`stubbed ${kind} (${current}): ${stub.status}`);
      send(res, stub.status, "application/json", JSON.stringify(stub.json));
      return;
    }
  }

  const headers = { ...req.headers, host: `localhost:${APP_PORT}` };
  const upstream = httpRequest(
    {
      host: "127.0.0.1",
      port: APP_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (response) => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    },
  );
  upstream.on("error", () =>
    send(
      res,
      502,
      "text/plain",
      `The app is not answering on port ${APP_PORT}.`,
    ),
  );
  upstream.end(body);
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  say(`Stub proxy on http://localhost:${PROXY_PORT}/ (app on ${APP_PORT})`);
  say(`Modes: http://localhost:${PROXY_PORT}/__stub`);
});
