"use client";

import { type FormEvent, useId, useRef, useState } from "react";
import { callApi } from "@/shared/ui/api-client";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { Link } from "@/shared/ui/components/link";
import { PasswordToggle } from "@/shared/ui/components/password-toggle";
import { TextField } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import { sessionViewSchema } from "../contracts";
import { checkLoginEmail, checkLoginPassword } from "./form-checks";
import { goTo, refuseField } from "./form-support";

type Errors = { email?: string; password?: string };

// Logg inn (Story 6.4, FR-18): E-post and Passord; success lands on Søknad. A
// wrong email or password is one error on the password field that does not say
// which part was wrong; the email and the password stay as typed (NFR-5).
export function LoginForm() {
  const emailId = useId();
  const passwordId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [shown, setShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Editing either part drops the credentials error, which belongs to both.
  function editEmail(value: string) {
    setEmail(value);
    setErrors({});
  }
  function editPassword(value: string) {
    setPassword(value);
    setErrors({});
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFailed(false);
    const found: Errors = {
      email: checkLoginEmail(email),
      password: checkLoginPassword(password),
    };
    setErrors(found);
    if (found.email !== undefined) {
      refuseField(emailRef, found.email);
      return;
    }
    if (found.password !== undefined) {
      refuseField(passwordRef, found.password);
      return;
    }

    setBusy(true);
    const result = await callApi("/api/auth/login", sessionViewSchema, {
      body: { email, password },
    });
    if (result.ok) {
      // Stays busy: the page is leaving.
      goTo("/soknad");
      return;
    }
    setBusy(false);
    const { code } = result.error;
    if (code === "INVALID_INPUT") {
      // Any refusal of the pair, a too-long email or password included, is one
      // text on the password field that does not say which part was wrong.
      setErrors({ password: messages.login.errors.credentials });
      refuseField(passwordRef, messages.login.errors.credentials);
      return;
    }
    setFailed(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {failed ? <Alert>{messages.networkFailure}</Alert> : null}
      <TextField
        id={emailId}
        ref={emailRef}
        label={messages.login.email}
        error={errors.email}
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => editEmail(event.target.value)}
      />
      <TextField
        id={passwordId}
        ref={passwordRef}
        label={messages.login.password}
        error={errors.password}
        name="password"
        type={shown ? "text" : "password"}
        autoComplete="current-password"
        value={password}
        onChange={(event) => editPassword(event.target.value)}
        after={
          <PasswordToggle
            shown={shown}
            controls={passwordId}
            onToggle={() => setShown((value) => !value)}
          />
        }
      />
      <div>
        <Button type="submit" busy={busy}>
          {messages.login.submit}
        </Button>
      </div>
      <p>
        <Link href="/registrer" kind="standalone">
          {messages.login.noAccount}
        </Link>
      </p>
    </form>
  );
}
