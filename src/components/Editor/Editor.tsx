import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { EditorState, Extension, Compartment } from "@codemirror/state";
import { defaultKeymap, historyKeymap, history, indentWithTab, insertNewline } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { search, searchKeymap, openSearchPanel, selectNextOccurrence } from "@codemirror/search";
import { markdown } from "@codemirror/lang-markdown";
import { useShallow } from "zustand/react/shallow";
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
  onDocChange?: () => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(
  ({ initialContent = "", readOnly = false, onDocChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const styleCompRef = useRef(new Compartment());
    const wrapCompRef = useRef(new Compartment());
    const rulerCompRef = useRef(new Compartment());
    const whitespaceCompRef = useRef(new Compartment());

    // Subscribe selectively to avoid re-rendering on cursor moves.
    const {
      delimiter,
      filePath,
      fontFamily,
      fontSize,
      fontColor,
      editorBgColor,
      wrapMode,
      wrapColumn,
      showWhitespace,
    } = useEditorStore(
      useShallow((s) => ({
        delimiter: s.delimiter,
        filePath: s.filePath,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontColor: s.fontColor,
        editorBgColor: s.editorBgColor,
        wrapMode: s.wrapMode,
        wrapColumn: s.wrapColumn,
        showWhitespace: s.showWhitespace,
      })),
    );

    // Setters are stable — read once from the store.
    const setCursorPosition = useEditorStore((s) => s.setCursorPosition);
    const setSelectionLength = useEditorStore((s) => s.setSelectionLength);
    const setIsModified = useEditorStore((s) => s.setIsModified);

    // Keep the latest onDocChange in a ref so the editor (created once)
    // always calls the current callback without needing to re-create.
    const onDocChangeRef = useRef(onDocChange);
    onDocChangeRef.current = onDocChange;

    const savedSelectionRef = useRef<{ anchor: number; head: number } | null>(null);

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
      // Force no-wrap in CSV mode so visual column padding stays aligned.
      const ext = getFileExtension();
      const isCsvMode = !!delimiter && (ext === "csv" || ext === "tsv" || ext === "tab");
      if (isCsvMode) return [];

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
    }, [wrapMode, wrapColumn, delimiter, getFileExtension]);

    const buildWhitespaceExt = useCallback((): Extension => {
      return showWhitespace ? whitespaceExtension() : [];
    }, [showWhitespace]);

    // Create editor once (structural deps only)
    useEffect(() => {
      if (!containerRef.current) return;

      const ext = getFileExtension();
      const isCsvMode =
        !!delimiter && (ext === "csv" || ext === "tsv" || ext === "tab");
      const extensions: Extension[] = [
        indentUnit.of("\t"),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        search({ top: false }),
        EditorState.allowMultipleSelections.of(true),
        drawSelection(),
        rectangularSelection(),
        crosshairCursor(),
        // Fix: When Alt+clicking inside existing selected text, CodeMirror
        // sets dragging=null which doesn't preventDefault on mousedown.
        // The browser then initiates a native text drag, stealing mousemove
        // events and breaking multi-line rectangular selection.
        // Clearing the selection before CodeMirror processes mousedown
        // ensures isInPrimarySelection returns false → dragging=false →
        // mousedown is prevented → no native drag interference.
        EditorView.domEventHandlers({
          mousedown(e, view) {
            if (e.altKey && e.button === 0) {
              const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
              if (pos !== null && !view.state.selection.main.empty) {
                view.dispatch({ selection: { anchor: pos } });
              }
            }
            return false;
          },
          dragstart(e) {
            if (e.altKey) {
              e.preventDefault();
              return true;
            }
            return false;
          },
        }),
        keymap.of([
          // Override Enter before defaultKeymap so plain text gets a literal
          // newline. The default insertNewlineAndIndent has "smart" behavior
          // that strips a whitespace-only line's indent and re-applies it to
          // the new line — surprising in plain text.
          { key: "Enter", run: insertNewline },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          { key: "Mod-h", run: openSearchPanel },
          { key: "Mod-d", run: selectNextOccurrence },
        ]),
        getThemeExtension(),
        rulerCompRef.current.of(rulerExtension(wrapColumn)),
        whitespaceCompRef.current.of(buildWhitespaceExt()),
        styleCompRef.current.of(buildStyleExt()),
        wrapCompRef.current.of(buildWrapExt()),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            setCursorPosition(line.number, pos - line.from + 1);

            // Count selected characters by Unicode code point so a kanji and
            // an ASCII letter both count as 1, and a newline counts as 1.
            let selLen = 0;
            for (const range of update.state.selection.ranges) {
              if (!range.empty) {
                const text = update.state.doc.sliceString(range.from, range.to);
                selLen += [...text].length;
              }
            }
            setSelectionLength(selLen);
          }
          if (update.docChanged) {
            setIsModified(true);
            onDocChangeRef.current?.();
          }
        }),
      ];

      if (readOnly) {
        extensions.push(EditorState.readOnly.of(true));
      }

      if (ext === "md") {
        extensions.push(markdown());
      }

      if (isCsvMode) {
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

      // Restore cursor position after editor re-creation
      if (savedSelectionRef.current) {
        const { anchor, head } = savedSelectionRef.current;
        const docLen = view.state.doc.length;
        view.dispatch({
          selection: { anchor: Math.min(anchor, docLen), head: Math.min(head, docLen) },
          scrollIntoView: true,
        });
        savedSelectionRef.current = null;
      }

      return () => {
        // Save cursor position before destroying
        if (viewRef.current) {
          const sel = viewRef.current.state.selection.main;
          savedSelectionRef.current = { anchor: sel.anchor, head: sel.head };
        }
        view.destroy();
        viewRef.current = null;
      };
    }, [delimiter, readOnly, getFileExtension]); // eslint-disable-line react-hooks/exhaustive-deps

    // Dynamically reconfigure style/wrap/ruler/whitespace when settings change
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        effects: [
          styleCompRef.current.reconfigure(buildStyleExt()),
          wrapCompRef.current.reconfigure(buildWrapExt()),
          rulerCompRef.current.reconfigure(rulerExtension(wrapColumn)),
          whitespaceCompRef.current.reconfigure(buildWhitespaceExt()),
        ],
      });
    }, [fontFamily, fontSize, fontColor, editorBgColor, wrapMode, wrapColumn, showWhitespace, buildStyleExt, buildWrapExt, buildWhitespaceExt]);

    return <div ref={containerRef} className="editor-container" />;
  },
);

Editor.displayName = "Editor";
export default Editor;
