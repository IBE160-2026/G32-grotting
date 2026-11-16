import { extractText, getDocumentProxy } from "unpdf";
import { err, ok, type Result } from "@/shared/core/result";
import { type CvExtractResponse, cvFileKind } from "../contracts";

// A PDF starts with this; anything else is not one, whatever its name says.
const PDF_MAGIC = "%PDF-";

function startsWithPdfMagic(bytes: Uint8Array): boolean {
  return PDF_MAGIC.split("").every(
    (char, i) => bytes[i] === char.charCodeAt(0),
  );
}

async function pdfText(bytes: Uint8Array): Promise<string | undefined> {
  if (!startsWithPdfMagic(bytes)) return undefined;
  try {
    // unpdf takes over the buffer, so it gets a copy.
    const document = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(document, { mergePages: true });
    return text;
  } catch {
    return undefined;
  }
}

function txtText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
}

// Extracts the text of an uploaded CV file in memory (FR-1). Nothing is written
// anywhere and nothing from the file is logged (FR-23). The type is judged by
// the extension; a PDF that cannot be opened is FILE_TYPE too. `noText` is true
// when the file holds nothing but whitespace, and `text` is then empty.
export async function extractCvText(
  name: string,
  bytes: Uint8Array,
): Promise<Result<CvExtractResponse, "FILE_TYPE">> {
  const kind = cvFileKind(name);
  if (kind === undefined) return err("FILE_TYPE");
  const raw = kind === "pdf" ? await pdfText(bytes) : txtText(bytes);
  if (raw === undefined) return err("FILE_TYPE");
  const text = raw.replace(/\r\n?/g, "\n");
  return text.trim() === ""
    ? ok({ text: "", noText: true })
    : ok({ text, noText: false });
}
