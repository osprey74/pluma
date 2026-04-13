import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";

const columnMark = Decoration.mark({ class: "cm-csv-column-active" });

const columnHighlightTheme = EditorView.baseTheme({
  ".cm-csv-column-active": {
    backgroundColor: "#d4edda",
    color: "#000",
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

function buildColumnDecorations(
  state: EditorState,
  delimiter: string,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const pos = state.selection.main.head;
  const cursorLine = state.doc.lineAt(pos);
  const cursorCol = pos - cursorLine.from;
  const activeColumn = getColumnIndex(cursorLine.text, cursorCol, delimiter);

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const parts = line.text.split(delimiter);
    let offset = 0;

    for (let j = 0; j < parts.length; j++) {
      if (j === activeColumn) {
        const from = line.from + offset;
        const to = from + parts[j].length;
        if (from < to) {
          builder.add(from, to, columnMark);
        }
      }
      offset += parts[j].length + 1; // +1 for delimiter
    }
  }

  return builder.finish();
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
    StateField.define<DecorationSet>({
      create(state) {
        return buildColumnDecorations(state, delimiter);
      },
      update(decorations, tr) {
        if (!tr.docChanged && !tr.selection) return decorations;
        return buildColumnDecorations(tr.state, delimiter);
      },
      provide: (f) => EditorView.decorations.from(f),
    }),
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
