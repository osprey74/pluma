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
    if (i % 10 === 0) {
      // Major tick: tall line + number label
      const line = document.createElement("div");
      line.className = "cm-ruler-tick cm-ruler-tick-10";
      line.style.left = `${i * charW}px`;
      ticks.appendChild(line);

      const label = document.createElement("span");
      label.className = "cm-ruler-label";
      label.textContent = String(i);
      label.style.left = `${i * charW}px`;
      ticks.appendChild(label);
    } else if (i % 5 === 0) {
      // Medium tick
      const line = document.createElement("div");
      line.className = "cm-ruler-tick cm-ruler-tick-5";
      line.style.left = `${i * charW}px`;
      ticks.appendChild(line);
    } else {
      // Minor tick
      const line = document.createElement("div");
      line.className = "cm-ruler-tick cm-ruler-tick-1";
      line.style.left = `${i * charW}px`;
      ticks.appendChild(line);
    }
  }

  ruler.appendChild(ticks);
  return ruler;
}

export function rulerExtension(wrapColumn: number) {
  return [
    ViewPlugin.fromClass(
      class {
        rulerDom: HTMLDivElement | null = null;

        constructor(view: EditorView) {
          requestAnimationFrame(() => {
            const charW = getCharWidth(view);
            const maxCols = Math.max(
              wrapColumn,
              Math.ceil(window.innerWidth / charW) + 10,
            );
            this.rulerDom = buildRuler(maxCols, charW);

            view.dom.appendChild(this.rulerDom);

            const domRect = view.dom.getBoundingClientRect();
            const coords = view.coordsAtPos(0);
            if (coords) {
              this.rulerDom.style.left = `${coords.left - domRect.left}px`;
            }
          });
        }

        update(_update: ViewUpdate) {}

        destroy() {
          this.rulerDom?.remove();
        }
      },
    ),
    // Structural styles (base)
    EditorView.baseTheme({
      [`& .${rulerClass}`]: {
        position: "absolute",
        top: "0",
        right: "0",
        height: "31px",
        zIndex: "5",
        pointerEvents: "none",
      },
      "& .cm-ruler-ticks": {
        position: "relative",
        height: "100%",
      },
      "& .cm-ruler-tick": {
        position: "absolute",
        bottom: "0",
        width: "1px",
        transform: "translateX(-0.5px)",
        userSelect: "none",
      },
      "& .cm-ruler-tick-1": {
        height: "5px",
      },
      "& .cm-ruler-tick-5": {
        height: "10px",
      },
      "& .cm-ruler-tick-10": {
        height: "14px",
      },
      "& .cm-ruler-label": {
        position: "absolute",
        top: "1px",
        transform: "translateX(-50%)",
        fontSize: "9px",
        lineHeight: "12px",
        userSelect: "none",
        whiteSpace: "nowrap",
      },
      "& .cm-scroller": {
        paddingTop: "31px",
      },
    }),
    // Light theme colors
    EditorView.theme({
      [`& .${rulerClass}`]: {
        borderBottom: "1px solid #ccc",
        backgroundColor: "#ffffff",
      },
      "& .cm-ruler-tick": {
        backgroundColor: "#999",
      },
      "& .cm-ruler-tick-10": {
        backgroundColor: "#666",
      },
      "& .cm-ruler-label": {
        color: "#000",
      },
    }),
    // Dark theme colors
    EditorView.theme(
      {
        [`& .${rulerClass}`]: {
          borderBottom: "1px solid #3c3c3c",
          backgroundColor: "#1e1e1e",
        },
        "& .cm-ruler-tick": {
          backgroundColor: "#666",
        },
        "& .cm-ruler-tick-10": {
          backgroundColor: "#999",
        },
        "& .cm-ruler-label": {
          color: "#ccc",
        },
      },
      { dark: true },
    ),
  ];
}
