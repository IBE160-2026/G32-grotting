import { afterEach, describe, expect, it } from "vitest";
import {
  deadlineFrom,
  getDeadline,
  msUntilNextPhase,
  noteSessionHeaders,
  phaseAt,
  RENEW_EVERY_MS,
  renewDue,
  resetSessionClock,
  SESSION_TTL_MS,
  setDeadline,
  WARNING_LEAD_MS,
} from "./session-clock";

const MIN = 60 * 1000;

afterEach(() => resetSessionClock());

describe("AD-12 the session clock", () => {
  it("counts what the server says remains from the browser's own now", () => {
    const serverNow = Date.parse("2026-11-23T10:00:00Z");
    const expiresAt = "2026-11-23T10:30:00.000Z";
    // The browser clock is far off: only the remaining time matters.
    expect(deadlineFrom(expiresAt, serverNow, 5_000_000)).toBe(
      5_000_000 + 30 * MIN,
    );
    expect(deadlineFrom("not a date", serverNow, 0)).toBeUndefined();
  });

  it("warns two minutes before the end and expires at the end", () => {
    const deadline = 100 * MIN;
    expect(phaseAt(deadline - WARNING_LEAD_MS - 1, deadline)).toBe("active");
    expect(phaseAt(deadline - WARNING_LEAD_MS, deadline)).toBe("warning");
    expect(phaseAt(deadline - 1, deadline)).toBe("warning");
    expect(phaseAt(deadline, deadline)).toBe("expired");
    expect(phaseAt(deadline + 5 * MIN, deadline)).toBe("expired");
  });

  it("waits for the next change of phase", () => {
    const deadline = 100 * MIN;
    expect(msUntilNextPhase(deadline - 30 * MIN, deadline)).toBe(28 * MIN);
    expect(msUntilNextPhase(deadline - MIN, deadline)).toBe(MIN);
    expect(msUntilNextPhase(deadline, deadline)).toBeUndefined();
  });

  it("renews on activity at most once every 5 minutes", () => {
    const deadline = 100 * MIN;
    const extended = deadline - SESSION_TTL_MS;
    const due = (now: number, lastAttemptAt?: number) =>
      renewDue({ now, deadline, lastAttemptAt });
    expect(due(extended + RENEW_EVERY_MS - 1)).toBe(false);
    expect(due(extended + RENEW_EVERY_MS)).toBe(true);
    // A failed attempt is not repeated at every key press.
    expect(due(extended + 6 * MIN, extended + 5 * MIN + 1)).toBe(false);
    expect(due(extended + 11 * MIN, extended + 5 * MIN + 1)).toBe(true);
  });

  it("a renewal moves the end, and the next renewal is 5 minutes after it", () => {
    setDeadline(30 * MIN);
    const renewedAt = 6 * MIN;
    setDeadline(renewedAt + SESSION_TTL_MS);
    const deadline = getDeadline() ?? 0;
    const due = (now: number) =>
      renewDue({ now, deadline, lastAttemptAt: renewedAt });
    expect(due(renewedAt + 4 * MIN)).toBe(false);
    expect(due(renewedAt + 5 * MIN)).toBe(true);
  });

  it("only a later end replaces an earlier one", () => {
    setDeadline(1000);
    setDeadline(500);
    expect(getDeadline()).toBe(1000);
    setDeadline(2000);
    expect(getDeadline()).toBe(2000);
  });

  it("reads the end from the header, using the Date header as the server's now", () => {
    const headers = new Headers({
      "X-Session-Expires-At": "2026-11-23T10:30:00.000Z",
      Date: "Mon, 23 Nov 2026 10:00:00 GMT",
    });
    noteSessionHeaders(headers, 1_000);
    expect(getDeadline()).toBe(1_000 + 30 * MIN);
  });

  it("ignores a response without the header or with a bad one", () => {
    noteSessionHeaders(new Headers(), 1_000);
    expect(getDeadline()).toBeUndefined();
    noteSessionHeaders(new Headers({ "X-Session-Expires-At": "soon" }), 1_000);
    expect(getDeadline()).toBeUndefined();
  });

  it("without a Date header counts from the browser's now", () => {
    const now = Date.now();
    const end = new Date(now + 20 * MIN).toISOString();
    noteSessionHeaders(new Headers({ "X-Session-Expires-At": end }), now);
    expect(getDeadline()).toBe(now + 20 * MIN);
  });
});
