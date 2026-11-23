"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { callApi } from "@/shared/ui/api-client";
import { writeSession } from "@/shared/ui/client-session";
import {
  deadlineFrom,
  getDeadline,
  msUntilNextPhase,
  phaseAt,
  renewDue,
  SESSION_TTL_MS,
  setDeadline,
  setWarningOpen,
  subscribeSessionClock,
} from "@/shared/ui/session-clock";
import {
  endSession,
  forgetSessionForLogout,
  holdEnding,
} from "@/shared/ui/session-end";
import { logoutResponseSchema, sessionViewSchema } from "../contracts";
import { ExpiryWarning } from "./expiry-warning";

// What counts as activity (EXPERIENCE.md, Session expiring): any key, pointer
// or input event in the page, not only a request.
// A wheel turning is the pointer too: reading a long result by scrolling counts.
const ACTIVITY_EVENTS = [
  "keydown",
  "pointerdown",
  "pointermove",
  "wheel",
  "input",
];

type SessionWatchProps = {
  // The end of the session when the page was rendered, and the server's clock
  // at that moment. Later values come from the headers of the responses.
  expiresAt: string;
  serverNow: number;
};

// Mounted for a logged-in Student only (accounts on). It keeps the session
// alive while the Student is active, opens the expiry warning two minutes
// before the end and ends the session on the client when it runs out
// (Story 6.5, FR-18, AD-12). Renders the warning and nothing else.
export function SessionWatch({ expiresAt, serverNow }: SessionWatchProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"continue" | "logout" | null>(null);
  const [failed, setFailed] = useState(false);
  const openRef = useRef(false);
  const leaving = useRef(false);
  const lastAttempt = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const returnFocus = useRef<HTMLElement | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  // `GET /api/session` (AD-12) tells the email, kept for «Logg inn».
  const session = useQuery({
    queryKey: ["session"],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const result = await callApi("/api/session", sessionViewSchema);
      if (!result.ok) throw new Error(result.error.code);
      return result.data;
    },
  });
  const email = session.data?.email;
  useEffect(() => {
    if (email !== undefined) writeSession({ lastEmail: email });
  }, [email]);

  const showWarning = useCallback((shown: boolean) => {
    if (openRef.current === shown) return;
    if (shown) {
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setFailed(false);
    }
    openRef.current = shown;
    setOpen(shown);
    setWarningOpen(shown);
  }, []);

  // Looks at the clock and does what is due; then waits for the next change.
  const evaluate = useCallback(() => {
    window.clearTimeout(timer.current);
    const deadline = getDeadline();
    if (deadline === undefined || leaving.current) return;
    const now = Date.now();
    const phase = phaseAt(now, deadline);
    if (phase === "expired") {
      showWarning(false);
      endSession();
      return;
    }
    showWarning(phase === "warning");
    // Showing the warning tells the clock, which calls this again; one timer.
    window.clearTimeout(timer.current);
    const wait = msUntilNextPhase(now, deadline);
    if (wait !== undefined) timer.current = window.setTimeout(evaluate, wait);
  }, [showWarning]);

  useEffect(() => {
    const deadline = deadlineFrom(expiresAt, serverNow, Date.now());
    if (deadline !== undefined) setDeadline(deadline);
    evaluate();
    const unsubscribe = subscribeSessionClock(evaluate);

    function onActivity() {
      if (openRef.current || leaving.current) return;
      const current = getDeadline();
      if (current === undefined) return;
      const now = Date.now();
      // A computer that slept: the clock decides, not the activity.
      if (phaseAt(now, current) !== "active") {
        evaluate();
        return;
      }
      if (
        !renewDue({
          now,
          deadline: current,
          lastAttemptAt: lastAttempt.current,
        })
      ) {
        return;
      }
      lastAttempt.current = now;
      // The answer's header moves the end; a refusal ends the session in
      // `callApi`.
      void callApi("/api/session/renew", sessionViewSchema, { method: "POST" });
    }
    const options = { capture: true, passive: true } as const;
    for (const name of ACTIVITY_EVENTS) {
      document.addEventListener(name, onActivity, options);
    }
    // Timers stand still while the computer sleeps or the tab is hidden.
    document.addEventListener("visibilitychange", evaluate);
    window.addEventListener("focus", evaluate);
    window.addEventListener("pageshow", evaluate);
    return () => {
      unsubscribe();
      window.clearTimeout(timer.current);
      for (const name of ACTIVITY_EVENTS) {
        document.removeEventListener(name, onActivity, options);
      }
      document.removeEventListener("visibilitychange", evaluate);
      window.removeEventListener("focus", evaluate);
      window.removeEventListener("pageshow", evaluate);
    };
  }, [expiresAt, serverNow, evaluate]);

  // Gone from the page: the AI notice may open again.
  useEffect(() => () => setWarningOpen(false), []);

  // «Fortsett økten» and Esc.
  async function continueSession() {
    if (busy !== null) return;
    setBusy("continue");
    setFailed(false);
    lastAttempt.current = Date.now();
    const before = getDeadline();
    const result = await callApi("/api/session/renew", sessionViewSchema, {
      method: "POST",
    });
    setBusy(null);
    if (result.ok) {
      // The header moved the end. If it was lost on the way, the renewal still
      // gave 30 minutes from now, and the warning must not come back at once.
      if (getDeadline() === before) setDeadline(Date.now() + SESSION_TTL_MS);
      showWarning(false);
      evaluate();
    } else if (result.error.code !== "SESSION_EXPIRED") {
      setFailed(true);
    }
  }

  async function logOut() {
    if (busy !== null) return;
    setBusy("logout");
    setFailed(false);
    const result = await callApi("/api/auth/logout", logoutResponseSchema, {
      method: "POST",
    });
    if (!result.ok) {
      setBusy(null);
      // An ended session is on its way to Logg inn (`callApi`).
      if (result.error.code !== "SESSION_EXPIRED") setFailed(true);
      return;
    }
    // Stays busy: the page is leaving, for Hjem, logged out. A request that
    // answers SESSION_EXPIRED from now on must not send it to Logg inn.
    leaving.current = true;
    holdEnding();
    window.clearTimeout(timer.current);
    forgetSessionForLogout();
    window.location.replace("/");
  }

  return (
    <ExpiryWarning
      open={open}
      busy={busy}
      failed={failed}
      onContinue={continueSession}
      onLogOut={logOut}
      returnFocusRef={returnFocus}
      continueRef={continueRef}
    />
  );
}
