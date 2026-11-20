import "server-only";
import type { MessageKey } from "@/shared/core/message-key";

export type ErrorLogEvent = {
  readonly kind: "error";
  readonly code: MessageKey;
  readonly errorName: string;
  readonly route: string;
};

// One per AI request (AD-13), also when it fails. Counts are null when the
// provider reported none.
export type AiLogEvent = {
  readonly kind: "ai";
  readonly task: string;
  readonly provider: string;
  readonly model: string;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly durationMs: number;
  readonly errorCode: MessageKey | null;
};

// One per Gap analysis (AD-14, FR-15): how many Rewordable gaps were turned into
// the Real-gap template because their citation is not in the CV text. A count
// only, never a citation, a keyword or CV text.
export type GapsLogEvent = {
  readonly kind: "gaps";
  readonly downgraded: number;
};

export type LogEvent = ErrorLogEvent | AiLogEvent | GapsLogEvent;

// The only place that writes to the console (AD-13). An event carries codes,
// names and counts, never a message, a stack, a prompt or user content.
export function log(event: LogEvent): void {
  console.error(JSON.stringify(event));
}
