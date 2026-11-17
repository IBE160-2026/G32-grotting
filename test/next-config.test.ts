import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("AD-15 file tracing of data/", () => {
  it("includes the vocabulary for every API route", () => {
    expect(nextConfig.outputFileTracingIncludes?.["/api/**"]).toEqual([
      "./data/vocabulary/**",
    ]);
  });

  it("includes the vocabulary and the Example pair for Hjem", () => {
    expect(nextConfig.outputFileTracingIncludes?.["/"]).toEqual([
      "./data/vocabulary/**",
      "./data/fixtures/example-nordic-digital/**",
    ]);
  });

  it("lists no other route", () => {
    expect(Object.keys(nextConfig.outputFileTracingIncludes ?? {})).toEqual([
      "/api/**",
      "/",
    ]);
  });
});
