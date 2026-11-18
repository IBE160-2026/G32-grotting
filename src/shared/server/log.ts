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

export type LogEvent = ErrorLogEvent | AiLogEvent;

// The only place that writes to the console (AD-13). An event carries codes,
// names and counts, never a message, a stack, a prompt or user content.
export function log(event: LogEvent): void {
  console.error(JSON.stringify(event));
}
