import { type ComponentProps, type ReactNode, useId } from "react";
import { messages } from "../messages.nb";

type FieldProps = {
  label: string;
  hint?: string;
  // The field's error text. Validation runs on blur and on submit, never per
  // keystroke, and an error never clears the input (UX-DR9, NFR-5).
  error?: string;
};

type TextFieldProps = Omit<
  ComponentProps<"input">,
  "aria-invalid" | "aria-describedby"
> &
  FieldProps & {
    // Sits right of the field, outside the well (the password toggle).
    after?: ReactNode;
  };

type TextAreaProps = Omit<
  ComponentProps<"textarea">,
  "aria-invalid" | "aria-describedby"
> &
  FieldProps & {
    // «612 av 20 000 tegn», shown under the hint. It is announced on blur by
    // the form, so it is not part of the field's description.
    counter?: string;
  };

const WELL =
  "min-h-control-height w-full min-w-0 border bg-field px-3.5 py-3 text-body text-ink placeholder:text-placeholder";

function wellStyle(error: string | undefined, className: string | undefined) {
  return [
    WELL,
    error
      ? "border-rust"
      : "border-edge hover:border-edge-hover focus:border-ink",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

// The label, hint and error that every text control shares, with the ids that
// tie them to the control.
function Field({
  id: givenId,
  label,
  hint,
  error,
  counter,
  control,
}: FieldProps & {
  id?: string;
  counter?: string;
  control: (props: {
    id: string;
    "aria-invalid": "true" | undefined;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}) {
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
      {control({
        id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": describedBy,
      })}
      {hint ? (
        <p id={hintId} className="mt-2 text-hint text-ink-2">
          {hint}
        </p>
      ) : null}
      {counter ? (
        <p className="mt-1 font-mono text-mono-meta text-ink-2">{counter}</p>
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

export function TextField({
  label,
  hint,
  error,
  after,
  className,
  id,
  ...input
}: TextFieldProps) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      control={(aria) => (
        <div className="flex items-start gap-3">
          <input {...input} {...aria} className={wellStyle(error, className)} />
          {after}
        </div>
      )}
    />
  );
}

export function TextArea({
  label,
  hint,
  error,
  counter,
  className,
  id,
  ...textarea
}: TextAreaProps) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      counter={counter}
      control={(aria) => (
        <textarea
          {...textarea}
          {...aria}
          className={wellStyle(error, className)}
        />
      )}
    />
  );
}
