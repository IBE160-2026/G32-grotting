import { describe, expect, it } from "vitest";
import { scoreOf, verdictOf } from "./score";

describe("FR-7 scoreOf", () => {
  it.each([
    [5, 7, 71],
    [1, 8, 13],
    [7, 10, 70],
    [2, 3, 67],
    [0, 5, 0],
    [4, 4, 100],
  ])("gives %i of %i as %i", (matched, total, score) => {
    expect(scoreOf(matched, total)).toBe(score);
  });

  it("throws RangeError when there are no Keywords", () => {
    expect(() => scoreOf(0, 0)).toThrow(RangeError);
  });
});

describe("FR-7 verdictOf", () => {
  it("is needs-work at 69 and strong at 70", () => {
    expect(verdictOf(69)).toBe("needs-work");
    expect(verdictOf(70)).toBe("strong");
  });

  it("is judged on the rounded score", () => {
    // 139 of 200 is 69.5 %, which rounds to 70: the rounded score decides, not the raw share.
    expect(verdictOf(scoreOf(139, 200))).toBe("strong");
    expect(verdictOf(scoreOf(138, 200))).toBe("needs-work");
  });

  it("covers the ends of the range", () => {
    expect(verdictOf(0)).toBe("needs-work");
    expect(verdictOf(100)).toBe("strong");
  });
});
