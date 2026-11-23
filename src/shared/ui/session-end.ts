import {
  clearSessionForLogout,
  readSession,
  type SessionStorage,
  writeSession,
} from "./client-session";

// Where the Student lands when the session ended (FR-18): the same page the
// server sends a logged-out visitor to, with a marker that shows the alert.
export const SESSION_ENDED_PATH = "/logg-inn?okt=utlopt";
export const SESSION_ENDED_PARAM = "okt";
export const SESSION_ENDED_VALUE = "utlopt";

const QUIET_PATHS: readonly string[] = ["/logg-inn", "/registrer"];

type EndDeps = {
  storage?: SessionStorage | undefined;
  pathname?: string;
  go?: (path: string) => void;
};

let ending = false;

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "";
}

// The session is over, by the clock or by a request that answered
// SESSION_EXPIRED (AD-16). The client session holds what the Student typed (the
// pages write it as it changes, the CV draft included); this marks what each
// page must say after the next login and loads «Logg inn» with a full page
// load, so the app bar and every cache start from the logged-out session.
// Called more than once at the same time, it acts once.
export function endSession(deps: EndDeps = {}): void {
  const pathname =
    deps.pathname ??
    (typeof window === "undefined" ? undefined : window.location.pathname);
  if (pathname === undefined || QUIET_PATHS.includes(pathname) || ending) {
    return;
  }
  ending = true;
  // A page that comes back from the back/forward cache is live again.
  if (
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function"
  ) {
    window.addEventListener(
      "pageshow",
      (event) => {
        if (event.persisted) ending = false;
      },
      { once: true },
    );
  }
  const { inputs } = readSession(deps.storage);
  writeSession(
    {
      restoredAfterExpiry: {
        soknad: hasText(inputs.jobAd),
        // Søknad writes `cvDraft` too until Story 6.6: only a draft typed on
        // Profil is Profil's to restore.
        profil: pathname === "/profil" && hasText(inputs.cvDraft),
      },
    },
    deps.storage,
  );
  (deps.go ?? ((path) => window.location.replace(path)))(SESSION_ENDED_PATH);
}

// The Student has logged out on purpose and the page is leaving: a request
// that answers SESSION_EXPIRED after this must not take over.
export function holdEnding(): void {
  ending = true;
}

// «Logg ut» from the expiry warning (and later Konto): the session on the
// server is gone, so the client forgets what is not the Student's own input.
export function forgetSessionForLogout(storage?: SessionStorage): void {
  clearSessionForLogout(storage);
}

// For tests.
export function resetEnding(): void {
  ending = false;
}
