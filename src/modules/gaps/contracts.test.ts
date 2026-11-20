import { describe, expect, it } from "vitest";
import {
  gapSchema,
  gapsRequestSchema,
  gapsResponseSchema,
  REAL_GAP_KEY,
} from "./contracts";

const inputs = {
  cvText: "Erfaring med React. ".repeat(12),
  jobAd: "Vi søker en utvikler. ".repeat(20),
  jobTitle: "Utvikler",
  employer: "Nordic Digital",
};
const applicationId = "8d6e1f4a-2b3c-4d5e-8f60-1a2b3c4d5e6f";

describe("FR-13 Gap contract", () => {
  it("accepts a Rewordable gap with a text explanation and a citation", () => {
    expect(
      gapSchema.safeParse({
        keyword: "testing",
        kind: "rewordable",
        explanation: { text: "Linjen din dekker trolig dette." },
        citation: "Jeg skrev enkle tester",
        suggestion: null,
      }).success,
    ).toBe(true);
  });

  it("accepts the template Real gap as a key and its parameters", () => {
    const gap = {
      keyword: "REST-API",
      kind: "real",
      explanation: { key: REAL_GAP_KEY, params: { keyword: "REST-API" } },
      citation: null,
      suggestion: null,
    };
    expect(gapSchema.parse(gap)).toEqual(gap);
  });

  it("rejects an unknown kind and an explanation with another key", () => {
    const base = {
      keyword: "x",
      kind: "real",
      explanation: { text: "t" },
      citation: null,
      suggestion: null,
    };
    expect(gapSchema.safeParse({ ...base, kind: "maybe" }).success).toBe(false);
    expect(
      gapSchema.safeParse({
        ...base,
        explanation: { key: "OTHER", params: { keyword: "x" } },
      }).success,
    ).toBe(false);
  });
});

describe("AD-6 gaps request", () => {
  it("takes applicationId, fingerprint, inputs and consent, and drops other fields", () => {
    const parsed = gapsRequestSchema.parse({
      applicationId,
      fingerprint: "abc",
      inputs,
      consent: null,
      missing: ["klientens-ord"],
    });
    expect(parsed).toEqual({
      applicationId,
      fingerprint: "abc",
      inputs,
      consent: null,
    });
  });

  it("rejects a request without consent, as the Letter request does", () => {
    expect(
      gapsRequestSchema.safeParse({ applicationId, fingerprint: "a", inputs })
        .success,
    ).toBe(false);
  });

  it("lets the response carry no meta when nothing was asked", () => {
    expect(gapsResponseSchema.safeParse({ gaps: [], meta: null }).success).toBe(
      true,
    );
  });
});

describe("AD-7 Real-gap template text", () => {
  it("has a bokmål text for the template key, naming the keyword", async () => {
    const { messages } = await import("@/shared/ui/messages.nb");
    expect(messages.gaps.template[REAL_GAP_KEY]("REST-API")).toContain(
      "«REST-API»",
    );
  });
});
