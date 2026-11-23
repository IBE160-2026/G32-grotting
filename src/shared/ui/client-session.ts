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
  // The Tone chosen for the Letter (FR-10). A plain string here: the slice that
  // owns the Tones checks the value, so a Tone it later drops reads as unset.
  tone: z.string().optional(),
  // The email of the logged-in Student, kept so that «Logg inn» can prefill it
  // when the session ends (FR-18). Never a password or a token.
  lastEmail: z.string().optional(),
  // Set when the session ended: which page still owes the Student the notice
  // that their work was kept (Søknad: the Job ad; Profil: the CV draft).
  restoredAfterExpiry: z
    .object({
      soknad: z.boolean().optional(),
      profil: z.boolean().optional(),
    })
    .optional(),
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
  readonly tone?: string;
  readonly lastEmail?: string;
  // `null` removes it. A part set to `false` or `undefined` is removed.
  readonly restoredAfterExpiry?: RestoredAfterExpiry | null;
  readonly inputs?: SessionInputs;
};

export type RestoredAfterExpiry = NonNullable<
  ClientSession["restoredAfterExpiry"]
>;

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
  const {
    applicationId: current,
    restoredAfterExpiry: currentRestored,
    ...rest
  } = readSession(storage);
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
  if (patch.tone !== undefined) next.tone = patch.tone;
  if (patch.lastEmail !== undefined) next.lastEmail = patch.lastEmail;
  const restored =
    patch.restoredAfterExpiry === undefined
      ? currentRestored
      : (patch.restoredAfterExpiry ?? undefined);
  if (restored !== undefined) {
    const kept: RestoredAfterExpiry = {};
    if (restored.soknad === true) kept.soknad = true;
    if (restored.profil === true) kept.profil = true;
    if (kept.soknad || kept.profil) next.restoredAfterExpiry = kept;
  }
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(next));
  } catch {
    // A full or blocked store: the form works, it just forgets on refresh.
  }
}

// «Logg ut» clears everything except the Job ad, job title, employer and Tone;
// the CV draft goes too (AD-16).
export function clearSessionForLogout(
  storage: SessionStorage | undefined = browserStorage(),
): void {
  const { inputs, tone } = readSession(storage);
  const kept: ClientSession = { v: 1, inputs: {} };
  if (inputs.jobAd !== undefined) kept.inputs.jobAd = inputs.jobAd;
  if (inputs.jobTitle !== undefined) kept.inputs.jobTitle = inputs.jobTitle;
  if (inputs.employer !== undefined) kept.inputs.employer = inputs.employer;
  if (tone !== undefined) kept.tone = tone;
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(kept));
  } catch {
    // A blocked store: nothing was kept there to clear.
  }
}

// A different Student logs in on this tab than the one whose work it holds
// (a shared computer after an ended session): that work is not theirs, so the
// whole client session goes. The same Student, or a tab with no known email,
// keeps it (FR-18).
export function forgetOtherStudentsWork(
  email: string,
  storage: SessionStorage | undefined = browserStorage(),
): void {
  const last = readSession(storage).lastEmail;
  if (last === undefined || last === email.trim().toLowerCase()) return;
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(empty()));
  } catch {
    // A blocked store: nothing was kept there.
  }
}
