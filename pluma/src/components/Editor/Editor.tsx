import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useSyncExternalStore } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { EditorState, Extension, Compartment } from "@codemirror/state";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import { getThemeExtension } from "./extensions/theme";
import { csvKeymap } from "./extensions/csvKeymap";
import { csvColumnHighlight } from "./extensions/csvHighlight";
import { rulerExtension } from "./extensions/ruler";
import { whitespaceExtension } from "./extensions/whitespace";
import { useEditorStore } from "../../stores/editorStore";

export interface EditorHandle {
  getContent: () => string;
  setContent: (text: string) => void;
  getView: () => EditorView | null;
}

interface EditorProps {
  initialContent?: string;
  readOnly?: boolean;
}

const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ initialContent = "", readOnly = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const styleCompRef = useRef(new Compartment());
    const wrapCompRef = useRef(new Compartment());
    const rulerCompRef = useRef(new Compartment());
    const {
      setCursorPosition,
      setIsModified,
      delimiter,
      filePath,
      fontFamily,
      fontSize,
      fontColor,
      editorBgColor,
      wrapMode,
      wrapColumn,
    } = useEditorStore();

    const isDark = useMediaDark();

    useImperativeHandle(ref, () => ({
      getContent: () => viewRef.current?.state.doc.toString() ?? "",
      getView: () => viewRef.current,
      setContent: (text: string) => {
        if (viewRef.current) {
          viewRef.current.dispatch({
            changes: {
              from: 0,
              to: viewRef.current.state.doc.length,
              insert: text,
            },
          });
        }
      },
    }));

    const getFileExtension = useCallback(() => {
      if (!filePath) return null;
      return filePath.split(".").pop()?.toLowerCase() ?? null;
    }, [filePath]);

    // Build style extension from current settings
    const buildStyleExt = useCallback((): Extension => {
      return EditorView.theme({
        "&": {
          fontFamily,
          fontSize: `${fontSize}px`,
          ...(editorBgColor ? { backgroundColor: editorBgColor } : {}),
        },
        ".cm-content": {
          fontFamily,
          fontSize: `${fontSize}px`,
          ...(fontColor ? { color: fontColor } : {}),
        },
        ...(editorBgColor
          ? { ".cm-gutters": { backgroundColor: editorBgColor } }
          : {}),
      });
    }, [fontFamily, fontSize, fontColor, editorBgColor]);

    // Build wrap extension from current settings
    const buildWrapExt = useCallback((): Extension => {
      if (wrapMode === "window") {
        return EditorView.lineWrapping;
      } else if (wrapMode === "column") {
        return [
          EditorView.lineWrapping,
          EditorView.theme({
            ".cm-content": { maxWidth: `${wrapColumn}ch` },
          }),
        ];
      }
      return [];
    }, [wrapMode, wrapColumn]);

    // Create editor once (structural deps only)
    useEffect(() => {
      if (!containerRef.current) return;

      const ext = getFileExtension();
      const extensions: Extension[] = [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        search({ top: false }),
        rectangularSelection(),
        crosshairCursor(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        getThemeExtension(isDark),
        rulerCompRef.current.of(rulerExtension(wrapColumn)),
        whitespaceExtension(),
        styleCompRef.current.of(buildStyleExt()),
        wrapCompRef.current.of(buildWrapExt()),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            setCursorPosition(line.number, pos - line.from + 1);
          }
          if (update.docChanged) {
            setIsModified(true);
          }
        }),
      ];

      if (readOnly) {
        extensions.push(EditorState.readOnly.of(true));
      }

      if (ext === "md") {
        extensions.push(markdown());
      }

      if (delimiter && (ext === "csv" || ext === "tsv" || ext === "tab")) {
        extensions.push(csvKeymap(delimiter));
        extensions.push(csvColumnHighlight(delimiter));
      }

      const state = EditorState.create({
        doc: initialContent,
        extensions,
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, [isDark, delimiter, readOnly, getFileExtension]); // eslint-disable-line react-hooks/exhaustive-deps

    // Dynamically reconfigure style/wrap/ruler when display settings change
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: [
          styleCompRef.current.reconfigure(buildStyleExt()),
          wrapCompRef.current.reconfigure(buildWrapExt()),
          rulerCompRef.current.reconfigure(rulerExtension(wrapColumn)),
        ],
      });
    }, [fontFamily, fontSize, fontColor, editorBgColor, wrapMode, wrapColumn, buildStyleExt, buildWrapExt]);

    return <div ref={containerRef} className="editor-container" />;
  },
);

Editor.displayName = "Editor";
export default Editor;

function useMediaDark(): boolean {
  const query =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  const getSnapshot = () => query?.matches ?? false;

  const subscribe = (callback: () => void) => {
    query?.addEventListener("change", callback);
    return () => query?.removeEventListener("change", callback);
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
