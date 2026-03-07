import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

const columnMark = Decoration.mark({ class: "cm-csv-column-active" });

const columnHighlightTheme = EditorView.baseTheme({
  "&light .cm-csv-column-active": { backgroundColor: "#e8f4fd" },
  "&dark .cm-csv-column-active": { backgroundColor: "#1a3a4a" },
});

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
    columnHighlightTheme,
  ];
}
