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
import {
  type CvErrorCode,
  type CvState,
  cvLengthError,
  cvSubmitError,
  restoreCv,
} from "@/modules/cv/contracts";
import { CvInput } from "@/modules/cv/ui";
import { splitParagraphs } from "@/modules/keywords/core";
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
import {
  type AnalyseRequest,
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

// What the result view shows, kept as it was submitted: the form can change
// only after «Endre annonsen» has brought it back. Held in this component only,
// never stored (AD-8).
type Outcome = {
  readonly result: AnalysisResult;
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

export function ApplicationForm() {
  const cvRef = useRef<HTMLTextAreaElement>(null);
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Counts the times the form and the result have traded places; the new `h1`
  // takes focus once it is on the page (UX-DR19).
  const [headingFocus, setHeadingFocus] = useState(0);
  // A second submit while one runs does nothing, even before React has
  // rendered the busy button (NFR-5).
  const sending = useRef(false);
  const analysis = useMutation({
    mutationFn: (request: AnalyseRequest) =>
      callApi("/api/analyses", analyseResponseSchema, { body: request }),
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
    setRestored(true);
  }, []);

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
    send({ applicationId, inputs: { cvText: cv.draft, ...values } });
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
          show(answer.data.result, request.inputs);
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

  function show(result: AnalysisResult, inputs: AnalysisInputs) {
    setHeadingFocus((count) => count + 1);
    setOutcome({
      result,
      jobTitle: inputs.jobTitle,
      employer: inputs.employer,
      date: DATE.format(new Date()),
      adParagraphs: splitParagraphs(inputs.jobAd),
    });
    announce("phase", phaseOneLine(result));
  }

  function backToForm() {
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
        <div>
          <Button type="submit" busy={analysis.isPending}>
            {messages.application.submit}
          </Button>
        </div>
      </form>
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
