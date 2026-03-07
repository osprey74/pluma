import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { undo, redo } from "@codemirror/commands";
import { openSearchPanel } from "@codemirror/search";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Editor, { EditorHandle } from "./components/Editor/Editor";
import MenuBar from "./components/MenuBar/MenuBar";
import StatusBar from "./components/StatusBar/StatusBar";
import SettingsDialog from "./components/SettingsDialog/SettingsDialog";
import ConfirmSaveDialog from "./components/ConfirmSaveDialog/ConfirmSaveDialog";
import { useFileIO, getRecentFiles } from "./hooks/useFileIO";
import { useEditorStore } from "./stores/editorStore";
import type { WrapMode } from "./stores/editorStore";
import "./App.css";

const FONT_OPTIONS = [
  { label: "Source Han Code JP", value: "'Source Han Code JP', monospace" },
  { label: "MS ゴシック", value: "'MS Gothic', monospace" },
  { label: "MS 明朝", value: "'MS Mincho', monospace" },
];

type PendingAction =
  | { type: "new" }
  | { type: "open" }
  | { type: "openRecent"; path: string }
  | { type: "exit" }
  | null;

function App() {
  const editorRef = useRef<EditorHandle>(null);
  const [content, setContent] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingAction, _setPendingAction] = useState<PendingAction>(null);
  const pendingActionRef = useRef<PendingAction>(null);
  const setPendingAction = useCallback((action: PendingAction) => {
    pendingActionRef.current = action;
    _setPendingAction(action);
  }, []);
  const { openFile, openFileByPath, saveFile, reloadWithEncoding } = useFileIO();
  const {
    setLineEnding,
    isModified,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    wrapMode,
    setWrapMode,
    wrapColumn,
    setWrapColumn,
    reset,
  } = useEditorStore();

  // --- Core actions (no guard) ---

  const doNew = useCallback(() => {
    setContent("");
    setReadOnly(false);
    reset();
    setEditorKey((k) => k + 1);
  }, [reset]);

  const doOpen = useCallback(async () => {
    try {
      const result = await openFile();
      if (result) {
        setContent(result.text);
        setReadOnly(result.readOnly);
        setEditorKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [openFile]);

  const doOpenRecent = useCallback(
    async (path: string) => {
      try {
        const result = await openFileByPath(path);
        if (result) {
          setContent(result.text);
          setReadOnly(result.readOnly);
          setEditorKey((k) => k + 1);
        }
      } catch (err) {
        console.error("Failed to open recent file:", err);
      }
    },
    [openFileByPath],
  );

  const doExit = useCallback(() => {
    getCurrentWindow().destroy();
  }, []);

  const doSave = useCallback(async () => {
    const text = editorRef.current?.getContent() ?? "";
    try {
      await saveFile(text);
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [saveFile]);

  // --- Execute a pending action ---

  const executePendingAction = useCallback(
    async (action: PendingAction) => {
      if (!action) return;
      switch (action.type) {
        case "new":
          doNew();
          break;
        case "open":
          await doOpen();
          break;
        case "openRecent":
          await doOpenRecent(action.path);
          break;
        case "exit":
          doExit();
          break;
      }
    },
    [doNew, doOpen, doOpenRecent, doExit],
  );

  // --- Guarded actions (check isModified) ---

  const handleNew = useCallback(() => {
    if (isModified) {
      setPendingAction({ type: "new" });
    } else {
      doNew();
    }
  }, [isModified, doNew]);

  const handleOpen = useCallback(() => {
    if (isModified) {
      setPendingAction({ type: "open" });
    } else {
      doOpen();
    }
  }, [isModified, doOpen]);

  const handleOpenRecent = useCallback(
    (path: string) => {
      if (isModified) {
        setPendingAction({ type: "openRecent", path });
      } else {
        doOpenRecent(path);
      }
    },
    [isModified, doOpenRecent],
  );

  const handleExit = useCallback(() => {
    if (isModified) {
      setPendingAction({ type: "exit" });
    } else {
      doExit();
    }
  }, [isModified, doExit]);

  // --- Confirm dialog callbacks ---

  const handleConfirmSave = useCallback(async () => {
    const action = pendingActionRef.current;
    setPendingAction(null);
    await doSave();
    await executePendingAction(action);
  }, [doSave, executePendingAction, setPendingAction]);

  const handleConfirmDiscard = useCallback(async () => {
    const action = pendingActionRef.current;
    setPendingAction(null);
    await executePendingAction(action);
  }, [executePendingAction, setPendingAction]);

  const handleConfirmCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  // --- Other handlers ---

  const handleUndo = useCallback(() => {
    const view = editorRef.current?.getView();
    if (view) undo(view);
  }, []);

  const handleRedo = useCallback(() => {
    const view = editorRef.current?.getView();
    if (view) redo(view);
  }, []);

  const handleFind = useCallback(() => {
    const view = editorRef.current?.getView();
    if (view) openSearchPanel(view);
  }, []);

  const handleSelectAll = useCallback(() => {
    const view = editorRef.current?.getView();
    if (view) {
      view.dispatch({
        selection: { anchor: 0, head: view.state.doc.length },
      });
      view.focus();
    }
  }, []);

  const handleFontSizeIncrease = useCallback(() => {
    setFontSize(Math.min(fontSize + 1, 40));
  }, [fontSize, setFontSize]);

  const handleFontSizeDecrease = useCallback(() => {
    setFontSize(Math.max(fontSize - 1, 8));
  }, [fontSize, setFontSize]);

  const handleWrapColumnChange = useCallback(() => {
    const input = window.prompt("折り返し文字数を入力してください", String(wrapColumn));
    if (input !== null) {
      const n = parseInt(input, 10);
      if (!isNaN(n) && n >= 20 && n <= 500) {
        setWrapColumn(n);
        setWrapMode("column");
      }
    }
  }, [wrapColumn, setWrapColumn, setWrapMode]);

  const handleEncodingChange = useCallback(
    async (encoding: string) => {
      try {
        const text = await reloadWithEncoding(encoding);
        if (text !== null) {
          setContent(text);
          setEditorKey((k) => k + 1);
        }
      } catch (err) {
        console.error("Failed to reload with encoding:", err);
      }
    },
    [reloadWithEncoding],
  );

  const handleLineEndingChange = useCallback(
    (lineEnding: string) => {
      setLineEnding(lineEnding);
    },
    [setLineEnding],
  );

  // --- Keyboard shortcuts ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        handleNew();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        handleOpen();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNew, handleOpen, doSave]);

  // --- Intercept window close button ---

  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async (event) => {
      if (useEditorStore.getState().isModified) {
        event.preventDefault();
        setPendingAction({ type: "exit" });
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // --- Menus ---

  const menus = useMemo(
    () => [
      {
        label: "ファイル",
        items: [
          {
            label: "新規作成",
            icon: "note_add",
            shortcut: "Ctrl+N",
            action: handleNew,
          },
          {
            label: "開く",
            icon: "folder_open",
            shortcut: "Ctrl+O",
            action: handleOpen,
          },
          {
            label: "保存",
            icon: "save",
            shortcut: "Ctrl+S",
            action: doSave,
            disabled: !isModified,
            dividerAfter: true,
          },
          ...getRecentFiles().map((path, i, arr) => ({
            label: path,
            icon: "description",
            action: () => handleOpenRecent(path),
            dividerAfter: i === arr.length - 1,
          })),
          {
            label: "終了",
            icon: "close",
            action: handleExit,
          },
        ],
      },
      {
        label: "編集",
        items: [
          {
            label: "元に戻す",
            icon: "undo",
            shortcut: "Ctrl+Z",
            action: handleUndo,
            disabled: readOnly,
          },
          {
            label: "やり直し",
            icon: "redo",
            shortcut: "Ctrl+Y",
            action: handleRedo,
            disabled: readOnly,
            dividerAfter: true,
          },
          {
            label: "検索と置換",
            icon: "search",
            shortcut: "Ctrl+F",
            action: handleFind,
          },
          {
            label: "すべて選択",
            icon: "select_all",
            shortcut: "Ctrl+A",
            action: handleSelectAll,
          },
        ],
      },
      {
        label: "表示",
        items: [
          ...FONT_OPTIONS.map((font, i) => ({
            label: font.label,
            icon: "font_download",
            action: () => setFontFamily(font.value),
            checked: fontFamily === font.value,
            dividerAfter: i === FONT_OPTIONS.length - 1,
          })),
          {
            label: `文字サイズを拡大 (${fontSize}px)`,
            icon: "text_increase",
            shortcut: "Ctrl++",
            action: handleFontSizeIncrease,
          },
          {
            label: "文字サイズを縮小",
            icon: "text_decrease",
            shortcut: "Ctrl+-",
            action: handleFontSizeDecrease,
            dividerAfter: true,
          },
          {
            label: "折り返さない",
            icon: "wrap_text",
            action: () => setWrapMode("none" as WrapMode),
            checked: wrapMode === "none",
          },
          {
            label: "ウィンドウ幅で折り返し",
            icon: "wrap_text",
            action: () => setWrapMode("window" as WrapMode),
            checked: wrapMode === "window",
          },
          {
            label: `指定文字数で折り返し (${wrapColumn}文字)`,
            icon: "wrap_text",
            action: () => setWrapMode("column" as WrapMode),
            checked: wrapMode === "column",
          },
          {
            label: "折り返し文字数を変更...",
            icon: "edit",
            action: handleWrapColumnChange,
            dividerAfter: true,
          },
          {
            label: "設定...",
            icon: "settings",
            action: () => setSettingsOpen(true),
          },
        ],
      },
    ],
    [
      handleNew,
      handleOpen,
      handleOpenRecent,
      handleExit,
      doSave,
      handleUndo,
      handleRedo,
      handleFind,
      handleSelectAll,
      handleFontSizeIncrease,
      handleFontSizeDecrease,
      handleWrapColumnChange,
      isModified,
      readOnly,
      fontFamily,
      fontSize,
      wrapMode,
      wrapColumn,
      setFontFamily,
      setWrapMode,
    ],
  );

  return (
    <div className="app">
      <MenuBar menus={menus} readOnly={readOnly} />
      <Editor
        key={editorKey}
        ref={editorRef}
        initialContent={content}
        readOnly={readOnly}
      />
      <StatusBar
        onEncodingChange={handleEncodingChange}
        onLineEndingChange={handleLineEndingChange}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ConfirmSaveDialog
        open={pendingAction !== null}
        onSave={handleConfirmSave}
        onDiscard={handleConfirmDiscard}
        onCancel={handleConfirmCancel}
      />
    </div>
  );
}

export default App;
