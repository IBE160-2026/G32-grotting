"use client";

import { formatCount } from "@/shared/core/format-count";
import { Link } from "@/shared/ui/components/link";
import { Notice } from "@/shared/ui/components/notice";
import { messages } from "@/shared/ui/messages.nb";

const copy = messages.application;

// «17. nov. 2026»
const DATE = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// The date a CV text was saved, or null when none was kept or it is not a date.
export function savedDate(iso: string | null): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
}

type CvDisclosureProps = {
  // `profile`: the saved CV, with the link to Profil. `example`: the one-off
  // override of «Bruk eksempelet», which the Profile does not hold.
  readonly source: "profile" | "example";
  readonly text: string;
  // ISO instant the Profile text was saved; the example has none.
  readonly savedAt?: string | null;
};

// Søknad's CV slot with accounts on (Story 6.6, UX-DR26): a closed native
// `<details>` with the character count and the save date right-aligned in
// mono. Opened, it holds the text read-only. The CV is edited only in Profil,
// so there is no picker and nothing to confirm here.
export function CvDisclosure({ source, text, savedAt }: CvDisclosureProps) {
  const fromProfile = source === "profile";
  const meta = copy.cvDisclosure.meta(
    formatCount(text.length),
    fromProfile ? savedDate(savedAt ?? null) : null,
  );
  return (
    <details className="group border border-edge">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-3.5 py-2 hover:bg-hover [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          width="12"
          height="12"
          className="shrink-0 text-amber transition-transform group-open:rotate-90"
        >
          <path d="M3.5 1.5 8.5 6l-5 4.5z" fill="currentColor" />
        </svg>
        <span className="text-label text-ink">
          {fromProfile
            ? copy.cvDisclosure.summary
            : copy.cvDisclosure.exampleSummary}
        </span>
        <span className="ml-auto font-mono text-mono-meta text-ink">
          {meta}
        </span>
      </summary>
      <div className="border-t border-rule px-3.5 pt-3 pb-4">
        <textarea
          readOnly
          rows={12}
          aria-label={copy.cvDisclosure.textLabel}
          value={text}
          className="min-h-control-height w-full min-w-0 border border-edge bg-field px-3.5 py-3 font-mono text-mono-cv text-ink"
        />
        <p className="mt-2 mb-0 text-hint text-ink-2">
          {fromProfile ? (
            <>
              {copy.cvDisclosure.hint}{" "}
              <Link href="/profil">{copy.cvDisclosure.editLink}</Link>
            </>
          ) : (
            copy.cvDisclosure.exampleHint
          )}
        </p>
      </div>
    </details>
  );
}

// No CV in Profil yet: a notice in the CV slot with a link to Profil. Submit is
// unavailable until a CV exists.
export function NoCvNotice() {
  return (
    <Notice label={copy.noCv.label}>
      {copy.noCv.text}{" "}
      <Link kind="standalone" href="/profil">
        {copy.noCv.link}
      </Link>
    </Notice>
  );
}
