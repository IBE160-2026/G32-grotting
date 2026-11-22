import { messages } from "../messages.nb";

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly current: boolean;
};

// What the app bar knows about the visitor. `off`: accounts are off, so the
// nav is the two-item one. `out` and `in`: accounts are on and the visitor has
// no session or a live one (UX-DR5, after S6).
export type AccountNav = "off" | "out" | "in";

type Entry = { readonly href: string; readonly label: string };

const HOME: Entry = { href: "/", label: messages.nav.home };
const APPLICATION: Entry = { href: "/soknad", label: messages.nav.application };

const ENTRIES: Record<AccountNav, readonly Entry[]> = {
  // Before accounts exist the nav is Hjem · Søknad (EXPERIENCE.md, Navigation).
  off: [HOME, APPLICATION],
  out: [
    HOME,
    APPLICATION,
    { href: "/logg-inn", label: messages.nav.login },
    { href: "/registrer", label: messages.nav.register },
  ],
  in: [
    HOME,
    APPLICATION,
    { href: "/profil", label: messages.nav.profile },
    { href: "/historikk", label: messages.nav.history },
    { href: "/konto", label: messages.nav.account },
  ],
};

// A page counts as current for its own path and anything below it; Hjem only
// for the front page.
function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function navItems(
  pathname: string,
  account: AccountNav = "off",
): NavItem[] {
  return ENTRIES[account].map((entry) => ({
    ...entry,
    current: isCurrent(entry.href, pathname),
  }));
}
