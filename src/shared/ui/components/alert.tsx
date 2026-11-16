import type { ReactNode } from "react";
import { messages } from "../messages.nb";

// A rust-outlined box on the alert ground, with the «Feil» strip left of the
// message (UX-DR15). `role="alert"` makes it spoken when it appears, so show it
// by rendering it, not by revealing it.
export function Alert({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={[
        "flex items-baseline gap-2 border border-rust bg-alert-ground px-4 py-3 text-body text-ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="code border border-rust px-1.5 text-rust">
        {messages.errorStrip}
      </span>
      {children}
    </p>
  );
}
