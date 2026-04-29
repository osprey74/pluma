import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const spaceDecoration = Decoration.mark({ class: "cm-ws-space" });
const fullwidthSpaceDecoration = Decoration.mark({
  class: "cm-ws-fullwidth-space",
});
const tabDecoration = Decoration.mark({ class: "cm-ws-tab" });

class NewlineWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ws-newline";
    span.textContent = "↵";
    return span;
  }
}

const newlineWidget = Decoration.widget({
  widget: new NewlineWidget(),
  side: 1,
});

// Merge adjacent same-type whitespace into a single mark. This keeps the
// per-line span count bounded by indent/dedent transitions instead of by
// character count — critical for files heavy on indentation (a 56%-space
// file in the viewport drops from ~1800 spans to ~150).
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let runChar: string | null = null;
    let runStart = -1;

    const flushRun = (endRel: number) => {
      if (runChar === null || runStart < 0) return;
      const start = from + runStart;
      const end = from + endRel;
      if (runChar === " ") builder.add(start, end, spaceDecoration);
      else if (runChar === "　")
        builder.add(start, end, fullwidthSpaceDecoration);
      else if (runChar === "\t") builder.add(start, end, tabDecoration);
      runChar = null;
      runStart = -1;
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === " " || ch === "　" || ch === "\t") {
        if (ch !== runChar) {
          flushRun(i);
          runChar = ch;
          runStart = i;
        }
      } else {
        flushRun(i);
        if (ch === "\n") {
          builder.add(from + i, from + i, newlineWidget);
        }
      }
    }
    flushRun(text.length);
  }

  return builder.finish();
}

const whitespacePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const whitespaceColor = "#a8d4f0";
const whitespaceColorDark = "#3a6a8a";

// Encode an SVG as a data URI usable in a CSS url(). We avoid the heavy
// per-character ::before approach (one extra layout box + absolute
// positioning per glyph) in favour of background-image, which is rendered
// at paint time only and never participates in layout.
function openBoxSvg(color: string): string {
  // U+2423 OPEN BOX shape: a U-shape sitting at the bottom of the cell.
  // viewBox is roughly 1:1.6 to match typical monospace cell aspect.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 16'><path d='M2 9 V13 H8 V9' fill='none' stroke='${color}' stroke-width='1.2' stroke-linecap='square'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

function whiteSquareSvg(color: string): string {
  // U+25A1 WHITE SQUARE shape: a square outline centred in a 2ch (CJK) cell.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 16'><rect x='4' y='3' width='12' height='10' fill='none' stroke='${color}' stroke-width='1.2'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

function arrowSvg(color: string): string {
  // U+2192 RIGHTWARDS ARROW shape.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><path d='M1 5 H7 M5 3 L7 5 L5 7' fill='none' stroke='${color}' stroke-width='1'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

const whitespaceTheme = EditorView.baseTheme({
  ".cm-ws-space": {
    backgroundImage: openBoxSvg(whitespaceColor),
    backgroundSize: "1ch 100%",
    backgroundRepeat: "repeat-x",
    // Anchor at the left so tiles align to character cells. With "center",
    // an even-width span starts the first tile at half-tile offset, splitting
    // the glyph at both ends of the run.
    backgroundPosition: "0 center",
  },
  ".cm-ws-fullwidth-space": {
    backgroundImage: whiteSquareSvg(whitespaceColor),
    backgroundSize: "2ch 100%",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "0 center",
  },
  ".cm-ws-tab": {
    backgroundImage: arrowSvg(whitespaceColor),
    backgroundSize: "auto 80%",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "left center",
  },
  ".cm-ws-newline": {
    color: whitespaceColor,
    pointerEvents: "none",
  },
});

const whitespaceThemeDark = EditorView.theme(
  {
    ".cm-ws-space": {
      backgroundImage: openBoxSvg(whitespaceColorDark),
    },
    ".cm-ws-fullwidth-space": {
      backgroundImage: whiteSquareSvg(whitespaceColorDark),
    },
    ".cm-ws-tab": {
      backgroundImage: arrowSvg(whitespaceColorDark),
    },
    ".cm-ws-newline": {
      color: whitespaceColorDark,
    },
  },
  { dark: true },
);

export function whitespaceExtension() {
  return [whitespacePlugin, whitespaceTheme, whitespaceThemeDark];
}
