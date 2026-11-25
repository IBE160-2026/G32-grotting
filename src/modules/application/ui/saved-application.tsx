"use client";

import type { ReactNode } from "react";
import type { Gap } from "@/modules/gaps/contracts";
import { GAPS_HEADING_ID, GapsSection, gapTargetId } from "@/modules/gaps/ui";
import { splitParagraphs } from "@/modules/keywords/core";
import {
  LETTER_HEADING_ID,
  type LetterCheckState,
  LetterSection,
} from "@/modules/letter/ui";
import { KeywordList, PulsePlot, ScoreBlock } from "@/modules/match/ui";
import { ProfileRequestError, useProfile } from "@/modules/profile/ui";
import { formatCount } from "@/shared/core/format-count";
import { AiPlaceholder } from "@/shared/ui/components/ai-placeholder";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { CatalogueHeading } from "@/shared/ui/components/catalogue-heading";
import { type Credit, CreditsList } from "@/shared/ui/components/credits-list";
import { Link } from "@/shared/ui/components/link";
import { Notice } from "@/shared/ui/components/notice";
import { SkeletonRows } from "@/shared/ui/components/skeleton-rows";
import { messages } from "@/shared/ui/messages.nb";
import { useRunMode } from "@/shared/ui/run-mode";
import { formatCatalogueNumber } from "../core/catalogue-number";
import type { SavedApplication as Saved } from "../saved-contracts";
import {
  ApplicationRequestError,
  useSavedApplication,
} from "./use-applications";

// «17. nov. 2026», as on the result.
const DATE = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const NO_RETRY = () => {};

// How the Gapanalyse section stands on a reopened Application. Stored Gaps are
// shown whatever `features.gaps` says. A section never made is «Ikke laget.»
// only while Gaps were due: the flag is on and the ad has a Missing keyword (the
// live result shows no Gapanalyse otherwise either). When the keywords cannot be
// read nothing says that none was due, so the section is shown.
export type GapsPlacement = "show" | "notMade" | "unreadable" | "hidden";

export function gapsPlacement(
  saved: Pick<Saved, "gaps" | "analysis">,
  gapsOn: boolean,
): GapsPlacement {
  if (saved.gaps.status === "ok") return "show";
  if (saved.gaps.status === "unreadable") return "unreadable";
  if (!gapsOn) return "hidden";
  if (
    saved.analysis.status === "ok" &&
    saved.analysis.value.missing.length === 0
  ) {
    return "hidden";
  }
  return "notMade";
}

// The check state of the stored Letter: the flags when the server sent them
// (their revs matched the row's), else the unchecked notice, without a retry.
export function savedCheckState(check: Saved["check"]): LetterCheckState {
  return check === null
    ? { kind: "failed", busy: false }
    : { kind: "done", flags: check };
}

// «Se gapanalysen» links by Missing keyword, only when Gaps are shown.
export function savedGapTargets(
  gaps: Saved["gaps"],
): Record<string, string> | undefined {
  if (gaps.status !== "ok") return undefined;
  return Object.fromEntries(
    gaps.value.map((gap: Gap, index) => [gap.keyword, gapTargetId(index)]),
  );
}

// The credits under the heading: position, date, the Tone of the stored Letter
// and the ad. A part that cannot be read is left out.
export function savedCredits(saved: Saved): Credit[] {
  const items: Credit[] = [];
  if (saved.job.status === "ok") {
    items.push({
      term: messages.result.credits.position,
      value: saved.job.value.jobTitle,
    });
  }
  items.push({
    term: messages.result.credits.date,
    value: DATE.format(new Date(saved.createdAt)),
  });
  if (saved.letter.status === "ok") {
    items.push({
      term: messages.result.credits.tone,
      value: messages.tone.options[saved.letter.value.tone].name,
    });
  }
  if (saved.analysis.status === "ok") {
    items.push({
      term: messages.result.credits.ad,
      value: messages.result.adSummary(
        formatCount(saved.analysis.value.adParagraphs),
        formatCount(saved.analysis.value.totalCount),
      ),
    });
  }
  return items;
}

function Unreadable() {
  return (
    <Notice label={messages.history.unreadable}>
      {messages.saved.unreadable}
    </Notice>
  );
}

function NotMade() {
  return (
    <Notice label={messages.saved.notMade.label}>
      {messages.saved.notMade.text}
    </Notice>
  );
}

function Slot({
  title,
  headingId,
  children,
}: {
  title: string;
  headingId: string;
  children: ReactNode;
}) {
  return (
    <AiPlaceholder title={title} headingId={headingId}>
      {children}
    </AiPlaceholder>
  );
}

export function SavedBody({
  saved,
  name,
}: {
  saved: Saved;
  name: string | null;
}) {
  const runMode = useRunMode();
  const { job, analysis, gaps, letter } = saved;
  const number = formatCatalogueNumber(saved.seq);
  const reflection =
    job.status === "ok" && analysis.status === "ok"
      ? { job: job.value, result: analysis.value }
      : null;
  const adParagraphs =
    reflection === null ? [] : splitParagraphs(reflection.job.jobAd);
  const placement = gapsPlacement(saved, runMode.features.gaps);
  const gapTargets = savedGapTargets(gaps);
  const employer = job.status === "ok" ? job.value.employer : undefined;

  return (
    <>
      <nav
        aria-label={messages.saved.navLabel}
        className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-1"
      >
        {saved.previous === null ? null : (
          <Link
            href={`/historikk/${saved.previous.id}`}
            // Nothing is loaded ahead: the page holds decrypted text.
            prefetch={false}
            kind="standalone"
          >
            {messages.saved.previousLink(
              formatCatalogueNumber(saved.previous.seq),
              saved.previous.employer,
            )}
          </Link>
        )}
        <Link href="/historikk" prefetch={false} kind="standalone">
          {messages.saved.historyLink}
        </Link>
      </nav>
      <div className="max-w-measure">
        <CatalogueHeading employer number={number}>
          {employer}
        </CatalogueHeading>
        <div className="mt-6">
          <CreditsList items={savedCredits(saved)} />
        </div>
      </div>
      {reflection === null ? (
        <div className="mt-8 max-w-measure">
          <Unreadable />
        </div>
      ) : (
        <>
          <div className="mt-8">
            <PulsePlot
              placement="result"
              paragraphs={adParagraphs}
              matched={reflection.result.matched}
              missing={reflection.result.missing}
            />
          </div>
          <div className="mt-8 flex max-w-measure flex-col gap-8">
            <ScoreBlock result={reflection.result} />
            <KeywordList
              kind="matched"
              entries={reflection.result.matched}
              adParagraphs={adParagraphs}
            />
            <KeywordList
              kind="missing"
              entries={reflection.result.missing}
              adParagraphs={adParagraphs}
              gapTargets={gapTargets}
            />
          </div>
        </>
      )}
      <div className="mt-8 flex max-w-letter flex-col gap-8">
        {placement === "show" && gaps.status === "ok" ? (
          <GapsSection
            phase={{ kind: "done", gaps: gaps.value }}
            onRetry={NO_RETRY}
            rewording={runMode.features.rewording}
          />
        ) : placement === "notMade" ? (
          <Slot title={messages.gaps.heading} headingId={GAPS_HEADING_ID}>
            <NotMade />
          </Slot>
        ) : placement === "unreadable" ? (
          <Slot title={messages.gaps.heading} headingId={GAPS_HEADING_ID}>
            <Unreadable />
          </Slot>
        ) : null}
        {letter.status === "ok" ? (
          <LetterSection
            readOnly
            phase={{ kind: "done", letter: letter.value }}
            employer={employer ?? ""}
            check={savedCheckState(saved.check)}
            name={name}
            year={new Date(saved.createdAt).getFullYear()}
          />
        ) : (
          <Slot title={messages.letter.heading} headingId={LETTER_HEADING_ID}>
            {letter.status === "missing" ? <NotMade /> : <Unreadable />}
          </Slot>
        )}
      </div>
    </>
  );
}

/**
 * A saved Application reopened, read-only (Story 6.9, FR-21). It shows what was
 * stored, fetched through `GET /api/applications/[id]`, with the existing match,
 * gaps and letter components; nothing is written again and no AI is asked. The
 * Profile name is waited for, so a copied or downloaded Letter is never signed
 * «[Navnet ditt]»; a failed Profile or answer fails the page.
 */
export function SavedApplication({ id }: { id: string }) {
  const detail = useSavedApplication(id);
  const profile = useProfile();
  const data = detail.data;

  // A failed refetch must not replace what is already shown.
  const loadFailed =
    (detail.isError && data === undefined) ||
    (profile.isError && profile.data === undefined);
  // An ended session is on its way to Logg inn (`callApi`): no failure to show.
  const ended =
    (detail.error instanceof ApplicationRequestError &&
      detail.error.code === "SESSION_EXPIRED") ||
    (profile.error instanceof ProfileRequestError &&
      profile.error.code === "SESSION_EXPIRED");
  const loading = (detail.isPending || profile.isPending) && !loadFailed;

  if (loadFailed || loading || data === undefined || !profile.data) {
    return (
      <div>
        <h1 className="text-title max-640:text-title-mobile">
          {messages.saved.title}
        </h1>
        {loadFailed ? (
          <div className="mt-8 flex flex-col items-start gap-3">
            {ended ? null : (
              <>
                <Alert>{messages.networkFailure}</Alert>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void detail.refetch();
                    void profile.refetch();
                  }}
                >
                  {messages.letter.retry}
                </Button>
              </>
            )}
          </div>
        ) : (
          <div aria-busy="true" className="mt-8">
            <SkeletonRows rows={8} />
          </div>
        )}
      </div>
    );
  }
  return <SavedBody saved={data} name={profile.data.name} />;
}
