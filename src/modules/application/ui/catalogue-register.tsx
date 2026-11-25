"use client";

import NextLink from "next/link";
import type { Ref } from "react";
import { verdictOf } from "@/modules/match";
import { CodeStrip } from "@/shared/ui/components/code-strip";
import { messages } from "@/shared/ui/messages.nb";
import type { ApplicationEntry } from "../contracts";
import { formatCatalogueNumber } from "../core/catalogue-number";
import { RegisterActions } from "./register-actions";

// «17. nov. 2026»
const DATE = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const LINK =
  "font-semibold text-ink underline decoration-edge decoration-1 underline-offset-4 hover:decoration-amber";

function Title({ entry }: { entry: ApplicationEntry }) {
  return (
    <NextLink
      href={`/historikk/${entry.id}`}
      // Story 6.9 builds the page behind the link; nothing is loaded ahead.
      prefetch={false}
      className={LINK}
    >
      {entry.jobTitle ?? messages.history.unreadable}
    </NextLink>
  );
}

function Employer({ entry }: { entry: ApplicationEntry }) {
  return (
    <span className="block text-body text-ink-2">
      {entry.employer ?? messages.history.unreadable}
    </span>
  );
}

function When({ entry }: { entry: ApplicationEntry }) {
  return (
    <time
      dateTime={entry.createdAt}
      className="font-mono text-mono-meta text-ink-2"
    >
      {DATE.format(new Date(entry.createdAt))}
    </time>
  );
}

// The score sentence and its Verdict strip: the Verdict is derived from the
// score and always written out, so two rows never differ by colour alone.
function Score({ entry }: { entry: ApplicationEntry }) {
  const verdict = verdictOf(entry.score);
  const sentence =
    entry.matchedCount === null || entry.totalCount === null
      ? messages.history.scoreOnly(entry.score)
      : messages.result.score(
          entry.score,
          entry.matchedCount,
          entry.totalCount,
        );
  return (
    <span className="flex flex-col items-start gap-2">
      <span className="text-body text-ink tabular-nums">{sentence}</span>
      <CodeStrip kind={verdict === "strong" ? "found" : "outline"}>
        {messages.result.verdict[verdict]}
      </CodeStrip>
    </span>
  );
}

const HEAD = "caps border-edge border-b px-3 py-3 text-left text-ink-2";
const CELL = "px-3 py-5 align-top";

/**
 * The catalogue register of Historikk (Story 6.8, UX-DR21): the same entries
 * twice. A `<table>` with a hidden caption above 640 px and an `<ol>` at 640 px
 * or less; the media query hides the other with `display: none`, so only one is
 * ever in the accessibility tree. The caption takes focus when the page
 * changes (`captionRef`); the job title is the row header.
 */
export function CatalogueRegister({
  entries,
  name,
  captionRef,
}: {
  entries: readonly ApplicationEntry[];
  name: string | null;
  captionRef: Ref<HTMLTableCaptionElement>;
}) {
  const { columns } = messages.history;
  return (
    <>
      <div className="mt-8 overflow-x-auto max-640:hidden">
        <table className="w-full border-collapse text-left">
          <caption ref={captionRef} tabIndex={-1} className="sr-only">
            {messages.history.caption}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={HEAD}>
                {columns.number}
              </th>
              <th scope="col" className={HEAD}>
                {columns.position}
              </th>
              <th scope="col" className={HEAD}>
                {columns.date}
              </th>
              <th scope="col" className={HEAD}>
                {columns.score}
              </th>
              <th scope="col" className={HEAD}>
                <span className="sr-only">{columns.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-rule border-b hover:bg-hover"
              >
                <td className={`${CELL} font-mono text-register-number`}>
                  {formatCatalogueNumber(entry.seq)}
                </td>
                <th scope="row" className={`${CELL} font-normal`}>
                  <Title entry={entry} />
                  <Employer entry={entry} />
                </th>
                <td className={CELL}>
                  <When entry={entry} />
                </td>
                <td className={CELL}>
                  <Score entry={entry} />
                </td>
                <td className={`${CELL} text-right`}>
                  <RegisterActions entry={entry} name={name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol
        aria-label={messages.history.listLabel}
        className="m-0 mt-8 hidden list-none p-0 max-640:block"
      >
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 border-rule border-b py-5"
          >
            <span className="font-mono text-register-number-mobile">
              {formatCatalogueNumber(entry.seq)}
            </span>
            <div className="flex min-w-0 flex-col gap-3">
              <div>
                <Title entry={entry} />
                <Employer entry={entry} />
              </div>
              <When entry={entry} />
              <Score entry={entry} />
              <RegisterActions entry={entry} name={name} />
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
