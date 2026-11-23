import { useSyncExternalStore } from "react";

// The client's view of when the session ends (AD-12, FR-18). The server sends
// the end of the session as `X-Session-Expires-At` on every authenticated
// response; the client times the expiry warning from it.

export const SESSION_TTL_MS = 30 * 60 * 1000;
export const WARNING_LEAD_MS = 2 * 60 * 1000;
// While the Student is active the client renews at most this often.
export const RENEW_EVERY_MS = 5 * 60 * 1000;

export const SESSION_EXPIRES_HEADER = "X-Session-Expires-At";

// The server's clock and the browser's can differ, so the end is kept as a
// time on the browser's clock: what the server says remains, counted from the
// moment the server says it was (its `Date` header when there is one).
export function deadlineFrom(
  expiresAt: string,
  serverNowMs: number,
  clientNowMs: number,
): number | undefined {
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return undefined;
  return clientNowMs + (end - serverNowMs);
}

export type SessionPhase = "active" | "warning" | "expired";

export function phaseAt(now: number, deadline: number): SessionPhase {
  if (now >= deadline) return "expired";
  if (now >= deadline - WARNING_LEAD_MS) return "warning";
  return "active";
}

// Activity renews the session when its last extension is `RENEW_EVERY_MS` old
// (the extension is the end minus the 30 minutes) and no attempt was made
// within that time either, so a failing request is not repeated at every key.
export function renewDue(input: {
  now: number;
  deadline: number;
  lastAttemptAt: number | undefined;
}): boolean {
  const lastExtension = input.deadline - SESSION_TTL_MS;
  if (input.now - lastExtension < RENEW_EVERY_MS) return false;
  return (
    input.lastAttemptAt === undefined ||
    input.now - input.lastAttemptAt >= RENEW_EVERY_MS
  );
}

// How long until the clock has something to do, or `undefined` once expired.
export function msUntilNextPhase(
  now: number,
  deadline: number,
): number | undefined {
  const phase = phaseAt(now, deadline);
  if (phase === "expired") return undefined;
  return phase === "warning"
    ? deadline - now
    : deadline - WARNING_LEAD_MS - now;
}

type ClockState = {
  readonly deadline: number | undefined;
  // The expiry warning is open: the AI notice gives way to it (UX-DR17).
  readonly warningOpen: boolean;
};

let state: ClockState = { deadline: undefined, warningOpen: false };
const listeners = new Set<() => void>();

function set(next: ClockState): void {
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeSessionClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeadline(): number | undefined {
  return state.deadline;
}

// A later end replaces an earlier one; an earlier one (a response that left
// the session as it was, or a page that was rendered before a renewal) does
// not move it back. `reset` is for the logout and for tests.
export function setDeadline(deadline: number): void {
  if (state.deadline !== undefined && deadline <= state.deadline) return;
  set({ ...state, deadline });
}

export function resetSessionClock(): void {
  set({ deadline: undefined, warningOpen: false });
}

export function setWarningOpen(warningOpen: boolean): void {
  if (state.warningOpen === warningOpen) return;
  set({ ...state, warningOpen });
}

// Reads the header of an authenticated response.
export function noteSessionHeaders(
  headers: Pick<Headers, "get">,
  clientNowMs: number = Date.now(),
): void {
  const expiresAt = headers.get(SESSION_EXPIRES_HEADER);
  if (expiresAt === null) return;
  const date = headers.get("date");
  const parsed = date === null ? Number.NaN : Date.parse(date);
  const deadline = deadlineFrom(
    expiresAt,
    Number.isNaN(parsed) ? clientNowMs : parsed,
    clientNowMs,
  );
  if (deadline !== undefined) setDeadline(deadline);
}

// True while the expiry warning is open. The AI notice reads it, so that there
// are never two dialogs at once.
export function useWarningOpen(): boolean {
  return useSyncExternalStore(
    subscribeSessionClock,
    () => state.warningOpen,
    () => false,
  );
}
