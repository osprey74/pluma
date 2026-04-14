import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { undo, redo } from "@codemirror/commands";
import { openSearchPanel } from "@codemirror/search";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, TauriEvent } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Editor, { EditorHandle } from "./components/Editor/Editor";
import MenuBar from "./components/MenuBar/MenuBar";
import TabBar, { type TabInfo } from "./components/TabBar/TabBar";
import Toolbar, { type ToolbarItem } from "./components/Toolbar/Toolbar";
import StatusBar from "./components/StatusBar/StatusBar";
import SettingsDialog from "./components/SettingsDialog/SettingsDialog";
import ConfirmSaveDialog from "./components/ConfirmSaveDialog/ConfirmSaveDialog";
import InfoDialog from "./components/InfoDialog/InfoDialog";
import HelpDialog from "./components/HelpDialog/HelpDialog";
import { InvisibleInspector } from "./components/InvisibleInspector";
import { InspectorPreview } from "./components/InvisibleInspector/InspectorPreview";
import { MarkdownPreview, type MarkdownPreviewHandle } from "./components/MarkdownPreview/MarkdownPreview";
import { marked } from "marked";
import { useFileIO, getRecentFiles } from "./hooks/useFileIO";
import { useEditorStore } from "./stores/editorStore";
import type { WrapMode } from "./stores/editorStore";
import "./App.css";

type InspectorMode = "off" | "edit" | "preview";

const FONT_OPTIONS = [
  { label: "Source Han Code JP", value: "'Source Han Code JP', monospace" },
  { label: "MS ゴシック", value: "'MS Gothic', monospace" },
  { label: "MS 明朝", value: "'MS Mincho', monospace" },
];

// --- Tab data ---

interface TabData {
  id: number;
  content: string;
  readOnly: boolean;
  filePath: string | null;
  encoding: string;
  hasBom: boolean;
  lineEnding: string;
  fileSize: number;
  isModified: boolean;
  delimiter: "," | "\t" | ";" | null;
}

let nextTabId = 1;

function createTab(overrides?: Partial<TabData>): TabData {
  return {
    id: nextTabId++,
    content: "",
    readOnly: false,
    filePath: null,
    encoding: "UTF-8",
    hasBom: false,
    lineEnding: "LF",
    fileSize: 0,
    isModified: false,
    delimiter: null,
    ...overrides,
  };
}

function getTabTitle(tab: TabData): string {
  if (tab.filePath) {
    const name = tab.filePath.split(/[/\\]/).pop() ?? tab.filePath;
    return name;
  }
  return "Untitled";
}

// --- Pending actions ---

type PendingAction =
  | { type: "new" }
  | { type: "open" }
  | { type: "openRecent"; path: string }
  | { type: "closeTab"; tabId: number }
  | { type: "exit" }
  | null;

function App() {
  const editorRef = useRef<EditorHandle>(null);
  const [tabs, setTabs] = useState<TabData[]>(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState<number>(tabs[0].id);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const switchToTabRef = useRef<(tabId: number) => void>(() => {});
  const [editorKey, setEditorKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingAction, _setPendingAction] = useState<PendingAction>(null);
  const pendingActionRef = useRef<PendingAction>(null);
  const setPendingAction = useCallback((action: PendingAction) => {
    pendingActionRef.current = action;
    _setPendingAction(action);
  }, []);
  const { openFile, openFileByPath, saveFile, saveFileAs, reloadWithEncoding } = useFileIO();
  const store = useEditorStore();
  const {
    filePath,
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
    showInspector,
    setShowInspector,
    mdPreviewWidth,
    setMdPreviewWidth,
  } = store;

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId)!, [tabs, activeTabId]);
  const readOnly = activeTab.readOnly;

  const isMarkdownFile = useMemo(() => {
    if (!filePath) return false;
    const ext = filePath.split(".").pop()?.toLowerCase();
    return ext === "md" || ext === "markdown";
  }, [filePath]);

  // --- Save current editor content into tab data ---

  const syncCurrentTabContent = useCallback(() => {
    const text = editorRef.current?.getContent();
    if (text === undefined) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, content: text, isModified: store.isModified, filePath: store.filePath, encoding: store.encoding, hasBom: store.hasBom, lineEnding: store.lineEnding, fileSize: store.fileSize, delimiter: store.delimiter }
          : t,
      ),
    );
  }, [activeTabId, store]);

  // --- Restore tab data into editor store ---

  const restoreTabToStore = useCallback((tab: TabData) => {
    store.setFileInfo({
      filePath: tab.filePath ?? "",
      encoding: tab.encoding,
      hasBom: tab.hasBom,
      lineEnding: tab.lineEnding,
      fileSize: tab.fileSize,
    });
    if (!tab.filePath) {
      // reset filePath to null (setFileInfo sets it to "")
      useEditorStore.setState({ filePath: null });
    }
    store.setIsModified(tab.isModified);
    store.setDelimiter(tab.delimiter);
  }, [store]);

  // --- Tab operations ---

  const switchToTab = useCallback((tabId: number) => {
    if (tabId === activeTabId) return;
    syncCurrentTabContent();
    setActiveTabId(tabId);
    setMdPreview(false);
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      restoreTabToStore(tab);
      setEditorKey((k) => k + 1);
    }
  }, [activeTabId, tabs, syncCurrentTabContent, restoreTabToStore]);
  switchToTabRef.current = switchToTab;

  // Keep activeTab content in sync (needed since switchToTab reads from tabs state)
  useEffect(() => {
    restoreTabToStore(activeTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doNewTab = useCallback(() => {
    syncCurrentTabContent();
    setMdPreview(false);
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    restoreTabToStore(tab);
    setEditorKey((k) => k + 1);
  }, [syncCurrentTabContent, restoreTabToStore]);

  const doOpenInNewTab = useCallback(async () => {
    try {
      const result = await openFile();
      if (!result) return;
      // Switch to existing tab if already open
      const s = useEditorStore.getState();
      const existing = tabs.find((t) => t.filePath === s.filePath);
      if (existing) {
        switchToTab(existing.id);
        setInfoMessage("既に開いているファイルです");
        return;
      }
      syncCurrentTabContent();
      const tab = createTab({
        content: result.text,
        readOnly: result.readOnly,
        filePath: s.filePath,
        encoding: s.encoding,
        hasBom: s.hasBom,
        lineEnding: s.lineEnding,
        fileSize: s.fileSize,
        delimiter: s.delimiter,
      });
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
      restoreTabToStore(tab);
      setEditorKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  }, [tabs, switchToTab, openFile, syncCurrentTabContent, restoreTabToStore]);

  const doOpenRecentInNewTab = useCallback(
    async (path: string) => {
      try {
        // Switch to existing tab if already open
        const existing = tabs.find((t) => t.filePath === path);
        if (existing) {
          switchToTab(existing.id);
          setInfoMessage("既に開いているファイルです");
          return;
        }
        const result = await openFileByPath(path);
        if (!result) return;
        syncCurrentTabContent();
        const s = useEditorStore.getState();
        const tab = createTab({
          content: result.text,
          readOnly: result.readOnly,
          filePath: s.filePath,
          encoding: s.encoding,
          hasBom: s.hasBom,
          lineEnding: s.lineEnding,
          fileSize: s.fileSize,
          delimiter: s.delimiter,
        });
        setTabs((prev) => [...prev, tab]);
        setActiveTabId(tab.id);
        restoreTabToStore(tab);
        setEditorKey((k) => k + 1);
      } catch (err) {
        console.error("Failed to open recent file:", err);
      }
    },
    [tabs, switchToTab, openFileByPath, syncCurrentTabContent, restoreTabToStore],
  );

  const doCloseTab = useCallback(
    (tabId: number) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (remaining.length === 0) {
          // Last tab: create a new empty tab
          const tab = createTab();
          remaining.push(tab);
        }
        if (tabId === activeTabId) {
          // Switch to adjacent tab
          const idx = prev.findIndex((t) => t.id === tabId);
          const newActive = remaining[Math.min(idx, remaining.length - 1)];
          setActiveTabId(newActive.id);
          setMdPreview(false);
          restoreTabToStore(newActive);
          setEditorKey((k) => k + 1);
        }
        return remaining;
      });
    },
    [activeTabId, restoreTabToStore],
  );

  const doExit = useCallback(() => {
    getCurrentWindow().destroy();
  }, []);

  const doSave = useCallback(async () => {
    const text = editorRef.current?.getContent() ?? "";
    try {
      const saved = await saveFile(text);
      if (saved) {
        // Update tab data after save
        const s = useEditorStore.getState();
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, content: text, isModified: false, filePath: s.filePath, encoding: s.encoding, hasBom: s.hasBom, lineEnding: s.lineEnding, fileSize: s.fileSize }
              : t,
          ),
        );
      }
      requestAnimationFrame(() => editorRef.current?.getView()?.focus());
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [saveFile, activeTabId]);

  const doSaveAs = useCallback(async () => {
    const text = editorRef.current?.getContent() ?? "";
    try {
      const saved = await saveFileAs(text);
      if (saved) {
        const s = useEditorStore.getState();
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? { ...t, content: text, isModified: false, filePath: s.filePath, encoding: s.encoding, hasBom: s.hasBom, lineEnding: s.lineEnding, fileSize: s.fileSize }
              : t,
          ),
        );
      }
      requestAnimationFrame(() => editorRef.current?.getView()?.focus());
    } catch (err) {
      console.error("Failed to save file as:", err);
    }
  }, [saveFileAs, activeTabId]);

  // --- Execute a pending action ---

  const executePendingAction = useCallback(
    async (action: PendingAction) => {
      if (!action) return;
      switch (action.type) {
        case "new":
          doNewTab();
          break;
        case "open":
          await doOpenInNewTab();
          break;
        case "openRecent":
          await doOpenRecentInNewTab(action.path);
          break;
        case "closeTab":
          doCloseTab(action.tabId);
          break;
        case "exit":
          doExit();
          break;
      }
    },
    [doNewTab, doOpenInNewTab, doOpenRecentInNewTab, doCloseTab, doExit],
  );

  // --- Guarded actions ---

  const handleNew = useCallback(() => {
    doNewTab();
  }, [doNewTab]);

  const handleOpen = useCallback(() => {
    doOpenInNewTab();
  }, [doOpenInNewTab]);

  const handleOpenRecent = useCallback(
    (path: string) => {
      doOpenRecentInNewTab(path);
    },
    [doOpenRecentInNewTab],
  );

  const handleCloseTab = useCallback(
    (tabId: number) => {
      const tab = tabs.find((t) => t.id === tabId);
      // Sync content first if closing active tab
      if (tabId === activeTabId) {
        const text = editorRef.current?.getContent();
        if (text !== undefined) {
          const modified = useEditorStore.getState().isModified;
          setTabs((prev) => prev.map((t) => t.id === tabId ? { ...t, content: text, isModified: modified } : t));
          if (modified) {
            setPendingAction({ type: "closeTab", tabId });
            return;
          }
        }
      } else if (tab?.isModified) {
        // Switch to the tab first, then ask
        switchToTab(tabId);
        setTimeout(() => setPendingAction({ type: "closeTab", tabId }), 50);
        return;
      }
      doCloseTab(tabId);
    },
    [tabs, activeTabId, doCloseTab, switchToTab, setPendingAction],
  );

  const handleExit = useCallback(() => {
    // Check if any tab has unsaved changes
    syncCurrentTabContent();
    const anyModified = tabs.some((t) => t.id === activeTabId ? useEditorStore.getState().isModified : t.isModified);
    if (anyModified) {
      setPendingAction({ type: "exit" });
    } else {
      doExit();
    }
  }, [tabs, activeTabId, syncCurrentTabContent, doExit, setPendingAction]);

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
    // Mark as not modified so the action proceeds
    store.setIsModified(false);
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, isModified: false } : t));
    await executePendingAction(action);
  }, [executePendingAction, setPendingAction, store, activeTabId]);

  const handleConfirmCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  // --- Tab bar data ---

  const tabInfos: TabInfo[] = useMemo(() => {
    return tabs.map((t) => ({
      id: t.id,
      title: getTabTitle(t),
      isModified: t.id === activeTabId ? isModified : t.isModified,
    }));
  }, [tabs, activeTabId, isModified]);

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

  const handleFontSizeReset = useCallback(() => {
    setFontSize(14);
  }, [setFontSize]);

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
          setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: text } : t));
          setEditorKey((k) => k + 1);
        }
      } catch (err) {
        console.error("Failed to reload with encoding:", err);
      }
    },
    [reloadWithEncoding, activeTabId],
  );

  const handleLineEndingChange = useCallback(
    (lineEnding: string) => {
      setLineEnding(lineEnding);
    },
    [setLineEnding],
  );

  // --- Inspector ---

  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(
    showInspector ? "edit" : "off",
  );

  const inspectorActive = inspectorMode !== "off";

  const handleToggleInspector = useCallback(() => {
    if (inspectorMode === "off") {
      setInspectorMode("edit");
      setShowInspector(true);
    } else {
      setInspectorMode("off");
      setShowInspector(false);
    }
  }, [inspectorMode, setShowInspector]);

  const handleSwitchToPreview = useCallback(() => {
    if (inspectorMode === "preview") return;
    const currentText = editorRef.current?.getContent() ?? "";
    setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: currentText } : t));
    setInspectorText(currentText);
    setInspectorMode("preview");
  }, [inspectorMode, activeTabId]);

  const handleSwitchToEdit = useCallback(() => {
    setEditorKey((k) => k + 1);
    setInspectorMode("edit");
  }, []);

  // --- Markdown preview ---

  const mdPreviewRef = useRef<MarkdownPreviewHandle>(null);
  const [mdPreview, setMdPreview] = useState(false);
  const [mdPreviewText, setMdPreviewText] = useState("");

  const handleToggleMdPreview = useCallback(() => {
    // Only allow toggling on if it's a markdown file
    if (!mdPreview && !isMarkdownFile) return;
    setMdPreview((v) => !v);
  }, [mdPreview, isMarkdownFile]);

  // --- Print ---

  const [printContent, setPrintContent] = useState<{ type: "text" | "markdown"; html: string } | null>(null);

  const hasContent = activeTab.content.length > 0 || !!filePath;

  const handlePrint = useCallback(async () => {
    const text = editorRef.current?.getContent() ?? "";
    if (!text) return;

    // Prepare print content (swap DOM for PDF generation)
    if (mdPreview) {
      const html = marked.parse(text, { async: false }) as string;
      setPrintContent({ type: "markdown", html });
    } else {
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      setPrintContent({ type: "text", html: escaped });
    }

    const fp = useEditorStore.getState().filePath;
    const fileNameFull = fp ? fp.split(/[/\\]/).pop() ?? "Untitled" : "Untitled";
    const fileName = fileNameFull.replace(/\.[^.]+$/, "");

    // Set document.title to filename so CDP header template picks it up
    const origTitle = document.title;
    document.title = fileNameFull;

    // Wait for DOM update, then generate PDF via CDP
    await new Promise((r) => setTimeout(r, 150));
    try {
      await invoke("print_to_pdf", { fileName });
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    }
    document.title = origTitle;
    setPrintContent(null);
  }, [mdPreview]);

  useEffect(() => {
    if (!mdPreview) return;
    setMdPreviewText(editorRef.current?.getContent() ?? "");
    const interval = setInterval(() => {
      setMdPreviewText(editorRef.current?.getContent() ?? "");
    }, 500);
    return () => clearInterval(interval);
  }, [mdPreview, editorKey]);

  useEffect(() => {
    if (!mdPreview) return;
    const view = editorRef.current?.getView();
    if (!view) return;
    const editorScroller = view.scrollDOM;
    const previewEl = mdPreviewRef.current?.getScrollEl();
    if (!previewEl) return;

    let scrollSource: "editor" | "preview" | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onEditorScroll = () => {
      if (scrollSource === "preview") return;
      scrollSource = "editor";
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { scrollSource = null; }, 100);
      requestAnimationFrame(() => {
        const maxE = editorScroller.scrollHeight - editorScroller.clientHeight;
        const ratio = maxE > 0 ? editorScroller.scrollTop / maxE : 0;
        const maxP = previewEl.scrollHeight - previewEl.clientHeight;
        previewEl.scrollTop = ratio * maxP;
      });
    };

    const onPreviewScroll = () => {
      if (scrollSource === "editor") return;
      scrollSource = "preview";
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { scrollSource = null; }, 100);
      requestAnimationFrame(() => {
        const maxP = previewEl.scrollHeight - previewEl.clientHeight;
        const ratio = maxP > 0 ? previewEl.scrollTop / maxP : 0;
        const maxE = editorScroller.scrollHeight - editorScroller.clientHeight;
        editorScroller.scrollTop = ratio * maxE;
      });
    };

    editorScroller.addEventListener("scroll", onEditorScroll, { passive: true });
    previewEl.addEventListener("scroll", onPreviewScroll, { passive: true });
    return () => {
      editorScroller.removeEventListener("scroll", onEditorScroll);
      previewEl.removeEventListener("scroll", onPreviewScroll);
      if (timer) clearTimeout(timer);
    };
  }, [mdPreview, editorKey]);

  const getEditorText = useCallback(() => {
    return editorRef.current?.getContent() ?? "";
  }, []);

  const handleInspectorClean = useCallback(
    (cleanText: string) => {
      if (editorRef.current) {
        editorRef.current.setContent(cleanText);
      }
      setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, content: cleanText } : t));
      setInspectorText(cleanText);
    },
    [activeTabId],
  );

  // --- Ctrl+Mouse wheel for font size ---

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          useEditorStore.getState().setFontSize(
            Math.min(useEditorStore.getState().fontSize + 1, 40),
          );
        } else if (e.deltaY > 0) {
          useEditorStore.getState().setFontSize(
            Math.max(useEditorStore.getState().fontSize - 1, 8),
          );
        }
      }
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, []);

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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        doSaveAs();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        doSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        handleCloseTab(activeTabId);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        handleFontSizeIncrease();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        handleFontSizeDecrease();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        handleFontSizeReset();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
        handleToggleInspector();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "M") {
        e.preventDefault();
        handleToggleMdPreview();
      }
      if (e.key === "F1") {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNew, handleOpen, doSave, doSaveAs, handlePrint, handleCloseTab, activeTabId, handleFontSizeIncrease, handleFontSizeDecrease, handleFontSizeReset, handleToggleInspector, handleToggleMdPreview]);

  // --- Open files passed via CLI args (file association) ---

  useEffect(() => {
    (async () => {
      try {
        const paths = await invoke<string[]>("get_cli_file_args");
        if (paths.length > 0) {
          // Open the first file in the initial empty tab
          const result = await openFileByPath(paths[0]);
          if (result) {
            const s = useEditorStore.getState();
            setTabs((prev) =>
              prev.map((t) =>
                t.id === activeTabId
                  ? {
                      ...t,
                      content: result.text,
                      readOnly: result.readOnly,
                      filePath: s.filePath,
                      encoding: s.encoding,
                      hasBom: s.hasBom,
                      lineEnding: s.lineEnding,
                      fileSize: s.fileSize,
                      delimiter: s.delimiter,
                    }
                  : t,
              ),
            );
            setEditorKey((k) => k + 1);
          }
          // Open remaining files in new tabs
          for (let i = 1; i < paths.length; i++) {
            const res = await openFileByPath(paths[i]);
            if (res) {
              const s = useEditorStore.getState();
              const tab = createTab({
                content: res.text,
                readOnly: res.readOnly,
                filePath: s.filePath,
                encoding: s.encoding,
                hasBom: s.hasBom,
                lineEnding: s.lineEnding,
                fileSize: s.fileSize,
                delimiter: s.delimiter,
              });
              setTabs((prev) => [...prev, tab]);
              setActiveTabId(tab.id);
              restoreTabToStore(tab);
              setEditorKey((k) => k + 1);
            }
          }
        }
      } catch (err) {
        console.error("Failed to open CLI file args:", err);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Drag & drop files ---

  const [isDragOver, setIsDragOver] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];

    unlisteners.push(
      listen<{ paths: string[] }>(TauriEvent.DRAG_DROP, async (event) => {
        setIsDragOver(false);
        const paths = event.payload.paths;
        for (const path of paths) {
          try {
            // Switch to existing tab if already open
            const existing = tabsRef.current.find((t) => t.filePath === path);
            if (existing) {
              switchToTabRef.current(existing.id);
              setInfoMessage("既に開いているファイルです");
              continue;
            }
            const result = await openFileByPath(path);
            if (result) {
              // Save current editor text to active tab (keep metadata unchanged)
              const curText = editorRef.current?.getContent();
              const curId = activeTabIdRef.current;
              if (curText !== undefined) {
                setTabs((prev) =>
                  prev.map((t) => t.id === curId ? { ...t, content: curText } : t),
                );
              }
              const s = useEditorStore.getState();
              const tab = createTab({
                content: result.text,
                readOnly: result.readOnly,
                filePath: s.filePath,
                encoding: s.encoding,
                hasBom: s.hasBom,
                lineEnding: s.lineEnding,
                fileSize: s.fileSize,
                delimiter: s.delimiter,
              });
              setTabs((prev) => [...prev, tab]);
              setActiveTabId(tab.id);
              restoreTabToStore(tab);
              setEditorKey((k) => k + 1);
            }
          } catch (err) {
            console.error("Failed to open dropped file:", err);
          }
        }
      }),
    );

    unlisteners.push(
      listen(TauriEvent.DRAG_ENTER, () => setIsDragOver(true)),
    );

    unlisteners.push(
      listen(TauriEvent.DRAG_LEAVE, () => setIsDragOver(false)),
    );

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Intercept window close button ---

  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async (event) => {
      const state = useEditorStore.getState();
      if (state.isModified) {
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
          },
          {
            label: "名前を付けて保存",
            icon: "save_as",
            shortcut: "Ctrl+Shift+S",
            action: doSaveAs,
          },
          {
            label: "タブを閉じる",
            icon: "tab_close",
            shortcut: "Ctrl+W",
            action: () => handleCloseTab(activeTabId),
          },
          {
            label: "印刷...",
            icon: "print",
            shortcut: "Ctrl+P",
            action: handlePrint,
            disabled: !hasContent,
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
          },
          {
            label: "文字サイズをリセット",
            icon: "format_size",
            shortcut: "Ctrl+0",
            action: handleFontSizeReset,
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
            label: "不可視文字インスペクター",
            icon: "visibility",
            shortcut: "Ctrl+Shift+I",
            action: handleToggleInspector,
            checked: inspectorActive,
          },
          {
            label: "Markdownプレビュー",
            icon: "article",
            shortcut: "Ctrl+Shift+M",
            action: handleToggleMdPreview,
            checked: mdPreview,
            disabled: !isMarkdownFile && !mdPreview,
            dividerAfter: true,
          },
          {
            label: "設定...",
            icon: "settings",
            action: () => setSettingsOpen(true),
            dividerAfter: true,
          },
          {
            label: "キーバインド一覧",
            icon: "keyboard",
            shortcut: "F1",
            action: () => setHelpOpen(true),
          },
        ],
      },
    ],
    [
      handleNew, handleOpen, handleOpenRecent, handleCloseTab, handlePrint, hasContent, handleExit,
      doSave, handleUndo, handleRedo, handleFind, handleSelectAll,
      handleFontSizeIncrease, handleFontSizeDecrease, handleFontSizeReset,
      handleWrapColumnChange, handleToggleInspector, handleToggleMdPreview,
      isModified, readOnly, fontFamily, fontSize, wrapMode, wrapColumn,
      showInspector, mdPreview, isMarkdownFile, activeTabId,
      setFontFamily, setWrapMode,
    ],
  );

  const toolbarItems: ToolbarItem[] = useMemo(
    () => [
      { icon: "note_add", title: "新規作成 (Ctrl+N)", action: handleNew, colorClass: "tc-blue" },
      { icon: "folder_open", title: "開く (Ctrl+O)", action: handleOpen, colorClass: "tc-orange" },
      { icon: "save", title: "保存 (Ctrl+S)", action: doSave, disabled: !isModified, colorClass: "tc-blue" },
      { icon: "print", title: "印刷 (Ctrl+P)", action: handlePrint, disabled: !hasContent, colorClass: "tc-gray" },
      { icon: "", title: "", action: () => {}, separator: true },
      { icon: "undo", title: "元に戻す (Ctrl+Z)", action: handleUndo, disabled: readOnly, colorClass: "tc-teal" },
      { icon: "redo", title: "やり直し (Ctrl+Y)", action: handleRedo, disabled: readOnly, colorClass: "tc-teal" },
      { icon: "", title: "", action: () => {}, separator: true },
      { icon: "search", title: "検索と置換 (Ctrl+F)", action: handleFind, colorClass: "tc-purple" },
      { icon: "", title: "", action: () => {}, separator: true },
      { icon: "text_increase", title: "文字サイズ拡大 (Ctrl++)", action: handleFontSizeIncrease, colorClass: "tc-green" },
      { icon: "text_decrease", title: "文字サイズ縮小 (Ctrl+-)", action: handleFontSizeDecrease, colorClass: "tc-green" },
      { icon: "format_size", title: "文字サイズリセット (Ctrl+0)", action: handleFontSizeReset, colorClass: "tc-green" },
      { icon: "", title: "", action: () => {}, separator: true },
      { icon: "wrap_text", title: "折り返し切替", action: () => setWrapMode(wrapMode === "none" ? "window" : "none" as WrapMode), active: wrapMode !== "none", colorClass: "tc-teal" },
      { icon: "", title: "", action: () => {}, separator: true },
      { icon: "visibility", title: "不可視文字インスペクター (Ctrl+Shift+I)", action: handleToggleInspector, active: inspectorActive, colorClass: "tc-orange" },
      { icon: "article", title: "Markdownプレビュー (Ctrl+Shift+M)", action: handleToggleMdPreview, active: mdPreview, disabled: !isMarkdownFile && !mdPreview, colorClass: "tc-pink" },
      { icon: "", title: "", action: () => {}, separator: true },
      { icon: "settings", title: "設定", action: () => setSettingsOpen(true), colorClass: "tc-gray" },
      { icon: "keyboard", title: "キーバインド一覧 (F1)", action: () => setHelpOpen(true), colorClass: "tc-gray" },
    ],
    [
      handleNew, handleOpen, doSave, doSaveAs, handlePrint, hasContent, isModified, readOnly,
      handleUndo, handleRedo, handleFind,
      handleFontSizeIncrease, handleFontSizeDecrease, handleFontSizeReset,
      wrapMode, setWrapMode, inspectorActive, handleToggleInspector,
      mdPreview, isMarkdownFile, handleToggleMdPreview,
    ],
  );

  const [inspectorText, setInspectorText] = useState("");

  useEffect(() => {
    if (!inspectorActive || inspectorMode === "preview") return;
    setInspectorText(getEditorText());
    const interval = setInterval(() => {
      setInspectorText(getEditorText());
    }, 500);
    return () => clearInterval(interval);
  }, [inspectorActive, inspectorMode, getEditorText, editorKey]);

  return (
    <div className={`app${printContent ? " printing" : ""}`}>
      <MenuBar menus={menus} readOnly={readOnly} />
      <Toolbar items={toolbarItems} />
      <TabBar
        tabs={tabInfos}
        activeTabId={activeTabId}
        onSelect={switchToTab}
        onClose={handleCloseTab}
      />
      {inspectorMode === "preview" ? (
        <InspectorPreview
          text={inspectorText}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      ) : (
        <div className="main-area">
          <Editor
            key={editorKey}
            ref={editorRef}
            initialContent={activeTab.content}
            readOnly={readOnly}
          />
          {mdPreview && (
            <MarkdownPreview
              ref={mdPreviewRef}
              text={mdPreviewText}
              width={mdPreviewWidth}
              onWidthChange={setMdPreviewWidth}
            />
          )}
        </div>
      )}
      {inspectorActive && (
        <InvisibleInspector
          text={inspectorText}
          onClean={handleInspectorClean}
          onClose={handleToggleInspector}
          mode={inspectorMode as "edit" | "preview"}
          onSwitchToPreview={handleSwitchToPreview}
          onSwitchToEdit={handleSwitchToEdit}
        />
      )}
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
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <InfoDialog
        open={infoMessage !== null}
        message={infoMessage ?? ""}
        onClose={() => setInfoMessage(null)}
      />
      {printContent && (
        <div className="print-overlay">
          <div
            className={printContent.type === "markdown" ? "print-markdown" : "print-text"}
            dangerouslySetInnerHTML={{ __html: printContent.html }}
          />
        </div>
      )}
      {isDragOver && <div className="drop-overlay">ここにファイルをドロップ</div>}
    </div>
  );
}

export default App;
