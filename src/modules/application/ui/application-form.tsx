"use client";

import {
  type FormEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { formatCount } from "@/shared/core/format-count";
import { announce } from "@/shared/ui/announce";
import { readSession, writeSession } from "@/shared/ui/client-session";
import { Button } from "@/shared/ui/components/button";
import { TextArea, TextField } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import {
  type AnalysisInputs,
  JOB_AD_MAX,
  type JobInputErrorCode,
  type JobInputField,
  jobInputErrors,
  normaliseNewlines,
} from "../contracts";

type Errors = Partial<Record<JobInputField, JobInputErrorCode>>;

const EMPTY: AnalysisInputs = { jobTitle: "", employer: "", jobAd: "" };

// The order the fields sit in, which is also the order focus goes to the first
// error (EXPERIENCE.md, focus order).
const FIELD_ORDER: readonly JobInputField[] = ["jobTitle", "employer", "jobAd"];

export function ApplicationForm() {
  const jobTitleRef = useRef<HTMLInputElement>(null);
  const employerRef = useRef<HTMLInputElement>(null);
  const jobAdRef = useRef<HTMLTextAreaElement>(null);
  const [values, setValues] = useState<AnalysisInputs>(EMPTY);
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
    setRestored(true);
  }, []);

  const refs: Record<
    JobInputField,
    RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  > = { jobTitle: jobTitleRef, employer: employerRef, jobAd: jobAdRef };

  function errorText(field: JobInputField): string | undefined {
    const code = errors[field];
    return code === undefined ? undefined : messages.application.errors[code];
  }

  // An edit changes the inputs, so the id made for the old ones goes (AD-8).
  function change(field: JobInputField, raw: string) {
    const value = normaliseNewlines(raw);
    setValues((current) => ({ ...current, [field]: value }));
    if (restored) {
      writeSession({ applicationId: null, inputs: { [field]: value } });
    }
  }

  function blur(field: JobInputField) {
    const code = jobInputErrors(values)[field];
    setErrors((current) => {
      const next = { ...current };
      if (code === undefined) delete next[field];
      else next[field] = code;
      return next;
    });
    if (field === "jobAd") {
      announce(
        "action",
        messages.application.counter(
          formatCount(values.jobAd.length),
          formatCount(JOB_AD_MAX),
        ),
      );
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = jobInputErrors(values);
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field] !== undefined);
    if (first !== undefined) {
      refs[first].current?.focus();
      // Focus alone says nothing when the field already has it (UX-DR19).
      const code = found[first];
      if (code !== undefined) {
        announce("action", messages.application.errors[code]);
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
        counter={messages.application.counter(
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
