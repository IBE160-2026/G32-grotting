import { describe, expect, it } from "vitest";
import { phaseTwoLine, sectionKindOfFailure } from "./phase-two-line";

describe("NFR-2 the phase-2 line for the Gap analysis and the Letter", () => {
  it("shares one sentence when both settled the same way", () => {
    expect(phaseTwoLine("done", "done")).toBe(
      "Gapanalysen og søknadsbrevet er klare.",
    );
    expect(phaseTwoLine("failed", "failed")).toBe(
      "Gapanalysen og søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
    );
    expect(phaseTwoLine("cap", "cap")).toBe(
      "Dagens grense for KI er nådd. Samsvaret står fortsatt.",
    );
    expect(phaseTwoLine("testMode", "testMode")).toBe(
      "Gapanalysen og søknadsbrevet er ikke tilgjengelige i testmodus.",
    );
  });

  it("names the section that failed, the done one first", () => {
    expect(phaseTwoLine("done", "failed")).toBe(
      "Søknadsbrevet er klart. Gapanalysen kunne ikke lages.",
    );
    expect(phaseTwoLine("failed", "done")).toBe(
      "Gapanalysen er klar. Søknadsbrevet kunne ikke lages.",
    );
  });

  it("gives one sentence per section for the other mixes, done first", () => {
    expect(phaseTwoLine("done", "testMode")).toBe(
      "Søknadsbrevet er klart. Gapanalysen er ikke tilgjengelig i testmodus.",
    );
    expect(phaseTwoLine("testMode", "done")).toBe(
      "Gapanalysen er klar. Søknadsbrevet er ikke tilgjengelig i testmodus.",
    );
    expect(phaseTwoLine("done", "cap")).toBe(
      "Søknadsbrevet er klart. Dagens grense for KI er nådd.",
    );
    expect(phaseTwoLine("failed", "cap")).toBe(
      "Dagens grense for KI er nådd. Søknadsbrevet kunne ikke lages.",
    );
    expect(phaseTwoLine("testMode", "failed")).toBe(
      "Gapanalysen kunne ikke lages. Søknadsbrevet er ikke tilgjengelig i testmodus.",
    );
  });

  it("reads the kind of a section from its error code", () => {
    expect(sectionKindOfFailure("DAILY_CAP_REACHED")).toBe("cap");
    expect(sectionKindOfFailure("TEST_MODE_UNAVAILABLE")).toBe("testMode");
    expect(sectionKindOfFailure("AI_TIMEOUT")).toBe("failed");
    expect(sectionKindOfFailure("AI_NOTICE_REQUIRED")).toBe("failed");
  });
});
