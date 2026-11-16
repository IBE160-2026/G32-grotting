import { type ChangeEvent, type ReactNode, useId } from "react";
import { formatCount, kilobytes } from "@/shared/core/format-count";
import { messages } from "../messages.nb";
import { buttonClasses } from "./button";

type FilePickerProps = {
  // The visible button text, which is the label of the hidden input.
  label: string;
  // The accessible name of the input (it is not visible text).
  inputName: string;
  // The `accept` list of the native input, e.g. ".pdf,.txt".
  accept: string;
  // The chosen file, shown in mono beside the button. Never stored.
  file?: { name: string; size: number } | undefined;
  // A line under the file name, e.g. while text is extracted.
  status?: string | undefined;
  // The error under the picker (type or size), already in bokmål.
  error?: string | undefined;
  // The border is rust without an error text of its own (a scanned PDF).
  invalid?: boolean;
  onChoose: (file: File) => void;
  // An alert that sits directly below the picker.
  children?: ReactNode;
};

const UPLOAD_ICON = (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="square"
  >
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </svg>
);

// The file picker (UX-DR11): one tab stop, the native file input, visually
// hidden but not `display:none`, and the visible text as its <label> styled as
// a secondary button. The amber ring is drawn on the label while the input has
// keyboard focus. Choosing reports the file and resets the input, so the same
// file can be chosen again.
export function FilePicker({
  label,
  inputName,
  accept,
  file,
  status,
  error,
  invalid = false,
  onChoose,
  children,
}: FilePickerProps) {
  const errorId = `${useId()}-error`;

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (chosen) onChoose(chosen);
  }

  const rust = invalid || error !== undefined;

  return (
    <div>
      <div
        className={[
          "flex flex-wrap items-center gap-x-4 gap-y-3 border p-[18px]",
          rust ? "border-rust" : "border-edge",
        ].join(" ")}
      >
        <label
          className={buttonClasses("secondary", {
            className:
              "relative cursor-pointer has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-amber",
          })}
        >
          {UPLOAD_ICON}
          {label}
          <input
            type="file"
            accept={accept}
            aria-label={inputName}
            aria-invalid={error === undefined ? undefined : "true"}
            aria-describedby={error === undefined ? undefined : errorId}
            className="sr-only"
            onChange={onChange}
          />
        </label>
        {file ? (
          <div className="min-w-0 font-mono text-mono-meta text-ink [overflow-wrap:anywhere]">
            <p>
              {file.name} ·{" "}
              {messages.fileSize(formatCount(kilobytes(file.size)))}
            </p>
            {status ? <p className="text-ink-2">{status}</p> : null}
          </div>
        ) : null}
      </div>
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
      {children}
    </div>
  );
}
