import type { ReactNode } from "react";
import { messages } from "../messages.nb";

// A rust-outlined box on the alert ground, with the «Feil» strip left of the
// message (UX-DR15). `role="alert"` makes it spoken when it appears, so show it
// by rendering it, not by revealing it. `silent` leaves the role out when a
// live region speaks the same failure, so it is heard once (UX-DR39).
export function Alert({
  children,
  className,
  silent = false,
}: {
  children: ReactNode;
  className?: string;
  silent?: boolean;
}) {
  return (
    <p
      role={silent ? undefined : "alert"}
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
