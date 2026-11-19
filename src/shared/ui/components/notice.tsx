import type { ReactNode } from "react";
import { CodeStrip } from "./code-strip";

// A non-error section state: «Dagens grense», «Testmodus» (UX-DR15). Never
// `role="alert"`: nothing has gone wrong, a limit or a mode applies.
export function Notice({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border border-edge px-4 py-3 text-body text-ink">
      <CodeStrip kind="outline">{label}</CodeStrip>
      <p className="m-0">{children}</p>
    </div>
  );
}
