import { EditorSelection, EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, RectangleMarker, WidgetType, layer } from "@codemirror/view";

const columnHighlightTheme = EditorView.baseTheme({
  // Render the layer above the text so the 1px left border stays continuous
  // across line gaps. pointer-events:none keeps text selectable through it.
  ".cm-csv-column-layer": {
    pointerEvents: "none",
  },
  ".cm-csv-column-layer .cm-csv-column-active": {
    backgroundColor: "#16a34a",
  },
  ".cm-csv-pad": {
    display: "inline-block",
    verticalAlign: "baseline",
    pointerEvents: "none",
    userSelect: "none",
  },
});

// East Asian Width: returns 2 for Wide/Fullwidth chars, 1 otherwise.
// Covers the ranges relevant for CJK text alignment in monospace fonts.
function charWidth(cp: number): number {
  if (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK Radicals / Kangxi
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana, Katakana, Bopomofo, CJK Symbols
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compat Ideographs
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK Compat Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth signs
    (cp >= 0x20000 && cp <= 0x2fffd) || // CJK Ext B-F
    (cp >= 0x30000 && cp <= 0x3fffd)
  ) {
    return 2;
  }
  return 1;
}

function stringWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined) w += charWidth(cp);
  }
  return w;
}

class PadWidget extends WidgetType {
  constructor(readonly count: number) {
    super();
  }
  eq(other: PadWidget): boolean {
    return other.count === this.count;
  }
  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-csv-pad";
    span.style.width = `${this.count}ch`;
    // Zero-width space gives the inline-block proper baseline and line-height
    // so the caret rendered at the widget boundary keeps line-height (without
    // text content the box collapses to 0 and the caret becomes invisible).
    span.textContent = "​";
    span.setAttribute("aria-hidden", "true");
    return span;
  }
  ignoreEvent(): boolean {
    return true;
  }
}

function getColumnIndex(lineText: string, cursorCol: number, delimiter: string): number {
  let col = 0;
  for (let i = 0; i < cursorCol && i < lineText.length; i++) {
    if (lineText[i] === delimiter) col++;
  }
  return col;
}

// Build 1px-wide vertical line markers at the active column's left edge for
// every visible row. Each marker is intentionally extended by 1px above and
// below the cell so adjacent rows overlap and the left line stays continuous
// across the inter-line gap that RectangleMarker.forRange leaves behind.
function buildColumnMarkers(view: EditorView, delimiter: string): readonly RectangleMarker[] {
  const state = view.state;
  const pos = state.selection.main.head;
  const cursorLine = state.doc.lineAt(pos);
  const cursorCol = pos - cursorLine.from;
  const activeColumn = getColumnIndex(cursorLine.text, cursorCol, delimiter);

  const { viewport } = view;
  const fromLineNum = state.doc.lineAt(viewport.from).number;
  const toLineNum = state.doc.lineAt(viewport.to).number;

  const markers: RectangleMarker[] = [];
  for (let i = fromLineNum; i <= toLineNum; i++) {
    const line = state.doc.line(i);
    const parts = line.text.split(delimiter);
    let offset = 0;

    for (let j = 0; j < parts.length; j++) {
      if (j === activeColumn) {
        const from = line.from + offset;
        const to = from + parts[j].length;
        // Pass even when from === to: RectangleMarker.forRange returns a
        // caret-shaped marker for empty ranges, which gives us a vertical
        // line at the column position so empty cells stay on the border.
        const base = RectangleMarker.forRange(
          view,
          "cm-csv-column-active",
          EditorSelection.range(from, to),
        );
        // For empty cells, RectangleMarker.forRange uses the surrounding
        // character's (comma) bounding box, which is much shorter than the
        // line height. Use a larger vertical extension in that case so the
        // line still bridges into both adjacent rows.
        const extendY = from === to ? 14 : 3;
        for (const m of base) {
          markers.push(
            new RectangleMarker(
              "cm-csv-column-active",
              m.left - 2,
              m.top - extendY,
              1,
              m.height + extendY * 2,
            ),
          );
        }
      }
      offset += parts[j].length + 1; // +1 for delimiter
    }
  }

  return markers;
}

function columnLayer(delimiter: string) {
  return layer({
    // Render below the text/cursor layer so the cursor caret always wins.
    // drawSelection's cursor layer is above:true; if our layer is also above
    // and registered after it, the caret can get visually covered by our
    // marker rectangles (notably at the right edge of single-character cells
    // where a padding widget sits at the same position).
    above: false,
    class: "cm-csv-column-layer",
    update(update) {
      return update.docChanged || update.selectionSet || update.viewportChanged;
    },
    markers(view) {
      return buildColumnMarkers(view, delimiter);
    },
  });
}

// Performance guard: skip padding computation for very large docs.
const PAD_MAX_LINES = 20000;

function buildColumnPadding(
  state: EditorState,
  delimiter: string,
): DecorationSet {
  if (state.doc.lines > PAD_MAX_LINES) {
    return Decoration.none;
  }

  // Pass 1: compute max display width per column.
  const maxWidths: number[] = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const parts = line.text.split(delimiter);
    for (let j = 0; j < parts.length; j++) {
      const w = stringWidth(parts[j]);
      if (maxWidths[j] === undefined || w > maxWidths[j]) maxWidths[j] = w;
    }
  }

  // Pass 2: collect padding widgets at cell-end positions.
  type Entry = { from: number; deco: Decoration };
  const entries: Entry[] = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const parts = line.text.split(delimiter);
    let offset = 0;
    // Don't pad the last column (no trailing delimiter to align against).
    const lastIdx = parts.length - 1;
    for (let j = 0; j < parts.length; j++) {
      const cellLen = parts[j].length;
      if (j < lastIdx) {
        const pad = (maxWidths[j] ?? 0) - stringWidth(parts[j]);
        if (pad > 0) {
          const from = line.from + offset + cellLen;
          entries.push({
            from,
            deco: Decoration.widget({ widget: new PadWidget(pad), side: 1 }),
          });
        }
      }
      offset += cellLen + 1;
    }
  }

  entries.sort((a, b) => a.from - b.from);
  const builder = new RangeSetBuilder<Decoration>();
  for (const e of entries) builder.add(e.from, e.from, e.deco);
  return builder.finish();
}

export function csvColumnHighlight(delimiter: string) {
  return [
    columnLayer(delimiter),
    StateField.define<DecorationSet>({
      create(state) {
        return buildColumnPadding(state, delimiter);
      },
      update(decorations, tr) {
        if (!tr.docChanged) return decorations;
        return buildColumnPadding(tr.state, delimiter);
      },
      provide: (f) => EditorView.decorations.from(f),
    }),
    columnHighlightTheme,
  ];
}
