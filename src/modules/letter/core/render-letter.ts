import { SIGNATURE_TOKEN } from "../contracts";

// Shown in the Letter until the Student has a name to sign with.
export const NAME_PLACEHOLDER = "[Navnet ditt]";

/**
 * Puts the name in place of the sign-off token, for the screen, the copy and
 * the .docx. Replaces by split and join so `$` in a name stays as typed.
 */
export function renderLetter(text: string, name: string | null): string {
  const trimmed = name?.trim() ?? "";
  const signature = trimmed === "" ? NAME_PLACEHOLDER : trimmed;
  return text.split(SIGNATURE_TOKEN).join(signature);
}
