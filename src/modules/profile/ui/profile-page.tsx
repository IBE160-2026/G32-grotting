"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { cvLengthError } from "@/modules/cv/contracts";
import { CvInput } from "@/modules/cv/ui";
import { announce } from "@/shared/ui/announce";
import { callApi } from "@/shared/ui/api-client";
import { readSession, writeSession } from "@/shared/ui/client-session";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { CatalogueHeading } from "@/shared/ui/components/catalogue-heading";
import { Notice } from "@/shared/ui/components/notice";
import { SkeletonRows } from "@/shared/ui/components/skeleton-rows";
import { messages } from "@/shared/ui/messages.nb";
import { profileViewSchema } from "../contracts";
import { PROFILE_KEY, ProfileRequestError, useProfile } from "./use-profile";

const HINT_ID = "profile-save-hint";

// Windows line endings become LF where text enters the field, as on Søknad.
function normalise(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

// Profil (Story 6.3): the CV the Student keeps, saved by its own button. The
// name is read-only and appears only in the heading.
export function ProfilePage() {
  const queryClient = useQueryClient();
  const cvRef = useRef<HTMLTextAreaElement>(null);
  // `null` shows the saved text; an edit or an upload makes it a draft.
  const [draft, setDraft] = useState<string | null>(null);
  const [lengthError, setLengthError] = useState(false);
  const [saved, setSaved] = useState(false);
  // The session ended with text that was not saved, and the Student logged in
  // again: the draft is back, and this says so (FR-18, AD-16).
  const [draftKept, setDraftKept] = useState(false);
  const draftKeptRead = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Counts the edits, so a save that was sent before the latest edit does not
  // overwrite the newer text or claim it was saved.
  const edits = useRef(0);

  const profile = useProfile();
  const save = useMutation({
    mutationFn: (cvText: string) =>
      callApi("/api/profile", profileViewSchema, {
        method: "PUT",
        body: { cvText },
      }),
  });

  // Once, when the saved text is known: a draft the tab kept across an ended
  // session replaces it, unless it is the saved text itself.
  useEffect(() => {
    if (draftKeptRead.current || profile.data === undefined) return;
    draftKeptRead.current = true;
    const { inputs, restoredAfterExpiry } = readSession();
    if (restoredAfterExpiry?.profil !== true) return;
    writeSession({
      restoredAfterExpiry: { ...restoredAfterExpiry, profil: false },
    });
    const kept = inputs.cvDraft;
    if (
      kept !== undefined &&
      kept.trim() !== "" &&
      kept !== (profile.data.cvText ?? "")
    ) {
      setDraft(kept);
      setDraftKept(true);
    }
  }, [profile.data]);

  const text = draft ?? profile.data?.cvText ?? "";
  const empty = text.trim() === "";

  function edit(raw: string) {
    edits.current++;
    const next = normalise(raw);
    setDraft(next);
    // The draft follows the field, so an ended session cannot take it (AD-16).
    writeSession({ inputs: { cvDraft: next } });
    setSaved(false);
    setSaveFailed(false);
  }

  // The text of an uploaded file replaces the field as an edit; its length is
  // judged at once. Nothing is saved until «Lagre».
  function extracted(fileText: string) {
    edit(fileText);
    setLengthError(cvLengthError(normalise(fileText)) !== undefined);
  }

  // Leaving the field judges a text that is there; an empty field has no error.
  function blur() {
    setLengthError(!empty && cvLengthError(text) !== undefined);
  }

  function refuseLength() {
    setLengthError(true);
    cvRef.current?.focus();
    announce("action", messages.cv.errors.CV_LENGTH);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (empty || save.isPending) return;
    if (cvLengthError(text) !== undefined) {
      refuseLength();
      return;
    }
    setSaveFailed(false);
    const sentAt = edits.current;
    save.mutate(text, {
      onSuccess: (answer) => {
        if (answer.ok) {
          // The text was stored either way; only an unchanged field is "saved".
          queryClient.setQueryData(PROFILE_KEY, answer.data);
          if (edits.current !== sentAt) return;
          setDraft(null);
          setDraftKept(false);
          // Saved: no draft left to keep (AD-16).
          writeSession({ inputs: { cvDraft: undefined } });
          setLengthError(false);
          setSaved(true);
          announce("action", messages.profile.saved);
          return;
        }
        const { code, field } = answer.error;
        // An ended session is handled by `callApi`: the draft is kept and the
        // page goes to Logg inn.
        if (code === "SESSION_EXPIRED") return;
        if (code === "INVALID_INPUT" && field === "cvText") refuseLength();
        else setSaveFailed(true);
      },
      onError: () => setSaveFailed(true),
    });
  }

  // A failed refetch must not replace a form that already has its data.
  const loadFailed = profile.isError && profile.data === undefined;
  // An ended session is on its way to Logg inn (`callApi`): no failure to show.
  const ended =
    profile.isError &&
    profile.error instanceof ProfileRequestError &&
    profile.error.code === "SESSION_EXPIRED";

  return (
    <div>
      <CatalogueHeading lead={messages.profile.headingLead}>
        {profile.data?.name}
      </CatalogueHeading>
      {loadFailed ? (
        <div className="mt-8">
          {ended ? null : <Alert>{messages.networkFailure}</Alert>}
        </div>
      ) : (
        <div
          aria-busy={profile.isPending ? "true" : undefined}
          className="mt-8"
        >
          {profile.isPending ? (
            <SkeletonRows rows={8} />
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-6"
            >
              {draftKept ? (
                <Notice label={messages.session.restoredLabel}>
                  {messages.profile.restored}
                </Notice>
              ) : null}
              {saveFailed ? <Alert>{messages.networkFailure}</Alert> : null}
              <CvInput
                mode="save"
                inputRef={cvRef}
                draft={text}
                error={lengthError ? messages.cv.errors.CV_LENGTH : undefined}
                placeholder={messages.profile.placeholder}
                hint={messages.profile.cvHint}
                pickerHint={messages.profile.pickerHint}
                onChange={edit}
                onBlur={blur}
                onExtracted={extracted}
                after={
                  <div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <Button
                        type="submit"
                        disabled={empty}
                        busy={save.isPending}
                        aria-describedby={empty ? HINT_ID : undefined}
                        // Pressing the button must not blur the field first:
                        // its error would show, the button would move down, and
                        // the click would be lost.
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        {messages.profile.save}
                      </Button>
                      {saved ? (
                        <p className="font-mono text-mono-meta text-ink">
                          {messages.profile.saved}
                        </p>
                      ) : null}
                    </div>
                    {empty ? (
                      <p id={HINT_ID} className="mt-2 text-hint text-ink-2">
                        {messages.profile.saveHint}
                      </p>
                    ) : null}
                  </div>
                }
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
}
