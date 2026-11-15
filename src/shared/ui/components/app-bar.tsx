"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { messages } from "../messages.nb";
import { Button } from "./button";
import { Link } from "./link";
import { navItems } from "./nav-items";

// Three amber pulse lines, drawn with the product's one icon stroke.
function PulseGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="18"
      viewBox="0 0 22 18"
      fill="none"
      stroke="var(--color-amber)"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      <path d="M1 3h6l2-2 2 4 2-2h8" />
      <path d="M1 9h9l2-3 2 6 2-3h6" />
      <path d="M1 15h4l2-2 2 3 2-1h11" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      {open ? (
        <path d="M5 5l14 14M19 5L5 19" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

export function AppBar() {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so back/forward or any
  // navigation closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  // The Access-code screen shows the wordmark only (UX-DR35).
  const wordmarkOnly = pathname === "/tilgang";
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenPath(null);
      toggleRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="flex min-h-appbar-height flex-wrap items-center justify-between border-b border-rule bg-ground px-page-x max-640:min-h-appbar-height-mobile max-640:px-page-x-mobile">
      <Link
        href="/"
        kind="nav"
        className="wordmark gap-3 text-ink hover:text-ink"
      >
        <PulseGlyph />
        {messages.siteName}
      </Link>
      {wordmarkOnly ? null : (
        <div className="hidden max-640:block">
          <Button
            ref={toggleRef}
            small
            variant="secondary"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpenPath(open ? null : pathname)}
          >
            <MenuIcon open={open} />
            {open ? messages.nav.menuClose : messages.nav.menuOpen}
          </Button>
        </div>
      )}
      {wordmarkOnly ? null : (
        <nav
          id={menuId}
          aria-label={messages.nav.label}
          className={`max-640:-mx-page-x-mobile max-640:basis-[calc(100%+2*var(--spacing-page-x-mobile))] ${open ? "" : "max-640:hidden"}`}
        >
          <ul className="m-0 flex list-none gap-1 p-0 max-640:flex-col max-640:gap-0">
            {navItems(pathname).map((item) => (
              <li
                key={item.href}
                className="max-640:border-t max-640:border-rule"
              >
                <Link
                  href={item.href}
                  kind="nav"
                  aria-current={item.current ? "page" : undefined}
                  onClick={() => setOpenPath(null)}
                  className={`px-3.5 text-nav max-640:min-h-14 max-640:w-full max-640:px-page-x-mobile max-640:text-nav-mobile ${
                    item.current
                      ? "text-ink shadow-[inset_0_-2px_0_var(--color-amber)] max-640:bg-lift max-640:shadow-[inset_3px_0_0_var(--color-amber)]"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
