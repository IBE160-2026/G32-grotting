import { extractCvText } from "@/modules/cv";
import { CV_FILE_MAX_BYTES, cvFileError } from "@/modules/cv/contracts";
import { ApiError, handle } from "@/shared/server/handle";

// Answers per request: never prerendered at build.
export const dynamic = "force-dynamic";

// The multipart framing adds a little to the file itself.
const BODY_SLACK_BYTES = 64 * 1024;

const FIELD = { type: "file.type", size: "file.size" } as const;

// FR-1: extracts the text of one uploaded CV file in memory and returns
// `{ text, noText }`. The file is never written, logged or served back (FR-23).
// The browser has already judged type and size; they are judged again here.
export const POST = handle("/api/cv/extract", async (request) => {
  const declared = Number(request.headers.get("content-length"));
  if (declared > CV_FILE_MAX_BYTES + BODY_SLACK_BYTES) {
    throw new ApiError("INVALID_INPUT", { field: FIELD.size });
  }

  const form = await request.formData().catch(() => undefined);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    throw new ApiError("INVALID_INPUT", { field: "file" });
  }

  const wrong = cvFileError(file.name, file.size);
  if (wrong !== undefined) {
    throw new ApiError("INVALID_INPUT", {
      field: wrong === "FILE_TYPE" ? FIELD.type : FIELD.size,
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const wrongBytes = cvFileError(file.name, bytes.length);
  if (wrongBytes === "FILE_TOO_LARGE") {
    throw new ApiError("INVALID_INPUT", { field: FIELD.size });
  }

  const extracted = await extractCvText(file.name, bytes);
  if (!extracted.ok) throw new ApiError("INVALID_INPUT", { field: FIELD.type });
  return extracted.value;
});
