"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import {
  ACCESS_CODE_MIN_LENGTH,
  accessResponseSchema,
} from "@/modules/identity/contracts";
import { announce } from "@/shared/ui/announce";
import { callApi } from "@/shared/ui/api-client";
import { Button } from "@/shared/ui/components/button";
import { PasswordToggle } from "@/shared/ui/components/password-toggle";
import { TextField } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";

export function AccessForm() {
  const fieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [shown, setShown] = useState(false);
  // Which field error shows: `short` is checked here before any request;
  // `refused` came back from the server and stays until the text is edited.
  const [errorKind, setErrorKind] = useState<"short" | "refused" | undefined>();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const error =
    errorKind === "short"
      ? messages.access.tooShort
      : errorKind === "refused"
        ? messages.access.wrong
        : undefined;

  function tooShort(value: string): boolean {
    return value.length < ACCESS_CODE_MIN_LENGTH;
  }

  // Focus alone says nothing when the field already has it, so the error is
  // also spoken through the live region (UX-DR19).
  function refuse(kind: "short" | "refused") {
    setErrorKind(kind);
    inputRef.current?.focus();
    announce(
      "action",
      kind === "short" ? messages.access.tooShort : messages.access.wrong,
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFailed(false);
    if (tooShort(code)) {
      refuse("short");
      return;
    }
    setErrorKind(undefined);

    setBusy(true);
    const result = await callApi("/api/access", accessResponseSchema, {
      body: { code },
    });
    if (result.ok) {
      // A full load, not the client router: it has cached the redirects that
      // the proxy gave to the prefetched links on this screen.
      window.location.replace("/");
      return;
    }
    setBusy(false);
    if (
      result.error.code === "INVALID_INPUT" &&
      result.error.field === "code"
    ) {
      refuse("refused");
      return;
    }
    // Network failure or any other fault: the code was not judged, so it is
    // not called wrong. The text stays and focus stays on «Åpne».
    setFailed(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {failed ? (
        <p
          role="alert"
          className="mb-6 flex items-baseline gap-2 border border-rust bg-alert-ground px-4 py-3 text-body text-ink"
        >
          <span className="code border border-rust px-1.5 text-rust">
            {messages.errorStrip}
          </span>
          {messages.networkFailure}
        </p>
      ) : null}
      <TextField
        id={fieldId}
        ref={inputRef}
        label={messages.access.label}
        hint={messages.access.hint}
        error={error}
        name="code"
        type={shown ? "text" : "password"}
        autoComplete="off"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setErrorKind((current) =>
            current === "refused" ? undefined : current,
          );
        }}
        onBlur={() => {
          // An empty field waits for submit, so reaching for «Vis» first
          // does not raise an error; a refused code stays until it is edited.
          setErrorKind((current) => {
            if (current === "refused") return current;
            return code !== "" && tooShort(code) ? "short" : undefined;
          });
        }}
        after={
          <PasswordToggle
            shown={shown}
            controls={fieldId}
            onToggle={() => setShown((value) => !value)}
          />
        }
      />
      <div className="mt-6">
        <Button type="submit" busy={busy}>
          {messages.access.submit}
        </Button>
      </div>
    </form>
  );
}
