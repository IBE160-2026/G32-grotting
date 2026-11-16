import { describe, expect, it } from "vitest";
import { formatCount } from "./format-count";

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
