"use client";

import { useEffect, useRef, useState } from "react";
import { ProfileRequestError, useProfile } from "@/modules/profile/ui";
import { announce } from "@/shared/ui/announce";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { SkeletonRows } from "@/shared/ui/components/skeleton-rows";
import { messages } from "@/shared/ui/messages.nb";
import { formatCatalogueNumber } from "../core/catalogue-number";
import { CatalogueRegister } from "./catalogue-register";
import { EmptyState } from "./empty-state";
import {
  ApplicationRequestError,
  useApplicationList,
} from "./use-applications";

// At this width the register is the `<ol>` and the table is hidden, so focus
// goes to the page heading instead of the table caption.
const PHONE_QUERY = "(max-width: 640px)";

// Historikk (Story 6.8, FR-21): the Student's Applications, newest first, 20
// per page, with no search, delete or rename (D5). The Profile is read for the
// name that signs a copied or downloaded Letter.
export function HistoryPage() {
  const [page, setPage] = useState(1);
  const list = useApplicationList(page);
  const profile = useProfile();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const captionRef = useRef<HTMLTableCaptionElement>(null);
  // The page a press on «Forrige» or «Neste» asked for. Focus moves and the
  // page is announced once that page is on screen, never ahead of it.
  const [pendingPage, setPendingPage] = useState<number | null>(null);

  const data = list.data;
  const pages =
    data === undefined ? 1 : Math.max(1, Math.ceil(data.total / data.pageSize));
  const shownPage = data?.page ?? page;

  useEffect(() => {
    if (pendingPage === null || data === undefined) return;
    if (data.page !== pendingPage) return;
    setPendingPage(null);
    announce("action", messages.history.pagination.page(data.page, pages));
    const phone = window.matchMedia(PHONE_QUERY).matches;
    (phone ? headingRef.current : captionRef.current)?.focus();
  }, [pendingPage, data, pages]);

  function goTo(next: number) {
    setPage(next);
    setPendingPage(next);
  }

  // A failed refetch must not replace a list that is already shown. Without the
  // Profile name a Letter would be signed with the placeholder, so a failed
  // Profile fails the page too.
  const loadFailed =
    (list.isError && data === undefined) ||
    (profile.isError && profile.data === undefined);
  // An ended session is on its way to Logg inn (`callApi`): no failure to show.
  const ended =
    (list.error instanceof ApplicationRequestError &&
      list.error.code === "SESSION_EXPIRED") ||
    (profile.error instanceof ProfileRequestError &&
      profile.error.code === "SESSION_EXPIRED");
  // The Profile name is read before the rows appear, so a copy or a download is
  // never signed with the placeholder while the name is on its way.
  const loading = (list.isPending || profile.isPending) && !loadFailed;

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-title max-640:text-title-mobile"
      >
        {messages.history.title}
      </h1>
      {data !== undefined && data.total > 0 && !loading ? (
        <p className="mt-4 text-lede text-ink-2">
          {messages.history.summary(
            formatCatalogueNumber(data.firstSeq ?? 1),
            formatCatalogueNumber(data.lastSeq ?? 1),
            data.total,
          )}
        </p>
      ) : null}
      {loadFailed ? (
        <div className="mt-8 flex flex-col items-start gap-3">
          {ended ? null : (
            <>
              <Alert>{messages.networkFailure}</Alert>
              <Button
                variant="secondary"
                onClick={() => {
                  void list.refetch();
                  void profile.refetch();
                }}
              >
                {messages.letter.retry}
              </Button>
            </>
          )}
        </div>
      ) : loading || data === undefined ? (
        <div aria-busy="true" className="mt-8">
          <SkeletonRows rows={8} />
        </div>
      ) : data.total === 0 ? (
        <EmptyState />
      ) : (
        <>
          <CatalogueRegister
            entries={data.entries}
            name={profile.data?.name ?? null}
            captionRef={captionRef}
          />
          <p className="mt-6 max-w-measure text-hint text-ink-2">
            {messages.history.note}
          </p>
          {pages > 1 ? (
            <nav
              aria-label={messages.history.pagination.label}
              className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4"
            >
              <div>
                {shownPage > 1 ? (
                  <Button
                    small
                    variant="secondary"
                    onClick={() => goTo(shownPage - 1)}
                  >
                    {messages.history.pagination.previous}
                  </Button>
                ) : null}
              </div>
              <p className="m-0 font-mono text-mono-meta text-ink">
                {messages.history.pagination.page(shownPage, pages)}
              </p>
              <div className="text-right">
                {shownPage < pages ? (
                  <Button
                    small
                    variant="secondary"
                    onClick={() => goTo(shownPage + 1)}
                  >
                    {messages.history.pagination.next}
                  </Button>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
