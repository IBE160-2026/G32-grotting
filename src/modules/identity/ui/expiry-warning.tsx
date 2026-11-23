"use client";

import type { RefObject } from "react";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { Dialog } from "@/shared/ui/components/dialog";
import { messages } from "@/shared/ui/messages.nb";

type ExpiryWarningProps = {
  open: boolean;
  // A request the Student started from the warning is under way.
  busy: "continue" | "logout" | null;
  // That request got no answer; the dialog stays so the Student can try again.
  failed: boolean;
  // «Fortsett økten» and Esc (a key press is activity).
  onContinue: () => void;
  onLogOut: () => void;
  // Where focus was when the warning opened.
  returnFocusRef: RefObject<HTMLElement | null>;
  // The primary button, where focus starts.
  continueRef: RefObject<HTMLButtonElement | null>;
};

// The session-expiry warning (Story 6.5, UX-DR17, WCAG 2.2.1): an
// `alertdialog` on the shared dialog, opened two minutes before the session
// ends. Focus starts on «Fortsett økten» and returns to where it was.
export function ExpiryWarning({
  open,
  busy,
  failed,
  onContinue,
  onLogOut,
  returnFocusRef,
  continueRef,
}: ExpiryWarningProps) {
  const text = messages.session.warning;
  return (
    <Dialog
      open={open}
      role="alertdialog"
      title={text.title}
      onCancel={onContinue}
      returnFocusRef={returnFocusRef}
      initialFocusRef={continueRef}
    >
      {({ descriptionId }) => (
        <>
          <p id={descriptionId} className="mt-4 mb-0 text-body text-ink">
            {text.body}
          </p>
          {failed ? (
            <div className="mt-5">
              <Alert>{messages.networkFailure}</Alert>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              ref={continueRef}
              busy={busy === "continue"}
              onClick={onContinue}
            >
              {text.continue}
            </Button>
            <Button
              variant="secondary"
              busy={busy === "logout"}
              onClick={onLogOut}
            >
              {text.logOut}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
