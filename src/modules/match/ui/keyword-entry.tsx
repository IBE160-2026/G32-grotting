import { CodeStrip } from "@/shared/ui/components/code-strip";
import { EvidenceQuote } from "@/shared/ui/components/evidence-quote";
import { Link } from "@/shared/ui/components/link";
import { messages } from "@/shared/ui/messages.nb";
import type { MatchedKeyword, MissingKeyword } from "../contracts";

type KeywordPosition = MatchedKeyword["positions"][number];

// «03»: the paragraph number is 1-based and has two digits.
function paragraphNumber(position: KeywordPosition | undefined) {
  return position === undefined
    ? undefined
    : String(position.paragraph + 1).padStart(2, "0");
}

const ENTRY = "border-rule border-t py-6";
const KEYWORD = "flex flex-wrap items-baseline gap-x-3 gap-y-2 text-keyword";

type EntryProps = {
  // The paragraphs of the Job ad as submitted, in the order the Keyword
  // positions count them.
  adParagraphs: readonly string[];
};

function MatchedEntry({ entry }: { entry: MatchedKeyword }) {
  const { evidence } = entry;
  return (
    <li className={ENTRY}>
      <h3 className={KEYWORD}>
        {entry.term}
        <CodeStrip kind="found">{messages.result.found.strip}</CodeStrip>
      </h3>
      <div className="mt-3">
        <EvidenceQuote
          text={evidence.text}
          mark={{ start: evidence.start, end: evidence.end }}
          source={messages.result.found.source(
            evidence.line,
            paragraphNumber(entry.positions[0]),
          )}
        />
      </div>
    </li>
  );
}

// «Se gapanalysen»: moves focus to the `h3` of the Gap of this Keyword. The
// target is given by the owner of the page; this slice knows nothing of Gaps.
function GapLink({ term, target }: { term: string; target: string }) {
  return (
    <p className="mt-3 mb-0 text-body">
      <Link
        kind="standalone"
        href={`#${target}`}
        onClick={(event) => {
          // A click that opens the link elsewhere is left to the browser.
          if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
          const element = document.getElementById(target);
          if (element === null) return;
          event.preventDefault();
          element.focus();
        }}
      >
        {messages.result.missing.gapLink}
        <span className="sr-only">
          {messages.result.missing.gapLinkFor(term)}
        </span>
      </Link>
    </p>
  );
}

function MissingEntry({
  entry,
  adParagraphs,
  target,
}: { entry: MissingKeyword; target?: string } & EntryProps) {
  const [position] = entry.positions;
  const adLine = position ? adParagraphs[position.paragraph] : undefined;
  const number = paragraphNumber(position);
  return (
    <li className={ENTRY}>
      <h3 className={KEYWORD}>
        {entry.term}
        <CodeStrip kind="missing">{messages.result.missing.strip}</CodeStrip>
      </h3>
      <p className="mt-3 text-body text-ink">
        {messages.result.missing.line(
          entry.explanation.key === "MISSING_KEYWORD"
            ? entry.explanation.params.keyword
            : entry.term,
        )}
      </p>
      {position && adLine !== undefined && number !== undefined ? (
        <div className="mt-3">
          <EvidenceQuote
            text={adLine}
            mark={{ start: position.start, end: position.end }}
            source={messages.result.missing.source(number)}
          />
        </div>
      ) : null}
      {target === undefined ? null : (
        <GapLink term={entry.term} target={target} />
      )}
    </li>
  );
}

// One of the two lists on the result. An empty list shows no heading.
export function KeywordList(
  props: EntryProps &
    (
      | { kind: "matched"; entries: readonly MatchedKeyword[] }
      | {
          kind: "missing";
          entries: readonly MissingKeyword[];
          // The `id` of the element each Missing keyword links to, by term.
          // Without a target there is no link.
          gapTargets?: Readonly<Record<string, string>>;
        }
    ),
) {
  if (props.entries.length === 0) return null;
  const heading =
    props.kind === "matched"
      ? messages.result.found.heading
      : messages.result.missing.heading;
  return (
    <section aria-labelledby={`${props.kind}-heading`}>
      <h2 id={`${props.kind}-heading`} className="mb-4 text-heading">
        {heading}
      </h2>
      <ul className="m-0 list-none p-0">
        {props.kind === "matched"
          ? props.entries.map((entry) => (
              <MatchedEntry key={entry.term} entry={entry} />
            ))
          : props.entries.map((entry) => (
              <MissingEntry
                key={entry.term}
                entry={entry}
                adParagraphs={props.adParagraphs}
                target={
                  props.gapTargets !== undefined &&
                  Object.hasOwn(props.gapTargets, entry.term)
                    ? props.gapTargets[entry.term]
                    : undefined
                }
              />
            ))}
      </ul>
    </section>
  );
}
