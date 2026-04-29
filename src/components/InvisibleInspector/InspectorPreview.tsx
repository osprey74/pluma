import { useEffect, useRef, useCallback } from "react";
import {
  EditorView,
  lineNumbers,
  ViewPlugin,
  Decoration,
  DecorationSet,
  WidgetType,
} from "@codemirror/view";
import { EditorState, Extension, RangeSetBuilder } from "@codemirror/state";
import { getThemeExtension } from "../Editor/extensions/theme";
import { rulerExtension } from "../Editor/extensions/ruler";
import { classifyCodePoint, getCharInfo } from "../../lib/invisibleChars";
import { useEditorStore } from "../../stores/editorStore";

interface Props {
  text: string;
  fontFamily: string;
  fontSize: number;
}

/* ---------- Widget for invisible char badge ---------- */

class InvCharWidget extends WidgetType {
  constructor(
    readonly hex: string,
    readonly name: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "preview-inv-char";
    span.textContent = this.hex;
    span.title = `${this.name} (${this.hex})`;
    return span;
  }

  eq(other: InvCharWidget): boolean {
    return this.hex === other.hex;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

/* ---------- Decoration plugin ---------- */

function invisibleCharDecorations(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: { docChanged: boolean; view: EditorView }) {
        if (update.docChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const text = view.state.doc.toString();
        const chars = Array.from(text);
        let offset = 0;
        for (const ch of chars) {
          const cp = ch.codePointAt(0)!;
          const type = classifyCodePoint(cp);
          if (type === "invisible") {
            const hex = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
            const info = getCharInfo(cp);
            const deco = Decoration.replace({
              widget: new InvCharWidget(hex, info.name),
            });
            builder.add(offset, offset + ch.length, deco);
          }
          offset += ch.length;
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}

/* ---------- Color highlighting plugin ---------- */

function isDigit(cp: number): boolean {
  return cp >= 0x30 && cp <= 0x39;
}

function isSymbol(cp: number): boolean {
  if (
    (cp >= 0x21 && cp <= 0x2f) ||
    (cp >= 0x3a && cp <= 0x40) ||
    (cp >= 0x5b && cp <= 0x60) ||
    (cp >= 0x7b && cp <= 0x7e)
  )
    return true;
  if (
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0xff01 && cp <= 0xff20) ||
    (cp >= 0xff3b && cp <= 0xff40) ||
    (cp >= 0xff5b && cp <= 0xff65)
  )
    return true;
  return false;
}

const digitMark = Decoration.mark({ class: "preview-digit" });
const symbolMark = Decoration.mark({ class: "preview-symbol" });

function colorHighlightDecorations(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: { docChanged: boolean; view: EditorView }) {
        if (update.docChanged) {
          this.decorations = this.build(update.view);
        }
      }

      build(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const text = view.state.doc.toString();
        const chars = Array.from(text);
        let offset = 0;
        for (const ch of chars) {
          const cp = ch.codePointAt(0)!;
          const type = classifyCodePoint(cp);
          if (type === "visible") {
            if (isDigit(cp)) {
              builder.add(offset, offset + ch.length, digitMark);
            } else if (isSymbol(cp)) {
              builder.add(offset, offset + ch.length, symbolMark);
            }
          }
          offset += ch.length;
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations },
  );
}

/* ---------- Component ---------- */

export function InspectorPreview({ text, fontFamily, fontSize }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const wrapMode = useEditorStore((s) => s.wrapMode);
  const wrapColumn = useEditorStore((s) => s.wrapColumn);

  // Latest text in a ref so the create-effect can read the initial doc
  // without re-running when text changes.
  const textRef = useRef(text);
  textRef.current = text;

  const buildStyleExt = useCallback(
    (): Extension =>
      EditorView.theme({
        "&": { fontFamily, fontSize: `${fontSize}px` },
        ".cm-content": { fontFamily, fontSize: `${fontSize}px` },
      }),
    [fontFamily, fontSize],
  );

  const buildWrapExt = useCallback((): Extension => {
    if (wrapMode === "window") return EditorView.lineWrapping;
    if (wrapMode === "column")
      return [
        EditorView.lineWrapping,
        EditorView.theme({
          ".cm-content": { maxWidth: `${wrapColumn}ch` },
        }),
      ];
    return [];
  }, [wrapMode, wrapColumn]);

  // Create editor once. Text updates flow through dispatch (see effect below).
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      getThemeExtension(),
      rulerExtension(wrapColumn),
      invisibleCharDecorations(),
      colorHighlightDecorations(),
      buildStyleExt(),
      buildWrapExt(),
    ];

    const state = EditorState.create({ doc: textRef.current, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [wrapColumn, buildStyleExt, buildWrapExt]);

  // Update doc when text changes — dispatch a replace instead of rebuilding
  // the editor, which would otherwise discard scroll position and re-run all
  // view plugins on every keystroke upstream.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() === text) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: text },
    });
  }, [text]);

  return <div ref={containerRef} className="preview-fullscreen" />;
}
