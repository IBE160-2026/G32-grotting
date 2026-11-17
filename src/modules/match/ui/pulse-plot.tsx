"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "@/shared/ui/debounce";
import { messages } from "@/shared/ui/messages.nb";
import {
  estimateMeasure,
  layoutPulsePlot,
  type Measure,
  type PlotLabel,
  type PlotLayout,
  type PlotMode,
  type PlotState,
  type PlotTerm,
  plotModeFor,
} from "../core/pulse-layout";

type Placement = "result" | "home" | "flat";

type PulsePlotProps = {
  // The paragraphs of the Job ad, in the order the Keyword positions count them.
  paragraphs: readonly string[];
  matched: readonly PlotTerm[];
  missing: readonly PlotTerm[];
  // `result`: the Søknad result. `home`: Hjem, a little tighter. `flat`: baselines
  // only, for the form before there is a result.
  placement: Placement;
};

const REDRAW_MS = 150;
const COMPACT_MAX_WIDTH = 420;

const FILL: Record<PlotState, string> = {
  matched: "fill-moss",
  missing: "fill-rust",
};

// The layout asks for widths in CSS pixels at the text's own size; the canvas
// answers with the font of the container once the fonts have loaded.
function canvasMeasure(family: string): Measure {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return estimateMeasure;
  return (text, px) => {
    context.font = `600 ${px}px ${family}`;
    return context.measureText(text).width;
  };
}

function Label({ label, compact }: { label: PlotLabel; compact: boolean }) {
  const { plate, square } = label;
  return (
    <g>
      {label.leader ? (
        <path
          d={label.leader}
          fill="none"
          className="stroke-ink-2"
          strokeWidth={1}
          strokeDasharray="1 2.5"
        />
      ) : null}
      {plate ? (
        <rect
          x={plate.x}
          y={plate.y}
          width={plate.width}
          height={plate.height}
          className="fill-ground"
          opacity={0.94}
        />
      ) : null}
      <rect
        x={square.x}
        y={square.y}
        width={9}
        height={9}
        className={FILL[label.state]}
      />
      <text
        x={label.textX}
        y={label.termY}
        className="fill-ink text-plot-label"
        style={compact ? { fontSize: label.termFontSize } : undefined}
      >
        {label.term}
      </text>
      <text
        x={label.textX}
        y={label.stateY}
        className="fill-ink font-caps text-plot-state"
        style={{
          fontStretch: "125%",
          fontSize: compact ? label.stateFontSize : undefined,
        }}
      >
        {messages.plot.state[label.state]}
      </text>
    </g>
  );
}

function Drawing({ layout }: { layout: PlotLayout }) {
  const flat = layout.mode === "flat";
  const compact = layout.mode === "compact";
  const { stroke } = layout;
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      focusable="false"
      aria-hidden="true"
      className="block h-auto w-full overflow-visible"
      style={{ maxWidth: compact ? COMPACT_MAX_WIDTH : layout.width }}
    >
      <g>
        {layout.lines.map((line) => (
          <g key={line.paragraph}>
            <path d={line.occluder} className="fill-ground" />
            {line.segments.map((segment) => (
              <path
                key={`${segment.kind}-${segment.d}`}
                d={segment.d}
                fill="none"
                className={flat ? "stroke-plot-flat" : "stroke-ink"}
                strokeLinejoin="round"
                strokeLinecap="butt"
                strokeWidth={
                  segment.kind === "neutral"
                    ? stroke.neutral
                    : stroke[segment.kind]
                }
                strokeDasharray={
                  segment.kind === "missing" ? stroke.dash : undefined
                }
              />
            ))}
          </g>
        ))}
      </g>
      {flat ? null : (
        <g>
          {layout.lines.map((line) => (
            <text
              key={line.paragraph}
              x={0}
              y={line.baseline + 3.5}
              className="fill-ink-2 font-mono text-plot-index"
            >
              {line.index}
            </text>
          ))}
          {layout.labels.map((label) => (
            <Label
              key={`${label.paragraph}-${label.term}`}
              label={label}
              compact={compact}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

function LegendLine({
  stroke,
  dash,
  children,
}: {
  stroke: number;
  dash?: string;
  children: string;
}) {
  return (
    <li className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 34 10"
        width={34}
        height={10}
        aria-hidden="true"
        className="flex-none"
      >
        <path
          d="M0 5h34"
          className="stroke-ink"
          strokeWidth={stroke}
          strokeDasharray={dash}
        />
      </svg>
      {children}
    </li>
  );
}

// The legend draws the three line kinds as the plot in the same mode does.
function Legend({ layout }: { layout: PlotLayout }) {
  const { stroke } = layout;
  return (
    <ul
      className={[
        "m-0 mt-5 flex list-none gap-y-2 p-0 text-hint text-ink-2",
        layout.mode === "compact" ? "flex-col" : "flex-wrap gap-x-8",
      ].join(" ")}
    >
      <LegendLine stroke={stroke.neutral}>
        {messages.plot.legend.thin}
      </LegendLine>
      <LegendLine stroke={stroke.matched}>
        {messages.plot.legend.matched}
      </LegendLine>
      <LegendLine stroke={stroke.missing} dash={stroke.dash}>
        {messages.plot.legend.missing}
      </LegendLine>
    </ul>
  );
}

type ViewProps = PulsePlotProps & {
  mode: PlotMode;
  measure: Measure;
};

// The plot as drawn in one mode: the part that holds no state.
export function PulsePlotView({
  paragraphs,
  matched,
  missing,
  mode,
  measure,
}: Omit<ViewProps, "placement">) {
  const layout = useMemo(
    () =>
      layoutPulsePlot({
        paragraphs,
        matched,
        missing,
        mode,
        measure,
        stateText: messages.plot.state,
      }),
    [paragraphs, matched, missing, mode, measure],
  );

  if (layout.paragraphCount === 0) return null;

  if (layout.mode === "flat") {
    return (
      <div aria-hidden="true">
        <Drawing layout={layout} />
      </div>
    );
  }

  const compact = layout.mode === "compact";
  const label = messages.plot.label(
    layout.paragraphCount,
    compact ? layout.drawnCount : undefined,
    matched.map((entry) => entry.term),
    missing.map((entry) => entry.term),
  );
  return (
    <>
      <figure role="img" aria-label={label} className="m-0">
        <Drawing layout={layout} />
        {compact ? (
          <figcaption className="mt-3 text-hint text-ink-2">
            {messages.plot.compactCaption(
              layout.drawnCount,
              layout.paragraphCount,
            )}
          </figcaption>
        ) : null}
      </figure>
      <Legend layout={layout} />
    </>
  );
}

/**
 * The Job ad drawn as a pulse plot (FR-8, UX-DR22): a line per paragraph, a peak
 * at each Keyword, thick where the CV has it and dashed where it does not. No
 * hover, click or focusable part; the keyword lists are its full equivalent.
 * The first render is the full variant, the same on server and client. After
 * mount the container's width picks full or compact, and the plot is drawn
 * again once the fonts have loaded and, debounced, when the window resizes.
 */
export function PulsePlot({
  paragraphs,
  matched,
  missing,
  placement,
}: PulsePlotProps) {
  const container = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<PlotMode>(plotModeFor(Infinity, placement));
  const [measure, setMeasure] = useState<Measure>(() => estimateMeasure);

  useEffect(() => {
    const element = container.current;
    if (!element || placement === "flat") return;
    let alive = true;
    const pick = () => {
      if (alive) setMode(plotModeFor(element.clientWidth, placement));
    };
    pick();
    const redraw = debounce(pick, REDRAW_MS);
    window.addEventListener("resize", redraw);
    document.fonts?.ready.then(() => {
      if (!alive) return;
      setMeasure(() => canvasMeasure(getComputedStyle(element).fontFamily));
      pick();
    });
    return () => {
      alive = false;
      redraw.cancel();
      window.removeEventListener("resize", redraw);
    };
  }, [placement]);

  return (
    <div ref={container}>
      <PulsePlotView
        paragraphs={paragraphs}
        matched={matched}
        missing={missing}
        mode={mode}
        measure={measure}
      />
    </div>
  );
}
