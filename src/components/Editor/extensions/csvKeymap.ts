import { EditorView, keymap } from "@codemirror/view";

function moveToNextCell(view: EditorView, delimiter: string): boolean {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const colPos = pos - line.from;

  const nextDelim = line.text.indexOf(delimiter, colPos);
  if (nextDelim !== -1) {
    view.dispatch({
      selection: { anchor: line.from + nextDelim + 1 },
    });
    return true;
  }

  // Move to start of next line if no more delimiters
  const nextLineNum = line.number + 1;
  if (nextLineNum <= state.doc.lines) {
    const nextLine = state.doc.line(nextLineNum);
    view.dispatch({
      selection: { anchor: nextLine.from },
    });
    return true;
  }
  return false;
}

function moveToPrevCell(view: EditorView, delimiter: string): boolean {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const colPos = pos - line.from;

  const beforeCursor = line.text.substring(0, Math.max(0, colPos - 1));
  const prevDelim = beforeCursor.lastIndexOf(delimiter);
  if (prevDelim !== -1) {
    view.dispatch({
      selection: { anchor: line.from + prevDelim + 1 },
    });
    return true;
  }

  // Move to end of previous line
  const prevLineNum = line.number - 1;
  if (prevLineNum >= 1) {
    const prevLine = state.doc.line(prevLineNum);
    view.dispatch({
      selection: { anchor: prevLine.to },
    });
    return true;
  }
  return false;
}

export const csvKeymap = (delimiter: string) =>
  keymap.of([
    {
      key: "Tab",
      run: (view) => moveToNextCell(view, delimiter),
    },
    {
      key: "Shift-Tab",
      run: (view) => moveToPrevCell(view, delimiter),
    },
  ]);
