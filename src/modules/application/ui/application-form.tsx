"use client";

import {
  type FormEvent,
  type RefObject,
  useEffect,
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
import { formatCount } from "@/shared/core/format-count";
import { announce } from "@/shared/ui/announce";
import { readSession, writeSession } from "@/shared/ui/client-session";
import { Button } from "@/shared/ui/components/button";
import { TextArea, TextField } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import {
  type AnalysisInputs,
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
const EMPTY_CV: CvState = { draft: "", confirmed: false };

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

  function errorText(field: InputField): string | undefined {
    const code = errors[field];
    return code === undefined ? undefined : ERROR_TEXTS[code];
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
    // The id lives as long as the inputs do; a second submit reuses it. No
    // analysis request is sent yet.
    if (readSession().applicationId === undefined) {
      writeSession({ applicationId: crypto.randomUUID() });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <CvInput
        inputRef={cvRef}
        draft={cv.draft}
        confirmed={cv.confirmed}
        error={errorText("cvText")}
        onChange={changeCv}
        onBlur={blurCv}
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
        <Button type="submit">{messages.application.submit}</Button>
      </div>
    </form>
  );
}
