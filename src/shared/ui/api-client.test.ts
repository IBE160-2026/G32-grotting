import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { callApi } from "./api-client";

const schema = z.object({ opened: z.literal(true) });

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("AD-7 api-client", () => {
  it("parses a success envelope with the route's schema", async () => {
    const fetchMock = stubFetch(async () =>
      Response.json({ ok: true, data: { opened: true } }),
    );
    expect(
      await callApi("/api/access", schema, { body: { code: "x" } }),
    ).toEqual({ ok: true, data: { opened: true } });
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/api/access");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"code":"x"}');
  });

  it("sends a FormData body as it is, with no JSON header", async () => {
    const fetchMock = stubFetch(async () =>
      Response.json({ ok: true, data: { opened: true } }),
    );
    const form = new FormData();
    form.set("file", new File(["hei"], "cv.txt"));
    expect(await callApi("/api/cv/extract", schema, { body: form })).toEqual({
      ok: true,
      data: { opened: true },
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(form);
    expect(init.headers).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns the error code, field and retryable flag", async () => {
    stubFetch(async () =>
      Response.json(
        {
          ok: false,
          error: { code: "INVALID_INPUT", field: "code", retryable: false },
        },
        { status: 400 },
      ),
    );
    expect(await callApi("/api/access", schema)).toEqual({
      ok: false,
      error: { code: "INVALID_INPUT", field: "code", retryable: false },
    });
  });

  it("turns a rejected fetch into NETWORK_ERROR", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await callApi("/api/access", schema)).toEqual({
      ok: false,
      error: { code: "NETWORK_ERROR", retryable: true },
    });
  });

  it("gives every request a timeout signal; a timeout is NETWORK_ERROR", async () => {
    const fetchMock = stubFetch(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    expect(await callApi("/api/access", schema)).toEqual({
      ok: false,
      error: { code: "NETWORK_ERROR", retryable: true },
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("turns a body that is not JSON into NETWORK_ERROR", async () => {
    stubFetch(
      async () => new Response("<html>Bad gateway</html>", { status: 502 }),
    );
    expect(await callApi("/api/access", schema)).toEqual({
      ok: false,
      error: { code: "NETWORK_ERROR", retryable: true },
    });
  });

  it("turns JSON that is not the envelope into UNEXPECTED", async () => {
    stubFetch(async () => Response.json({ hello: "world" }));
    expect(await callApi("/api/access", schema)).toEqual({
      ok: false,
      error: { code: "UNEXPECTED", retryable: false },
    });
    stubFetch(async () => Response.json({ ok: true, data: { opened: false } }));
    expect((await callApi("/api/access", schema)).ok).toBe(false);
  });
});

describe("NFR-4 api-client timeout", () => {
  it("uses the given timeout for a slow request such as the Letter", async () => {
    const spy = vi.spyOn(AbortSignal, "timeout");
    stubFetch(async () => Response.json({ ok: true, data: { opened: true } }));
    await callApi("/api/x", schema, { body: {}, timeoutMs: 105_000 });
    await callApi("/api/x", schema, { body: {} });
    expect(spy).toHaveBeenNthCalledWith(1, 105_000);
    expect(spy).toHaveBeenNthCalledWith(2, 15_000);
    spy.mockRestore();
  });
});
