import { type ComponentProps, type ReactNode, useId } from "react";
import { messages } from "../messages.nb";

type TextFieldProps = Omit<
  ComponentProps<"input">,
  "aria-invalid" | "aria-describedby"
> & {
  label: string;
  hint?: string;
  // The field's error text. Validation runs on blur and on submit, never per
  // keystroke, and an error never clears the input (UX-DR9, NFR-5).
  error?: string;
  // Sits right of the field, outside the well (the password toggle).
  after?: ReactNode;
};

export function TextField({
  label,
  hint,
  error,
  after,
  className,
  id: givenId,
  ...input
}: TextFieldProps) {
  const generatedId = useId();
  const id = givenId ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-label text-ink">
        {label}
      </label>
      <div className="flex items-start gap-3">
        <input
          {...input}
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={[
            "min-h-control-height w-full min-w-0 border bg-field px-3.5 py-3 text-body text-ink placeholder:text-placeholder",
            error
              ? "border-rust"
              : "border-edge hover:border-edge-hover focus:border-ink",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        {after}
      </div>
      {hint ? (
        <p id={hintId} className="mt-2 text-hint text-ink-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="mt-2 flex items-baseline gap-2 text-hint text-ink"
        >
          <span className="code border border-rust px-1.5 text-rust">
            {messages.errorStrip}
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
