// Every code the wire carries (AD-7). The server sends codes, never prose; the
// UI maps each one to a text in messages.nb.ts.
export const MESSAGE_KEYS = [
  "AI_TIMEOUT",
  "AI_PROVIDER_ERROR",
  "DAILY_CAP_REACHED",
  "TEST_MODE_UNAVAILABLE",
  "AI_NOTICE_REQUIRED",
  "ANALYSIS_STALE",
  "SESSION_EXPIRED",
  "ACCESS_REQUIRED",
  "NOT_FOUND",
  "NETWORK_ERROR",
  "INVALID_INPUT",
  "UNEXPECTED",
] as const;

export type MessageKey = (typeof MESSAGE_KEYS)[number];
