import { describe, expect, it } from "vitest";
import { formatCount, kilobytes } from "./format-count";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [612, "612"],
    [3412, "3 412"],
    [15000, "15 000"],
    [1234567, "1 234 567"],
  ])("writes %i as %s", (count, text) => {
    expect(formatCount(count)).toBe(text);
  });
});

describe("kilobytes", () => {
  it.each([
    [0, 1],
    [1, 1],
    [1024, 1],
    [1025, 2],
    [2 * 1024 * 1024, 2048],
  ])("writes %i bytes as %i kB", (bytes, size) => {
    expect(kilobytes(bytes)).toBe(size);
  });
});
