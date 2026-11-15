import { messages } from "../messages.nb";

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly current: boolean;
};

// Before accounts exist the nav is Hjem · Søknad (EXPERIENCE.md, Navigation).
// A page counts as current for its own path and anything below it.
export function navItems(pathname: string): NavItem[] {
  return [
    {
      href: "/",
      label: messages.nav.home,
      current: pathname === "/",
    },
    {
      href: "/soknad",
      label: messages.nav.application,
      current: pathname === "/soknad" || pathname.startsWith("/soknad/"),
    },
  ];
}
