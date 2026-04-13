import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";

const lightTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#2563eb",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#2563eb",
    borderLeftWidth: "1px",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "#3390ff44",
  },
  "& .cm-selectionBackground": {
    background: "#3390ff30",
  },
  ".cm-gutters": {
    backgroundColor: "#f5f5f5",
    borderRight: "1px solid #ddd",
    color: "#999",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#e8e8e8",
  },
  ".cm-activeLine": {
    backgroundColor: "#0000000a",
  },
  ".cm-panels, .cm-panels.cm-panels-bottom, .cm-panels.cm-panels-top": {
    backgroundColor: "#f5f5f5",
    color: "#000",
    borderColor: "#ddd",
  },
  ".cm-panel.cm-search": {
    backgroundColor: "#f5f5f5",
    color: "#000",
  },
  ".cm-panel.cm-search label": {
    color: "#000",
  },
  ".cm-panel.cm-search input, .cm-panel.cm-search input[type=checkbox]": {
    color: "#000",
  },
  ".cm-panel.cm-search input[type=text]": {
    backgroundColor: "#fff",
    color: "#000",
    border: "1px solid #ccc",
  },
  ".cm-panel.cm-search button, .cm-panel.cm-search .cm-button, .cm-button": {
    backgroundColor: "#f5f5f5",
    backgroundImage: "none",
    color: "#000",
    border: "1px solid #ccc",
  },
  ".cm-panel.cm-search button:hover, .cm-panel.cm-search .cm-button:hover, .cm-button:hover": {
    backgroundColor: "#e8e8e8",
    backgroundImage: "none",
  },
  ".cm-panel.cm-search button[name=close]": {
    backgroundColor: "transparent",
    backgroundImage: "none",
    border: "none",
    color: "#000",
  },
});

export function getThemeExtension(): Extension {
  return lightTheme;
}
