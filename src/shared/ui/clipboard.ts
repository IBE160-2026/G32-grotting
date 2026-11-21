// How long the copy button reads «Kopiert» (UX-DR13).
export const COPIED_MS = 1800;

type ClipboardWriter = Pick<Clipboard, "writeText">;

/**
 * Puts plain text on the clipboard. `false` means it did not work: no
 * clipboard (an insecure page, an old browser) or a refusal (permission,
 * missing user gesture), so the caller falls back to selecting the text.
 */
export async function writeToClipboard(
  text: string,
  clipboard: ClipboardWriter | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.clipboard,
): Promise<boolean> {
  if (clipboard === undefined || typeof clipboard.writeText !== "function") {
    return false;
  }
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Selects what an element shows, so Ctrl+C or a long press copies it when the
 * clipboard is blocked (the Letter, a suggestion).
 */
export function selectContents(element: HTMLElement | null): void {
  if (element === null) return;
  const selection = window.getSelection();
  if (selection === null) return;
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.addRange(range);
}
