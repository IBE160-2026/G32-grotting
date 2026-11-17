// The geometry of the pulse plot (FR-8, UX-DR22): one baseline per paragraph of
// the Job ad, a peak at each Keyword. Pure: no DOM, clock, random or I/O, so one
// ad and its lists always give identical geometry. Text width comes in as an
// injected `measure`, since only the browser knows the font.

export type PlotMode = "full" | "home" | "compact" | "flat";
export type PlotState = "matched" | "missing";

/** A Keyword as the plot needs it: its term and where it sits in the ad. */
export type PlotTerm = {
  readonly term: string;
  readonly positions: readonly {
    readonly paragraph: number;
    readonly start: number;
    readonly end: number;
  }[];
};

/** Width in CSS pixels of `text` set at `px` pixels. */
export type Measure = (text: string, px: number) => number;

export type PlotSegment = {
  readonly kind: "neutral" | PlotState;
  readonly d: string;
};

export type PlotLine = {
  /** The paragraph's place in the ad, 0-based. */
  readonly paragraph: number;
  /** «03» */
  readonly index: string;
  readonly baseline: number;
  /** Closed path in the ground colour: lower lines hide upper ones. */
  readonly occluder: string;
  readonly segments: readonly PlotSegment[];
};

export type PlotLabel = {
  readonly term: string;
  readonly state: PlotState;
  readonly paragraph: number;
  /** The ground plate behind a floating label (full and home). */
  readonly plate?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly square: { readonly x: number; readonly y: number };
  readonly textX: number;
  readonly termY: number;
  readonly stateY: number;
  readonly termFontSize: number;
  readonly stateFontSize: number;
  /** The dotted leader from the peak to the label column (compact). */
  readonly leader?: string;
};

export type PlotLayout = {
  readonly mode: PlotMode;
  readonly width: number;
  readonly height: number;
  readonly lines: readonly PlotLine[];
  readonly labels: readonly PlotLabel[];
  /** Paragraphs in the ad, and how many of them are drawn. */
  readonly paragraphCount: number;
  readonly drawnCount: number;
  readonly stroke: {
    readonly neutral: number;
    readonly matched: number;
    readonly missing: number;
    readonly dash: string;
  };
};

export const SQUARE = 9;
const TERM_FONT = 12.5;
const STATE_FONT = 10;
const COMPACT_TERM_FONT = 12;
const COMPACT_STATE_FONT = 9;
const ROW = 32;
const ROW_STEP = 34;
const MAX_ROWS = 60;
const COMPACT_MAX = 640;

type Config = {
  width: number;
  left: number;
  right: number;
  top: number;
  gap: number;
  peak: number;
  ripple: number;
  sigma: number;
  window: number;
  step: number;
  labelX: number;
  neutral: number;
  matched: number;
  missing: number;
  dash: string;
};

const CONFIG: Record<PlotMode, Config> = {
  full: {
    width: 1160,
    left: 40,
    right: 990,
    top: 96,
    gap: 23,
    peak: 62,
    ripple: 2.4,
    sigma: 7,
    window: 30,
    step: 3,
    labelX: 0,
    neutral: 1.15,
    matched: 2.8,
    missing: 1.5,
    dash: "3.5 3",
  },
  home: {
    width: 620,
    left: 28,
    right: 604,
    top: 92,
    gap: 21,
    peak: 54,
    ripple: 2.2,
    sigma: 6,
    window: 24,
    step: 3,
    labelX: 0,
    neutral: 1.15,
    matched: 2.8,
    missing: 1.5,
    dash: "3.5 3",
  },
  compact: {
    width: 328,
    left: 24,
    right: 160,
    top: 0,
    gap: 0,
    peak: 30,
    ripple: 1.6,
    sigma: 4.2,
    window: 15,
    step: 2,
    labelX: 174,
    neutral: 1.15,
    matched: 2.4,
    missing: 1.5,
    dash: "3 2.5",
  },
  flat: {
    width: 520,
    left: 0,
    right: 520,
    top: 20,
    gap: 22,
    peak: 0,
    ripple: 1.6,
    sigma: 6,
    window: 0,
    step: 3,
    labelX: 0,
    neutral: 1,
    matched: 1,
    missing: 1,
    dash: "0",
  },
};

/** The mode a container of `containerWidth` pixels gets (≤ 640 px: compact). */
export function plotModeFor(
  containerWidth: number,
  placement: "result" | "home" | "flat",
): PlotMode {
  if (placement === "flat") return "flat";
  if (containerWidth <= COMPACT_MAX) return "compact";
  return placement === "home" ? "home" : "full";
}

/**
 * A width guess from the character count, for the server render and before
 * the fonts have loaded.
 */
export const estimateMeasure: Measure = (text, px) =>
  Array.from(text).length * px * 0.58;

/** A paragraph and where in it each Keyword first sits. */
type Spike = {
  readonly term: string;
  readonly state: PlotState;
  readonly start: number;
  x: number;
  peak: number;
};

function round(value: number): string {
  return value.toFixed(1);
}

function pathOf(points: readonly (readonly [number, number])[]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${round(x)} ${round(y)}`)
    .join("");
}

// A small ripple from the paragraph's own characters: the same paragraph always
// gives the same line.
function ripple(paragraph: string, f: number, seed: number): number {
  const length = paragraph.length;
  if (length === 0) return 0;
  const at = Math.min(length - 1, Math.floor(f * length));
  const code = paragraph.charCodeAt(at);
  return ((code * 7 + at * 13 + seed * 5) % 11) / 11;
}

type Drawn = {
  readonly points: [number, number][];
  readonly kinds: ("neutral" | PlotState)[];
};

function trace(
  paragraph: string,
  index: number,
  baseline: number,
  spikes: Spike[],
  c: Config,
): Drawn {
  const points: [number, number][] = [];
  const kinds: ("neutral" | PlotState)[] = [];
  const count = Math.floor((c.right - c.left) / c.step);
  const xs = Array.from({ length: count + 1 }, (_, i) => c.left + i * c.step);
  if (xs[xs.length - 1] < c.right - 0.01) xs.push(c.right);
  const compactScale = c.labelX > 0 ? 0.55 : 1;
  for (const spike of spikes) spike.peak = baseline;
  for (const x of xs) {
    const f = (x - c.left) / (c.right - c.left);
    const n = ripple(paragraph, f, index);
    const envelope = 0.35 + 0.65 * Math.sin(Math.PI * f);
    let lift = n * c.ripple * envelope;
    let kind: "neutral" | PlotState = "neutral";
    for (const spike of spikes) {
      const d = x - spike.x;
      const k = compactScale;
      lift +=
        c.peak * Math.exp(-(d * d) / (2 * c.sigma * c.sigma)) +
        c.peak * 0.3 * Math.exp(-((d + 11 * k) * (d + 11 * k)) / (50 * k)) +
        c.peak * 0.2 * Math.exp(-((d - 12 * k) * (d - 12 * k)) / (40 * k)) +
        n * c.peak * 0.22 * Math.exp(-(d * d) / (2 * 16 * 16 * k));
      if (Math.abs(d) < c.window) kind = spike.state;
    }
    const y = baseline - lift;
    for (const spike of spikes) {
      if (Math.abs(x - spike.x) < c.window && y < spike.peak) spike.peak = y;
    }
    points.push([x, y]);
    kinds.push(kind);
  }
  return { points, kinds };
}

// Runs of one kind become one path each; a run starts where the last ended.
function segmentsOf(drawn: Drawn): PlotSegment[] {
  const segments: PlotSegment[] = [];
  const { points, kinds } = drawn;
  let run: [number, number][] = [points[0]];
  let current = kinds[0];
  for (let i = 1; i < points.length; i++) {
    run.push(points[i]);
    if (kinds[i] !== current || i === points.length - 1) {
      if (run.length >= 2) segments.push({ kind: current, d: pathOf(run) });
      run = [points[i]];
      current = kinds[i];
    }
  }
  return segments;
}

type Box = { x: number; y: number; width: number; height: number };

function collides(a: Box, others: readonly Box[], pad: number): boolean {
  return others.some(
    (b) =>
      a.x < b.x + b.width + pad &&
      a.x + a.width + pad > b.x &&
      a.y < b.y + b.height + pad &&
      a.y + a.height + pad > b.y,
  );
}

type LabelContext = {
  readonly measure: Measure;
  readonly stateText: Record<PlotState, string>;
};

// The caps state word is set wide (stretch 125 %, tracking 0.14 em).
function stateWidth(text: string, measure: Measure): number {
  return measure(text, STATE_FONT) * 1.25 + text.length * STATE_FONT * 0.14;
}

/**
 * Lays out the plot. `paragraphs` are the ad's paragraphs in the order the
 * Keyword positions count them; a Keyword peaks at its first position in each
 * paragraph where it occurs, at `start` over the paragraph's length. `flat`
 * draws baselines only. `stateText` is the «FUNNET» / «MANGLER» pair, so no text
 * of the UI lives here.
 */
export function layoutPulsePlot(input: {
  paragraphs: readonly string[];
  matched: readonly PlotTerm[];
  missing: readonly PlotTerm[];
  mode: PlotMode;
  measure: Measure;
  stateText: Record<PlotState, string>;
}): PlotLayout {
  const { paragraphs, mode, measure } = input;
  const c = CONFIG[mode];
  const flat = mode === "flat";
  const compact = mode === "compact";
  const context: LabelContext = { measure, stateText: input.stateText };

  // Spikes per paragraph, left to right.
  const spikesBy = new Map<number, Spike[]>();
  if (!flat) {
    const add = (entry: PlotTerm, state: PlotState) => {
      const first = new Map<number, number>();
      for (const position of entry.positions) {
        const paragraph = paragraphs[position.paragraph];
        if (paragraph === undefined) continue;
        const known = first.get(position.paragraph);
        if (known === undefined || position.start < known) {
          first.set(position.paragraph, position.start);
        }
      }
      for (const [index, start] of first) {
        const length = Math.max(1, paragraphs[index].length);
        const margin = Math.min(c.window / 2, (c.right - c.left) / 4);
        const x = Math.min(
          c.right - margin,
          Math.max(
            c.left + margin,
            c.left + (start / length) * (c.right - c.left),
          ),
        );
        const list = spikesBy.get(index) ?? [];
        list.push({ term: entry.term, state, start, x, peak: 0 });
        spikesBy.set(index, list);
      }
    };
    for (const entry of input.matched) add(entry, "matched");
    for (const entry of input.missing) add(entry, "missing");
    for (const list of spikesBy.values()) {
      list.sort((a, b) => a.start - b.start || a.term.localeCompare(b.term));
    }
  }

  // Which paragraphs are drawn, and where their baselines sit.
  const rows = paragraphs
    .map((text, index) => ({ text, index }))
    .filter(({ index }) => !compact || spikesBy.has(index));
  const baselines: number[] = [];
  if (compact) {
    let y = 0;
    rows.forEach(({ index }, row) => {
      const count = spikesBy.get(index)?.length ?? 0;
      y +=
        row === 0
          ? Math.max(44, (count - 1) * ROW + 46)
          : Math.max(48, count * ROW + 18);
      baselines.push(y);
    });
  } else {
    rows.forEach((_, row) => {
      baselines.push(c.top + row * c.gap);
    });
  }
  const bottom = baselines.length > 0 ? baselines[baselines.length - 1] : 0;
  let height = bottom + 14;

  const lines: PlotLine[] = [];
  const labels: PlotLabel[] = [];
  const placed: Box[] = [];

  rows.forEach(({ text, index }, row) => {
    const baseline = baselines[row];
    const spikes = spikesBy.get(index) ?? [];
    const drawn = trace(text, index, baseline, spikes, c);
    const occluder = `${pathOf(drawn.points)}L${round(c.right)} ${round(baseline + 1.5)}L${round(c.left)} ${round(baseline + 1.5)}Z`;
    lines.push({
      paragraph: index,
      index: String(index + 1).padStart(2, "0"),
      baseline,
      occluder,
      segments: segmentsOf(drawn),
    });

    spikes.forEach((spike, j) => {
      if (compact) {
        const label = compactLabel(spike, j, spikes, index, c, context);
        labels.push(label);
        height = Math.max(height, label.stateY + 4);
      } else {
        const label = floatingLabel(spike, index, c, context, placed);
        labels.push(label);
        if (label.plate) {
          height = Math.max(height, label.plate.y + label.plate.height + 4);
        }
      }
    });
  });

  return {
    mode,
    width: c.width,
    height: Math.ceil(height),
    lines,
    labels,
    paragraphCount: paragraphs.length,
    drawnCount: rows.length,
    stroke: {
      neutral: c.neutral,
      matched: c.matched,
      missing: c.missing,
      dash: c.dash,
    },
  };
}

// Full and home: the label floats beside the peak, trying the right and left
// side on the peak's row, then rows above and below, and takes the first place
// free of the labels already placed.
function floatingLabel(
  spike: Spike,
  paragraph: number,
  c: Config,
  context: LabelContext,
  placed: Box[],
): PlotLabel {
  const { measure, stateText } = context;
  const text = stateText[spike.state];
  const w =
    Math.max(measure(spike.term, TERM_FONT), stateWidth(text, measure)) + 18;
  const peak = spike.peak - 2;
  // Rows on the peak's own level first, then further up and down; a label
  // never stands above the plot, and below it there is always room.
  const free = (x: number, y: number) =>
    x >= c.left &&
    x + w <= c.width - 2 &&
    y - 13 >= 0 &&
    !collides({ x: x - 4, y: y - 13, width: w + 8, height: 31 }, placed, 8);
  let found: [number, number] | undefined;
  for (let k = 0; k <= MAX_ROWS && found === undefined; k++) {
    const rises = k === 0 ? [0] : [-ROW_STEP * k, ROW_STEP * k];
    for (const rise of rises) {
      for (const x of [spike.x + 12, spike.x - 12 - w]) {
        if (found === undefined && free(x, peak + rise)) {
          found = [x, peak + rise];
        }
      }
    }
  }
  const [x, y] = found ?? [spike.x + 12, peak];
  const plate = { x: x - 4, y: y - 13, width: w + 8, height: 31 };
  placed.push(plate);
  return {
    term: spike.term,
    state: spike.state,
    paragraph,
    plate,
    square: { x, y: y - 8 },
    textX: x + 15,
    termY: y,
    stateY: y + 13,
    termFontSize: TERM_FONT,
    stateFontSize: STATE_FONT,
  };
}

// Compact: labels stand in a column to the right, one row per Keyword, rows 32
// px apart and stacked per paragraph, so they cannot collide. The last Keyword
// sits level with its peak, earlier ones stack upward, each joined to its peak
// by a dotted leader.
function compactLabel(
  spike: Spike,
  j: number,
  spikes: readonly Spike[],
  paragraph: number,
  c: Config,
  context: LabelContext,
): PlotLabel {
  const last = spikes.length - 1;
  const y = Math.round(spikes[last].peak + 4) - (last - j) * ROW;
  const gx = c.labelX;
  const leader =
    j === last
      ? `M${round(spike.x + 4)} ${round(spike.peak)}L${round(spike.x + 10)} ${round(y - 4)}H${round(gx - 5)}`
      : `M${round(spike.x)} ${round(spike.peak - 5)}V${round(y - 4)}H${round(gx - 5)}`;
  const available = c.width - (gx + 14) - 1;
  const w = context.measure(spike.term, COMPACT_TERM_FONT);
  const termFontSize =
    w > available ? (COMPACT_TERM_FONT * available) / w : COMPACT_TERM_FONT;
  return {
    term: spike.term,
    state: spike.state,
    paragraph,
    square: { x: gx, y: y - 9 },
    textX: gx + 14,
    termY: y,
    stateY: y + 13,
    termFontSize: Number(termFontSize.toFixed(2)),
    stateFontSize: COMPACT_STATE_FONT,
    leader,
  };
}
