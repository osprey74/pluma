import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";

const lightTheme = EditorView.theme({
  "&": {
    height: "100%",
  },
  ".cm-content": {
    caretColor: "#000",
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
    backgroundColor: "#f0f0f0",
  },
});

const darkThemeOverrides = EditorView.theme(
  {
    "&": {
      height: "100%",
    },
  },
  { dark: true },
);

export function getThemeExtension(isDark: boolean): Extension {
  if (isDark) {
    return [oneDark, darkThemeOverrides];
  }
  return lightTheme;
}
