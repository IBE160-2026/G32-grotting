import { beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "./log";

vi.mock("./log", () => ({ log: vi.fn() }));

import { ApiError, handle, SESSION_EXPIRES_HEADER } from "./handle";

const request = new Request("http://localhost/api/x");
const END = new Date("2026-11-22T10:30:00.000Z");

beforeEach(() => {
  vi.mocked(log).mockClear();
});

describe("AD-12 handle() session options", () => {
  it("passes the session and the response headers to the handler", async () => {
    const seen: unknown[] = [];
    const response = await handle(
      "/api/x",
      (_request, ctx) => {
        seen.push(ctx.session, ctx.responseHeaders instanceof Headers);
        return { ok: 1 };
      },
      {
        authenticate: async () => ({
          session: { studentId: "s" },
          expiresAt: END,
        }),
      },
    )(request);
    expect(seen).toEqual([{ studentId: "s" }, true]);
    expect(response.status).toBe(200);
    expect(response.headers.get(SESSION_EXPIRES_HEADER)).toBe(
      END.toISOString(),
    );
  });

  it("adds no expiry header to a route without authenticate", async () => {
    const response = await handle("/api/x", () => 1)(request);
    expect(response.headers.has(SESSION_EXPIRES_HEADER)).toBe(false);
  });

  it("carries the expiry on an error response after authentication", async () => {
    const response = await handle(
      "/api/x",
      () => {
        throw new ApiError("NOT_FOUND");
      },
      { authenticate: async () => ({ session: 1, expiresAt: END }) },
    )(request);
    expect(response.status).toBe(404);
    expect(response.headers.get(SESSION_EXPIRES_HEADER)).toBe(
      END.toISOString(),
    );
  });

  it("answers 401 without the header when authenticate throws", async () => {
    const handler = vi.fn();
    const response = await handle("/api/x", handler, {
      authenticate: async () => {
        throw new ApiError("SESSION_EXPIRED");
      },
    })(request);
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("SESSION_EXPIRED");
    expect(response.headers.has(SESSION_EXPIRES_HEADER)).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("lets the handler override the expiry header", async () => {
    const renewed = new Date("2026-11-22T11:00:00.000Z");
    const response = await handle(
      "/api/x",
      (_request, ctx) => {
        ctx.responseHeaders.set(SESSION_EXPIRES_HEADER, renewed.toISOString());
        return 1;
      },
      { authenticate: async () => ({ session: 1, expiresAt: END }) },
    )(request);
    expect(response.headers.get(SESSION_EXPIRES_HEADER)).toBe(
      renewed.toISOString(),
    );
  });

  it("copies every Set-Cookie of the handler onto a success response", async () => {
    const response = await handle("/api/x", (_request, ctx) => {
      ctx.responseHeaders.append("Set-Cookie", "a=1; Path=/");
      ctx.responseHeaders.append("Set-Cookie", "b=2; Path=/");
      return 1;
    })(request);
    expect(response.headers.getSetCookie()).toEqual([
      "a=1; Path=/",
      "b=2; Path=/",
    ]);
  });

  it("sets no cookie on an error response", async () => {
    const response = await handle("/api/x", (_request, ctx) => {
      ctx.responseHeaders.append("Set-Cookie", "a=1");
      throw new ApiError("INVALID_INPUT");
    })(request);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
});
