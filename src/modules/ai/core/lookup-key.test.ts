import { describe, expect, it } from "vitest";
import { type LookupKeyInputs, lookupKeyOf } from "./lookup-key";

const base: LookupKeyInputs = {
  task: "letter",
  cvText: "Jeg kan TypeScript.",
  jobAd: "Vi søker utvikler.",
  jobTitle: "Utvikler",
  employer: "Firma AS",
  tone: "formell",
};

describe("AD-15 lookupKeyOf", () => {
  it("is a hex sha256", () => {
    expect(lookupKeyOf(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable under whitespace and CRLF", () => {
    expect(
      lookupKeyOf({
        ...base,
        cvText: "  Jeg kan\r\nTypeScript.  ",
        jobAd: "Vi  søker\nutvikler.",
      }),
    ).toBe(lookupKeyOf(base));
  });

  const changes: [string, Partial<LookupKeyInputs>][] = [
    ["task", { task: "keywords" }],
    ["cvText", { cvText: "Jeg kan Java." }],
    ["no cvText", { cvText: undefined }],
    ["jobAd", { jobAd: "Vi søker tester." }],
    ["jobTitle", { jobTitle: "Tester" }],
    ["employer", { employer: "Annet AS" }],
    ["tone", { tone: "personlig" }],
    ["no tone", { tone: undefined }],
  ];
  it.each(changes)("changes with %s", (_name, change) => {
    expect(lookupKeyOf({ ...base, ...change })).not.toBe(lookupKeyOf(base));
  });

  it("does not confuse field boundaries", () => {
    expect(lookupKeyOf({ ...base, jobTitle: "A", employer: "B C" })).not.toBe(
      lookupKeyOf({ ...base, jobTitle: "A B", employer: "C" }),
    );
  });
});
