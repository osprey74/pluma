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
const fullwidthSpaceDecoration = Decoration.mark({ class: "cm-ws-fullwidth-space" });
const tabDecoration = Decoration.mark({ class: "cm-ws-tab" });

class NewlineWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ws-newline";
    span.textContent = "\u21B5";
    return span;
  }
}

const newlineWidget = Decoration.widget({
  widget: new NewlineWidget(),
  side: 1,
});

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const pos = from + i;
      if (ch === " ") {
        builder.add(pos, pos + 1, spaceDecoration);
      } else if (ch === "\u3000") {
        builder.add(pos, pos + 1, fullwidthSpaceDecoration);
      } else if (ch === "\t") {
        builder.add(pos, pos + 1, tabDecoration);
      } else if (ch === "\n") {
        builder.add(pos, pos, newlineWidget);
      }
    }
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

const whitespaceTheme = EditorView.baseTheme({
  ".cm-ws-space": {
    position: "relative",
  },
  ".cm-ws-space::before": {
    content: "'\\2423'", // U+2423 open box
    position: "absolute",
    color: whitespaceColor,
    pointerEvents: "none",
  },
  ".cm-ws-fullwidth-space": {
    position: "relative",
  },
  ".cm-ws-fullwidth-space::before": {
    content: "'\\25A1'", // U+25A1 white square
    position: "absolute",
    color: whitespaceColor,
    pointerEvents: "none",
  },
  ".cm-ws-tab": {
    position: "relative",
  },
  ".cm-ws-tab::before": {
    content: "'\\2192'", // rightwards arrow
    position: "absolute",
    color: whitespaceColor,
    pointerEvents: "none",
  },
  ".cm-ws-newline": {
    color: whitespaceColor,
    pointerEvents: "none",
  },
});

const whitespaceThemeDark = EditorView.theme(
  {
    ".cm-ws-space::before": {
      color: whitespaceColorDark,
    },
    ".cm-ws-fullwidth-space::before": {
      color: whitespaceColorDark,
    },
    ".cm-ws-tab::before": {
      color: whitespaceColorDark,
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
