import "server-only";
import type { MessageKey } from "@/shared/core/message-key";

export type LogEvent = {
  readonly kind: "error";
  readonly code: MessageKey;
  readonly errorName: string;
  readonly route: string;
};

// The only place that writes to the console (AD-13). An event carries codes and
// names, never a message, a stack or user content.
export function log(event: LogEvent): void {
  console.error(JSON.stringify(event));
}
