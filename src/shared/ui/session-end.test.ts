import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readSession,
  SESSION_KEY,
  type SessionStorage,
  writeSession,
} from "./client-session";
import {
  endSession,
  forgetSessionForLogout,
  holdEnding,
  resetEnding,
  SESSION_ENDED_PATH,
} from "./session-end";

function memoryStorage(): SessionStorage & { dump(): string | null } {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    dump: () => value,
  };
}

afterEach(() => resetEnding());

describe("FR-18, AD-16 the session ends on the client", () => {
  it("marks what the Student kept and loads Logg inn once", () => {
    const storage = memoryStorage();
    writeSession(
      { inputs: { jobAd: "annonse", cvDraft: "utkast" }, tone: "Direkte" },
      storage,
    );
    const go = vi.fn();
    endSession({ storage, pathname: "/profil", go });
    endSession({ storage, pathname: "/profil", go });
    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith(SESSION_ENDED_PATH);
    const kept = readSession(storage);
    expect(kept.restoredAfterExpiry).toEqual({ soknad: true, profil: true });
    expect(kept.inputs).toEqual({ jobAd: "annonse", cvDraft: "utkast" });
    expect(kept.tone).toBe("Direkte");
  });

  it("marks only the pages that have something to restore", () => {
    const storage = memoryStorage();
    writeSession({ inputs: { jobAd: "  ", cvDraft: "utkast" } }, storage);
    endSession({ storage, pathname: "/profil", go: vi.fn() });
    expect(readSession(storage).restoredAfterExpiry).toEqual({ profil: true });
  });

  it("a draft in the tab is Profil's to restore whichever page the session ended on (only Profil writes it, Story 6.6)", () => {
    const storage = memoryStorage();
    writeSession({ inputs: { jobAd: "annonse", cvDraft: "utkast" } }, storage);
    endSession({ storage, pathname: "/soknad", go: vi.fn() });
    expect(readSession(storage).restoredAfterExpiry).toEqual({
      soknad: true,
      profil: true,
    });
  });

  it("does not end the session after the Student has logged out on purpose", () => {
    const go = vi.fn();
    holdEnding();
    endSession({ storage: memoryStorage(), pathname: "/profil", go });
    expect(go).not.toHaveBeenCalled();
  });

  it("marks nothing when the tab holds nothing", () => {
    const storage = memoryStorage();
    endSession({ storage, pathname: "/soknad", go: vi.fn() });
    expect(readSession(storage).restoredAfterExpiry).toBeUndefined();
  });

  it("does nothing on Logg inn and Registrer deg, or without a window", () => {
    const go = vi.fn();
    endSession({ pathname: "/logg-inn", go });
    endSession({ pathname: "/registrer", go });
    endSession({ go });
    expect(go).not.toHaveBeenCalled();
  });

  it("logout keeps the Job ad, title, employer and Tone and drops the rest", () => {
    const storage = memoryStorage();
    writeSession(
      {
        applicationId: "id-1",
        noticeVersion: "v",
        tone: "Formell",
        lastEmail: "kari@example.test",
        restoredAfterExpiry: { soknad: true },
        inputs: {
          jobAd: "a",
          jobTitle: "t",
          employer: "e",
          cvText: "cv",
          cvDraft: "cv",
        },
      },
      storage,
    );
    forgetSessionForLogout(storage);
    expect(JSON.parse(storage.dump() ?? "{}")).toEqual({
      v: 1,
      tone: "Formell",
      inputs: { jobAd: "a", jobTitle: "t", employer: "e" },
    });
    expect(SESSION_KEY).toBe("ja.session.v1");
  });
});
