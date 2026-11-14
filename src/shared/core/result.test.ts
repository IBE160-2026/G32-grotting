import { describe, expect, it } from "vitest";
import { err, ok } from "./result";

describe("NFR-11 Result", () => {
  it("wraps a value", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
  });

  it("wraps an error", () => {
    expect(err("NOT_FOUND")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});
