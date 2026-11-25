import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readSession,
  type SessionStorage,
  writeSession,
} from "@/shared/ui/client-session";
import { endSession, resetEnding } from "@/shared/ui/session-end";
import { logOutNow } from "./log-out";

function memoryStorage(): SessionStorage {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
}

// What a Student's tab holds just before «Logg ut»: query answers with the CV
// text, a saved Application and the email, and the client session.
function fullTab() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["profile"], { cvText: "CV-tekst til Student A" });
  queryClient.setQueryData(["session"], { email: "a@example.test" });
  queryClient.setQueryData(["applications", "count"], 3);
  queryClient.setQueryData(["applications", "list", 1], { entries: [] });
  queryClient.setQueryData(["applications", "detail", "id-1"], {
    letter: "Brev til Student A",
  });
  const storage = memoryStorage();
  writeSession(
    {
      applicationId: "app-1",
      noticeVersion: "v1",
      tone: "Direkte",
      lastEmail: "a@example.test",
      restoredAfterExpiry: { profil: true },
      inputs: {
        jobAd: "annonse",
        jobTitle: "Utvikler",
        employer: "Firma",
        cvDraft: "utkast",
        cvText: "CV",
      },
    },
    storage,
  );
  return { queryClient, storage };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetEnding();
});

describe("FR-18, AD-16 «Logg ut»", () => {
  it("ends the session, empties every cache and keeps only the ad, title, employer and Tone", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true, data: { loggedOut: true } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { queryClient, storage } = fullTab();

    const result = await logOutNow(queryClient, storage);

    expect(result.ok).toBe(true);
    const [path, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/api/auth/logout");
    expect(init.method).toBe("POST");
    // Profile, session view, count, list and the decrypted detail are gone.
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getQueryData(["profile"])).toBeUndefined();
    expect(queryClient.getQueryData(["applications", "count"])).toBeUndefined();
    expect(
      queryClient.getQueryData(["applications", "detail", "id-1"]),
    ).toBeUndefined();
    const kept = readSession(storage);
    expect(kept).toEqual({
      v: 1,
      tone: "Direkte",
      inputs: { jobAd: "annonse", jobTitle: "Utvikler", employer: "Firma" },
    });
  });

  it("holds the ending: a request that answers SESSION_EXPIRED afterwards does not take the Student to Logg inn", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, data: { loggedOut: true } })),
    );
    const { queryClient, storage } = fullTab();
    await logOutNow(queryClient, storage);
    const go = vi.fn();
    endSession({ storage, pathname: "/konto", go });
    expect(go).not.toHaveBeenCalled();
  });

  it("leaves a query that is still on its way no cache to settle into", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, data: { loggedOut: true } })),
    );
    const { queryClient, storage } = fullTab();
    queryClient.removeQueries({ queryKey: ["session"] });
    void queryClient
      .prefetchQuery({
        queryKey: ["session"],
        queryFn: () => new Promise(() => {}),
      })
      .catch(() => undefined);
    expect(queryClient.isFetching()).toBe(1);
    await logOutNow(queryClient, storage);
    expect(queryClient.isFetching()).toBe(0);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("changes nothing when the request gets no answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const { queryClient, storage } = fullTab();

    const result = await logOutNow(queryClient, storage);

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NETWORK_ERROR" },
    });
    expect(queryClient.getQueryData(["profile"])).toEqual({
      cvText: "CV-tekst til Student A",
    });
    const held = readSession(storage);
    expect(held.lastEmail).toBe("a@example.test");
    expect(held.inputs.cvDraft).toBe("utkast");
  });

  it("changes nothing when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { ok: false, error: { code: "UNEXPECTED", retryable: false } },
          { status: 500 },
        ),
      ),
    );
    const { queryClient, storage } = fullTab();

    const result = await logOutNow(queryClient, storage);

    expect(result.ok).toBe(false);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(5);
    expect(readSession(storage).inputs.cvDraft).toBe("utkast");
  });
});
