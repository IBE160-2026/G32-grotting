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

export type LazyCopyOutcome = "copied" | "blocked" | "unavailable";

type ClipboardWithItems = Pick<Clipboard, "writeText"> &
  Partial<Pick<Clipboard, "write">>;

/**
 * Puts a text on the clipboard that is fetched first (a Historikk row, whose
 * Letter is not on the page until asked for). Safari and iOS only let the
 * write start inside the press, so where `ClipboardItem` exists the promised
 * text is handed to it at once and the browser waits for it; elsewhere the text
 * is awaited and written as usual. `unavailable` means the fetch gave no text
 * (null or an error), `blocked` that the clipboard refused it.
 */
export async function writeLazyToClipboard(
  fetchText: () => Promise<string | null>,
  clipboard: ClipboardWithItems | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.clipboard,
  Item: typeof ClipboardItem | undefined = typeof ClipboardItem === "undefined"
    ? undefined
    : ClipboardItem,
): Promise<LazyCopyOutcome> {
  const pending = fetchText().catch(() => null);
  if (clipboard !== undefined && Item !== undefined && clipboard.write) {
    let missing = false;
    const blob = pending.then((text) => {
      if (text === null) {
        missing = true;
        throw new Error("no text");
      }
      return new Blob([text], { type: "text/plain" });
    });
    try {
      await clipboard.write([new Item({ "text/plain": blob })]);
      return "copied";
    } catch {
      if (missing) return "unavailable";
      // The browser refused the item: try the plain text write below.
    }
  }
  const text = await pending;
  if (text === null) return "unavailable";
  return (await writeToClipboard(text, clipboard)) ? "copied" : "blocked";
}
