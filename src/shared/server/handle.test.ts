import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { log } from "./log";

vi.mock("./log", () => ({ log: vi.fn() }));

import { ApiError, handle } from "./handle";

const request = new Request("http://localhost/api/x");

beforeEach(() => {
  vi.mocked(log).mockClear();
});

describe("NFR-7 handle() envelope (AD-7)", () => {
  it("wraps a result in { ok: true, data }", async () => {
    const response = await handle("/api/x", () => ({ n: 1 }))(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { n: 1 } });
    expect(log).not.toHaveBeenCalled();
  });

  it("maps a zod failure to 400 INVALID_INPUT with the field", async () => {
    const schema = z.object({ title: z.object({ text: z.string() }) });
    const response = await handle("/api/x", () =>
      schema.parse({ title: { text: 1 } }),
    )(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "INVALID_INPUT", field: "title.text", retryable: false },
    });
  });

  it("omits the field when the zod path is empty", async () => {
    const response = await handle("/api/x", () => z.string().parse(1))(request);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toEqual({ code: "INVALID_INPUT", retryable: false });
  });

  it("maps an ApiError to its code's status and logs only the code", async () => {
    const response = await handle("/api/x", () => {
      throw new ApiError("DAILY_CAP_REACHED", { retryable: true });
    })(request);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "DAILY_CAP_REACHED", retryable: true },
    });
    expect(log).toHaveBeenCalledWith({
      kind: "error",
      code: "DAILY_CAP_REACHED",
      errorName: "ApiError",
      route: "/api/x",
    });
  });

  it("carries the field of an ApiError", async () => {
    const response = await handle("/api/x", () => {
      throw new ApiError("NOT_FOUND", { field: "id" });
    })(request);
    expect(response.status).toBe(404);
    expect((await response.json()).error.field).toBe("id");
  });

  it("maps anything else to 500 UNEXPECTED with no message or stack", async () => {
    const response = await handle("/api/x", () => {
      throw new TypeError("secret detail from inside");
    })(request);
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: { code: "UNEXPECTED", retryable: false },
    });
    expect(text).not.toContain("secret detail");
    expect(text).not.toContain("stack");
    expect(log).toHaveBeenCalledWith({
      kind: "error",
      code: "UNEXPECTED",
      errorName: "TypeError",
      route: "/api/x",
    });
    expect(JSON.stringify(vi.mocked(log).mock.calls)).not.toContain("secret");
  });

  it("handles a thrown non-Error and an async rejection", async () => {
    const thrown = await handle("/api/x", () => {
      throw "plain string";
    })(request);
    expect(thrown.status).toBe(500);
    const rejected = await handle("/api/x", async () => {
      throw new RangeError("x");
    })(request);
    expect(rejected.status).toBe(500);
  });
});
