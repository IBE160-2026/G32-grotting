import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Smoke run for CI (AD-17): the started app answers its health check.
// Run inside the app container: `node scripts/smoke.mjs`.
const DEFAULT_BASE_URL = "http://127.0.0.1:3000";

// Resolves to { ok: true } or { ok: false, reason }; never throws.
export async function checkHealth(baseUrl = DEFAULT_BASE_URL) {
  let response;
  try {
    response = await fetch(new URL("/api/health", baseUrl), {
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause ? error.cause : error;
    return { ok: false, reason: `request failed: ${String(cause)}` };
  }
  if (response.status !== 200) {
    return { ok: false, reason: `expected status 200, got ${response.status}` };
  }
  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "response is not JSON" };
  }
  if (body?.ok !== true || body?.data?.hosted !== false) {
    return {
      ok: false,
      reason: `expected {"ok":true,"data":{"hosted":false}}, got ${JSON.stringify(body)}`,
    };
  }
  return { ok: true };
}

function isEntryPoint() {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  const baseUrl = process.argv[2] ?? DEFAULT_BASE_URL;
  const result = await checkHealth(baseUrl);
  if (result.ok) {
    process.stdout.write(`Smoke passed: ${baseUrl}/api/health\n`);
  } else {
    process.stderr.write(`Smoke failed: ${result.reason}\n`);
    process.exit(1);
  }
}
