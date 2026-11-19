import { z } from "zod";

// The one browser key (AD-16). Nothing else reads or writes sessionStorage.
export const SESSION_KEY = "ja.session.v1";

// Loose, so a field a later story adds (tone, …) survives a write
// made by code that does not know it yet.
const sessionSchema = z.looseObject({
  v: z.literal(1),
  applicationId: z.string().optional(),
  // The AI notice the Student accepted in this browser session (FR-24): the
  // `RunMode.aiNotice.version` that was showing.
  noticeVersion: z.string().optional(),
  inputs: z
    .looseObject({
      // `cvDraft` is the CV text as typed; `cvText` exists only while it is
      // the confirmed text (FR-3).
      cvText: z.string().optional(),
      cvDraft: z.string().optional(),
      jobAd: z.string().optional(),
      jobTitle: z.string().optional(),
      employer: z.string().optional(),
    })
    .default({}),
});

export type ClientSession = z.infer<typeof sessionSchema>;
export type SessionInputs = ClientSession["inputs"];

export type SessionStorage = Pick<Storage, "getItem" | "setItem">;

export type SessionPatch = {
  // `null` removes the id. An input set to `undefined` is removed.
  readonly applicationId?: string | null;
  readonly noticeVersion?: string;
  readonly inputs?: SessionInputs;
};

// A fresh object each time, so a caller that edits the result cannot change
// what the next empty read returns.
function empty(): ClientSession {
  return { v: 1, inputs: {} };
}

// Private windows and blocked site data can throw on access (NFR-5).
function browserStorage(): SessionStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

// A missing, corrupt or blocked store reads as an empty session.
export function readSession(
  storage: SessionStorage | undefined = browserStorage(),
): ClientSession {
  try {
    const raw = storage?.getItem(SESSION_KEY);
    if (raw === null || raw === undefined) return empty();
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : empty();
  } catch {
    return empty();
  }
}

export function writeSession(
  patch: SessionPatch,
  storage: SessionStorage | undefined = browserStorage(),
): void {
  const { applicationId: current, ...rest } = readSession(storage);
  const applicationId =
    patch.applicationId === undefined
      ? current
      : (patch.applicationId ?? undefined);
  const next: ClientSession = {
    ...rest,
    inputs: { ...rest.inputs, ...patch.inputs },
  };
  if (applicationId !== undefined) next.applicationId = applicationId;
  if (patch.noticeVersion !== undefined) {
    next.noticeVersion = patch.noticeVersion;
  }
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // A full or blocked store: the form works, it just forgets on refresh.
  }
}
