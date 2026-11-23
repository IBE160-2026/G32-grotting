import type { MessageKey } from "@/shared/core/message-key";
import { messages } from "@/shared/ui/messages.nb";

// How one AI section of phase 2 settled.
export type SectionKind = "done" | "failed" | "cap" | "testMode";

// The settled kind of a section from the error code it failed with.
export function sectionKindOfFailure(code: MessageKey): SectionKind {
  if (code === "DAILY_CAP_REACHED") return "cap";
  if (code === "TEST_MODE_UNAVAILABLE") return "testMode";
  return "failed";
}

/**
 * The phase-2 line when the Gap analysis and the Letter have both settled,
 * spoken once in the first live region (NFR-2). Two sections that settled the
 * same way share one sentence. Otherwise each gets its own, the one that is done
 * first, then the Gap analysis before the Letter as on the page. A failure
 * names the section that failed.
 */
export function phaseTwoLine(letter: SectionKind, gaps: SectionKind): string {
  if (letter === gaps) return messages.phaseTwo.both[letter];
  const sentences = [
    { text: messages.phaseTwo.gaps[gaps], done: gaps === "done" },
    { text: messages.phaseTwo.letter[letter], done: letter === "done" },
  ];
  // `sort` is stable, so the Gap analysis stays first among equals.
  sentences.sort((a, b) => Number(b.done) - Number(a.done));
  return sentences.map(({ text }) => text).join(" ");
}

/**
 * A phase-2 line with the saved sentence after it («… Lagret i Historikk som
 * JA-002.»), when the Application is saved. Without one the line is as it was.
 * It is said for every phase-2 outcome, a failed section too: the Application
 * is stored whatever the AI did.
 */
export function withSavedLine(line: string, savedLine?: string): string {
  return savedLine === undefined ? line : `${line} ${savedLine}`;
}
