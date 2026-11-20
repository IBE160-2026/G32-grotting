"use client";

import { useMutation } from "@tanstack/react-query";
import {
  type FormEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AiNotice, consentFor, noticeRequired } from "@/modules/ai/ui";
import {
  type CvErrorCode,
  type CvState,
  cvLengthError,
  cvSubmitError,
  restoreCv,
} from "@/modules/cv/contracts";
import { CvInput } from "@/modules/cv/ui";
import { splitParagraphs } from "@/modules/keywords/core";
import { TONES, type Tone } from "@/modules/letter/contracts";
import {
  type LetterJob,
  type LetterPhase,
  LetterSection,
  letterLine,
  type RegenState,
  requestLetter,
  ToneChoice,
} from "@/modules/letter/ui";
import type { AnalysisResult } from "@/modules/match/contracts";
import {
  KeywordList,
  PulsePlot,
  phaseOneLine,
  ScoreBlock,
} from "@/modules/match/ui";
import { formatCount } from "@/shared/core/format-count";
import { announce } from "@/shared/ui/announce";
import { callApi } from "@/shared/ui/api-client";
import { readSession, writeSession } from "@/shared/ui/client-session";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { CatalogueHeading } from "@/shared/ui/components/catalogue-heading";
import { CreditsList } from "@/shared/ui/components/credits-list";
import { TextArea, TextField } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import { useRunMode } from "@/shared/ui/run-mode";
import {
  type AnalyseRequest,
  type AnalyseResponse,
  type AnalysisInputs,
  analyseResponseSchema,
  type InputErrorCode,
  type InputField,
  inputErrors,
  JOB_AD_MAX,
  normaliseNewlines,
} from "../contracts";

type Errors = Partial<Record<InputField, InputErrorCode>>;
type JobField = Exclude<InputField, "cvText">;
type JobValues = Omit<AnalysisInputs, "cvText">;

const EMPTY: JobValues = { jobTitle: "", employer: "", jobAd: "" };
const NONE: readonly never[] = [];
const EMPTY_CV: CvState = { draft: "", confirmed: false };
const DEFAULT_TONE: Tone = "Formell";

// Read from the tab's session; a value that is not a Tone reads as unset.
function storedTone(): Tone {
  const stored = readSession().tone;
  return TONES.find((tone) => tone === stored) ?? DEFAULT_TONE;
}

// The phase-1 line is spoken first; the phase-2 line waits until it has had
// time to be read, so a Letter that arrives at once does not cut it off.
const PHASE_LINE_GAP_MS = 1500;

// What the result view shows, kept as it was submitted: the form can change
// only after «Endre annonsen» has brought it back. Held in this component only,
// never stored (AD-8).
type Outcome = {
  readonly result: AnalysisResult;
  // What phase 2 needs to ask for the Letter again.
  readonly job: LetterJob;
  readonly jobTitle: string;
  readonly employer: string;
  readonly date: string;
  readonly adParagraphs: readonly string[];
};

// «17. nov. 2026»
const DATE = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const ERROR_TEXTS: Record<InputErrorCode, string> = {
  ...messages.application.errors,
  ...messages.cv.errors,
};

// The order the fields sit in, which is also the order focus goes to the first
// error (EXPERIENCE.md, focus order, before S6).
const FIELD_ORDER: readonly InputField[] = [
  "cvText",
  "jobTitle",
  "employer",
  "jobAd",
];

type ApplicationFormProps = {
  // The Example pair, read by the server component page. Without it the form
  // has no «Bruk eksempelet» button (FR-27).
  example?: AnalysisInputs;
};

export function ApplicationForm({ example }: ApplicationFormProps) {
  const cvRef = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  // Counts the presses of «Bruk eksempelet»; it is the key of the CV slot, so
  // the slot starts over, collapsed on the confirmed text.
  const [exampleRuns, setExampleRuns] = useState(0);
  const jobTitleRef = useRef<HTMLInputElement>(null);
  const employerRef = useRef<HTMLInputElement>(null);
  const jobAdRef = useRef<HTMLTextAreaElement>(null);
  const [values, setValues] = useState<JobValues>(EMPTY);
  const [cv, setCv] = useState<CvState>(EMPTY_CV);
  const [errors, setErrors] = useState<Errors>({});
  // The server found too few Keywords in the ad; it stays until the ad is
  // edited (FR-4).
  const [adUnclear, setAdUnclear] = useState(false);
  // The request got no answer, or the answer was not a result.
  const [failed, setFailed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [tone, setTone] = useState<Tone>(DEFAULT_TONE);
  // Phase 2: where the Letter stands, and what a refused request holds back.
  const [letterPhase, setLetterPhase] = useState<LetterPhase | null>(null);
  // «Lag nytt utkast»: the Letter on screen stays while a new one is written.
  const [regen, setRegen] = useState<RegenState>("idle");
  const letterHeadingRef = useRef<HTMLHeadingElement>(null);
  const [letterFocus, setLetterFocus] = useState(0);
  const pendingLetter = useRef<LetterJob | null>(null);
  const reprompted = useRef(false);
  const lastJob = useRef<LetterJob | null>(null);
  const regenerating = useRef(false);
  const phaseOneAt = useRef(0);
  const phaseTwoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Counts the times the form and the result have traded places; the new `h1`
  // takes focus once it is on the page (UX-DR19).
  const [headingFocus, setHeadingFocus] = useState(0);
  // A second submit while one runs does nothing, even before React has
  // rendered the busy button (NFR-5).
  const sending = useRef(false);
  const runMode = useRunMode();
  // The AI notice is open (FR-24); the request it holds back waits in the ref.
  const [noticeOpen, setNoticeOpen] = useState(false);
  const pending = useRef<AnalyseRequest | null>(null);
  const analysis = useMutation({
    mutationFn: (request: AnalyseRequest) =>
      callApi("/api/analyses", analyseResponseSchema, { body: request }),
  });
  // One Letter request in flight (AD-6). The consent is read when it starts,
  // so a notice accepted a moment ago counts (AD-13).
  const letter = useMutation({
    mutationFn: (job: LetterJob) =>
      requestLetter(job, consentFor(runMode, readSession().noticeVersion)),
  });
  // Nothing is written until what the tab held has been read back (AD-16).
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const { inputs } = readSession();
    setValues({
      jobTitle: inputs.jobTitle ?? "",
      employer: inputs.employer ?? "",
      jobAd: inputs.jobAd ?? "",
    });
    setCv(restoreCv(inputs));
    setTone(storedTone());
    setRestored(true);
  }, []);

  useEffect(() => () => clearTimeout(phaseTwoTimer.current), []);

  useEffect(() => {
    if (letterFocus > 0) letterHeadingRef.current?.focus();
  }, [letterFocus]);

  const refs: Record<
    InputField,
    RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  > = {
    cvText: cvRef,
    jobTitle: jobTitleRef,
    employer: employerRef,
    jobAd: jobAdRef,
  };

  useEffect(() => {
    if (headingFocus > 0) headingRef.current?.focus();
  }, [headingFocus]);

  // The flat plot draws the ad as typed, one line per paragraph.
  const livePlotParagraphs = useMemo(
    () => splitParagraphs(values.jobAd),
    [values.jobAd],
  );

  function errorText(field: InputField): string | undefined {
    const code = errors[field];
    if (code !== undefined) return ERROR_TEXTS[code];
    return field === "jobAd" && adUnclear
      ? messages.application.adUnclear
      : undefined;
  }

  function setError(field: InputField, code: InputErrorCode | undefined) {
    setErrors((current) => {
      const next = { ...current };
      if (code === undefined) delete next[field];
      else next[field] = code;
      return next;
    });
  }

  // An edit changes the inputs, so the id made for the old ones goes (AD-8).
  function change(field: JobField, raw: string) {
    const value = normaliseNewlines(raw);
    setValues((current) => ({ ...current, [field]: value }));
    if (field === "jobAd") setAdUnclear(false);
    if (restored) {
      writeSession({ applicationId: null, inputs: { [field]: value } });
    }
  }

  function changeTone(next: Tone) {
    setTone(next);
    if (restored) writeSession({ tone: next });
  }

  // Any CV edit drops the confirmation (FR-3): `cvText` goes, the draft stays.
  function changeCv(raw: string) {
    const draft = normaliseNewlines(raw);
    setCv({ draft, confirmed: false });
    if (restored) {
      writeSession({
        applicationId: null,
        inputs: { cvDraft: draft, cvText: undefined },
      });
    }
  }

  // The text of an uploaded file replaces the field as an edit, so it needs
  // confirming (FR-3), and its length is judged at once.
  function extractedCv(text: string) {
    changeCv(text);
    setError("cvText", cvLengthError(normaliseNewlines(text)));
  }

  // Leaving the CV field judges the length only; a missing confirmation stays
  // until the Student confirms, since an edit leaves the text unconfirmed.
  function blurCv() {
    const missing =
      errors.cvText === "CV_NOT_CONFIRMED" && !cv.confirmed
        ? "CV_NOT_CONFIRMED"
        : undefined;
    setError("cvText", cvLengthError(cv.draft) ?? missing);
  }

  function confirmCv(): boolean {
    const code: CvErrorCode | undefined = cvLengthError(cv.draft);
    setError("cvText", code);
    if (code !== undefined) {
      cvRef.current?.focus();
      announce("action", messages.cv.errors[code]);
      return false;
    }
    setCv({ draft: cv.draft, confirmed: true });
    writeSession({ inputs: { cvDraft: cv.draft, cvText: cv.draft } });
    announce("action", messages.cv.confirmed(formatCount(cv.draft.length)));
    return true;
  }

  // The Example pair replaces every input and counts as a confirmed CV: it is
  // not extraction output (FR-27, FR-3). Nothing is sent and nothing submits.
  function fillExample() {
    if (example === undefined) return;
    const filled: JobValues = {
      jobTitle: normaliseNewlines(example.jobTitle),
      employer: normaliseNewlines(example.employer),
      jobAd: normaliseNewlines(example.jobAd),
    };
    const draft = normaliseNewlines(example.cvText);
    setValues(filled);
    setCv({ draft, confirmed: true });
    setErrors({});
    setAdUnclear(false);
    setFailed(false);
    setExampleRuns((count) => count + 1);
    writeSession({
      applicationId: null,
      inputs: { ...filled, cvDraft: draft, cvText: draft },
    });
    submitRef.current?.focus();
    announce("action", messages.application.exampleFilled);
  }

  function blur(field: JobField) {
    setError(field, inputErrors({ cvText: cv.draft, ...values })[field]);
    if (field === "jobAd") {
      announce(
        "action",
        messages.counter(
          formatCount(values.jobAd.length),
          formatCount(JOB_AD_MAX),
        ),
      );
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = inputErrors({ cvText: cv.draft, ...values });
    // The CV is also blocked while it is valid but not confirmed (FR-3).
    const cvCode = cvSubmitError(cv.draft, cv.confirmed);
    if (cvCode === undefined) delete found.cvText;
    else found.cvText = cvCode;
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field] !== undefined);
    if (first !== undefined) {
      refs[first].current?.focus();
      // Focus alone says nothing when the field already has it (UX-DR19).
      const code = found[first];
      if (code !== undefined) {
        announce("action", ERROR_TEXTS[code]);
      }
      return;
    }
    if (sending.current) return;
    // The id lives as long as the inputs do; a second submit reuses it.
    let applicationId = readSession().applicationId;
    if (applicationId === undefined) {
      applicationId = crypto.randomUUID();
      writeSession({ applicationId });
    }
    const request: AnalyseRequest = {
      applicationId,
      inputs: { cvText: cv.draft, ...values },
    };
    // Before anything can leave the app, the Student is asked once per browser
    // session (FR-24). Test mode never asks. Phase 1 waits for the answer.
    if (noticeRequired(runMode, readSession().noticeVersion)) {
      pending.current = request;
      setNoticeOpen(true);
      return;
    }
    send(request);
  }

  function acceptNotice() {
    writeSession({ noticeVersion: runMode.aiNotice.version });
    setNoticeOpen(false);
    const request = pending.current;
    pending.current = null;
    if (request !== null) send(request);
    const job = pendingLetter.current;
    pendingLetter.current = null;
    if (job !== null) runLetter(job);
  }

  // «Avbryt» and Esc: the inputs stay, nothing is sent, and focus goes back to
  // the submit button once the dialog has closed. A Letter held back by the
  // server's refusal becomes the section alert, with its retry.
  function cancelNotice() {
    pending.current = null;
    setNoticeOpen(false);
    if (pendingLetter.current !== null) {
      pendingLetter.current = null;
      reprompted.current = false;
      settleLetter({ kind: "failed", code: "AI_NOTICE_REQUIRED" });
    }
  }

  // One request for phase 1: code only, so the result needs no AI (NFR-4).
  function send(request: AnalyseRequest) {
    sending.current = true;
    setAdUnclear(false);
    setFailed(false);
    analysis.mutate(request, {
      onSuccess: (answer) => {
        sending.current = false;
        if (answer.ok) {
          show(answer.data, request);
          return;
        }
        const { code, field } = answer.error;
        if (code === "INVALID_INPUT" && field === "inputs.jobAd") {
          setAdUnclear(true);
          jobAdRef.current?.focus();
          announce("action", messages.application.adUnclear);
          return;
        }
        // The network failed or something else went wrong: nothing was judged,
        // so the inputs stay and focus stays where it was.
        setFailed(true);
      },
      onError: () => {
        sending.current = false;
        setFailed(true);
      },
    });
  }

  // Phase 1 is on the screen; phase 2 starts at once (NFR-4). The Tone is the
  // one chosen at submit (the form is inert while the notice is open), and the phase-1 line ends with what happens next.
  function show(answer: AnalyseResponse, request: AnalyseRequest) {
    const { inputs } = request;
    const job: LetterJob = {
      applicationId: request.applicationId,
      inputs,
      tone,
      fingerprint: answer.fingerprint,
    };
    setHeadingFocus((count) => count + 1);
    setOutcome({
      result: answer.result,
      job,
      jobTitle: inputs.jobTitle,
      employer: inputs.employer,
      date: DATE.format(new Date()),
      adParagraphs: splitParagraphs(inputs.jobAd),
    });
    setRegen("idle");
    announce("phase", phaseOneLine(answer.result, true));
    phaseOneAt.current = Date.now();
    reprompted.current = false;
    runLetter(job);
  }

  // `again` is «Lag nytt utkast»: the Letter shown stays until the new one has
  // arrived, and the outcome goes to the second live region (FR-12, UX-DR39).
  function runLetter(job: LetterJob, again = false) {
    // A line still waiting from an earlier outcome must not be spoken now; a
    // new draft leaves the first Letter's line alone.
    if (!again) clearTimeout(phaseTwoTimer.current);
    lastJob.current = job;
    if (again) setRegen("running");
    else setLetterPhase({ kind: "pending" });
    letter.mutate(job, {
      onSuccess: ({ answer, rerun }) => {
        // ANALYSIS_STALE was answered by a silent rerun of phase 1: the score
        // and the fingerprint now come from it (AD-6).
        const current = rerun
          ? { ...job, fingerprint: rerun.fingerprint }
          : job;
        lastJob.current = current;
        if (rerun) {
          setOutcome((held) =>
            held === null
              ? held
              : { ...held, result: rerun.result, job: current },
          );
        }
        if (answer.ok) {
          reprompted.current = false;
          if (again) {
            setLetterPhase({ kind: "done", letter: answer.data.letter });
            regenerating.current = false;
            setRegen("idle");
            announce("action", messages.letter.regenerate.live.done);
            return;
          }
          settleLetter({ kind: "done", letter: answer.data.letter });
          return;
        }
        if (again) {
          failRegenerate();
          return;
        }
        // The server and this page disagree about the notice (a config change
        // in mid-session): ask again, once, then resend (AD-13, FR-24). A
        // second refusal after the Student accepted is an alert, so it cannot
        // loop; a reload brings the server's current version.
        if (answer.error.code === "AI_NOTICE_REQUIRED" && !reprompted.current) {
          reprompted.current = true;
          pendingLetter.current = current;
          setNoticeOpen(true);
          return;
        }
        reprompted.current = false;
        settleLetter({ kind: "failed", code: answer.error.code });
      },
      onError: () =>
        again
          ? failRegenerate()
          : settleLetter({ kind: "failed", code: "UNEXPECTED" }),
    });
  }

  // The old Letter stays; the section shows the alert with «Prøv igjen».
  function failRegenerate() {
    regenerating.current = false;
    setRegen("failed");
    announce("action", messages.letter.regenerate.live.failed);
  }

  // «Lag nytt utkast»: one new Letter request with the form's Tone and the rev
  // of the Letter shown (FR-12, FR-10). Test mode answers with the Cached
  // Letter again.
  function regenerate() {
    const base = lastJob.current;
    // A ref, not `regen`: two presses before React has rendered the busy
    // button must not send two requests (each counts toward the Daily cap).
    if (regenerating.current || letterPhase?.kind !== "done" || base === null) {
      return;
    }
    regenerating.current = true;
    reprompted.current = false;
    runLetter({ ...base, tone, previousRev: letterPhase.letter.rev }, true);
  }

  // The phase-2 line, once, in the first live region (NFR-2).
  function settleLetter(phase: LetterPhase) {
    setLetterPhase(phase);
    const line = letterLine(phase);
    if (line === null) return;
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
    reprompted.current = false;
    setLetterFocus((count) => count + 1);
    runLetter(job);
  }

  function backToForm() {
    clearTimeout(phaseTwoTimer.current);
    letter.reset();
    pendingLetter.current = null;
    setLetterPhase(null);
    regenerating.current = false;
    setRegen("idle");
    setHeadingFocus((count) => count + 1);
    setOutcome(null);
  }

  if (outcome !== null) {
    const { result } = outcome;
    return (
      <>
        <div className="max-w-measure">
          <CatalogueHeading ref={headingRef} employer>
            {outcome.employer}
          </CatalogueHeading>
          <div className="mt-6 flex flex-col gap-8">
            <CreditsList
              items={[
                {
                  term: messages.result.credits.position,
                  value: outcome.jobTitle,
                },
                { term: messages.result.credits.date, value: outcome.date },
                ...(letterPhase?.kind === "done"
                  ? [
                      {
                        term: messages.result.credits.tone,
                        value:
                          messages.tone.options[letterPhase.letter.tone].name,
                      },
                    ]
                  : []),
                {
                  term: messages.result.credits.ad,
                  value: messages.result.adSummary(
                    formatCount(result.adParagraphs),
                    formatCount(result.totalCount),
                  ),
                },
              ]}
            />
            <div>
              <Button variant="secondary" onClick={backToForm}>
                {messages.result.editAd}
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <PulsePlot
            placement="result"
            paragraphs={outcome.adParagraphs}
            matched={result.matched}
            missing={result.missing}
          />
        </div>
        <div className="mt-8 flex max-w-measure flex-col gap-8">
          <ScoreBlock result={result} />
          <KeywordList
            kind="matched"
            entries={result.matched}
            adParagraphs={outcome.adParagraphs}
          />
          <KeywordList
            kind="missing"
            entries={result.missing}
            adParagraphs={outcome.adParagraphs}
          />
        </div>
        <div className="mt-8 max-w-letter">
          <LetterSection
            phase={letterPhase ?? { kind: "pending" }}
            onRetry={retryLetter}
            headingRef={letterHeadingRef}
            employer={outcome.employer}
            regen={regen}
            onRegenerate={regenerate}
          />
        </div>
        <AiNotice
          open={noticeOpen}
          onAccept={acceptNotice}
          onCancel={cancelNotice}
          returnFocusRef={letterHeadingRef}
        />
      </>
    );
  }

  return (
    <div className="max-w-measure">
      <CatalogueHeading ref={headingRef}>
        {messages.application.heading}
      </CatalogueHeading>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        {failed ? <Alert>{messages.networkFailure}</Alert> : null}
        <CvInput
          key={exampleRuns}
          inputRef={cvRef}
          draft={cv.draft}
          confirmed={cv.confirmed}
          error={errorText("cvText")}
          onChange={changeCv}
          onBlur={blurCv}
          onExtracted={extractedCv}
          onConfirm={confirmCv}
        />
        <TextField
          ref={jobTitleRef}
          label={messages.application.jobTitle}
          error={errorText("jobTitle")}
          name="jobTitle"
          autoComplete="off"
          value={values.jobTitle}
          onChange={(event) => change("jobTitle", event.target.value)}
          onBlur={() => blur("jobTitle")}
        />
        <TextField
          ref={employerRef}
          label={messages.application.employer}
          error={errorText("employer")}
          name="employer"
          autoComplete="organization"
          value={values.employer}
          onChange={(event) => change("employer", event.target.value)}
          onBlur={() => blur("employer")}
        />
        {example === undefined ? null : (
          <div>
            <Button
              variant="secondary"
              type="button"
              // As «Bekreft CV-teksten»: a blur first could raise an error and
              // move the button before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={fillExample}
            >
              {messages.application.useExample}
            </Button>
          </div>
        )}
        <TextArea
          ref={jobAdRef}
          label={messages.application.jobAd}
          hint={messages.application.jobAdHint}
          counter={messages.counter(
            formatCount(values.jobAd.length),
            formatCount(JOB_AD_MAX),
          )}
          error={errorText("jobAd")}
          name="jobAd"
          rows={12}
          autoComplete="off"
          value={values.jobAd}
          onChange={(event) => change("jobAd", event.target.value)}
          onBlur={() => blur("jobAd")}
        />
        <ToneChoice value={tone} onChange={changeTone} />
        <div>
          <Button ref={submitRef} type="submit" busy={analysis.isPending}>
            {messages.application.submit}
          </Button>
        </div>
      </form>
      <AiNotice
        open={noticeOpen}
        onAccept={acceptNotice}
        onCancel={cancelNotice}
        returnFocusRef={submitRef}
      />
      <div className="mt-8">
        <PulsePlot
          placement="flat"
          paragraphs={livePlotParagraphs}
          matched={NONE}
          missing={NONE}
        />
      </div>
    </div>
  );
}
