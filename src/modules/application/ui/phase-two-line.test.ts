import { describe, expect, it } from "vitest";
import { messages } from "@/shared/ui/messages.nb";
import {
  phaseTwoLine,
  sectionKindOfFailure,
  withSavedLine,
} from "./phase-two-line";

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

describe("Story 6.7 the saved sentence on the phase-2 line", () => {
  const saved = messages.result.saved("JA-002");

  it("appends it to every outcome when the Application is saved", () => {
    expect(saved).toBe("Lagret i Historikk som JA-002.");
    for (const kind of ["done", "failed", "cap", "testMode"] as const) {
      const line = phaseTwoLine(kind, kind);
      expect(withSavedLine(line, saved)).toBe(`${line} ${saved}`);
    }
    expect(withSavedLine(phaseTwoLine("done", "failed"), saved)).toBe(
      "Søknadsbrevet er klart. Gapanalysen kunne ikke lages. Lagret i Historikk som JA-002.",
    );
  });

  it("leaves the line as it was when nothing is saved", () => {
    expect(withSavedLine("Søknadsbrevet er klart.")).toBe(
      "Søknadsbrevet er klart.",
    );
  });
});
