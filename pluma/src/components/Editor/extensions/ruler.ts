import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

const rulerClass = "cm-ruler";

function getCharWidth(view: EditorView): number {
  // Measure actual rendered character width by inserting a hidden element
  // into .cm-content so it inherits the exact same font styles.
  const span = document.createElement("span");
  span.style.position = "absolute";
  span.style.visibility = "hidden";
  span.style.whiteSpace = "pre";
  span.textContent = "0123456789";
  view.contentDOM.appendChild(span);
  const w = span.getBoundingClientRect().width / 10;
  span.remove();
  return w || view.defaultCharacterWidth;
}

function buildRuler(
  maxCols: number,
  charW: number,
): HTMLDivElement {
  const ruler = document.createElement("div");
  ruler.className = rulerClass;

  const ticks = document.createElement("div");
  ticks.className = "cm-ruler-ticks";

  for (let i = 1; i <= maxCols; i++) {
    const tick = document.createElement("span");
    if (i % 10 === 0) {
      tick.className = "cm-ruler-tick cm-ruler-tick-major";
      tick.textContent = String(i);
    } else if (i % 5 === 0) {
      tick.className = "cm-ruler-tick cm-ruler-tick-minor";
      tick.textContent = "|";
    } else {
      tick.className = "cm-ruler-tick cm-ruler-tick-minor";
      tick.textContent = "'";
    }
    tick.style.left = `${i * charW}px`;
    ticks.appendChild(tick);
  }

  ruler.appendChild(ticks);
  return ruler;
}

function buildGuideLine(
  wrapColumn: number,
  charW: number,
): HTMLDivElement {
  const line = document.createElement("div");
  line.className = "cm-ruler-line";
  line.style.left = `${wrapColumn * charW}px`;
  return line;
}

export function rulerExtension(wrapColumn: number) {
  return [
    ViewPlugin.fromClass(
      class {
        rulerDom: HTMLDivElement | null = null;
        lineDom: HTMLDivElement | null = null;

        constructor(view: EditorView) {
          // Defer to requestAnimationFrame so font is loaded and
          // defaultCharacterWidth is accurate after first paint
          requestAnimationFrame(() => {
            const charW = getCharWidth(view);
            const maxCols = Math.max(
              wrapColumn,
              Math.ceil(window.innerWidth / charW) + 10,
            );
            this.rulerDom = buildRuler(maxCols, charW);
            this.lineDom = buildGuideLine(wrapColumn, charW);

            view.dom.appendChild(this.rulerDom);
            view.contentDOM.appendChild(this.lineDom);

            // Align ruler with content area (skip gutters + content padding)
            const gutters = view.dom.querySelector(".cm-gutters");
            const gutterW = gutters
              ? gutters.getBoundingClientRect().width
              : 0;
            const contentPadding =
              parseFloat(getComputedStyle(view.contentDOM).paddingLeft) || 0;
            this.rulerDom.style.left = `${gutterW + contentPadding}px`;
          });
        }

        update(_update: ViewUpdate) {}

        destroy() {
          this.rulerDom?.remove();
          this.lineDom?.remove();
        }
      },
    ),
    // Structural styles (base)
    EditorView.baseTheme({
      [`& .${rulerClass}`]: {
        position: "absolute",
        top: "0",
        right: "0",
        height: "20px",
        zIndex: "5",
        pointerEvents: "none",
      },
      "& .cm-ruler-ticks": {
        position: "relative",
        height: "100%",
      },
      "& .cm-ruler-tick": {
        position: "absolute",
        transform: "translateX(-50%)",
        fontSize: "9px",
        lineHeight: "20px",
        userSelect: "none",
      },
      "& .cm-ruler-line": {
        position: "absolute",
        top: "0",
        bottom: "0",
        width: "1px",
        pointerEvents: "none",
        zIndex: "1",
      },
      "& .cm-scroller": {
        paddingTop: "20px",
      },
    }),
    // Light theme colors
    EditorView.theme({
      [`& .${rulerClass}`]: {
        borderBottom: "1px solid #ccc",
        backgroundColor: "#ffffff",
      },
      "& .cm-ruler-tick-minor": {
        color: "#999",
      },
      "& .cm-ruler-tick-major": {
        color: "#000",
      },
      "& .cm-ruler-line": {
        backgroundColor: "#aaa",
      },
    }),
    // Dark theme colors
    EditorView.theme(
      {
        [`& .${rulerClass}`]: {
          borderBottom: "1px solid #3c3c3c",
          backgroundColor: "#1e1e1e",
        },
        "& .cm-ruler-tick-minor": {
          color: "#666",
        },
        "& .cm-ruler-tick-major": {
          color: "#ccc",
        },
        "& .cm-ruler-line": {
          backgroundColor: "#555",
        },
      },
      { dark: true },
    ),
  ];
}
