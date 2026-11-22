import { PROFILE_NAME_MAX } from "@/modules/profile/contracts";
import { messages } from "@/shared/ui/messages.nb";
import {
  ACCESS_CODE_MIN_LENGTH,
  emailSchema,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "../contracts";

// What the browser checks before a request, so a plain slip never costs a round
// trip (UX-DR9). Each returns the field's error text, or undefined when the
// value is acceptable. The server checks the same again; these only mirror it.
// The server's own wording for a field it refused is mapped in the forms.

export function checkName(value: string): string | undefined {
  const name = value.trim();
  if (name === "") return messages.register.errors.nameRequired;
  if (name.length > PROFILE_NAME_MAX) {
    return messages.register.errors.nameTooLong;
  }
  return undefined;
}

export function checkNewEmail(value: string): string | undefined {
  if (value.trim() === "") return messages.register.errors.emailRequired;
  return emailSchema.safeParse(value).success
    ? undefined
    : messages.register.errors.emailInvalid;
}

export function checkNewPassword(value: string): string | undefined {
  if (value.length > PASSWORD_MAX) return messages.register.errors.passwordLong;
  return value.length < PASSWORD_MIN
    ? messages.register.errors.passwordShort
    : undefined;
}

export function checkAccessCode(value: string): string | undefined {
  return value.length < ACCESS_CODE_MIN_LENGTH
    ? messages.access.tooShort
    : undefined;
}

// Logg inn judges nothing but emptiness: an address that is not an address
// fails like an unknown one, and the answer never says which part was wrong.
export function checkLoginEmail(value: string): string | undefined {
  return value.trim() === "" ? messages.login.errors.emailRequired : undefined;
}

export function checkLoginPassword(value: string): string | undefined {
  return value === "" ? messages.login.errors.passwordRequired : undefined;
}
