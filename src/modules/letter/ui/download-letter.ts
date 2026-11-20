import { letterFileName } from "../core/file-name";

/**
 * Builds the .docx and hands it to the browser as a download under the Letter's
 * file name (FR-12). The `docx` package is loaded here, on the first press, so
 * it is not part of the page the Student first sees.
 */
export async function downloadLetter(
  text: string,
  employer: string,
  year: number = new Date().getFullYear(),
): Promise<void> {
  const { buildLetterDocx } = await import("./build-docx");
  const blob = await buildLetterDocx(text);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = letterFileName({ employer, year }, null);
  document.body.append(link);
  link.click();
  link.remove();
  // The click has started the save; the address can go a moment later.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
