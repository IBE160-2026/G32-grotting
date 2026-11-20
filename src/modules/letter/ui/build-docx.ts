import { Document, Packer, Paragraph, TextRun } from "docx";
import { renderLetter } from "../core/render-letter";

// A blank line between paragraphs of the Letter, as the screen shows it.
const PARAGRAPH_GAP_TWIPS = 240;

// The rendered Letter as paragraphs; a line break inside one stays a break.
export function letterParagraphs(text: string): string[] {
  return renderLetter(text, null)
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "");
}

/**
 * The Letter as a Word file (FR-12, AD-7), built in the browser from what the
 * screen and the copy show: the sign-off is the placeholder, since there is no
 * name before accounts. Plain paragraphs only, so Word and others open it as a
 * blank document the Student edits.
 */
export async function buildLetterDocx(text: string): Promise<Blob> {
  const document = new Document({
    creator: "JobAssistant",
    title: "Søknadsbrev",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, language: { value: "nb-NO" } },
        },
      },
    },
    sections: [
      {
        children: letterParagraphs(text).map(
          (paragraph) =>
            new Paragraph({
              spacing: { after: PARAGRAPH_GAP_TWIPS },
              children: paragraph.split("\n").map(
                (line, index) =>
                  new TextRun({
                    text: line,
                    break: index === 0 ? undefined : 1,
                  }),
              ),
            }),
        ),
      },
    ],
  });
  return Packer.toBlob(document);
}
