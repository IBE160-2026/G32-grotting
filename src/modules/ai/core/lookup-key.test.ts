import { describe, expect, it } from "vitest";
import { contentHash } from "@/shared/server/content-hash";
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

  it("FR-5b keys a Keyword request by the ad alone, as contentHash(canon(ad))", () => {
    const keywords = { task: "keywords", jobAd: "Vi  søker\nutvikler." };
    expect(lookupKeyOf(keywords)).toBe(contentHash("Vi søker utvikler."));
    expect(
      lookupKeyOf({ ...keywords, cvText: "Jeg kan Java.", tone: "Formell" }),
    ).toBe(lookupKeyOf(keywords));
    expect(lookupKeyOf({ ...keywords, jobAd: "Vi søker tester." })).not.toBe(
      lookupKeyOf(keywords),
    );
  });
});
