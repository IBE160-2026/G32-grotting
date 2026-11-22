"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { callApi } from "@/shared/ui/api-client";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { Link } from "@/shared/ui/components/link";
import { PasswordToggle } from "@/shared/ui/components/password-toggle";
import { TextField } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import { useRunMode } from "@/shared/ui/run-mode";
import { registerResponseSchema, sessionViewSchema } from "../contracts";
import {
  checkAccessCode,
  checkName,
  checkNewEmail,
  checkNewPassword,
} from "./form-checks";
import { goTo, refuseField } from "./form-support";

type Field = "name" | "email" | "password" | "accessCode";
type Errors = Partial<Record<Field, string>>;

const CHECKS: Record<Field, (value: string) => string | undefined> = {
  name: checkName,
  email: checkNewEmail,
  password: checkNewPassword,
  accessCode: checkAccessCode,
};

// What a field the server refused says. The browser has judged the value
// already, so a refusal of the email means it is taken.
const SERVER_ERRORS: Record<Field, string> = {
  name: messages.register.errors.nameRequired,
  email: messages.register.errors.emailTaken,
  password: messages.register.errors.passwordShort,
  accessCode: messages.access.wrong,
};

const isField = (value: string | undefined): value is Field =>
  value === "name" ||
  value === "email" ||
  value === "password" ||
  value === "accessCode";

// Registrer deg (Story 6.4, FR-18, FR-31): Navn, E-post, Passord and, on the
// Hosted version only, the Access code. A successful registration logs the
// Student in (the register route does not) and goes to Profil.
export function RegisterForm() {
  const { hosted } = useRunMode();
  const ids = {
    name: useId(),
    email: useId(),
    password: useId(),
    accessCode: useId(),
  };
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    accessCode: useRef<HTMLInputElement>(null),
  };
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    password: "",
    accessCode: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [shown, setShown] = useState({ password: false, accessCode: false });
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  // The account exists but the login after it did not go through: a second
  // press logs in again, with the email and password that were registered,
  // instead of registering the same email twice.
  const registered = useRef<{ email: string; password: string } | null>(null);

  const fields: readonly Field[] = hosted
    ? ["name", "email", "password", "accessCode"]
    : ["name", "email", "password"];

  function change(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // An empty field waits for submit, so reaching for «Vis» first raises no
  // error; a refusal from the server stays until the text is edited.
  function blur(field: Field) {
    const message =
      values[field] === "" ? undefined : CHECKS[field](values[field]);
    if (message) setErrors((current) => ({ ...current, [field]: message }));
  }

  function refuse(field: Field, message: string) {
    setErrors((current) => ({ ...current, [field]: message }));
    refuseField(refs[field], message);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFailed(false);

    if (registered.current === null) {
      const found: Errors = {};
      for (const field of fields) found[field] = CHECKS[field](values[field]);
      setErrors(found);
      const first = fields.find((field) => found[field] !== undefined);
      if (first !== undefined) {
        refuseField(refs[first], found[first] ?? "");
        return;
      }
    }

    setBusy(true);
    if (registered.current === null) {
      const result = await callApi(
        "/api/auth/register",
        registerResponseSchema,
        {
          body: {
            name: values.name,
            email: values.email,
            password: values.password,
            ...(hosted ? { accessCode: values.accessCode } : {}),
          },
        },
      );
      if (!result.ok) {
        setBusy(false);
        const { code, field } = result.error;
        if (code === "INVALID_INPUT" && isField(field)) {
          refuse(field, SERVER_ERRORS[field]);
        } else {
          setFailed(true);
        }
        return;
      }
      registered.current = { email: values.email, password: values.password };
    }

    const login = await callApi("/api/auth/login", sessionViewSchema, {
      body: registered.current ?? {
        email: values.email,
        password: values.password,
      },
    });
    if (login.ok) {
      // Stays busy: the page is leaving.
      goTo("/profil");
      return;
    }
    setBusy(false);
    setFailed(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {failed ? <Alert>{messages.networkFailure}</Alert> : null}
      <TextField
        id={ids.name}
        ref={refs.name}
        label={messages.register.name}
        error={errors.name}
        name="name"
        type="text"
        autoComplete="name"
        value={values.name}
        onChange={(event) => change("name", event.target.value)}
        onBlur={() => blur("name")}
      />
      <TextField
        id={ids.email}
        ref={refs.email}
        label={messages.register.email}
        error={errors.email}
        name="email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(event) => change("email", event.target.value)}
        onBlur={() => blur("email")}
      />
      <TextField
        id={ids.password}
        ref={refs.password}
        label={messages.register.password}
        hint={messages.register.passwordHint}
        error={errors.password}
        name="password"
        type={shown.password ? "text" : "password"}
        autoComplete="new-password"
        value={values.password}
        onChange={(event) => change("password", event.target.value)}
        onBlur={() => blur("password")}
        after={
          <PasswordToggle
            shown={shown.password}
            controls={ids.password}
            onToggle={() =>
              setShown((current) => ({
                ...current,
                password: !current.password,
              }))
            }
          />
        }
      />
      {hosted ? (
        <TextField
          id={ids.accessCode}
          ref={refs.accessCode}
          label={messages.access.label}
          hint={messages.register.accessCodeHint}
          error={errors.accessCode}
          name="accessCode"
          type={shown.accessCode ? "text" : "password"}
          autoComplete="off"
          value={values.accessCode}
          onChange={(event) => change("accessCode", event.target.value)}
          onBlur={() => blur("accessCode")}
          after={
            <PasswordToggle
              shown={shown.accessCode}
              controls={ids.accessCode}
              onToggle={() =>
                setShown((current) => ({
                  ...current,
                  accessCode: !current.accessCode,
                }))
              }
            />
          }
        />
      ) : null}
      <p className="text-hint text-ink-2">{messages.register.trust}</p>
      <div>
        <Button
          type="submit"
          busy={busy}
          // Pressing the button must not blur the field first: its error
          // would show, the button would move down, and the click would be lost.
          onMouseDown={(event) => event.preventDefault()}
        >
          {messages.register.submit}
        </Button>
      </div>
      <p>
        <Link href="/logg-inn" kind="standalone">
          {messages.register.haveAccount}
        </Link>
      </p>
    </form>
  );
}
