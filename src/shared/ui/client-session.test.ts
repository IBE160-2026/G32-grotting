import { describe, expect, it } from "vitest";
import {
  readSession,
  SESSION_KEY,
  type SessionStorage,
  writeSession,
} from "./client-session";

function memoryStorage(initial?: string): SessionStorage & {
  dump(): string | null;
} {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    dump: () => value,
  };
}

describe("NFR-5, AD-16 client session", () => {
  it("reads an empty session when nothing is stored", () => {
    expect(readSession(memoryStorage())).toEqual({ v: 1, inputs: {} });
  });

  it("reads an empty session from corrupt or foreign data", () => {
    for (const raw of [
      "{not json",
      JSON.stringify({ v: 2, inputs: {} }),
      JSON.stringify({ v: 1, inputs: { jobAd: 5 } }),
    ]) {
      expect(readSession(memoryStorage(raw))).toEqual({ v: 1, inputs: {} });
    }
  });

  it("reads an empty session and writes nothing when storage is blocked", () => {
    const blocked: SessionStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readSession(blocked)).toEqual({ v: 1, inputs: {} });
    expect(() =>
      writeSession({ inputs: { jobAd: "x" } }, blocked),
    ).not.toThrow();
  });

  it("merges input fields and keeps the others", () => {
    const storage = memoryStorage();
    writeSession({ inputs: { jobTitle: "Utvikler" } }, storage);
    writeSession({ inputs: { employer: "Nordic Digital" } }, storage);
    expect(readSession(storage).inputs).toEqual({
      jobTitle: "Utvikler",
      employer: "Nordic Digital",
    });
  });

  it("keeps keys it does not know", () => {
    const storage = memoryStorage(
      JSON.stringify({
        v: 1,
        inputs: { cvText: "cv", tone: "formal", fresh: 1 },
        extra: 1,
      }),
    );
    writeSession({ inputs: { jobAd: "annonse" } }, storage);
    expect(JSON.parse(storage.dump() ?? "{}")).toEqual({
      v: 1,
      inputs: { cvText: "cv", tone: "formal", fresh: 1, jobAd: "annonse" },
      extra: 1,
    });
  });

  it("keeps the CV draft and removes the confirmed text on an edit", () => {
    const storage = memoryStorage();
    writeSession({ inputs: { cvDraft: "cv", cvText: "cv" } }, storage);
    expect(readSession(storage).inputs).toEqual({
      cvDraft: "cv",
      cvText: "cv",
    });
    writeSession({ inputs: { cvDraft: "cv2", cvText: undefined } }, storage);
    expect(readSession(storage).inputs).toEqual({ cvDraft: "cv2" });
    expect(storage.dump()).not.toContain("cvText");
  });

  it("sets, keeps and removes the applicationId", () => {
    const storage = memoryStorage();
    writeSession({ applicationId: "id-1" }, storage);
    writeSession({ inputs: { jobAd: "a" } }, storage);
    expect(readSession(storage).applicationId).toBe("id-1");
    writeSession({ applicationId: null }, storage);
    expect(readSession(storage).applicationId).toBeUndefined();
    expect(storage.dump()).not.toContain("applicationId");
  });

  it("FR-24 keeps the accepted noticeVersion through edits and a dropped id", () => {
    const storage = memoryStorage();
    writeSession({ noticeVersion: "notice-3:a:unknown:no-fallback" }, storage);
    writeSession({ applicationId: "id-1", inputs: { jobAd: "a" } }, storage);
    writeSession({ applicationId: null, inputs: { jobAd: "b" } }, storage);
    expect(readSession(storage).noticeVersion).toBe(
      "notice-3:a:unknown:no-fallback",
    );
  });

  it("FR-24 reads no noticeVersion from a fresh or foreign session", () => {
    expect(readSession(memoryStorage()).noticeVersion).toBeUndefined();
    expect(
      readSession(
        memoryStorage(JSON.stringify({ v: 1, inputs: {}, noticeVersion: 5 })),
      ).noticeVersion,
    ).toBeUndefined();
  });

  it("uses the one key ja.session.v1", () => {
    expect(SESSION_KEY).toBe("ja.session.v1");
  });
});

describe("FR-10 the Tone in the client session", () => {
  it("keeps the Tone through edits and a dropped id, and reads none from a foreign session", () => {
    const storage = memoryStorage();
    writeSession({ tone: "Direkte" }, storage);
    writeSession({ applicationId: "id-1", inputs: { jobAd: "a" } }, storage);
    writeSession({ applicationId: null, inputs: { jobAd: "b" } }, storage);
    expect(readSession(storage).tone).toBe("Direkte");
    expect(readSession(memoryStorage()).tone).toBeUndefined();
    expect(
      readSession(memoryStorage(JSON.stringify({ v: 1, inputs: {}, tone: 3 })))
        .tone,
    ).toBeUndefined();
  });
});
