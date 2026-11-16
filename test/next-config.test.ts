import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("AD-15 file tracing of data/", () => {
  it("includes the vocabulary for every API route", () => {
    expect(nextConfig.outputFileTracingIncludes).toEqual({
      "/api/**": ["./data/vocabulary/**"],
    });
  });
});
