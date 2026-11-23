"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { type LetterJob, ToneChoice } from "@/modules/letter/ui";
import { PulsePlot } from "@/modules/match/ui";
import type { ProfileView } from "@/modules/profile/contracts";
import {
  PROFILE_KEY,
  ProfileRequestError,
  useAcceptAiNotice,
  useProfile,
} from "@/modules/profile/ui";
import { formatCount } from "@/shared/core/format-count";
import { announce } from "@/shared/ui/announce";
import { callApi } from "@/shared/ui/api-client";
import { readSession, writeSession } from "@/shared/ui/client-session";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { CatalogueHeading } from "@/shared/ui/components/catalogue-heading";
import { Notice } from "@/shared/ui/components/notice";
import { ProgressLine } from "@/shared/ui/components/progress-line";
import { SkeletonRows } from "@/shared/ui/components/skeleton-rows";
import { TextArea, TextField } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import { newId } from "@/shared/ui/new-id";
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
import { CvDisclosure, NoCvNotice } from "./cv-disclosure";
import { type Outcome, ResultView } from "./result-view";
import { usePhaseTwo } from "./use-phase-two";

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
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Counts the times the form and the result have traded places; the new `h1`
  // takes focus once it is on the page (UX-DR19).
  const [headingFocus, setHeadingFocus] = useState(0);
  // A second submit while one runs does nothing, even before React has
  // rendered the busy button (NFR-5).
  const sending = useRef(false);
  const runMode = useRunMode();
  // With accounts on (Story 6.6) the CV is the Profile's and the AI notice is
  // accepted once per account; with them off the form is the one of Epic 5.
  const accountsOn = runMode.features.accounts;
  const queryClient = useQueryClient();
  const profile = useProfile({ enabled: accountsOn });
  const acceptOnAccount = useAcceptAiNotice();
  // «Bruk eksempelet» with accounts on: a one-off CV for this application,
  // held here only. It is never saved to the Profile and never written to
  // `sessionStorage`.
  const [exampleCv, setExampleCv] = useState<string | null>(null);
  // The AI notice is open (FR-24); the request it holds back waits in the ref.
  const [noticeOpen, setNoticeOpen] = useState(false);
  const pending = useRef<AnalyseRequest | null>(null);
  const accepting = useRef(false);
  // Bumped by «Avbryt» and Esc: an answer that lands after it is not for the
  // dialog that is open now.
  const noticeRound = useRef(0);
  // The notice version this Student has accepted: on the Profile with accounts
  // on, in this tab's session otherwise.
  const acceptedNotice = (): string | undefined =>
    accountsOn
      ? (queryClient.getQueryData<ProfileView>(PROFILE_KEY)?.aiNoticeVersion ??
        undefined)
      : readSession().noticeVersion;
  // The CV text every request carries.
  const cvText = accountsOn
    ? (exampleCv ?? profile.data?.cvText ?? "")
    : cv.draft;
  // With accounts on, submit needs the loaded Profile and a CV text: the
  // Profile's or the example's. Flag off: the form validates as before.
  const cvReady =
    !accountsOn || (profile.data !== undefined && cvText.trim() !== "");
  const loadFailed =
    accountsOn && profile.isError && profile.data === undefined;
  // An ended session is on its way to Logg inn (`callApi`): no failure to show.
  const profileEnded =
    profile.error instanceof ProfileRequestError &&
    profile.error.code === "SESSION_EXPIRED";
  const analysis = useMutation({
    mutationFn: (request: AnalyseRequest) =>
      callApi("/api/analyses", analyseResponseSchema, { body: request }),
  });
  // Phase 2: the Letter, the Gap analysis and the check of the Letter.
  const phaseTwo = usePhaseTwo({
    runMode,
    tone,
    openNotice: () => setNoticeOpen(true),
    // A silent rerun of phase 1 changed the result the page holds.
    onRerun: (result, job) =>
      setOutcome((held) => (held === null ? held : { ...held, result, job })),
    acceptedNotice,
  });
  // Nothing is written until what the tab held has been read back (AD-16).
  const [restored, setRestored] = useState(false);
  // The session ended and the Student logged in again: the Job ad the tab kept
  // is back, and this says so, once (FR-18, AD-16).
  const [adKept, setAdKept] = useState(false);
  const adKeptRead = useRef(false);

  useEffect(() => {
    const { inputs, restoredAfterExpiry } = readSession();
    if (!adKeptRead.current) {
      adKeptRead.current = true;
      if (restoredAfterExpiry?.soknad === true) {
        setAdKept((inputs.jobAd ?? "").trim() !== "");
        writeSession({
          restoredAfterExpiry: { ...restoredAfterExpiry, soknad: false },
        });
      }
    }
    setValues({
      jobTitle: inputs.jobTitle ?? "",
      employer: inputs.employer ?? "",
      jobAd: inputs.jobAd ?? "",
    });
    // With accounts on the CV is the Profile's; nothing of it is read back.
    if (!accountsOn) setCv(restoreCv(inputs));
    setTone(storedTone());
    setRestored(true);
  }, [accountsOn]);

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
    setErrors({});
    setAdUnclear(false);
    setFailed(false);
    setExampleRuns((count) => count + 1);
    if (accountsOn) {
      // The CV is a one-off override held in memory, never stored (Story 6.6).
      setExampleCv(draft);
      writeSession({ applicationId: null, inputs: filled });
    } else {
      setCv({ draft, confirmed: true });
      writeSession({
        applicationId: null,
        inputs: { ...filled, cvDraft: draft, cvText: draft },
      });
    }
    submitRef.current?.focus();
    announce("action", messages.application.exampleFilled);
  }

  function blur(field: JobField) {
    setError(field, inputErrors({ cvText, ...values })[field]);
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
    const found: Errors = inputErrors({ cvText, ...values });
    if (accountsOn) {
      // The CV is the Profile's, judged when it was saved; no CV at all keeps
      // the button unavailable. Nothing is confirmed here.
      delete found.cvText;
      if (!cvReady) return;
    } else {
      // The CV is also blocked while it is valid but not confirmed (FR-3).
      const cvCode = cvSubmitError(cv.draft, cv.confirmed);
      if (cvCode === undefined) delete found.cvText;
      else found.cvText = cvCode;
    }
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
      applicationId = newId();
      writeSession({ applicationId });
    }
    const request: AnalyseRequest = {
      applicationId,
      inputs: { cvText, ...values },
    };
    // Before anything can leave the app, the Student is asked once per browser
    // session (FR-24). Test mode never asks. Phase 1 waits for the answer.
    if (noticeRequired(runMode, acceptedNotice())) {
      pending.current = request;
      setNoticeOpen(true);
      return;
    }
    send(request);
  }

  function acceptNotice() {
    if (accountsOn) {
      void storeNoticeOnAccount();
      return;
    }
    writeSession({ noticeVersion: runMode.aiNotice.version });
    setNoticeOpen(false);
    resumeAfterNotice();
  }

  function resumeAfterNotice() {
    const request = pending.current;
    pending.current = null;
    if (request !== null) send(request);
    phaseTwo.resumeHeld();
  }

  // With accounts on the version is stored on the Profile first (Story 6.6): on
  // success the cache holds it and phase 1 starts; on failure the notice closes,
  // nothing is sent and the next submit asks again.
  async function storeNoticeOnAccount() {
    if (accepting.current) return;
    accepting.current = true;
    const round = noticeRound.current;
    let stored = false;
    let expired = false;
    try {
      const answer = await acceptOnAccount.mutateAsync(
        runMode.aiNotice.version,
      );
      stored = answer.ok;
      expired = !answer.ok && answer.error.code === "SESSION_EXPIRED";
    } catch {
      stored = false;
    } finally {
      if (round === noticeRound.current) accepting.current = false;
    }
    // Cancelled while the save was on its way: the Profile cache holds the
    // version (onSuccess), but nothing is resumed or shown.
    if (round !== noticeRound.current) return;
    setNoticeOpen(false);
    if (stored) {
      resumeAfterNotice();
      return;
    }
    // An ended session is on its way to Logg inn (`callApi`).
    pending.current = null;
    if (!expired) setFailed(true);
    phaseTwo.cancelHeld();
  }

  // «Avbryt» and Esc: the inputs stay, nothing is sent, and focus goes back to
  // the submit button once the dialog has closed.
  function cancelNotice() {
    noticeRound.current += 1;
    accepting.current = false;
    pending.current = null;
    setNoticeOpen(false);
    phaseTwo.cancelHeld();
  }

  // One request for phase 1: code only, so the result needs no AI (NFR-4).
  function send(plain: AnalyseRequest) {
    // The accepted notice goes with phase 1: with it, the Keywords of a new ad
    // may be proposed by AI (FR-5b). The server checks the version again.
    const request: AnalyseRequest = {
      ...plain,
      consent: consentFor(runMode, acceptedNotice()),
    };
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
  // one chosen at submit (the form is inert while the notice is open).
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
    phaseTwo.begin(job, answer.result);
  }

  function backToForm() {
    phaseTwo.reset();
    setFailed(false);
    setHeadingFocus((count) => count + 1);
    setOutcome(null);
  }

  if (outcome !== null) {
    return (
      <>
        <ResultView
          outcome={outcome}
          phaseTwo={phaseTwo}
          headingRef={headingRef}
          onBack={backToForm}
          name={accountsOn ? (profile.data?.name ?? null) : null}
        />
        <AiNotice
          open={noticeOpen}
          onAccept={acceptNotice}
          onCancel={cancelNotice}
          returnFocusRef={phaseTwo.letterHeadingRef}
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
        {adKept ? (
          <Notice label={messages.session.restoredLabel}>
            {messages.session.restoredAd}
          </Notice>
        ) : null}
        {failed ? <Alert>{messages.networkFailure}</Alert> : null}
        {accountsOn ? (
          <>
            {loadFailed && !profileEnded ? (
              <Alert>{messages.networkFailure}</Alert>
            ) : null}
            {exampleCv !== null ? (
              <CvDisclosure
                key={exampleRuns}
                source="example"
                text={exampleCv}
              />
            ) : profile.isPending ? (
              <div aria-busy="true">
                <SkeletonRows rows={3} />
              </div>
            ) : profile.data === undefined ? null : profile.data.cvText ===
              null ? (
              <NoCvNotice />
            ) : (
              <CvDisclosure
                source="profile"
                text={profile.data.cvText}
                savedAt={profile.data.cvSavedAt}
              />
            )}
          </>
        ) : (
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
        )}
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
          <Button
            ref={submitRef}
            type="submit"
            disabled={!cvReady}
            busy={analysis.isPending}
          >
            {messages.application.submit}
          </Button>
        </div>
        {analysis.isPending &&
        runMode.features.keywordFallback &&
        !runMode.testMode ? (
          <ProgressLine>{messages.application.keywordProgress}</ProgressLine>
        ) : null}
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
