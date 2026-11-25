import { PulsePlot } from "@/modules/match/ui";
import { Link } from "@/shared/ui/components/link";
import { messages } from "@/shared/ui/messages.nb";

const NONE: readonly never[] = [];
// Six baselines: the flat plot of an ad that has not been written yet.
const FLAT_PARAGRAPHS = ["", "", "", "", "", ""] as const;

// Historikk with no entries (Story 6.8, UX-DR31): the number the first
// Application will get, as an outline, the FR-21 sentence, and the way in. The
// ghost number and the flat plot are decoration, hidden from assistive
// technology.
export function EmptyState() {
  const { empty } = messages.history;
  return (
    <div className="mt-10 max-w-measure">
      <p
        aria-hidden="true"
        className="m-0 font-mono text-ghost-number text-transparent [-webkit-text-stroke:1px_var(--color-edge)]"
      >
        {empty.ghost}
      </p>
      <p className="mt-6 text-lede text-ink">{empty.text}</p>
      <p className="mt-2 text-body text-ink-2">{empty.hint}</p>
      <div className="mt-6">
        <Link kind="button" href="/soknad">
          {empty.action}
        </Link>
      </div>
      <div aria-hidden="true" className="mt-10">
        <PulsePlot
          placement="flat"
          paragraphs={FLAT_PARAGRAPHS}
          matched={NONE}
          missing={NONE}
        />
      </div>
    </div>
  );
}
