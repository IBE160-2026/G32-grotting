"use client";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";

type DialogProps = {
  open: boolean;
  title: string;
  // Esc. The scrim does nothing: a modal native `<dialog>` closes only on a
  // close request (Esc) or when the owner sets `open` to false.
  onCancel: () => void;
  // Where focus goes once the dialog has closed.
  returnFocusRef?: RefObject<HTMLElement | null>;
  // The expiry warning is an `alertdialog`; the AI notice has no role of its own.
  role?: "alertdialog";
  // Where focus starts. By default the title, so the body is read before the
  // buttons; the expiry warning starts on its primary button.
  initialFocusRef?: RefObject<HTMLElement | null>;
  // Gets the id the body text must carry, so the dialog is described by it.
  children: (ids: { descriptionId: string }) => ReactNode;
};

// The one modal (UX-DR17, UX-DR38): a native `<dialog>` opened with
// `showModal()`, so the page behind is inert and focus stays inside. Focus
// starts on the title (`tabindex="-1"`), so the body is read before the
// buttons (or on `initialFocusRef`). The owner decides what closes it: it keeps
// `open` in its own state.
export function Dialog({
  open,
  title,
  onCancel,
  returnFocusRef,
  role,
  initialFocusRef,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Not the first render: a dialog that starts closed must not steal focus.
  const wasOpen = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    if (open) {
      if (!element.open) element.showModal();
      (initialFocusRef?.current ?? titleRef.current)?.focus();
      wasOpen.current = true;
      return;
    }
    if (element.open) element.close();
    if (wasOpen.current) {
      wasOpen.current = false;
      returnFocusRef?.current?.focus();
    }
  }, [open, returnFocusRef, initialFocusRef]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Esc equals the cancel button; the owner closes it.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // A second Esc without a click between can close the dialog natively
      // (the browser makes that `cancel` event not cancelable). The owner
      // still thinks it is open, so it is told to close it too.
      onClose={() => {
        if (open) onCancel();
      }}
      className="mx-auto mt-30 max-h-[calc(100dvh-8rem)] w-[calc(100%-2rem)] max-w-[35rem] overflow-y-auto border border-ink bg-ground p-8 text-ink shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop:bg-scrim/66 max-640:mt-6 max-640:max-h-[calc(100dvh-3rem)] max-640:p-5"
    >
      <h2
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="m-0 text-dialog-title text-ink"
      >
        {title}
      </h2>
      {children({ descriptionId })}
    </dialog>
  );
}
