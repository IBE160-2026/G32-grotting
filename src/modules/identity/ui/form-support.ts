import type { RefObject } from "react";
import { announce } from "@/shared/ui/announce";

// Moves focus to the field that has the error and says the error aloud: focus
// alone says nothing when the field already has it, and the error text is not
// in the field's description until the next render (UX-DR19, Form errors).
export function refuseField(
  input: RefObject<HTMLInputElement | null>,
  message: string,
): void {
  input.current?.focus();
  announce("action", message);
}

// What a successful sign-up or sign-in ends with is a full page load, not the
// client router: the app bar, the Hjem button and every query cache then start
// from the new session (as the Access-code screen does).
export function goTo(path: string): void {
  window.location.replace(path);
}
