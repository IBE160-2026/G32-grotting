"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { consentFor } from "@/modules/ai/ui";
import {
  type GapsJob,
  type GapsPhase,
  gapTargetId,
  requestGaps,
} from "@/modules/gaps/ui";
import type {
  CheckGap,
  Letter,
  LetterFlagWire,
  Tone,
} from "@/modules/letter/contracts";
import {
  type LetterCheckState,
  type LetterJob,
  type LetterPhase,
  letterLine,
  type RegenState,
  requestLetter,
  requestLetterCheck,
} from "@/modules/letter/ui";
import type { AnalysisResult } from "@/modules/match/contracts";
import { phaseOneLine, resultChanged, updatedLine } from "@/modules/match/ui";
import { formatCount } from "@/shared/core/format-count";
import type { MessageKey } from "@/shared/core/message-key";
import { announce } from "@/shared/ui/announce";
import { readSession } from "@/shared/ui/client-session";
import { messages } from "@/shared/ui/messages.nb";
import type { useRunMode } from "@/shared/ui/run-mode";
import type { AnalyseResponse } from "../contracts";
import {
  phaseTwoLine,
  type SectionKind,
  sectionKindOfFailure,
} from "./phase-two-line";

const NONE: readonly never[] = [];

// The phase-1 line is spoken first; the phase-2 line waits until it has had
// time to be read, so a Letter that arrives at once does not cut it off.
const PHASE_LINE_GAP_MS = 1500;
// «Sjekk igjen» moves focus to the section heading, and a screen reader that is
// still speaking the heading drops a polite line set at the same moment. The
// check answers in about 100 ms, so its outcome is held until this long after
// the click (measured: the line came 20 ms after focus and was not read).
const CHECK_RETRY_SPEECH_MS = 600;

// Which request phase 2 is sending: the first Letter, «Prøv igjen» after it
// failed, or «Lag nytt utkast» (the old Letter stays). The mode decides where
// the outcome is spoken and how a refusal is shown (UX-DR39).
type LetterMode = "first" | "retry" | "again";
type GapsMode = "first" | "retry";

// Where the integrity check of one Letter stands (FR-11): kept with the rev of
// the Letter it was made for. `retrying` is «Sjekk igjen» running.
type CheckHeld = {
  readonly rev: number;
  readonly status: "running" | "done" | "failed" | "retrying";
  readonly flags: readonly LetterFlagWire[];
};

// How a settled section of phase 2 ended, for the phase-2 line.
function kindOfPhase(
  phase: { kind: "done" } | { kind: "failed"; code: MessageKey },
): SectionKind {
  return phase.kind === "done" ? "done" : sectionKindOfFailure(phase.code);
}

type PhaseTwoOptions = {
  readonly runMode: ReturnType<typeof useRunMode>;
  // The Tone the form shows now; «Lag nytt utkast» asks for it.
  readonly tone: Tone;
  // Opens the AI notice; the request it holds back waits in this hook.
  readonly openNotice: () => void;
  // A silent rerun of phase 1 changed the result on screen (ANALYSIS_STALE).
  readonly onRerun: (result: AnalysisResult, job: LetterJob) => void;
};

/**
 * Phase 2 of Søknad: the Letter and the Gap analysis written next to the score,
 * the integrity check of the Letter, and what is spoken about them. It holds
 * every request, retry, rev and live-region rule of the phase, so the form
 * keeps only the inputs and phase 1.
 */
export function usePhaseTwo({
  runMode,
  tone,
  openNotice,
  onRerun,
}: PhaseTwoOptions) {
  // Phase 2: where the Letter stands, and what a refused request holds back.
  const [letterPhase, setLetterPhase] = useState<LetterPhase | null>(null);
  // «Lag nytt utkast»: the Letter on screen stays while a new one is written.
  const [regen, setRegen] = useState<RegenState>("idle");
  const letterHeadingRef = useRef<HTMLHeadingElement>(null);
  const [letterFocus, setLetterFocus] = useState(0);
  // Phase 2 with the Gap analysis (FR-13): `null` when it is not asked for (the
  // flag is off, or no Keyword is missing). It is written next to the Letter and
  // fails on its own; «Prøv igjen» moves focus to its heading.
  const [gapsPhase, setGapsPhase] = useState<GapsPhase | null>(null);
  const gapsHeadingRef = useRef<HTMLHeadingElement>(null);
  const [gapsFocus, setGapsFocus] = useState(0);
  const gapsBusy = useRef(false);
  const gapsActive = useRef(false);
  // The rev of the Gap analysis shown: it counts the ones that arrived, and is
  // 0 while there is none (flag off, or it failed). The Letter check is sent
  // with it and a result for another rev is dropped (FR-11, AD-8).
  const gapsRev = useRef(0);
  const checkedGaps = useRef<GapsPhase | null>(null);
  const repromptedGaps = useRef(false);
  const pendingGaps = useRef<{ job: GapsJob; mode: GapsMode } | null>(null);
  // How each AI section of phase 2 settled, and whether the phase-2 line has
  // been given: it waits for both sections and is spoken once (NFR-2).
  const sectionKinds = useRef<{
    letter: SectionKind | null;
    gaps: SectionKind | null;
  }>({ letter: null, gaps: null });
  const lineGiven = useRef(false);
  // The integrity check of the Letter shown (FR-11). It is no AI request, so a
  // check for an old Letter may finish while a new one is written: the sequence
  // and the rev of the Letter shown decide whether a result is used.
  const [check, setCheck] = useState<CheckHeld | null>(null);
  const checkSeq = useRef(0);
  const checkedLetter = useRef<Letter | null>(null);
  const shownRev = useRef<number | null>(null);
  // A Letter request the server refused for the notice, waiting for the answer.
  const pendingLetter = useRef<{
    job: LetterJob;
    mode: LetterMode;
  } | null>(null);
  const reprompted = useRef(false);
  const lastJob = useRef<LetterJob | null>(null);
  // One Letter request at a time, even before React has rendered the busy
  // button: a double press must not send two (each counts toward the Daily
  // cap) (AD-6, NFR-5).
  const letterBusy = useRef(false);
  // The result on screen, so a silent rerun can tell whether it changed it.
  const shownResult = useRef<AnalysisResult | null>(null);
  // «Samsvaret er oppdatert …» from a silent rerun, held to be spoken together
  // with the outcome of «Prøv igjen» or a new draft: both go to the second live
  // region, and a second `announce` there would replace the first.
  const updateNote = useRef<string | null>(null);
  const phaseOneAt = useRef(0);
  const phaseTwoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The same for the Gaps request; the two are independent (AD-6).
  const gaps = useMutation({
    mutationFn: (job: GapsJob) =>
      requestGaps(job, consentFor(runMode, readSession().noticeVersion)),
  });
  // One Letter request in flight (AD-6). The consent is read when it starts,
  // so a notice accepted a moment ago counts (AD-13).
  const letter = useMutation({
    mutationFn: (job: LetterJob) =>
      requestLetter(job, consentFor(runMode, readSession().noticeVersion)),
  });

  useEffect(() => () => clearTimeout(phaseTwoTimer.current), []);

  useEffect(() => {
    if (letterFocus > 0) letterHeadingRef.current?.focus();
  }, [letterFocus]);

  useEffect(() => {
    if (gapsFocus > 0) gapsHeadingRef.current?.focus();
  }, [gapsFocus]);

  // One check per Letter that has arrived and per Gap analysis it can lean on
  // (FR-11): it starts when the Letter is there and the Gaps have settled, with
  // the Gaps (or none when they failed or are off). So it is sent again after a
  // successful Gaps retry and after «Lag nytt utkast». A Gaps retry that fails
  // again changes nothing. The Letter is on screen already; flags follow.
  // biome-ignore lint/correctness/useExhaustiveDependencies: starts once per arrived Letter and Gap analysis; runCheck reads refs and sets state only
  useEffect(() => {
    if (letterPhase?.kind !== "done") return;
    if (gapsPhase?.kind === "pending") return;
    const { letter: arrived } = letterPhase;
    const usable = gapsPhase?.kind === "done" ? gapsPhase : null;
    if (checkedLetter.current === arrived && checkedGaps.current === usable) {
      return;
    }
    checkedLetter.current = arrived;
    checkedGaps.current = usable;
    shownRev.current = arrived.rev;
    void runCheck(arrived, false);
  }, [letterPhase, gapsPhase]);

  // Phase 1 is on the screen; phase 2 starts at once (NFR-4). The phase-1 line
  // ends with what happens next.
  function begin(job: LetterJob, result: AnalysisResult) {
    setRegen("idle");
    resetCheck();
    gapsRev.current = 0;
    shownResult.current = result;
    updateNote.current = null;
    // The Gap analysis needs the flag and at least one Missing keyword; the
    // server would answer an empty list for none.
    const withGaps = runMode.features.gaps && result.missing.length > 0;
    announce("phase", phaseOneLine(result, true, withGaps));
    phaseOneAt.current = Date.now();
    reprompted.current = false;
    repromptedGaps.current = false;
    pendingGaps.current = null;
    sectionKinds.current = { letter: null, gaps: null };
    lineGiven.current = false;
    gapsActive.current = withGaps;
    setGapsPhase(withGaps ? { kind: "pending" } : null);
    // A new Application: nothing from an earlier one is still in flight.
    letterBusy.current = false;
    gapsBusy.current = false;
    runLetter(job);
    if (withGaps) runGaps(job);
  }

  // `again` is «Lag nytt utkast»: the Letter shown stays until the new one has
  // arrived, and the outcome goes to the second live region (FR-12, UX-DR39).
  function runLetter(job: LetterJob, mode: LetterMode = "first") {
    if (letterBusy.current) return;
    letterBusy.current = true;
    // A line still waiting from an earlier outcome must not be spoken now; a
    // new draft leaves the first Letter's line alone.
    if (mode !== "again") clearTimeout(phaseTwoTimer.current);
    if (mode === "retry" && !lineGiven.current) {
      sectionKinds.current.letter = null;
    }
    lastJob.current = job;
    if (mode === "again") setRegen("running");
    else setLetterPhase({ kind: "pending" });
    letter.mutate(job, {
      onSuccess: ({ answer, rerun }) => {
        letterBusy.current = false;
        // ANALYSIS_STALE was answered by a silent rerun of phase 1: the score
        // and the fingerprint now come from it (AD-6).
        const current = rerun ? adoptRerun(job, rerun, mode === "first") : job;
        lastJob.current = current;
        if (answer.ok) {
          reprompted.current = false;
          if (mode === "again") {
            setLetterPhase({ kind: "done", letter: answer.data.letter });
            setRegen("idle");
            say(messages.letter.regenerate.live.done);
            return;
          }
          settle(mode, { kind: "done", letter: answer.data.letter });
          return;
        }
        // The server and this page disagree about the notice (a config change
        // in mid-session): ask again, once, then resend (AD-13, FR-24). A
        // second refusal after the Student accepted is an alert, so it cannot
        // loop; a reload brings the server's current version.
        if (answer.error.code === "AI_NOTICE_REQUIRED" && !reprompted.current) {
          reprompted.current = true;
          pendingLetter.current = { job: current, mode };
          if (mode === "again") setRegen("idle");
          openNotice();
          return;
        }
        reprompted.current = false;
        if (mode === "again") failRegenerate(answer.error.code);
        else settle(mode, { kind: "failed", code: answer.error.code });
      },
      onError: () => {
        letterBusy.current = false;
        if (mode === "again") failRegenerate("UNEXPECTED");
        else settle(mode, { kind: "failed", code: "UNEXPECTED" });
      },
    });
  }

  // The Gaps request next to the Letter (FR-13): the same stale rerun and
  // notice handling, its own busy flag and its own outcome. The job is the one
  // the page holds now, so a retry carries the fingerprint of a rerun.
  function runGaps(job: GapsJob, mode: GapsMode = "first") {
    if (gapsBusy.current) return;
    gapsBusy.current = true;
    if (mode === "retry" && !lineGiven.current) {
      sectionKinds.current.gaps = null;
    }
    setGapsPhase({ kind: "pending" });
    gaps.mutate(job, {
      onSuccess: ({ answer, rerun }) => {
        gapsBusy.current = false;
        const base = lastJob.current;
        if (rerun && base !== null) adoptRerun(base, rerun, mode === "first");
        if (answer.ok) {
          repromptedGaps.current = false;
          settleGaps({ kind: "done", gaps: answer.data.gaps });
          return;
        }
        // As for the Letter: ask again once, then it is the alert.
        if (
          answer.error.code === "AI_NOTICE_REQUIRED" &&
          !repromptedGaps.current
        ) {
          repromptedGaps.current = true;
          pendingGaps.current = { job: lastJob.current ?? job, mode };
          openNotice();
          return;
        }
        repromptedGaps.current = false;
        settleGaps({ kind: "failed", code: answer.error.code });
      },
      onError: () => {
        gapsBusy.current = false;
        settleGaps({ kind: "failed", code: "UNEXPECTED" });
      },
    });
  }

  // A silent rerun of phase 1 (ANALYSIS_STALE, AD-6): the result and the
  // fingerprint the page holds come from it. When the score changed under the
  // Student's eyes it is said, once: at once, or held for the outcome that the
  // second live region speaks next. Returns the job with the new fingerprint.
  function adoptRerun(
    job: LetterJob,
    rerun: AnalyseResponse,
    speakNow: boolean,
  ): LetterJob {
    const current = { ...job, fingerprint: rerun.fingerprint };
    lastJob.current = current;
    const before = shownResult.current;
    shownResult.current = rerun.result;
    onRerun(rerun.result, current);
    if (before !== null && resultChanged(before, rerun.result)) {
      const note = updatedLine(rerun.result);
      if (speakNow) announce("action", note);
      else updateNote.current = note;
    }
    return current;
  }

  // Nothing from an earlier Letter's check may reach the screen.
  function resetCheck() {
    checkSeq.current += 1;
    checkedLetter.current = null;
    checkedGaps.current = null;
    shownRev.current = null;
    setCheck(null);
  }

  // The integrity check of one Letter (FR-11): code only, so it needs no
  // consent and does not count toward the cap. `manual` is «Sjekk igjen»,
  // whose outcome is spoken in the second live region; an automatic check says
  // nothing, in either outcome.
  async function runCheck(arrived: Letter, manual: boolean) {
    const base = lastJob.current;
    if (base === null) return;
    checkSeq.current += 1;
    const seq = checkSeq.current;
    const asked = Date.now();
    // The Gap analysis the Student sees now, or none when it failed or is off.
    const shownGaps: readonly CheckGap[] | null =
      gapsPhase?.kind === "done" ? gapsPhase.gaps : null;
    // `gaps: null` always goes with rev 0, whatever the counter says now.
    const askedGapsRev = shownGaps === null ? 0 : gapsRev.current;
    setCheck({
      rev: arrived.rev,
      status: manual ? "retrying" : "running",
      flags: NONE,
    });
    const outcome = await requestLetterCheck(
      {
        ...base,
        consent: consentFor(runMode, readSession().noticeVersion),
        gaps: shownGaps,
        gapsRev: askedGapsRev,
      },
      arrived,
    );
    // A newer Letter, a newer check or the form took over: drop this result.
    if (seq !== checkSeq.current) return;
    if (outcome.rerun) {
      adoptRerun(lastJob.current ?? base, outcome.rerun, !manual);
    }
    const { answer } = outcome;
    if (answer.ok) {
      const { flags, letterRev, gapsRev: answerGapsRev } = answer.data;
      // The result is for the Letter and the Gap analysis shown.
      if (letterRev !== shownRev.current || answerGapsRev !== gapsRev.current) {
        return;
      }
      setCheck({ rev: arrived.rev, status: "done", flags });
      if (manual && (await spokenAfterFocus(seq, asked))) {
        say(
          flags.length > 0
            ? messages.letter.check.live.found(formatCount(flags.length))
            : messages.letter.check.live.none,
        );
      }
      return;
    }
    setCheck({ rev: arrived.rev, status: "failed", flags: NONE });
    if (manual && (await spokenAfterFocus(seq, asked))) {
      say(messages.letter.check.live.still);
    }
  }

  // Waits until the screen reader has had time to speak the heading that focus
  // moved to, then says whether this check is still the current one.
  async function spokenAfterFocus(
    seq: number,
    asked: number,
  ): Promise<boolean> {
    const wait = CHECK_RETRY_SPEECH_MS - (Date.now() - asked);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    return seq === checkSeq.current;
  }

  // «Sjekk igjen»: only the check is sent again; focus follows to the section
  // heading, as for «Prøv igjen».
  function retryCheck() {
    if (check?.status === "retrying") return;
    if (letterPhase?.kind !== "done") return;
    setLetterFocus((count) => count + 1);
    void runCheck(letterPhase.letter, true);
  }

  // The old Letter stays. The cap and Test mode are notices without a retry;
  // anything else is the alert with «Prøv igjen». Spoken once, in the second
  // live region.
  function failRegenerate(code: MessageKey) {
    letterBusy.current = false;
    if (code === "DAILY_CAP_REACHED") {
      setRegen("cap");
      say(messages.letter.regenerate.live.cap);
    } else if (code === "TEST_MODE_UNAVAILABLE") {
      setRegen("testMode");
      say(messages.letter.regenerate.live.testMode);
    } else {
      setRegen("failed");
      say(messages.letter.regenerate.live.failed);
    }
  }

  // «Lag nytt utkast»: one new Letter request with the form's Tone and the rev
  // of the Letter shown (FR-12, FR-10). Test mode answers with the Cached
  // Letter again.
  function regenerate() {
    const base = lastJob.current;
    if (letterBusy.current || letterPhase?.kind !== "done" || base === null) {
      return;
    }
    reprompted.current = false;
    runLetter({ ...base, tone, previousRev: letterPhase.letter.rev }, "again");
  }

  // Where a settled phase is spoken: the first Letter in the first live region
  // (the phase-2 line, once); «Prøv igjen» in the second (UX-DR39). With the
  // Gap analysis the line waits for both sections.
  function settle(mode: LetterMode, phase: LetterPhase) {
    if (gapsActive.current) {
      setLetterPhase(phase);
      const line = letterLine(phase);
      if (line !== null && phase.kind !== "pending") {
        settleSection("letter", kindOfPhase(phase), line);
      }
      return;
    }
    if (mode === "first") {
      settleLetter(phase);
      return;
    }
    setLetterPhase(phase);
    const line = letterLine(phase);
    if (line !== null) say(line);
  }

  // The second live region, with a held update note in front.
  function say(text: string) {
    const note = updateNote.current;
    updateNote.current = null;
    announce("action", note === null ? text : `${note} ${text}`);
  }

  // The Gap analysis settled: the first outcome joins the Letter's in the
  // phase-2 line, a retry after it is spoken in the second live region.
  function settleGaps(phase: GapsPhase) {
    if (phase.kind === "done") gapsRev.current += 1;
    setGapsPhase(phase);
    if (phase.kind === "pending") return;
    const kind = kindOfPhase(phase);
    settleSection("gaps", kind, messages.gaps.live[kind]);
  }

  // One section of phase 2 settled. Once the line has been given, an outcome
  // is a retry and goes to the second live region; before it, the line waits
  // until both sections have settled and is then spoken once (NFR-2).
  function settleSection(
    section: "letter" | "gaps",
    kind: SectionKind,
    own: string,
  ) {
    sectionKinds.current[section] = kind;
    if (lineGiven.current) {
      say(own);
      return;
    }
    const { letter: letterKind, gaps: gapsKind } = sectionKinds.current;
    if (letterKind === null || gapsKind === null) return;
    lineGiven.current = true;
    speakPhaseLine(phaseTwoLine(letterKind, gapsKind));
  }

  // The phase-2 line, once, in the first live region (NFR-2).
  function settleLetter(phase: LetterPhase) {
    setLetterPhase(phase);
    const line = letterLine(phase);
    if (line === null) return;
    speakPhaseLine(line);
  }

  // After the phase-1 line has had time to be read.
  function speakPhaseLine(line: string) {
    clearTimeout(phaseTwoTimer.current);
    const wait = Math.max(
      0,
      PHASE_LINE_GAP_MS - (Date.now() - phaseOneAt.current),
    );
    phaseTwoTimer.current = setTimeout(() => announce("phase", line), wait);
  }

  // «Prøv igjen»: only the Letter request is sent again; focus follows to the
  // section heading, since the button goes away.
  function retryLetter() {
    const job = lastJob.current;
    if (job === null) return;
    if (letterBusy.current) return;
    reprompted.current = false;
    setLetterFocus((count) => count + 1);
    runLetter(job, "retry");
  }

  // «Prøv igjen» for the Gap analysis: only the Gaps request is sent again;
  // focus follows to the section heading, since the button goes away.
  function retryGaps() {
    const job = lastJob.current;
    if (job === null || gapsBusy.current) return;
    repromptedGaps.current = false;
    setGapsFocus((count) => count + 1);
    runGaps(job, "retry");
  }

  // The notice was accepted: the requests the server refused are sent again.
  function resumeHeld() {
    const held = pendingLetter.current;
    pendingLetter.current = null;
    if (held !== null) runLetter(held.job, held.mode);
    const heldGaps = pendingGaps.current;
    pendingGaps.current = null;
    if (heldGaps !== null) runGaps(heldGaps.job, heldGaps.mode);
  }

  // «Avbryt» and Esc: a Letter held back by the server's refusal becomes the
  // section alert, with its retry; so does a held Gaps request.
  function cancelHeld() {
    const held = pendingLetter.current;
    if (held !== null) {
      pendingLetter.current = null;
      reprompted.current = false;
      if (held.mode === "again") failRegenerate("AI_NOTICE_REQUIRED");
      else settle(held.mode, { kind: "failed", code: "AI_NOTICE_REQUIRED" });
    }
    const heldGaps = pendingGaps.current;
    if (heldGaps !== null) {
      pendingGaps.current = null;
      repromptedGaps.current = false;
      settleGaps({ kind: "failed", code: "AI_NOTICE_REQUIRED" });
    }
  }

  // «Endre annonsen»: nothing of phase 2 stays.
  function reset() {
    clearTimeout(phaseTwoTimer.current);
    resetCheck();
    letter.reset();
    gaps.reset();
    pendingLetter.current = null;
    pendingGaps.current = null;
    setLetterPhase(null);
    setGapsPhase(null);
    gapsActive.current = false;
    gapsBusy.current = false;
    gapsRev.current = 0;
    letterBusy.current = false;
    shownResult.current = null;
    setRegen("idle");
  }

  // The check state of the Letter on screen: a result for an earlier Letter is
  // not shown on a new one.
  let letterCheck: LetterCheckState = { kind: "pending" };
  if (letterPhase?.kind === "done" && check?.rev === letterPhase.letter.rev) {
    if (check.status === "done") {
      letterCheck = { kind: "done", flags: check.flags };
    } else if (check.status === "failed" || check.status === "retrying") {
      letterCheck = { kind: "failed", busy: check.status === "retrying" };
    }
  }

  // «Se gapanalysen» on each Missing entry that has a Gap to go to. The slice
  // of the match list knows no Gaps: it gets the element ids from here.
  const gapTargets =
    gapsPhase?.kind === "done"
      ? Object.fromEntries(
          gapsPhase.gaps.map((gap, index) => [gap.keyword, gapTargetId(index)]),
        )
      : undefined;

  return {
    letterPhase,
    regen,
    gapsPhase,
    letterCheck,
    gapTargets,
    letterHeadingRef,
    gapsHeadingRef,
    begin,
    retryLetter,
    retryGaps,
    retryCheck,
    regenerate,
    resumeHeld,
    cancelHeld,
    reset,
  };
}

export type PhaseTwo = ReturnType<typeof usePhaseTwo>;
