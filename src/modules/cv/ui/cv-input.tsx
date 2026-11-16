"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { formatCount } from "@/shared/core/format-count";
import { announce } from "@/shared/ui/announce";
import { callApi } from "@/shared/ui/api-client";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { FilePicker } from "@/shared/ui/components/file-picker";
import { TextArea } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import {
  CV_FILE_EXTENSIONS,
  CV_MAX,
  type CvFileErrorCode,
  cvExtractResponseSchema,
  cvFileError,
} from "../contracts";

type CvInputProps = {
  draft: string;
  confirmed: boolean;
  // The error text for the field, already in bokmål.
  error: string | undefined;
  // Every call is an edit: the value changed.
  onChange: (value: string) => void;
  onBlur: () => void;
  // The text of an uploaded file: an edit like any other, so it is left
  // unconfirmed (FR-3).
  onExtracted: (text: string) => void;
  // Returns true when the text was confirmed, so the slot can collapse.
  onConfirm: () => boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

// What the file picker shows. It lives in this component only: the file name
// and the file are never stored (FR-23).
type PickerState = {
  file?: { name: string; size: number };
  extracting: boolean;
  // A wrong type or size, judged in the browser or by the server.
  fileError?: CvFileErrorCode;
  // The PDF held no text (a scan).
  scanned: boolean;
  // The request failed, so the file was not judged.
  failed: boolean;
};

const IDLE: PickerState = { extracting: false, scanned: false, failed: false };

// The server's answer for a wrong file names the field (FR-1).
function serverFileError(field: string | undefined) {
  if (field === "file.type") return "FILE_TYPE";
  if (field === "file.size") return "FILE_TOO_LARGE";
  return undefined;
}

// The before-S6 CV slot (UX-DR26): the file picker, the editable text with
// «Bekreft CV-teksten», collapsing to the confirmed line with a way back. The
// form owns the text, the confirmation and the session; this part owns the
// picker, what is open and where focus goes (UX-DR36).
export function CvInput({
  draft,
  confirmed,
  error,
  onChange,
  onBlur,
  onExtracted,
  onConfirm,
  inputRef,
}: CvInputProps) {
  const reopenRef = useRef<HTMLButtonElement>(null);
  // Reopening a confirmed text does not clear the confirmation; an edit does.
  const [reopened, setReopened] = useState(false);
  const [moveFocusTo, setMoveFocusTo] = useState<"field" | "reopen" | null>(
    null,
  );
  const [picker, setPicker] = useState<PickerState>(IDLE);
  // The newest choice wins: an answer to an older one is ignored.
  const latestChoice = useRef(0);
  const collapsed = confirmed && !reopened;

  async function choose(file: File) {
    const choice = ++latestChoice.current;
    const shown = { name: file.name, size: file.size };
    const wrong = cvFileError(file.name, file.size);
    if (wrong !== undefined) {
      setPicker({ ...IDLE, file: shown, fileError: wrong });
      return;
    }
    setPicker({ ...IDLE, file: shown, extracting: true });
    announce("action", messages.cv.file.extracting);

    const body = new FormData();
    body.set("file", file);
    const result = await callApi("/api/cv/extract", cvExtractResponseSchema, {
      body,
    });
    if (choice !== latestChoice.current) return;

    if (!result.ok) {
      const fileError =
        result.error.code === "INVALID_INPUT"
          ? serverFileError(result.error.field)
          : undefined;
      // Any other failure leaves the file unjudged; focus stays on the picker.
      setPicker(
        fileError === undefined
          ? { ...IDLE, file: shown, failed: true }
          : { ...IDLE, file: shown, fileError },
      );
      return;
    }
    if (result.data.noText) {
      setPicker({ ...IDLE, file: shown, scanned: true });
    } else {
      setPicker({ ...IDLE, file: shown });
      onExtracted(result.data.text);
    }
    setMoveFocusTo("field");
  }

  // The control that had focus is gone after a collapse or a reopen, so focus
  // is placed once the other control has rendered.
  useEffect(() => {
    if (moveFocusTo === "field") inputRef.current?.focus();
    if (moveFocusTo === "reopen") reopenRef.current?.focus();
    if (moveFocusTo !== null) setMoveFocusTo(null);
  }, [moveFocusTo, inputRef]);

  if (collapsed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-edge px-3.5 py-3">
        <p className="font-mono text-mono-meta text-ink">
          {messages.cv.confirmed(formatCount(draft.length))}
        </p>
        <Button
          ref={reopenRef}
          variant="secondary"
          small
          onClick={() => {
            setReopened(true);
            setMoveFocusTo("field");
          }}
        >
          {messages.cv.reopen}
        </Button>
      </div>
    );
  }

  const { file, extracting, fileError, scanned, failed } = picker;

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        label={
          scanned ? messages.cv.file.chooseAnother : messages.cv.file.choose
        }
        inputName={messages.cv.file.inputName}
        accept={CV_FILE_EXTENSIONS.join(",")}
        file={file}
        status={extracting ? messages.cv.file.extracting : undefined}
        error={fileError ? messages.cv.file.errors[fileError] : undefined}
        invalid={scanned}
        onChoose={choose}
      >
        {scanned ? (
          <Alert className="mt-2">{messages.cv.file.scanned}</Alert>
        ) : null}
        {failed ? (
          <Alert className="mt-2">{messages.networkFailure}</Alert>
        ) : null}
      </FilePicker>
      <TextArea
        ref={inputRef}
        label={messages.cv.label}
        hint={scanned ? messages.cv.pasteHint : undefined}
        counter={messages.counter(
          formatCount(draft.length),
          formatCount(CV_MAX),
        )}
        error={error}
        name="cvText"
        rows={14}
        autoComplete="off"
        className="font-mono text-mono-cv"
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <div>
        <Button
          variant="secondary"
          // Pressing the button must not blur the field first: its error would
          // clear, the button would move up, and the click would be lost.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (onConfirm()) {
              // The picker's state belongs to the text that was just settled.
              latestChoice.current++;
              setPicker(IDLE);
              setReopened(false);
              setMoveFocusTo("reopen");
            }
          }}
        >
          {messages.cv.confirm}
        </Button>
      </div>
    </div>
  );
}
