import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CV_FILE_MAX_BYTES } from "@/modules/cv/contracts";
import { POST } from "./route";

function fixture(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    readFileSync(
      fileURLToPath(
        new URL(`../../../../../e2e/files/${name}`, import.meta.url),
      ),
    ),
  );
}

function post(file: File | string | undefined, headers: HeadersInit = {}) {
  const body = new FormData();
  if (file !== undefined) body.set("file", file);
  return POST(
    new Request("http://localhost/api/cv/extract", {
      method: "POST",
      body,
      headers,
    }),
  );
}

async function invalid(response: Response, field: string) {
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    ok: false,
    error: { code: "INVALID_INPUT", field, retryable: false },
  });
}

describe("FR-1 POST /api/cv/extract", () => {
  it("returns the text of a PDF", async () => {
    const response = await post(
      new File([fixture("text-cv.pdf")], "text-cv.pdf"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.noText).toBe(false);
    expect(body.data.text).toContain("frontendutvikler med React");
  });

  it("returns a TXT with CRLF turned into LF", async () => {
    const response = await post(new File(["a\r\nb"], "cv.txt"));
    expect(await response.json()).toEqual({
      ok: true,
      data: { text: "a\nb", noText: false },
    });
  });

  it("returns noText for a PDF without text", async () => {
    const response = await post(
      new File([fixture("scanned.pdf")], "scanned.pdf"),
    );
    expect(await response.json()).toEqual({
      ok: true,
      data: { text: "", noText: true },
    });
  });

  it("rejects a wrong type as file.type", async () => {
    await invalid(
      await post(new File([fixture("cv.docx")], "cv.docx")),
      "file.type",
    );
  });

  it("rejects 2 MB and one byte as file.size", async () => {
    await invalid(
      await post(new File([new Uint8Array(CV_FILE_MAX_BYTES + 1)], "cv.txt")),
      "file.size",
    );
  });

  it("accepts exactly 2 MB", async () => {
    const response = await post(
      new File(["a".repeat(CV_FILE_MAX_BYTES)], "cv.txt"),
    );
    expect(response.status).toBe(200);
  });

  it("rejects a declared body above the limit plus 64 KB before reading it", async () => {
    await invalid(
      await post(new File(["a"], "cv.txt"), {
        "content-length": String(CV_FILE_MAX_BYTES + 64 * 1024 + 1),
      }),
      "file.size",
    );
  });

  it("rejects bytes that are not a PDF as file.type", async () => {
    await invalid(await post(new File(["not a pdf"], "cv.pdf")), "file.type");
  });

  it("rejects a missing file, a text field and a body that is not multipart", async () => {
    await invalid(await post(undefined), "file");
    await invalid(await post("cv.txt"), "file");
    const response = await POST(
      new Request("http://localhost/api/cv/extract", {
        method: "POST",
        body: "{}",
      }),
    );
    await invalid(response, "file");
  });
});
